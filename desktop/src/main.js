import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
const WebSocket = require('ws');
const io = require('socket.io')(8080, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const ffmpeg = require('fluent-ffmpeg');
const http = require('http');
const fs = require('fs');
const url = require('url');
const mediasoup = require('mediasoup');
const RtmpServer = require('rtmp-server');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow;
let wss;
let pairingCode;
let connectedClient = null;
let ffmpegProcess = null;
let httpServer = null;
let rtspUrl;

// Mediasoup variables
let worker;
let router;
let producerTransport;
let consumerTransport;
let producer;
let consumers = new Map();
let rtmpServer;

const generatePairingCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getLocalIPAddress = () => {
  const { networkInterfaces } = require('os');
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

const handleWebRTCOffer = async (socket, offer) => {
  try {
    // Create consumer transport for mobile
    consumerTransport = await createWebRtcTransport();

    // Set up transport event handlers
    consumerTransport.on('icestatechange', (state) => {
      console.log('Consumer transport ICE state:', state);
    });

    consumerTransport.on('icecandidate', (candidate) => {
      socket.emit('ice-candidate', { candidate: candidate.toJSON() });
    });

    // Consume the screen producer
    if (producer) {
      const consumer = await consumerTransport.consume({
        producerId: producer.id,
        rtpCapabilities: router.rtpCapabilities,
        paused: false,
      });

      consumer.on('transportclose', () => {
        console.log('Consumer transport closed');
      });

      consumer.on('producerclose', () => {
        console.log('Producer closed');
      });

      // Create answer
      const answer = {
        type: 'answer',
        sdp: consumerTransport.sdp,
      };

      return answer;
    } else {
      throw new Error('No screen producer available');
    }
  } catch (error) {
    console.error('Error handling WebRTC offer:', error);
    throw error;
  }
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
  // For Android emulator, use 10.0.2.2 as the RTSP URL so emulator can reach it
  rtspUrl = `rtsp://127.0.0.1:8554/stream`; // Server listens on localhost
  const clientUrl = `rtsp://10.0.2.2:8554/stream`; // Client connects to this URL
  console.log('Pairing code:', pairingCode);
  console.log('Local IP:', localIP);
  console.log('RTSP URL:', rtspUrl);

  // Send to renderer
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('pairing-code', pairingCode);
    mainWindow.webContents.send('local-ip', localIP);
  });

  // Start Socket.IO server
  // Start HTTP server for HLS streaming
  httpServer = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    if (pathname === '/hls/stream.m3u8' || pathname.endsWith('.ts') || pathname.endsWith('.mp4')) {
      const filePath = pathname.startsWith('/hls/') 
        ? path.join(process.cwd(), 'hls', pathname.substring(5))
        : path.join(process.cwd(), pathname.substring(1));
      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          res.writeHead(404);
          res.end('File not found');
          return;
        }
        const fileStream = fs.createReadStream(filePath);
        let contentType;
        if (pathname.endsWith('.m3u8')) {
          contentType = 'application/vnd.apple.mpegurl';
        } else if (pathname.endsWith('.ts')) {
          contentType = 'video/MP2T';
        } else if (pathname.endsWith('.mp4')) {
          contentType = 'video/mp4';
        }
        res.writeHead(200, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
          'Cache-Control': 'no-cache'
        });
        fileStream.pipe(res);
      });
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  httpServer.listen(8081, () => {
    console.log('HTTP server started on port 8081 for HLS streaming');
  });

  console.log('Socket.IO server started on port 8080');

  // Initialize mediasoup
  createMediasoupWorker();

  // Initialize RTMP server
  rtmpServer = new RtmpServer();
  rtmpServer.listen(1935); // Standard RTMP port
  console.log('RTMP server started on port 1935');

  rtmpServer.on('stream', (stream) => {
    console.log('RTMP stream received:', stream.key);
    // Handle incoming RTMP stream from mobile
    // Could save to file or forward to WebRTC
  });

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

    socket.on('start-stream', () => {
      console.log('Starting RTSP stream');
      startRTSPStream();
      socket.emit('stream-started');
    });

    socket.on('start-livestream', (data) => {
      console.log('Starting livestream to:', data.rtmpUrl);
      startLivestream(data.rtmpUrl);
    });

    socket.on('stop-livestream', () => {
      console.log('Stopping livestream');
      stopLivestream();
    });

    // WebRTC signaling from mobile
    socket.on('webrtc-offer', async (data) => {
      console.log('Received WebRTC offer from mobile');
      try {
        const offer = data.offer;
        const answer = await handleWebRTCOffer(socket, offer);
        socket.emit('webrtc-answer', { answer });
      } catch (error) {
        console.error('Error handling WebRTC offer:', error);
      }
    });

    socket.on('ice-candidate', (data) => {
      console.log('Received ICE candidate, forwarding to other clients');
      // Forward to all other clients (both mobile and renderer)
      io.sockets.sockets.forEach(s => {
        if (s !== socket) {
          s.emit('ice-candidate', data);
        }
      });
    });

    socket.on('start-screen-sharing', async () => {
      console.log('Mobile requested screen sharing - forwarding to renderer');
      mainWindow.webContents.send('start-screen-sharing');
    });

    socket.on('stop-screen-sharing', () => {
      console.log('Mobile requested to stop screen sharing - forwarding to renderer');
      mainWindow.webContents.send('stop-screen-sharing');
    });

    socket.on('stream-started', (data) => {
      console.log('Received stream-started from renderer, forwarding to mobile');
      if (connectedClient) {
        connectedClient.emit('stream-started', data);
      }
    });

    socket.on('webrtc-offer', (data) => {
      console.log('Received WebRTC offer from renderer, forwarding to mobile');
      if (connectedClient) {
        connectedClient.emit('webrtc-offer', data);
      }
    });

    socket.on('webrtc-answer', (data) => {
      console.log('Received WebRTC answer from mobile, forwarding to renderer');
      // Forward to all other clients
      io.sockets.sockets.forEach(s => {
        if (s !== socket) {
          s.emit('webrtc-answer', data);
        }
      });
    });

    socket.on('ice-candidate', (data) => {
      console.log('Received ICE candidate, forwarding');
      // Forward to all other clients
      io.sockets.sockets.forEach(s => {
        if (s !== socket) {
          s.emit('ice-candidate', data);
        }
      });
    });
  });
};
ipcMain.on('send-to-ws', (event, data) => {
  if (connectedClient) {
    connectedClient.emit('message', data);
  }
});

// Get screen sources
ipcMain.handle('get-screen-sources', async () => {
  console.log('get-screen-sources handler called');
  const { desktopCapturer } = require('electron');
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  console.log('Screen sources found:', sources.length);
  return sources;
});

// HLS segment handlers
ipcMain.handle('save-hls-segment', async (event, { name, data }) => {
  const hlsDir = path.join(process.cwd(), 'hls');
  if (!fs.existsSync(hlsDir)) {
    fs.mkdirSync(hlsDir);
  }
  const segmentPath = path.join(hlsDir, name);
  fs.writeFileSync(segmentPath, Buffer.from(data));
  console.log('Saved HLS segment:', name);
});

ipcMain.handle('delete-hls-segment', async (event, name) => {
  const segmentPath = path.join(process.cwd(), 'hls', name);
  try {
    fs.unlinkSync(segmentPath);
    console.log('Deleted HLS segment:', name);
  } catch (e) {
    console.log('Error deleting HLS segment:', e);
  }
});

ipcMain.handle('update-m3u8-playlist', async (event, segments) => {
  const hlsDir = path.join(process.cwd(), 'hls');
  const m3u8Path = path.join(hlsDir, 'stream.m3u8');
  
  let m3u8Content = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:2\n';
  m3u8Content += `#EXT-X-MEDIA-SEQUENCE:${Math.max(0, segments.length - 10)}\n`;
  
  segments.slice(-10).forEach(segment => {
    m3u8Content += `#EXTINF:${segment.duration}.0,\n${segment.name}\n`;
  });
  
  fs.writeFileSync(m3u8Path, m3u8Content);
  console.log('Updated M3U8 playlist');
});

// Start HLS streaming using desktopCapturer
function startRTSPStream() {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Starting HLS stream with MediaRecorder...');

      // Get screen sources using desktopCapturer
      const { desktopCapturer } = require('electron');
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1, height: 1 } // Minimal thumbnail for performance
      });

      if (!sources || sources.length === 0) {
        throw new Error('No screen sources found');
      }

      const screenSource = sources[0];
      console.log('Using screen source:', screenSource.name);

      // Get screen stream using the main window's webContents
      const stream = await mainWindow.webContents.executeJavaScript(`
        navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: '${screenSource.id}',
              minWidth: 1280,
              maxWidth: 1920,
              minHeight: 720,
              maxHeight: 1080
            }
          }
        })
      `);

      console.log('Screen stream obtained, creating HLS segments...');

      // Create HLS directory
      const hlsDir = path.join(process.cwd(), 'hls');
      if (!fs.existsSync(hlsDir)) {
        fs.mkdirSync(hlsDir);
      }

      let segmentCounter = 0;
      const segments = [];
      let m3u8Content = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:2\n#EXT-X-MEDIA-SEQUENCE:0\n';

      // Create MediaRecorder for HLS segments
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          segmentCounter++;
          const segmentName = `segment_${segmentCounter}.webm`;
          const segmentPath = path.join(hlsDir, segmentName);

          // Convert blob to buffer and save
          const reader = new FileReader();
          reader.onload = () => {
            const buffer = Buffer.from(reader.result);
            fs.writeFileSync(segmentPath, buffer);
            segments.push({ name: segmentName, duration: 2 }); // Assume 2 second segments

            // Update M3U8 playlist
            m3u8Content += `#EXTINF:2.0,\n${segmentName}\n`;

            // Keep only last 10 segments
            if (segments.length > 10) {
              const oldSegment = segments.shift();
              try {
                fs.unlinkSync(path.join(hlsDir, oldSegment.name));
              } catch (e) {
                // Ignore cleanup errors
              }
            }

            // Write M3U8 file
            const m3u8Path = path.join(hlsDir, 'stream.m3u8');
            fs.writeFileSync(m3u8Path, m3u8Content + '#EXT-X-ENDLIST\n');
          };
          reader.readAsArrayBuffer(event.data);
        }
      };

      // Start recording with 2 second chunks
      mediaRecorder.start(2000);

      // Store recorder for cleanup
      ffmpegProcess = {
        kill: () => {
          try {
            mediaRecorder.stop();
            stream.getTracks().forEach(track => track.stop());
          } catch (e) {
            console.log('Error stopping media recorder:', e);
          }
        }
      };

      console.log('HLS streaming started with MediaRecorder');
      mainWindow.webContents.send('stream-started');
      resolve();

    } catch (error) {
      console.error('Error starting HLS stream:', error);
      mainWindow.webContents.send('stream-error', error.message);
      reject(error);
    }
  });
}

// Stop RTSP streaming
function stopRTSPStream() {
  if (ffmpegProcess) {
    ffmpegProcess.kill();
    ffmpegProcess = null;
    mainWindow.webContents.send('stream-stopped');
  }
}

// Start livestream to RTMP
function startLivestream(rtmpUrl) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Starting livestream to:', rtmpUrl);

      // Get screen sources
      const { desktopCapturer } = require('electron');
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1, height: 1 }
      });

      if (!sources || sources.length === 0) {
        throw new Error('No screen sources found');
      }

      const screenSource = sources[0];

      // Use FFmpeg to stream to RTMP
      ffmpegProcess = ffmpeg()
        .input(`desktop`)
        .inputOptions([
          '-f', 'gdigrab',
          '-framerate', '30',
          '-offset_x', '0',
          '-offset_y', '0',
          '-video_size', '1920x1080'
        ])
        .output(rtmpUrl)
        .outputOptions([
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-maxrate', '3000k',
          '-bufsize', '6000k',
          '-pix_fmt', 'yuv420p',
          '-g', '60',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-ac', '2',
          '-ar', '44100',
          '-f', 'flv'
        ])
        .on('start', (commandLine) => {
          console.log('FFmpeg command: ' + commandLine);
          mainWindow.webContents.send('livestream-started');
          resolve();
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          mainWindow.webContents.send('livestream-error', err.message);
          reject(err);
        })
        .on('end', () => {
          console.log('FFmpeg ended');
          mainWindow.webContents.send('livestream-ended');
        })
        .run();

    } catch (error) {
      console.error('Error starting livestream:', error);
      mainWindow.webContents.send('livestream-error', error.message);
      reject(error);
    }
  });
}

// Stop livestream
function stopLivestream() {
  if (ffmpegProcess) {
    ffmpegProcess.kill('SIGINT');
    ffmpegProcess = null;
    mainWindow.webContents.send('livestream-ended');
  }
}

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
