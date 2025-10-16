import './index.css';
import * as mediasoupClient from 'mediasoup-client';
import io from 'socket.io-client';

const { electronAPI } = window;

// Global variables
let pairingCodeEl, statusEl, screenStatusEl, startLivestreamBtn, stopLivestreamBtn, rtmpUrlEl, previewEl, streamStatusTextEl, streamIndicatorEl, localIPEl;
let connectionStatusEl, streamStatusEl, liveStatusEl, liveIndicatorEl, streamOverlayEl;
let totalGiftsEl, totalValueEl, topGifterEl, giftListEl;
let viewerCountEl, bitrateEl, uptimeEl;
let cameraPreviewEl, cameraStatusEl, cameraStatusTextEl;
// Global variables for screensharing
let screenStream = null;
let cameraStream = null;
let screenCanvas, screenCtx;
let frameInterval;
let isScreenSharing = false;
let isStreaming = false;
let isLivestreaming = false;
let peerConnection = null; // WebRTC peer connection
let device;
let producerTransport;
let videoProducer;
let socket;
let localIP = 'localhost';
let streamStartTime = null;
let uptimeInterval = null;


let giftStats = {
  totalGifts: 0,
  totalValue: 0,
  topGifter: '-',
  gifts: []
};

const giftTypes = [
  { name: 'Rose', icon: '🌹', value: 5, color: 'gift-rose' },
  { name: 'Heart', icon: '❤️', value: 10, color: 'gift-heart' },
  { name: 'Star', icon: '⭐', value: 25, color: 'gift-star' },
  { name: 'Crown', icon: '👑', value: 50, color: 'gift-crown' }
];

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  pairingCodeEl = document.getElementById('pairing-code');
  statusEl = document.getElementById('status');
  screenStatusEl = document.getElementById('screen-status');
  startLivestreamBtn = document.getElementById('start-livestream');
  stopLivestreamBtn = document.getElementById('stop-livestream');
  rtmpUrlEl = document.getElementById('rtmp-url');
  previewEl = document.getElementById('preview');
  streamStatusTextEl = document.getElementById('stream-status-text');
  streamIndicatorEl = document.getElementById('stream-indicator');
  localIPEl = document.getElementById('local-ip');

  // New elements for modern UI
  connectionStatusEl = document.getElementById('connection-status');
  streamStatusEl = document.getElementById('stream-status');
  liveStatusEl = document.getElementById('live-status');
  liveIndicatorEl = document.getElementById('live-indicator');
  streamOverlayEl = document.getElementById('stream-overlay');

  // Gift statistics elements
  totalGiftsEl = document.getElementById('total-gifts');
  totalValueEl = document.getElementById('total-value');
  topGifterEl = document.getElementById('top-gifter');
  giftListEl = document.getElementById('gift-list');

  // Toolbar elements
  viewerCountEl = document.getElementById('viewer-count');
  bitrateEl = document.getElementById('bitrate');
  uptimeEl = document.getElementById('uptime');

  // Camera elements
  cameraPreviewEl = document.getElementById('camera-preview');
  cameraStatusEl = document.getElementById('camera-status');
  cameraStatusTextEl = document.getElementById('camera-status-text');

  // Set up IPC listeners for screen sharing control from main process
  electronAPI.onStartScreenSharing(() => {
    console.log('Received start screen sharing request from main process');
    startScreenSharing();
  });

  electronAPI.onStopScreenSharing(() => {
    console.log('Received stop screen sharing request from main process');
    stopScreenSharing();
  });

  // Set up other IPC listeners
  electronAPI.onPairingCode((event, code) => {
    pairingCodeEl.textContent = code;
  });

  electronAPI.onLocalIP((event, ip) => {
    localIP = ip;
    localIPEl.textContent = ip;
  });

  electronAPI.onPaired(() => {
    statusEl.textContent = 'Paired with mobile device - Screen sharing will start automatically';
    updateConnectionStatus(true);
  });

  electronAPI.onDisconnected(() => {
    statusEl.textContent = 'Disconnected from mobile device';
    screenStatusEl.textContent = 'Not Active';
    updateConnectionStatus(false);
    updateStreamStatus(false);
  });

  // Initialize
  initSocket();
  initScreenCapture();
  initCameraCapture();

  // Set up button event listeners
  startLivestreamBtn.addEventListener('click', () => {
    if (!isLivestreaming) {
      startLivestream();
    }
  });

  stopLivestreamBtn.addEventListener('click', () => {
    if (isLivestreaming) {
      stopLivestream();
    }
  });

  // Chat functionality
  const chatInputEl = document.getElementById('chat-input');
  const sendChatBtn = document.getElementById('send-chat');
  
  if (sendChatBtn) {
    sendChatBtn.addEventListener('click', sendChatMessage);
  }
  
  if (chatInputEl) {
    chatInputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendChatMessage();
      }
    });
  }

  // Start mock gift simulation
  startMockGiftSimulation();
  
  // Start mock chat
  startMockChat();
  
  // Start mock metrics updates
  setInterval(() => {
    if (isScreenSharing || isLivestreaming) {
      updateViewerCount();
      updateBitrate();
    }
  }, 5000); // Update every 5 seconds
});



// UI Update functions
function updateConnectionStatus(isConnected) {
  if (connectionStatusEl) {
    if (isConnected) {
      connectionStatusEl.className = 'status-item status-connected';
      document.getElementById('status-text').textContent = 'Connected';
    } else {
      connectionStatusEl.className = 'status-item status-disconnected';
      document.getElementById('status-text').textContent = 'Disconnected';
    }
  }
}

function updateStreamStatus(isLive) {
  if (streamStatusEl && liveStatusEl) {
    if (isLive) {
      streamStatusEl.className = 'status-item status-live';
      document.getElementById('screen-status-text').textContent = 'Screen Live';
      liveStatusEl.className = 'stream-status status-live';
      document.getElementById('stream-status-text').textContent = 'LIVE';
      if (liveIndicatorEl) liveIndicatorEl.style.display = 'block';
      if (streamOverlayEl) streamOverlayEl.style.display = 'flex';
      if (previewEl) previewEl.parentElement.classList.add('live');
      
      // Start uptime timer
      if (!streamStartTime) {
        streamStartTime = Date.now();
        uptimeInterval = setInterval(updateUptime, 1000);
      }
      
      // Mock viewer count and bitrate
      updateViewerCount();
      updateBitrate();
    } else {
      streamStatusEl.className = 'status-item status-offline';
      document.getElementById('screen-status-text').textContent = 'Screen Offline';
      liveStatusEl.className = 'stream-status status-offline';
      document.getElementById('stream-status-text').textContent = 'Offline';
      if (liveIndicatorEl) liveIndicatorEl.style.display = 'none';
      if (streamOverlayEl) streamOverlayEl.style.display = 'none';
      if (previewEl) previewEl.parentElement.classList.remove('live');
      
      // Stop uptime timer
      if (uptimeInterval) {
        clearInterval(uptimeInterval);
        uptimeInterval = null;
      }
      streamStartTime = null;
      if (uptimeEl) uptimeEl.textContent = '00:00:00';
      if (viewerCountEl) viewerCountEl.textContent = '0';
      if (bitrateEl) bitrateEl.textContent = '0 kbps';
    }
  }
}

function updateUptime() {
  if (streamStartTime && uptimeEl) {
    const elapsed = Date.now() - streamStartTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    uptimeEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

function updateViewerCount() {
  if (viewerCountEl && (isScreenSharing || isLivestreaming)) {
    // Mock viewer count that fluctuates
    const baseViewers = 150;
    const fluctuation = Math.floor(Math.random() * 50) - 25;
    const viewers = Math.max(0, baseViewers + fluctuation);
    viewerCountEl.textContent = viewers.toString();
  }
}

function updateBitrate() {
  if (bitrateEl && (isScreenSharing || isLivestreaming)) {
    // Mock bitrate
    const baseBitrate = 2500;
    const fluctuation = Math.floor(Math.random() * 500) - 250;
    const bitrate = Math.max(500, baseBitrate + fluctuation);
    bitrateEl.textContent = `${bitrate} kbps`;
  }
}

function sendChatMessage() {
  const chatInputEl = document.getElementById('chat-input');
  const message = chatInputEl.value.trim();
  if (message) {
    addChatMessage('You', message);
    chatInputEl.value = '';
    
    // Mock response
    setTimeout(() => {
      const responses = ['Thanks!', 'Nice stream!', 'GG!', 'Keep it up!', 'Awesome!'];
      const response = responses[Math.floor(Math.random() * responses.length)];
      addChatMessage('Viewer123', response);
    }, 1000 + Math.random() * 2000);
  }
}

function addChatMessage(username, message) {
  const chatMessagesEl = document.getElementById('chat-messages');
  if (chatMessagesEl) {
    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message';
    messageEl.innerHTML = `<strong>${username}:</strong> ${message}`;
    chatMessagesEl.appendChild(messageEl);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }
}

// Mock chat messages
function startMockChat() {
  const messages = [
    { user: 'Alex_123', msg: 'Amazing stream! 🔥' },
    { user: 'GamingPro', msg: 'Love the new setup!' },
    { user: 'StreamFan', msg: 'Can you show the character select?' },
    { user: 'CoolViewer', msg: 'GG on that last match' },
    { user: 'ChatMaster', msg: 'Stream quality is perfect!' },
  ];
  
  messages.forEach((msg, index) => {
    setTimeout(() => addChatMessage(msg.user, msg.msg), index * 2000);
  });
  
  // Continue adding messages periodically
  setInterval(() => {
    if (isScreenSharing || isLivestreaming) {
      const users = ['Alex_123', 'GamingPro', 'StreamFan', 'CoolViewer', 'ChatMaster', 'ViewerX'];
      const msgs = ['Great stream!', 'Love this game!', 'What\'s your setup?', 'Amazing gameplay!', 'Keep it up!'];
      const user = users[Math.floor(Math.random() * users.length)];
      const msg = msgs[Math.floor(Math.random() * msgs.length)];
      addChatMessage(user, msg);
    }
  }, 5000 + Math.random() * 10000);
}

function startMockGiftSimulation() {
  // Simulate gifts every 5-15 seconds when streaming
  setInterval(() => {
    if ((isScreenSharing || isLivestreaming) && Math.random() < 0.3) { // 30% chance every 5-15 seconds
      addMockGift();
    }
  }, Math.random() * 10000 + 5000);
}

function addMockGift() {
  const giftType = giftTypes[Math.floor(Math.random() * giftTypes.length)];
  const usernames = ['Alex_123', 'GamingPro', 'StreamFan', 'CoolViewer', 'ChatMaster', 'ViewerX', 'StreamLover'];
  const username = usernames[Math.floor(Math.random() * usernames.length)];

  // Add to stats
  giftStats.totalGifts++;
  giftStats.totalValue += giftType.value;

  // Update top gifter
  if (giftStats.topGifter === '-' || Math.random() < 0.7) {
    giftStats.topGifter = username;
  }

  // Add to recent gifts
  const gift = {
    type: giftType,
    username: username,
    timestamp: new Date()
  };
  giftStats.gifts.unshift(gift);

  // Keep only last 10 gifts
  if (giftStats.gifts.length > 10) {
    giftStats.gifts = giftStats.gifts.slice(0, 10);
  }

  updateGiftUI();
}

function updateGiftUI() {
  if (totalGiftsEl) totalGiftsEl.textContent = giftStats.totalGifts;
  if (totalValueEl) totalValueEl.textContent = `$${giftStats.totalValue.toFixed(2)}`;
  if (topGifterEl) topGifterEl.textContent = giftStats.topGifter;

  if (giftListEl) {
    giftListEl.innerHTML = '';
    giftStats.gifts.slice(0, 5).forEach(gift => {
      const giftElement = document.createElement('div');
      giftElement.className = 'gift-item';
      giftElement.innerHTML = `
        <div class="gift-icon ${gift.type.color}">${gift.type.icon}</div>
        <div class="gift-info">
          <div class="gift-name">${gift.username}</div>
          <div class="gift-count">sent ${gift.type.name} ($${gift.type.value})</div>
        </div>
      `;
      giftListEl.appendChild(giftElement);
    });
  }
}


async function startScreenSharing() {
  try {
    console.log('Starting WebRTC screen sharing...');

    // Get screen capture
    if (!screenStream) {
      screenStream = await getScreenCapture();
    }

    // Create WebRTC peer connection
    peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add connection state monitoring
    peerConnection.onconnectionstatechange = () => {
      console.log('WebRTC connection state:', peerConnection.connectionState);
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnection.iceConnectionState);
    };

    // Add screen stream to peer connection
    screenStream.getTracks().forEach(track => {
      console.log('Adding track to peer connection:', track.kind, track.label);
      peerConnection.addTrack(track, screenStream);
    });

    // Set up ICE candidate handling
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket && socket.connected) {
        socket.emit('screen-ice-candidate', {
          candidate: event.candidate
        });
      }
    };

    // Create offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Send offer to mobile via Socket.IO
    if (socket && socket.connected) {
      socket.emit('screen-offer', {
        offer: offer
      });
    }

    // Set up preview
    if (previewEl) {
      previewEl.srcObject = screenStream;
      previewEl.play();
    }

    if (screenStatusEl) screenStatusEl.textContent = 'Active - WebRTC';
    if (statusEl) statusEl.textContent = 'Screen sharing started (WebRTC)';
    updateStreamStatus(true);
    isScreenSharing = true;
    isStreaming = true;

  } catch (error) {
    console.error('Error starting WebRTC screen sharing:', error);
    if (statusEl) statusEl.textContent = 'Screen sharing failed: ' + error.message;
  }
}

async function stopScreenSharing() {
  console.log('Stopping WebRTC screen sharing');

  // Close peer connection
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  // Stop screen stream
  if (screenStream) {
    console.log('Stopping screen stream tracks');
    screenStream.getTracks().forEach(track => {
      console.log('Stopping track:', track.kind, track.label);
      track.stop();
    });
    screenStream = null;
  }

  // Clear preview
  if (previewEl) {
    console.log('Clearing preview element');
    previewEl.srcObject = null;
  }

  // Notify mobile app
  if (socket && socket.connected) {
    socket.emit('screen-sharing-stopped');
  }

  if (screenStatusEl) screenStatusEl.textContent = 'Not Active';
  if (statusEl) statusEl.textContent = 'Screen sharing stopped';
  updateStreamStatus(false);
  isScreenSharing = false;
  isStreaming = false;
}

function startSendingFrames() {
  if (!screenStream || !screenCanvas || !screenCtx) {
    console.error('Screen capture not set up');
    return;
  }

  console.log('Starting to send screen frames via Socket.IO');

  // Send frames at ~15 FPS
  frameInterval = setInterval(() => {
    if (isScreenSharing && screenStream && socket && socket.connected) {
      try {
        // Draw current frame to canvas
        const videoTrack = screenStream.getVideoTracks()[0];
        if (videoTrack && videoTrack.readyState === 'live') {
          screenCtx.drawImage(previewEl, 0, 0, screenCanvas.width, screenCanvas.height);

          // Convert to JPEG for compression
          screenCanvas.toBlob((blob) => {
            if (blob) {
              // Convert blob to base64 for Socket.IO transmission
              const reader = new FileReader();
              reader.onload = () => {
                const base64Data = reader.result;
                // Send frame data via Socket.IO
                socket.emit('screen-frame', {
                  frame: base64Data,
                  timestamp: Date.now()
                });
              };
              reader.readAsDataURL(blob);
            }
          }, 'image/jpeg', 0.8); // 80% quality
        }
      } catch (error) {
        console.error('Error capturing/sending frame:', error);
        // If we get persistent errors, we might need to restart capture
      }
    }
  }, 1000 / 15); // 15 FPS
}

function stopSendingFrames() {
  if (frameInterval) {
    clearInterval(frameInterval);
    frameInterval = null;
    console.log('Stopped sending screen frames');
  }
}

async function getScreenCapture() {
  try {
    console.log('Getting screen capture...');
    const sources = await electronAPI.getScreenSources();

    if (!sources || sources.length === 0) {
      throw new Error('No screen sources found');
    }

    const screenSource = sources[0];
    console.log('Using screen source:', screenSource.name);

    // Get screen stream using the main window's webContents
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: screenSource.id,
          minWidth: 800,
          maxWidth: 800,
          minHeight: 600,
          maxHeight: 600
        }
      }
    });

    console.log('Screen stream obtained');
    return stream;
  } catch (err) {
    console.error('Screen capture failed:', err);
    throw err;
  }
}

async function initScreenCapture() {
  try {
    console.log('Initializing screen capture...');
    screenStream = await getScreenCapture();
    if (previewEl) {
      previewEl.srcObject = screenStream;
      previewEl.play();
    }
    isScreenSharing = true;
    isStreaming = true;
    console.log('Screen capture initialized and started');
    if (statusEl) statusEl.textContent = 'Screen capture active - Ready for sharing';
    updateStreamStatus(true); // Show as live since capturing
  } catch (err) {
    console.error('Screen capture init failed:', err);
    if (statusEl) statusEl.textContent = 'Screen capture failed: ' + err.message;
  }
}

async function initCameraCapture() {
  try {
    console.log('Initializing camera capture...');
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: false
    });
    if (cameraPreviewEl) {
      cameraPreviewEl.srcObject = cameraStream;
      cameraPreviewEl.play();
    }
    if (cameraStatusEl) cameraStatusEl.className = 'stream-status status-live';
    if (cameraStatusTextEl) cameraStatusTextEl.textContent = 'Active';
  } catch (err) {
    console.error('Camera capture failed:', err);
    if (cameraStatusEl) cameraStatusEl.className = 'stream-status status-offline';
    if (cameraStatusTextEl) cameraStatusTextEl.textContent = 'Failed';
  }
}

function initSocket() {
  socket = io('http://localhost:8080');

  socket.on('connect', () => {
    console.log('Connected to server');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });

  // Handle start screen sharing request from mobile
  socket.on('start-screen-sharing', () => {
    console.log('Received start screen sharing request from mobile');
    startScreenSharing();
  });

  // Handle stop screen sharing request from mobile
  socket.on('stop-screen-sharing', () => {
    console.log('Received stop screen sharing request from mobile');
    stopScreenSharing();
  });

  // Handle screen sharing answer from mobile
  socket.on('screen-answer', async (data) => {
    console.log('Received screen answer from mobile');
    try {
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log('Remote description set successfully');
      }
    } catch (error) {
      console.error('Error setting remote description:', error);
    }
  });

  // Handle ICE candidates from mobile
  socket.on('mobile-ice-candidate', async (data) => {
    console.log('Received ICE candidate from mobile');
    try {
      if (peerConnection && data.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  });
}

async function startLivestream() {
  if (!rtmpUrlEl) return;
  const rtmpUrl = rtmpUrlEl.value.trim();
  if (!rtmpUrl) {
    alert('Please enter RTMP URL');
    return;
  }

  try {
    if (!screenStream) {
      screenStream = await getScreenCapture();
    }

    // Send to main process to start FFmpeg livestream
    electronAPI.sendToWS({ type: 'start-livestream', rtmpUrl });
    isLivestreaming = true;
    if (statusEl) statusEl.textContent = 'Livestreaming started';
    updateButtons();

  } catch (error) {
    console.error('Error starting livestream:', error);
    if (statusEl) statusEl.textContent = 'Livestream error: ' + error.message;
  }
}

// function updateButtons() {
//   // Update button states based on streaming status
//   // Note: These buttons might not exist in the current UI
// }

console.log('Desktop renderer loaded');

async function startWebRTCStreaming() {
  try {
    if (!screenStream) {
      screenStream = await getScreenCapture();
      previewEl.srcObject = screenStream;
      previewEl.play();
    }

    // Create device
    device = new mediasoupClient.Device();

    // Get router RTP capabilities from main process
    const routerRtpCapabilities = await new Promise((resolve) => {
      electronAPI.sendToWS({ type: 'get-router-rtp-capabilities' });
      // This will be handled by the main process and sent back
      // For now, assume it's available
      resolve(null); // TODO: implement proper signaling
    });

    await device.load({ routerRtpCapabilities });

    // Create producer transport
    const transportInfo = await new Promise((resolve, reject) => {
      electronAPI.sendToWS({ type: 'create-producer-transport' });
      // Listen for response
      const handler = (event, data) => {
        if (data.type === 'producer-transport-created') {
          electronAPI.removeListener('ws-message', handler);
          resolve(data);
        }
      };
      electronAPI.onWSMessage(handler);
    });

    producerTransport = device.createSendTransport(transportInfo);

    producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await new Promise((resolve, reject) => {
          electronAPI.sendToWS({ type: 'connect-producer-transport', dtlsParameters });
          const handler = (event, data) => {
            if (data.type === 'producer-transport-connected') {
              electronAPI.removeListener('ws-message', handler);
              resolve();
            }
          };
          electronAPI.onWSMessage(handler);
        });
        callback();
      } catch (error) {
        errback(error);
      }
    });

    producerTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
      try {
        const { id } = await new Promise((resolve, reject) => {
          electronAPI.sendToWS({ type: 'produce', kind, rtpParameters });
          const handler = (event, data) => {
            if (data.type === 'produced') {
              electronAPI.removeListener('ws-message', handler);
              resolve(data);
            }
          };
          electronAPI.onWSMessage(handler);
        });
        callback({ id });
      } catch (error) {
        errback(error);
      }
    });

    // Produce video
    videoProducer = await producerTransport.produce({
      track: screenStream.getVideoTracks()[0],
      encodings: [
        { maxBitrate: 1000000 },
        { maxBitrate: 300000 },
        { maxBitrate: 150000 }
      ],
      codecOptions: {
        videoGoogleStartBitrate: 1000
      }
    });

    isStreaming = true;
    statusEl.textContent = 'WebRTC streaming started';
    streamStatusTextEl.textContent = 'Streaming';
    streamIndicatorEl.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 10px;">🟢</div>
      <div>WebRTC Stream: <span id="stream-status-text">Streaming</span></div>
      <div style="font-size: 12px; margin-top: 5px; color: #666;">Connected to mobile</div>
    `;
    updateButtons();

  } catch (error) {
    console.error('Error starting WebRTC stream:', error);
    statusEl.textContent = 'WebRTC streaming error: ' + error.message;
    isStreaming = false;
    updateButtons();
  }
}

async function stopWebRTCStreaming() {
  if (videoProducer) {
    videoProducer.close();
    videoProducer = null;
  }
  if (producerTransport) {
    producerTransport.close();
    producerTransport = null;
  }
  isStreaming = false;
  statusEl.textContent = 'WebRTC streaming stopped';
  streamStatusTextEl.textContent = 'Not Streaming';
  streamIndicatorEl.innerHTML = `
    <div style="font-size: 24px; margin-bottom: 10px;">🔴</div>
    <div>WebRTC Stream: <span id="stream-status-text">Not Streaming</span></div>
    <div style="font-size: 12px; margin-top: 5px; color: #666;">Not connected</div>
  `;
  updateButtons();
}

async function stopLivestream() {
  electronAPI.sendToWS({ type: 'stop-livestream' });
  isLivestreaming = false;
  statusEl.textContent = 'Livestreaming stopped';
  updateButtons();
}

function updateButtons() {
  if (startLivestreamBtn) {
    startLivestreamBtn.disabled = isLivestreaming;
    startLivestreamBtn.textContent = isLivestreaming ? '▶️ Livestreaming...' : '▶️ Start Livestream';
  }
  if (stopLivestreamBtn) {
    stopLivestreamBtn.disabled = !isLivestreaming;
  }
}
