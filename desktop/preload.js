const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
});

// Polyfill for screen sharing
window.addEventListener('DOMContentLoaded', () => {
  console.log('Electron preload script loaded for screen sharing support');
});