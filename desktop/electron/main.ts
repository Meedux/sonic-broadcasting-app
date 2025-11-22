import { app, BrowserWindow, ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCommunicationServer } from './server'
import { IPC_CHANNELS } from './messaging'
import type { CommunicationServer } from './server'

const isMac = process.platform === 'darwin'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null
let communicationServer: CommunicationServer | undefined

async function createWindow(): Promise<void> {
  const preloadCandidates = [
    path.join(__dirname, '../preload/preload.cjs'),
    path.join(__dirname, '../preload/index.cjs'),
    path.join(__dirname, '../preload/index.js'),
    path.join(__dirname, '../preload/preload.js'),
    path.join(__dirname, '../preload/preload.mjs'),
  ]
  const preloadPath = preloadCandidates.find((candidate) => fs.existsSync(candidate)) ?? preloadCandidates[0]

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#0d0d0f',
    show: false,
    title: 'Sonic Broadcast Desktop',
    webPreferences: {
      preload: preloadPath,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.on('did-finish-load', () => {
    const state = communicationServer?.getState()
    if (state) {
      mainWindow?.webContents.send(IPC_CHANNELS.COMMUNICATION_STATUS, state)
    }
  })

  const devServerUrl = process.env.VITE_DEV_SERVER_URL

  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }
}

async function bootCommunicationServer(): Promise<void> {
  communicationServer = await createCommunicationServer({
    onStateChange: (state) => {
      if (mainWindow) {
        mainWindow.webContents.send(IPC_CHANNELS.COMMUNICATION_STATUS, state)
      }
    },
  })
  await communicationServer.start()

  ipcMain.handle(IPC_CHANNELS.GET_COMMUNICATION_STATE, () => {
    return communicationServer?.getState() ?? null
  })

  ipcMain.handle(IPC_CHANNELS.GET_DESKTOP_SOURCES, async (_event, options: { types: Array<'screen' | 'window'> }) => {
    const { desktopCapturer } = await import('electron')
    const sources = await desktopCapturer.getSources({
      types: options.types,
      fetchWindowIcons: true,
      thumbnailSize: { width: 320, height: 180 },
    })

    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      type: source.id.startsWith('screen:') ? 'screen' : 'window',
      thumbnail: source.thumbnail?.getSize()?.width ? source.thumbnail.toDataURL() : null,
      displayId: (source as unknown as { display_id?: string }).display_id,
    }))
  })
}

async function initialize(): Promise<void> {
  await app.whenReady()
  await bootCommunicationServer()
  await createWindow()

  if (isMac) {
    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow()
      }
    })
  }
}

void initialize()

app.on('window-all-closed', async () => {
  if (!isMac) {
    await communicationServer?.stop()
    app.quit()
  }
})

app.on('quit', async () => {
  await communicationServer?.stop()
})
