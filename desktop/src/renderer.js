import './index.css';
import * as mediasoupClient from 'mediasoup-client';
import io from 'socket.io-client';

const { electronAPI } = window;

// Global variables
let pairingCodeEl, statusEl, screenStatusEl, startLivestreamBtn, stopLivestreamBtn, rtmpUrlEl, previewEl, streamStatusTextEl, streamIndicatorEl, localIPEl;
let peerConnection = null;
let screenStream = null;
let isStreaming = false;
let isLivestreaming = false;
let device;
let producerTransport;
let videoProducer;
let socket;
let localIP = 'localhost';

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

  // Set up IPC listeners for WebRTC signaling from main process
  electronAPI.onWebRTCOffer(async (data) => {
    console.log('Received WebRTC offer from main process (forwarded from mobile)');
    await handleWebRTCOffer(data);
  });

  electronAPI.onIceCandidate(async (data) => {
    console.log('Received ICE candidate from main process (forwarded from mobile)');
    await handleIceCandidate(data);
  });

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
  });

  electronAPI.onDisconnected(() => {
    statusEl.textContent = 'Disconnected from mobile device';
    screenStatusEl.textContent = 'Not Active';
  });

  // Initialize
  initSocket();
  initScreenCapture();

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
});

// Function definitions
async function handleWebRTCOffer(data) {
  try {
    console.log('Handling WebRTC offer from mobile');

    // Create WebRTC peer connection if it doesn't exist
    if (!peerConnection) {
      peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });

      // Set up ICE candidate handler
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate to mobile');
          // Send to main process which will forward to mobile
          electronAPI.sendToWS({
            type: 'ice-candidate',
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
          // Send to main process which will forward to mobile
          electronAPI.sendToWS({ type: 'stream-started' });
          if (screenStatusEl) screenStatusEl.textContent = 'Connected - Streaming';
          if (streamStatusTextEl) streamStatusTextEl.textContent = 'Connected';
        }
      };
    }

    // Set remote description (the offer from mobile)
    await peerConnection.setRemoteDescription({
      sdp: data.sdp,
      type: data.type
    });

    // Add screen stream tracks (should already be captured by startScreenSharing)
    if (screenStream) {
      screenStream.getTracks().forEach(track => {
        console.log('Adding screen track to peer connection:', track.kind);
        peerConnection.addTrack(track, screenStream);
      });
    } else {
      console.error('No screen stream available');
      return;
    }

    // Create answer
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    console.log('Sending WebRTC answer to mobile');
    // Send answer to main process which will forward to mobile
    electronAPI.sendToWS({
      type: 'webrtc-answer',
      sdp: answer.sdp,
      type: answer.type
    });

  } catch (error) {
    console.error('Error handling WebRTC offer:', error);
  }
}

async function handleIceCandidate(data) {
  if (peerConnection) {
    try {
      console.log('Adding ICE candidate from mobile');
      await peerConnection.addIceCandidate({
        candidate: data.candidate,
        sdpMid: data.sdpMid,
        sdpMLineIndex: data.sdpMLineIndex,
      });
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }
}

async function startScreenSharing() {
  try {
    console.log('Setting up screen sharing - waiting for WebRTC offer from mobile...');

    // Get screen capture if not already done
    if (!screenStream) {
      screenStream = await getScreenCapture();
      if (previewEl) {
        previewEl.srcObject = screenStream;
        previewEl.play();
      }
      if (statusEl) statusEl.textContent = 'Screen captured - Waiting for mobile connection';
    }

    if (screenStatusEl) screenStatusEl.textContent = 'Active - Waiting for mobile';

  } catch (error) {
    console.error('Error starting screen sharing:', error);
    if (statusEl) statusEl.textContent = 'Screen sharing failed: ' + error.message;
  }
}

async function stopScreenSharing() {
  console.log('Stopping screen sharing');

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (screenStream) {
    screenStream.getTracks().forEach(track => track.stop());
    screenStream = null;
  }

  if (previewEl) previewEl.srcObject = null;
  if (screenStatusEl) screenStatusEl.textContent = 'Not Active';
  if (statusEl) statusEl.textContent = 'Screen sharing stopped';
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
          minWidth: 1280,
          maxWidth: 1920,
          minHeight: 720,
          maxHeight: 1080
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
    if (statusEl) statusEl.textContent = 'Screen captured - Ready to stream';
  } catch (err) {
    console.error('Screen capture failed:', err);
    if (statusEl) statusEl.textContent = 'Screen capture failed: ' + err.message;
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
  startStreamBtn.disabled = isStreaming;
  stopStreamBtn.disabled = !isStreaming;
  startLivestreamBtn.disabled = isLivestreaming;
  stopLivestreamBtn.disabled = !isLivestreaming;
}

console.log('Desktop renderer loaded');
