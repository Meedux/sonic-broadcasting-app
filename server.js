const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
      credentials: true
    },
    allowEIO3: true,
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // WebRTC signaling
  const rooms = new Map();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Mobile app wants to connect to web app
    socket.on('mobile-connect', (data) => {
      const { roomId } = data;
      socket.join(roomId);
      
      const room = rooms.get(roomId) || {};
      room.mobile = socket.id;
      rooms.set(roomId, room);
      
      console.log(`Mobile ${socket.id} joined room ${roomId}`);
      
      // If web app already in room, establish connection immediately
      if (room.web) {
        io.to(roomId).emit('connection-established', { 
          webId: room.web, 
          mobileId: socket.id 
        });
        console.log(`Connection established in room ${roomId}`);
      } else {
        // Notify that mobile is waiting
        socket.emit('mobile-waiting', { roomId });
      }
    });

    // Web app creates/joins room
    socket.on('web-join', (data) => {
      const { roomId } = data;
      socket.join(roomId);
      
      const room = rooms.get(roomId) || {};
      room.web = socket.id;
      rooms.set(roomId, room);
      
      console.log(`Web ${socket.id} joined room ${roomId}`);
      
      // If mobile already connected, notify both
      if (room.mobile) {
        io.to(roomId).emit('connection-established', { 
          webId: socket.id, 
          mobileId: room.mobile 
        });
        console.log(`Connection established in room ${roomId}`);
      }
    });

    // Screen sharing from web app
    socket.on('screen-share-start', (data) => {
      const { roomId, streamData } = data;
      socket.to(roomId).emit('screen-share-available', streamData);
      console.log('Screen sharing started in room:', roomId);
    });

    // Screen share frame data for React Native compatibility
    socket.on('screen-share-frame', (data) => {
      const { roomId, frameData, resolution } = data;
      socket.to(roomId).emit('screen-share-frame', { frameData, resolution });
    });

    // Screen share data transmission
    socket.on('screen-share-data', (data) => {
      const { roomId, frameData } = data;
      socket.to(roomId).emit('screen-frame', frameData);
    });

    // WebRTC signaling for screen share
    socket.on('webrtc-offer', (data) => {
      const { roomId, offer } = data;
      socket.to(roomId).emit('webrtc-offer', { offer, senderId: socket.id });
      console.log('WebRTC offer sent in room:', roomId);
    });

    socket.on('webrtc-answer', (data) => {
      const { roomId, answer } = data;
      socket.to(roomId).emit('webrtc-answer', { answer, senderId: socket.id });
      console.log('WebRTC answer sent in room:', roomId);
    });

    socket.on('webrtc-ice-candidate', (data) => {
      const { roomId, candidate } = data;
      socket.to(roomId).emit('webrtc-ice-candidate', { candidate, senderId: socket.id });
    });

    // Mobile camera stream
    socket.on('mobile-camera-stream', (data) => {
      const { roomId, streamData } = data;
      socket.to(roomId).emit('mobile-camera-available', streamData);
      console.log('Mobile camera stream in room:', roomId);
    });

    // Live stream setup
    socket.on('setup-live-stream', (data) => {
      const { roomId, config } = data;
      socket.to(roomId).emit('live-stream-config', config);
      console.log('Live stream setup in room:', roomId);
    });

    // Mobile-initiated livestreaming
    socket.on('mobile-live-stream-start', (data) => {
      const { roomId, config } = data;
      console.log(`Mobile starting livestream to ${config.platform} in room: ${roomId}`);
      
      // Notify web app that mobile is starting the stream
      socket.to(roomId).emit('mobile-stream-started', {
        platform: config.platform,
        config: config,
        timestamp: new Date().toISOString()
      });
      
      // Log the streaming details
      console.log('Livestream Details:', {
        room: roomId,
        platform: config.platform,
        camera: config.camera,
        screenShare: config.screenShare,
        quality: config.quality
      });
    });

    socket.on('mobile-live-stream-stop', (data) => {
      const { roomId, timestamp } = data;
      console.log(`Mobile stopping livestream in room: ${roomId}`);
      
      // Notify web app that mobile stopped the stream
      socket.to(roomId).emit('mobile-stream-stopped', {
        timestamp: timestamp
      });
    });

    // Live stream start/stop
    socket.on('live-stream-control', (data) => {
      const { roomId, action } = data;
      socket.to(roomId).emit('live-stream-action', { action });
      console.log(`Live stream ${action} in room:`, roomId);
    });

    // WebRTC signaling
    socket.on('webrtc-offer', (data) => {
      const { roomId, offer, target } = data;
      socket.to(target).emit('webrtc-offer', { offer, from: socket.id });
    });

    socket.on('webrtc-answer', (data) => {
      const { roomId, answer, target } = data;
      socket.to(target).emit('webrtc-answer', { answer, from: socket.id });
    });

    socket.on('webrtc-ice-candidate', (data) => {
      const { roomId, candidate, target } = data;
      socket.to(target).emit('webrtc-ice-candidate', { candidate, from: socket.id });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      // Clean up rooms
      for (const [roomId, room] of rooms.entries()) {
        if (room.mobile === socket.id || room.web === socket.id) {
          socket.to(roomId).emit('peer-disconnected', { peerId: socket.id });
          
          if (room.mobile === socket.id) {
            room.mobile = null;
          }
          if (room.web === socket.id) {
            room.web = null;
          }
          
          // Remove empty rooms
          if (!room.mobile && !room.web) {
            rooms.delete(roomId);
          }
        }
      }
    });
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
    console.log('> WebRTC signaling server ready');
  });
});