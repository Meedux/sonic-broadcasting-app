import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
// const WebSocket = require('ws');
import { Server as SocketIOServer } from 'socket.io';
import ffmpeg from 'fluent-ffmpeg';
import http from 'http';
import fs from 'fs';
import url from 'url';
import { exec } from 'child_process';
import mediasoup from 'mediasoup';
import RtmpServer from 'rtmp-server';
import { networkInterfaces } from 'os';

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

// Helper: check if the installed ffmpeg binary supports a given input format
async function ffmpegSupportsFormat(format) {
  return new Promise((resolve) => {
    exec('ffmpeg -hide_banner -formats', (err, stdout, stderr) => {
      if (err) {
        console.warn('ffmpeg -formats failed:', err.message || err);
        return resolve(false);
      }
      try {
        const out = stdout + '\n' + stderr;
        resolve(out.includes(format));
      } catch (e) {
        resolve(false);
      }
    });
  });
}

// Helper: list dshow devices using ffmpeg (Windows)
async function ffmpegListDshowDevices() {
  return new Promise((resolve) => {
    // ffmpeg prints device list to stderr
    exec('ffmpeg -hide_banner -list_devices true -f dshow -i dummy', (err, stdout, stderr) => {
      if (err && !stderr) {
        console.warn('ffmpeg dshow probe failed:', err.message || err);
        return resolve([]);
      }
      const out = String(stderr || stdout);
      const lines = out.split(/\r?\n/);
      const devices = [];
      let captureSection = false;
      for (const line of lines) {
        const l = line.trim();
        // Example line: "\t"DirectShow video devices (some may be both video and audio devices)\n"
        // Device lines typically look like: "\t"\"Integrated Camera\"\n"
        const m = l.match(/^"(.*)"$/);
        if (m) {
          devices.push(m[1]);
          continue;
        }
        // Another pattern: [dshow @ 000002...] "\t"  "USB2.0 HD UVC WebCam" (device)
        const m2 = l.match(/^\[.*\]\s+"(.*)"$/);
        if (m2) devices.push(m2[1]);
      }
      // Remove duplicates and empty
      const uniq = Array.from(new Set(devices.filter(Boolean)));
      resolve(uniq);
    });
  });
}

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
  // Start embedded static server for HLS with improved caching headers
  httpServer = http.createServer((req, res) => {
    try {
      const parsedUrl = url.parse(req.url || '', true);
      let pathname = parsedUrl.pathname || '/';

      // Normalize and prevent path traversal
      pathname = decodeURIComponent(pathname);
      if (pathname.indexOf('..') !== -1) {
        res.writeHead(400);
        res.end('Bad request');
        return;
      }

      // Only serve files under /hls/
      if (!pathname.startsWith('/hls/')) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const relative = pathname.substring('/hls/'.length);
      const filePath = path.join(process.cwd(), 'hls', relative);

      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream';
        let cacheControl = 'no-cache, no-store, must-revalidate';

        if (ext === '.m3u8') {
          contentType = 'application/vnd.apple.mpegurl';
          // playlists should not be cached aggressively
          cacheControl = 'no-cache, no-store, must-revalidate';
        } else if (ext === '.ts') {
          contentType = 'video/MP2T';
          // segments can be cached briefly to reduce chattiness
          cacheControl = 'public, max-age=5';
        } else if (ext === '.mp4') {
          contentType = 'video/mp4';
          cacheControl = 'public, max-age=3600';
        }

        // Common headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        res.setHeader('Cache-Control', cacheControl);
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Support HEAD
        if (req.method === 'HEAD') {
          res.writeHead(200);
          res.end();
          return;
        }

        // For mp4, support Range requests for seeking; for HLS (.m3u8/.ts) simple streaming is fine
        if (req.headers.range && ext === '.mp4') {
          const range = req.headers.range;
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
          if (start >= stats.size || end >= stats.size) {
            res.writeHead(416, { 'Content-Range': `bytes */${stats.size}` });
            res.end();
            return;
          }
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${stats.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': (end - start) + 1,
            'Content-Type': contentType
          });
          const stream = fs.createReadStream(filePath, { start, end });
          stream.pipe(res);
        } else {
          res.writeHead(200, { 'Content-Length': stats.size });
          const stream = fs.createReadStream(filePath);
          stream.pipe(res);
        }
      });
    } catch (e) {
      console.error('Static server error:', e);
      try {
        res.writeHead(500);
        res.end('Server error');
      } catch (e2) {}
    }
  });

  httpServer.listen(8081, () => {
    console.log('Embedded HLS static server started on port 8081 (serving /hls/)');
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
      console.log('Received WebRTC offer from mobile, forwarding to renderer');
      mainWindow.webContents.send('webrtc-offer', data);
    });

    socket.on('ice-candidate', (data) => {
      console.log('Received ICE candidate from mobile, forwarding to renderer');
      mainWindow.webContents.send('ice-candidate', data);
    });

    socket.on('start-screen-sharing', async () => {
      console.log('Mobile requested screen sharing - forwarding to renderer');
      mainWindow.webContents.send('start-screen-sharing');
      // Also start HLS livestream (no RTMP) so mobile can play via HLS
      try {
        if (!ffmpegProcess) {
          console.log('Starting HLS livestream in response to mobile request');
          await startLivestream();
        } else {
          console.log('Livestream already running');
        }
      } catch (e) {
        console.error('Error starting HLS livestream from mobile request:', e);
        socket.emit('error', { message: 'Failed to start screen sharing: ' + e.message });
      }
    });

    socket.on('stop-screen-sharing', () => {
      console.log('Mobile requested to stop screen sharing - forwarding to renderer');
      mainWindow.webContents.send('stop-screen-sharing');
      try {
        if (ffmpegProcess) {
          console.log('Stopping livestream in response to mobile request');
          stopLivestream();
        }
      } catch (e) {
        console.error('Error stopping livestream from mobile request:', e);
      }
    });
  });
};
ipcMain.on('send-to-ws', (event, data) => {
  if (connectedClient) {
    if (data.type === 'webrtc-answer') {
      connectedClient.emit('webrtc-answer', {
        sdp: data.sdp,
        type: data.type
      });
    } else if (data.type === 'ice-candidate') {
      connectedClient.emit('ice-candidate', {
        candidate: data.candidate,
        sdpMid: data.sdpMid,
        sdpMLineIndex: data.sdpMLineIndex,
      });
    } else if (data.type === 'stream-started') {
      connectedClient.emit('stream-started', data);
    } else {
      connectedClient.emit('message', data);
    }
  }
});

// Expose direct start/stop livestream IPC for the renderer UI
ipcMain.handle('start-livestream', async (event, rtmpUrl) => {
  try {
    await startLivestream(rtmpUrl);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('stop-livestream', async () => {
  try {
    stopLivestream();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Get screen sources
ipcMain.handle('get-screen-sources', async () => {
  console.log('get-screen-sources handler called');
  const { desktopCapturer } = await import('electron');
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
      // Ask the renderer to start HLS recording (MediaRecorder runs in renderer)
      const timeoutMs = 10000;
      let resolved = false;

      const cleanup = () => {
        ipcMain.removeAllListeners('hls-started');
        ipcMain.removeAllListeners('hls-error');
      };

      ipcMain.once('hls-started', () => {
        if (resolved) return;
        resolved = true;
        cleanup();
        console.log('Renderer reported HLS started');
        mainWindow.webContents.send('stream-started');
        resolve();
      });

      ipcMain.once('hls-error', (event, msg) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        console.error('Renderer reported HLS error:', msg);
        mainWindow.webContents.send('stream-error', msg);
        reject(new Error(msg));
      });

      // Instruct renderer to start recording
      mainWindow.webContents.send('start-hls-recording', { segmentDuration: 2000 });

      // Fallback timeout
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          const msg = 'Timeout waiting for renderer to start HLS recording';
          console.error(msg);
          mainWindow.webContents.send('stream-error', msg);
          reject(new Error(msg));
        }
      }, timeoutMs);
    } catch (error) {
      console.error('Error starting HLS stream:', error);
      mainWindow.webContents.send('stream-error', error.message);
      reject(error);
    }
  });
}

// Stop RTSP streaming
function stopRTSPStream() {
  // Tell renderer to stop recording
  try {
    mainWindow.webContents.send('stop-hls-recording');
  } catch (e) {
    console.error('Error sending stop-hls-recording to renderer:', e);
  }
  if (ffmpegProcess) {
    ffmpegProcess.kill();
    ffmpegProcess = null;
  }
  mainWindow.webContents.send('stream-stopped');
}

// Start livestream to RTMP
function startLivestream(rtmpUrl) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Starting livestream to:', rtmpUrl);

      // Get screen sources
  const { desktopCapturer } = await import('electron');
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1, height: 1 }
      });

      if (!sources || sources.length === 0) {
        throw new Error('No screen sources found');
      }

      const screenSource = sources[0];

      // Ensure HLS directory exists
      const hlsDir = path.join(process.cwd(), 'hls');
      if (!fs.existsSync(hlsDir)) fs.mkdirSync(hlsDir, { recursive: true });

      const hlsPath = path.join(hlsDir, 'stream.m3u8');

      // Probe dshow devices and select the best candidate for screen capture
      console.log('Probing for dshow devices to use for capture...');
      let dshowDevice = null;
      try {
        const devices = await ffmpegListDshowDevices();
        console.log('dshow devices found:', devices);
        if (devices && devices.length > 0) {
          // Prefer devices that look like screen capture or virtual display
          dshowDevice = devices.find(d => /screen|capture|monitor|display|virtual|obs/i.test(d)) || devices[0];
          console.log('Selected dshow device for capture:', dshowDevice);
        }
      } catch (e) {
        console.warn('Error probing dshow devices:', e);
      }

      if (!dshowDevice) {
        const msg = 'No DirectShow screen-capture device found. Install a DirectShow screen-capture driver (e.g. "screen-capture-recorder") or install OBS and use obs-websocket.\n' +
          'Alternatively, continue with the MediaRecorder->HLS fallback.';
        console.error(msg);
        mainWindow.webContents.send('livestream-error', msg);
        // Fall back to MediaRecorder HLS so the feature still works without extra installs
        try {
          await startRTSPStream();
          if (connectedClient) {
            try {
              connectedClient.emit('screen-sharing-started', { hlsUrl: `http://${getLocalIPAddress()}:8081/hls/stream.m3u8` });
            } catch (e) {
              console.error('Error emitting screen-sharing-started to client after fallback:', e);
            }
          }
          resolve();
          return;
        } catch (err) {
          console.error('Error during fallback HLS start:', err);
          mainWindow.webContents.send('livestream-error', err.message || String(err));
          reject(err);
          return;
        }
      }

      // Use FFmpeg to stream to RTMP (optional) and also produce HLS segments for mobile playback
      // Use dshow capture device
      ffmpegProcess = ffmpeg()
        .input(`video=${dshowDevice}`)
        .inputOptions([
          '-f', 'dshow',
          '-framerate', '30',
          '-video_size', '1920x1080'
        ]);

      // Conditionally add RTMP output if rtmpUrl provided
      if (rtmpUrl) {
        ffmpegProcess = ffmpegProcess.output(rtmpUrl).outputOptions([
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
        ]);
      }

      // Always produce HLS output
      ffmpegProcess = ffmpegProcess.output(hlsPath).outputOptions([
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
        '-f', 'hls',
        '-hls_time', '2',
        '-hls_list_size', '6',
        '-hls_flags', 'delete_segments+append_list'
      ])
        .on('start', (commandLine) => {
          console.log('FFmpeg started: ' + commandLine);
          mainWindow.webContents.send('livestream-started');
          // Notify connected mobile client that screen sharing / HLS is available
          if (connectedClient) {
            try {
              connectedClient.emit('screen-sharing-started', { hlsUrl: `http://${getLocalIPAddress()}:8081/hls/stream.m3u8` });
            } catch (e) {
              console.error('Error emitting screen-sharing-started to client:', e);
            }
          }
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
          // Notify mobile client that screen sharing stopped
          if (connectedClient) {
            try {
              connectedClient.emit('screen-sharing-stopped');
            } catch (e) {
              console.error('Error emitting screen-sharing-stopped to client:', e);
            }
          }
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
    if (connectedClient) {
      try {
        connectedClient.emit('screen-sharing-stopped');
      } catch (e) {
        console.error('Error emitting screen-sharing-stopped to client:', e);
      }
    }
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
