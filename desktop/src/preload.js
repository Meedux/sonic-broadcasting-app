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
  onLivestreamStarted: (callback) => ipcRenderer.on('livestream-started', callback),
  onLivestreamEnded: (callback) => ipcRenderer.on('livestream-ended', callback),
  onLivestreamError: (callback) => ipcRenderer.on('livestream-error', callback),
  onWebRTCOffer: (callback) => ipcRenderer.on('webrtc-offer', callback),
  onIceCandidate: (callback) => ipcRenderer.on('ice-candidate', callback),
  onStartScreenSharing: (callback) => ipcRenderer.on('start-screen-sharing', callback),
  onStopScreenSharing: (callback) => ipcRenderer.on('stop-screen-sharing', callback),
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  saveHLSSegment: (name, data) => ipcRenderer.invoke('save-hls-segment', { name, data }),
  deleteHLSSegment: (name) => ipcRenderer.invoke('delete-hls-segment', name),
  updateM3U8Playlist: (segments) => ipcRenderer.invoke('update-m3u8-playlist', segments),
  saveHLSSegment: (name, data) => ipcRenderer.invoke('save-hls-segment', { name, data }),
  deleteHLSSegment: (name) => ipcRenderer.invoke('delete-hls-segment', name),
  updateM3U8Playlist: (segments) => ipcRenderer.invoke('update-m3u8-playlist', segments),
});
