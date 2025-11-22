import type { DailyRoom } from './daily'
import { io, Socket } from 'socket.io-client'

const SOCKET_PATH = '/socket.io'

export const normalizeLanUrl = (raw: string): string => {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error('Enter the desktop LAN URL shared on the desktop app.')
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/$/, '')
  }
  return `http://${trimmed}`.replace(/\/$/, '')
}

export async function linkSession(baseUrl: string, room: DailyRoom): Promise<void> {
  const payload: Record<string, string> = {
    roomName: room.name,
    roomUrl: room.url,
  }
  if (room.token) {
    payload.token = room.token
  }

  const response = await fetch(`${baseUrl}/link/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Desktop rejected the session link.')
  }
}

export function createDesktopSocket(baseUrl: string): Socket {
  return io(baseUrl, {
    path: SOCKET_PATH,
    transports: ['websocket'],
    autoConnect: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1500,
  })
}
