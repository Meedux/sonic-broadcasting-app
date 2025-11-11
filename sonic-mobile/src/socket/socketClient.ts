import { io, Socket } from 'socket.io-client'
import { useSessionStore } from '../state/sessionStore'
import AsyncStorage from '@react-native-async-storage/async-storage'

let socket: Socket | null = null

export async function connectSocket(baseUrl: string, onConnected?: () => void) {
  const log = useSessionStore.getState().log
  if (socket) {
    socket.disconnect()
    socket = null
  }
  socket = io(baseUrl, { path: '/socket.io', autoConnect: true, reconnection: true, reconnectionAttempts: 10 })
  socket.on('connect', () => {
    log('Socket connected: ' + baseUrl)
    try { onConnected && onConnected() } catch {}
  })
  socket.on('disconnect', () => log('Socket disconnected'))
  socket.on('status', (payload: any) => log('Server status: ' + JSON.stringify(payload)))
  socket.on('stream-config', (cfg: any) => {
    useSessionStore.getState().setStreamConfig(cfg || {})
    log('Received stream config')
  })
  socket.on('command', (cmd: any) => {
    log('Received command: ' + JSON.stringify(cmd))
  })
  socket.on('join-now', () => {
    log('Received join-now signal')
    // Let main screen handle actual join using stored session (trigger flow externally if needed)
  })
  try {
    await AsyncStorage.setItem('sonic.baseUrl', baseUrl)
  } catch (e) {
    log('Failed to persist baseUrl: ' + (e as any)?.message)
  }
}

export function getSocket() {
  return socket
}

export async function loadPersistedBaseUrl(): Promise<string | undefined> {
  try {
    const v = await AsyncStorage.getItem('sonic.baseUrl')
    return v || undefined
  } catch {
    return undefined
  }
}
