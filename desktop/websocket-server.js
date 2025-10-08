// WebSocket Server for Mobile-Desktop Communication
const WebSocket = require('ws');
const { createServer } = require('http');

class SonicLiveServer {
  constructor(port = 8080) {
    this.port = port;
    this.server = createServer();
    this.wss = new WebSocket.Server({ server: this.server });
    this.rooms = new Map(); // meetingId -> Set of clients
    this.clients = new Map(); // client -> { type, meetingId, ws }
    
    this.setupWebSocketHandlers();
  }

  setupWebSocketHandlers() {
    this.wss.on('connection', (ws) => {
      console.log('🔌 New WebSocket connection');

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('❌ Invalid message format:', error);
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.handleDisconnection(ws);
      });
    });
  }

  handleMessage(ws, data) {
    const { type, meetingId, clientType, ...payload } = data;

    switch (type) {
      case 'join':
        this.handleJoin(ws, meetingId, clientType);
        break;
      case 'leave':
        this.handleLeave(ws);
        break;
      case 'camera_toggle':
      case 'broadcast_start':
      case 'broadcast_stop':
      case 'stream_config':
        this.broadcastToRoom(ws, data);
        break;
      default:
        console.warn('⚠️ Unknown message type:', type);
    }
  }

  handleJoin(ws, meetingId, clientType) {
    if (!meetingId || !clientType) {
      ws.send(JSON.stringify({ type: 'error', message: 'Missing meetingId or clientType' }));
      return;
    }

    // Store client info
    this.clients.set(ws, { type: clientType, meetingId, ws });

    // Add to room
    if (!this.rooms.has(meetingId)) {
      this.rooms.set(meetingId, new Set());
    }
    this.rooms.get(meetingId).add(ws);

    console.log(`📱 ${clientType} joined room: ${meetingId}`);

    // Notify client of successful join
    ws.send(JSON.stringify({ 
      type: 'joined', 
      meetingId, 
      clientType,
      participantCount: this.rooms.get(meetingId).size
    }));

    // Notify other participants in the room
    this.broadcastToRoom(ws, {
      type: 'participant_joined',
      clientType,
      participantCount: this.rooms.get(meetingId).size
    });
  }

  handleLeave(ws) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;

    const { meetingId, type: clientType } = clientInfo;
    
    // Remove from room
    if (this.rooms.has(meetingId)) {
      this.rooms.get(meetingId).delete(ws);
      
      // Clean up empty rooms
      if (this.rooms.get(meetingId).size === 0) {
        this.rooms.delete(meetingId);
      } else {
        // Notify remaining participants
        this.broadcastToRoom(ws, {
          type: 'participant_left',
          clientType,
          participantCount: this.rooms.get(meetingId).size
        });
      }
    }

    // Remove client info
    this.clients.delete(ws);
    
    console.log(`📱 ${clientType} left room: ${meetingId}`);
  }

  handleDisconnection(ws) {
    this.handleLeave(ws);
  }

  broadcastToRoom(senderWs, message) {
    const senderInfo = this.clients.get(senderWs);
    if (!senderInfo) return;

    const { meetingId } = senderInfo;
    const room = this.rooms.get(meetingId);
    
    if (!room) return;

    // Broadcast to all clients in the room except the sender
    room.forEach((clientWs) => {
      if (clientWs !== senderWs && clientWs.readyState === WebSocket.OPEN) {
        try {
          clientWs.send(JSON.stringify(message));
        } catch (error) {
          console.error('❌ Error sending message to client:', error);
        }
      }
    });
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`🚀 Sonic Live WebSocket Server running on port ${this.port}`);
      console.log(`🔗 WebSocket endpoint: ws://localhost:${this.port}`);
    });
  }

  stop() {
    this.wss.close();
    this.server.close();
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new SonicLiveServer(8080);
  server.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n📴 Shutting down Sonic Live Server...');
    server.stop();
    process.exit(0);
  });
}

module.exports = SonicLiveServer;