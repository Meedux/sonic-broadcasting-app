const { app, BrowserWindow, desktopCapturer, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      // Enable media permissions for screen sharing
      webSecurity: false,
      allowRunningInsecureContent: true
    },
    title: 'Sonic Broadcasting Studio',
    backgroundColor: '#1f2937', // Dark theme background
    show: false // Don't show until ready
  });

  // Enable screen sharing permissions
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'camera' || permission === 'microphone' || permission === 'display-capture') {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Handle screen sharing source selection
  ipcMain.handle('get-desktop-sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 150, height: 150 }
      });
      return sources;
    } catch (error) {
      console.error('Error getting desktop sources:', error);
      return [];
    }
  });

  mainWindow.loadURL('http://localhost:3001');
  
  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
  
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
