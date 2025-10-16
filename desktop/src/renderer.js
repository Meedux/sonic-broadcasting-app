import './index.css';
import * as mediasoupClient from 'mediasoup-client';
import io from 'socket.io-client';

const { electronAPI } = window;

// Elements
const pairingCodeEl = document.getElementById('pairing-code');
const statusEl = document.getElementById('status');
const screenStatusEl = document.getElementById('screen-status');
const startLivestreamBtn = document.getElementById('start-livestream');
const stopLivestreamBtn = document.getElementById('stop-livestream');
const rtmpUrlEl = document.getElementById('rtmp-url');
const previewEl = document.getElementById('preview');
const streamStatusTextEl = document.getElementById('stream-status-text');
const streamIndicatorEl = document.getElementById('stream-indicator');
const localIPEl = document.getElementById('local-ip');

async function startScreenSharing() {
  try {
    console.log('Starting screen sharing with WebRTC...');

    if (!screenStream) {
      screenStream = await getScreenCapture();
      previewEl.srcObject = screenStream;
      previewEl.play();
    }

    // Create WebRTC peer connection
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    // Set up signaling listeners BEFORE creating offer
    const handleAnswer = async (data) => {
      console.log('Received WebRTC answer from mobile');
      await peerConnection.setRemoteDescription({
        sdp: data.sdp,
        type: data.type
      });
      socket.off('webrtc-answer', handleAnswer); // Remove listener after handling
    };

    const handleIceCandidate = async (data) => {
      console.log('Received ICE candidate from mobile');
      await peerConnection.addIceCandidate({
        candidate: data.candidate,
        sdpMid: data.sdpMid,
        sdpMLineIndex: data.sdpMLineIndex,
      });
    };

    socket.on('webrtc-answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate to mobile');
        socket.emit('ice-candidate', {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        });
      }
    };

    peerConnection.onconnectionstatechange = (event) => {
      console.log('Peer connection state:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'connected') {
        console.log('WebRTC connection established');
        socket.emit('stream-started');
      }
    };

    // Add screen stream tracks
    screenStream.getTracks().forEach(track => {
      console.log('Adding track to peer connection:', track.kind);
      peerConnection.addTrack(track, screenStream);
    });

    // Create offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    console.log('Sending WebRTC offer to mobile');
    // Send offer to mobile
    socket.emit('webrtc-offer', {
      sdp: offer.sdp,
      type: offer.type
    });

    // Notify that screen sharing has started
    socket.emit('screen-sharing-started');

    // Store for cleanup
    window.peerConnection = peerConnection;

    console.log('Screen sharing started with WebRTC');
    statusEl.textContent = 'Screen sharing active';

  } catch (error) {
    console.error('Error starting screen sharing:', error);
    statusEl.textContent = 'Screen sharing failed: ' + error.message;
  }
}

let screenStream = null;
let isStreaming = false;
let isLivestreaming = false;
let device;
let producerTransport;
let videoProducer;
let socket;
let localIP = 'localhost';

// Initialize
initSocket();
initScreenCapture();

async function initSocket() {
  socket = io('http://localhost:8080');

  socket.on('connect', () => {
    console.log('Connected to server');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });

  // Handle WebRTC signaling from mobile
  socket.on('webrtc-offer', async (data) => {
    console.log('Received WebRTC offer');
    await handleWebRTCOffer(data);
  });

  socket.on('ice-candidate', (data) => {
    console.log('Received ICE candidate');
    if (producerTransport) {
      producerTransport.addIceCandidate(data.candidate);
    }
  });

  // Listen for screen sharing requests from mobile
  electronAPI.onStartScreenSharing(() => {
    console.log('Received start screen sharing request from mobile');
    startScreenSharing();
  });

  electronAPI.onStopScreenSharing(() => {
    console.log('Received stop screen sharing request from mobile');
    stopWebRTCStreaming();
  });

  // Listen for ICE candidates from mobile
  socket.on('ice-candidate', async (data) => {
    console.log('Received ICE candidate from mobile');
    // Handle ICE candidate in the active peer connection
    if (window.peerConnection) {
      try {
        await window.peerConnection.addIceCandidate({
          candidate: data.candidate,
          sdpMid: data.sdpMid,
          sdpMLineIndex: data.sdpMLineIndex,
        });
        console.log('ICE candidate added successfully');
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  });
}

async function initScreenCapture() {
  try {
    console.log('Initializing screen capture...');
    screenStream = await getScreenCapture();
    previewEl.srcObject = screenStream;
    previewEl.play();
    statusEl.textContent = 'Screen captured - Ready to stream';
  } catch (err) {
    console.error('Screen capture failed:', err);
    statusEl.textContent = 'Screen capture failed: ' + err.message;
  }
}

// Display pairing code
electronAPI.onPairingCode((event, code) => {
  pairingCodeEl.textContent = code;
});

// Display local IP
electronAPI.onLocalIP((event, ip) => {
  localIP = ip;
  localIPEl.textContent = ip;
});

// Handle pairing
electronAPI.onPaired(() => {
  statusEl.textContent = 'Paired with mobile device - Screen sharing will start automatically';
  screenStatusEl.textContent = 'Starting...';
});

// Handle disconnect
electronAPI.onDisconnected(() => {
  statusEl.textContent = 'Disconnected';
  screenStatusEl.textContent = 'Not Active';
  isStreaming = false;
  isLivestreaming = false;
  updateButtons();
});

async function getScreenCapture() {
  console.log('Calling getScreenSources...');
  const sources = await electronAPI.getScreenSources();
  console.log('Screen sources:', sources);
  const source = sources[0];
  if (!source) throw new Error('No screen source found');
  return await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id,
      },
    },
  });
}

// Handle screen sharing requests from mobile (via main process)
electronAPI.onStartScreenSharing(() => {
  console.log('Received start screen sharing request');
  startScreenSharing();
});

electronAPI.onStopScreenSharing(() => {
  console.log('Received stop screen sharing request');
  if (window.peerConnection) {
    window.peerConnection.close();
    window.peerConnection = null;
  }
  if (screenStream) {
    screenStream.getTracks().forEach(track => track.stop());
    screenStream = null;
  }
  socket.emit('screen-sharing-stopped');
});
electronAPI.onScreenSharingStarted(() => {
  screenStatusEl.textContent = 'Active';
  statusEl.textContent = 'Screen sharing active with mobile device';
});

electronAPI.onScreenSharingStopped(() => {
  screenStatusEl.textContent = 'Not Active';
  statusEl.textContent = 'Screen sharing stopped';
});

electronAPI.onScreenSharingError((event, error) => {
  screenStatusEl.textContent = 'Error';
  statusEl.textContent = 'Screen sharing error: ' + error;
});

electronAPI.onLivestreamStarted(() => {
  statusEl.textContent = 'Livestream started';
});

electronAPI.onLivestreamEnded(() => {
  statusEl.textContent = 'Livestream stopped';
  isLivestreaming = false;
  updateButtons();
});

electronAPI.onLivestreamError((event, error) => {
  statusEl.textContent = 'Livestream error: ' + error;
  isLivestreaming = false;
  updateButtons();
});

async function handleWebRTCOffer(data) {
  try {
    console.log('Handling WebRTC offer...');

    // Get router RTP capabilities from server
    const routerRtpCapabilities = await new Promise((resolve) => {
      socket.emit('get-router-rtp-capabilities');
      socket.once('router-rtp-capabilities', resolve);
    });

    // Create device
    device = new mediasoupClient.Device();
    await device.load({ routerRtpCapabilities });

    // Create send transport
    const transportData = await new Promise((resolve) => {
      socket.emit('create-transport', { direction: 'send' });
      socket.once('transport-created', resolve);
    });

    producerTransport = device.createSendTransport(transportData);

    producerTransport.on('connect', ({ dtlsParameters }, callback) => {
      socket.emit('transport-connect', { transportId: producerTransport.id, dtlsParameters });
      socket.once('transport-connected', callback);
    });

    producerTransport.on('produce', ({ kind, rtpParameters }, callback) => {
      socket.emit('transport-produce', { transportId: producerTransport.id, kind, rtpParameters });
      socket.once('transport-produced', ({ id }) => callback({ id }));
    });

    // Start screen sharing
    if (screenStream) {
      const videoTrack = screenStream.getVideoTracks()[0];
      videoProducer = await producerTransport.produce({ track: videoTrack });

      console.log('Screen sharing started');
      socket.emit('screen-sharing-started');
    }

  } catch (error) {
    console.error('Error handling WebRTC offer:', error);
    socket.emit('screen-sharing-error', error.message);
  }
}

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

function startStreaming() {
  startWebRTCStreaming();
  statusEl.textContent = 'Starting WebRTC stream...';
}

function stopStreaming() {
  stopWebRTCStreaming();
  statusEl.textContent = 'Stopping WebRTC stream...';
}

// Initialize button states
updateButtons();

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

async function startLivestream() {
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
    statusEl.textContent = 'Livestreaming started';
    updateButtons();

  } catch (error) {
    console.error('Error starting livestream:', error);
    statusEl.textContent = 'Livestream error: ' + error.message;
  }
}

async function stopLivestream() {
  electronAPI.sendToWS({ type: 'stop-livestream' });
  isLivestreaming = false;
  statusEl.textContent = 'Livestreaming stopped';
  updateButtons();
}

function updateButtons() {
  startStreamBtn.disabled = isStreaming;
  stopStreamBtn.disabled = !isStreaming;
  startLivestreamBtn.disabled = isLivestreaming;
  stopLivestreamBtn.disabled = !isLivestreaming;
}

console.log('Desktop renderer loaded');
