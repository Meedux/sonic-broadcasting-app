const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  sendToWS: (data) => ipcRenderer.send('send-to-ws', data),
  onWSMessage: (callback) => ipcRenderer.on('ws-message', callback),
  onPairingCode: (callback) => ipcRenderer.on('pairing-code', callback),
  onLocalIP: (callback) => ipcRenderer.on('local-ip', callback),
  onPaired: (callback) => ipcRenderer.on('paired', callback),
  onDisconnected: (callback) => ipcRenderer.on('disconnected', callback),
  onStreamStarted: (callback) => ipcRenderer.on('stream-started', callback),
  onStreamEnded: (callback) => ipcRenderer.on('stream-ended', callback),
  onStreamError: (callback) => ipcRenderer.on('stream-error', callback),
  onWebRTCOffer: (callback) => ipcRenderer.on('webrtc-offer', callback),
  onIceCandidate: (callback) => ipcRenderer.on('ice-candidate', callback),
  onStartScreenSharing: (callback) => ipcRenderer.on('start-screen-sharing', callback),
  onStopScreenSharing: (callback) => ipcRenderer.on('stop-screen-sharing', callback),
  // Screen-specific signaling forwarded from main process
  onScreenAnswer: (callback) => ipcRenderer.on('screen-answer', callback),
  onMobileIceCandidate: (callback) => ipcRenderer.on('mobile-ice-candidate', callback),
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  // legacy livestream IPC removed - use WebRTC screensharing flows instead
});
