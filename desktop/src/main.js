import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
// const WebSocket = require('ws');
import { Server as SocketIOServer } from 'socket.io';
import mediasoup from 'mediasoup';
import { networkInterfaces } from 'os';

// Catch unhandled promise rejections to avoid crashing without logs
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason, promise);
});

const io = new SocketIOServer(8080, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow;
let wss;
let pairingCode;
let connectedClient = null;

// Mediasoup variables
let worker;
let router;
let producerTransport;
let consumerTransport;
let producer;
let consumers = new Map();
// no RTMP server in this flow

const generatePairingCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getLocalIPAddress = () => {
  
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1'; // fallback
};

const createMediasoupWorker = async () => {
  worker = await mediasoup.createWorker({
    logLevel: 'warn',
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
  });

  console.log('Mediasoup worker created');

  worker.on('died', () => {
    console.error('Mediasoup worker died');
    process.exit(1);
  });

  const mediaCodecs = [
    {
      kind: 'audio',
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2,
    },
    {
      kind: 'video',
      mimeType: 'video/VP8',
      clockRate: 90000,
      parameters: {
        'x-google-start-bitrate': 1000,
      },
    },
  ];

  router = await worker.createRouter({ mediaCodecs });
  console.log('Mediasoup router created');
};

// FFmpeg/dshow helpers removed - the app now uses desktopCapturer + native WebRTC

const createWebRtcTransport = async () => {
  const transport = await router.createWebRtcTransport({
    listenIps: [
      {
        ip: '0.0.0.0',
        announcedIp: getLocalIPAddress(),
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  });

  transport.on('dtlsstatechange', (dtlsState) => {
    if (dtlsState === 'closed') {
      transport.close();
    }
  });

  transport.on('close', () => {
    console.log('Transport closed');
  });

  return transport;
};

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  // Generate pairing code
  pairingCode = generatePairingCode();
  const localIP = getLocalIPAddress();
  // Pairing info
  console.log('Pairing code:', pairingCode);
  console.log('Local IP:', localIP);

  // Send to renderer
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('pairing-code', pairingCode);
    mainWindow.webContents.send('local-ip', localIP);
  });

  // Start Socket.IO server
  // Start embedded static server for HLS with improved caching headers
  console.log('Socket.IO server started on port 8080');

  // Initialize mediasoup
  createMediasoupWorker();

  // RTMP/HLS servers removed - using desktopCapturer + native WebRTC (mediasoup) instead

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Handle incoming messages
    socket.on('pair', (data) => {
      console.log('Processing pairing request with code:', data.code);

      if (data.code && data.code.toString() === pairingCode.toString()) {
        console.log('Pairing successful!');
        connectedClient = socket;

        // Send success response
        socket.emit('paired', {
          message: 'Successfully paired with desktop'
        });

        // Send router RTP capabilities
        socket.emit('router-rtp-capabilities', {
          routerRtpCapabilities: router.rtpCapabilities
        });

        // Notify UI
        mainWindow.webContents.send('paired');

      } else {
        console.log('Pairing failed - invalid code');
        socket.emit('error', {
          message: 'Invalid pairing code'
        });
      }
    });

    // WebRTC signaling
    socket.on('create-producer-transport', async (data, callback) => {
      try {
        const transport = await createWebRtcTransport();
        producerTransport = transport;

        callback({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        });
      } catch (error) {
        console.error('Error creating producer transport:', error);
        callback({ error: error.message });
      }
    });

    socket.on('connect-producer-transport', async (data, callback) => {
      try {
        await producerTransport.connect({ dtlsParameters: data.dtlsParameters });
        callback();
      } catch (error) {
        console.error('Error connecting producer transport:', error);
        callback({ error: error.message });
      }
    });

    socket.on('produce', async (data, callback) => {
      try {
        producer = await producerTransport.produce({
          kind: data.kind,
          rtpParameters: data.rtpParameters,
        });

        producer.on('transportclose', () => {
          console.log('Producer transport closed');
          producer = null;
        });

        callback({ id: producer.id });
      } catch (error) {
        console.error('Error producing:', error);
        callback({ error: error.message });
      }
    });

    socket.on('create-consumer-transport', async (data, callback) => {
      try {
        const transport = await createWebRtcTransport();
        consumerTransport = transport;

        callback({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        });
      } catch (error) {
        console.error('Error creating consumer transport:', error);
        callback({ error: error.message });
      }
    });

    socket.on('connect-consumer-transport', async (data, callback) => {
      try {
        await consumerTransport.connect({ dtlsParameters: data.dtlsParameters });
        callback();
      } catch (error) {
        console.error('Error connecting consumer transport:', error);
        callback({ error: error.message });
      }
    });

    socket.on('consume', async (data, callback) => {
      try {
        const consumer = await consumerTransport.consume({
          producerId: data.producerId,
          rtpCapabilities: router.rtpCapabilities,
          paused: true,
        });

        consumers.set(consumer.id, consumer);

        consumer.on('transportclose', () => {
          console.log('Consumer transport closed');
          consumers.delete(consumer.id);
        });

        consumer.on('producerclose', () => {
          console.log('Producer closed');
          consumers.delete(consumer.id);
        });

        callback({
          id: consumer.id,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
          type: consumer.type,
          producerPaused: consumer.producerPaused,
        });
      } catch (error) {
        console.error('Error consuming:', error);
        callback({ error: error.message });
      }
    });

    socket.on('resume-consumer', async (data, callback) => {
      try {
        const consumer = consumers.get(data.consumerId);
        if (consumer) {
          await consumer.resume();
          callback();
        } else {
          callback({ error: 'Consumer not found' });
        }
      } catch (error) {
        console.error('Error resuming consumer:', error);
        callback({ error: error.message });
      }
    });

    socket.on('ping', () => {
      // Respond to ping to keep connection alive
      socket.emit('pong');
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      if (connectedClient === socket) {
        connectedClient = null;
        mainWindow.webContents.send('disconnected');
      }
    });

    // legacy RTSP/RTMP endpoints removed - use WebRTC flows

    // WebRTC signaling from mobile
    socket.on('webrtc-offer', async (data) => {
      console.log('Received WebRTC offer from mobile, forwarding to renderer');
      mainWindow.webContents.send('webrtc-offer', data);
    });

    socket.on('ice-candidate', (data) => {
      console.log('Received ICE candidate from mobile, forwarding to renderer');
      mainWindow.webContents.send('ice-candidate', data);
    });

    // Forward screen-specific signaling (answer / ICE) back to renderer
    socket.on('screen-answer', (data) => {
      console.log('Received screen answer from mobile, forwarding to renderer');
      mainWindow.webContents.send('screen-answer', data);
    });

    socket.on('screen-ice-candidate', (data) => {
      console.log('Received screen ICE candidate from mobile, forwarding to renderer');
      mainWindow.webContents.send('mobile-ice-candidate', data);
    });

    socket.on('start-screen-sharing', async () => {
      console.log('Mobile requested screen sharing - forwarding to renderer');
      mainWindow.webContents.send('start-screen-sharing');
    });

    socket.on('stop-screen-sharing', () => {
      console.log('Mobile requested to stop screen sharing - forwarding to renderer');
      mainWindow.webContents.send('stop-screen-sharing');
    });
  });
};
ipcMain.on('send-to-ws', (event, data) => {
  if (!connectedClient) return;
  try {
    const eventType = data && data.type ? data.type : 'message';
    // Emit the event to the connected mobile client with the payload (excluding the type)
    const payload = Object.assign({}, data);
    delete payload.type;
    connectedClient.emit(eventType, payload);
  } catch (e) {
    console.error('Error forwarding message to connected client:', e);
  }
});

// Legacy start/stop livestream IPC removed - use WebRTC screensharing flows instead

// Get screen sources
ipcMain.handle('get-screen-sources', async () => {
  console.log('get-screen-sources handler called');
  const { desktopCapturer } = await import('electron');
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  console.log('Screen sources found:', sources.length);
  return sources;
});

// HLS/FFmpeg/RTMP code removed: the app now uses desktopCapturer + native WebRTC (mediasoup)

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (wss) wss.close();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
