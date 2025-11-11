import crypto from 'node:crypto'
import express from 'express'
import http from 'node:http'
import { networkInterfaces } from 'node:os'
import { Server as SocketIOServer } from 'socket.io'
import QRCode from 'qrcode'

export interface CommunicationState {
  port: number
  protocol: 'http'
  hostname: string
  url: string
  socketPath: string
  lanAddresses: string[]
}

export interface CommunicationServer {
  app: express.Express
  io: SocketIOServer
  start: () => Promise<void>
  stop: () => Promise<void>
  getState: () => CommunicationState
}

const SOCKET_PATH = '/socket.io'
const DAILY_API_BASE = 'https://api.daily.co/v1'
const DEFAULT_DAILY_API_KEY = '1824c25b22b5dd9341d5100aa44f1183e8332eef0f480b8df9011879e123b71a'

type ManagedDailySession = {
  roomName: string
  roomUrl: string
  token: string | null
  expiresAt: number
}

type DailyManager = {
  ensureSession: (options?: { force?: boolean }) => Promise<ManagedDailySession>
}

function createDailyManager(apiKey: string): DailyManager {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  let cachedSession: ManagedDailySession | null = null

  const withUniqueRoom = async (): Promise<{ name: string; url: string }> => {
    let attempts = 0
    while (attempts < 6) {
      attempts += 1
      const proposedName = `sonic-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`
      const response = await fetch(`${DAILY_API_BASE}/rooms`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: proposedName,
          properties: {
            enable_screenshare: true,
            start_audio_off: true,
            start_video_off: true,
            exp: Math.round(Date.now() / 1000) + 4 * 60 * 60,
          },
        }),
      })

      if (response.ok) {
        const payload = (await response.json()) as { name: string; url: string }
        return payload
      }

      if (response.status === 409) {
        // Room name collision, retry with a new name.
        continue
      }

      const errorText = await response.text()
      throw new Error(errorText || `Daily rooms endpoint returned status ${response.status}`)
    }

    throw new Error('Unable to allocate a unique Daily room after multiple attempts')
  }

  const issueOwnerToken = async (roomName: string): Promise<string | null> => {
    const response = await fetch(`${DAILY_API_BASE}/meeting-tokens`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          is_owner: true,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `Daily token endpoint returned status ${response.status}`)
    }

    const payload = (await response.json()) as { token?: string }
    return payload.token ?? null
  }

  const ensureSession = async ({ force = false }: { force?: boolean } = {}): Promise<ManagedDailySession> => {
    const now = Date.now()
    if (!force && cachedSession && cachedSession.expiresAt - now > 60_000 && cachedSession.roomUrl) {
      return cachedSession
    }

    const room = await withUniqueRoom()

    let token: string | null = null
    try {
      token = await issueOwnerToken(room.name)
    } catch (error) {
      console.warn('Failed to issue Daily owner token automatically:', error)
    }

    const session: ManagedDailySession = {
      roomName: room.name,
      roomUrl: room.url,
      token,
      expiresAt: now + 4 * 60 * 60 * 1000,
    }

    cachedSession = session
    return session
  }

  return {
    ensureSession,
  }
}

export async function createCommunicationServer(): Promise<CommunicationServer> {
  const app = express()
  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/pairing/qr.png', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    const url = (req.query.url as string) || ''
    if (!url) {
      res.status(400).send('Missing url')
      return
    }
    try {
      const png = await QRCode.toBuffer(url, { type: 'png', margin: 1, width: 256, color: { dark: '#000000', light: '#ffffff' } })
      res.setHeader('Content-Type', 'image/png')
      res.send(png)
    } catch {
      res.status(500).send('Failed to generate QR')
    }
  })

  const httpServer = http.createServer(app)
  const io = new SocketIOServer(httpServer, {
    path: SOCKET_PATH,
    cors: { origin: '*' },
  })

  // In-memory stream configuration shared with mobile controllers
  let currentStreamConfig: Record<string, unknown> | null = null

  io.on('connection', (socket) => {
    socket.emit('status', { state: 'connected' })
    // Push current stream config to newly connected client
    if (currentStreamConfig) {
      socket.emit('stream-config', currentStreamConfig)
    }
    // Optionally prompt clients to join right away
    socket.emit('join-now', {})
  })

  const dailyApiKey = process.env.DAILY_API_KEY || process.env.VITE_DAILY_API_KEY || DEFAULT_DAILY_API_KEY
  const dailyManager = dailyApiKey ? createDailyManager(dailyApiKey) : null

  app.get('/daily/session', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    if (!dailyManager) {
      res.status(503).json({ error: 'Daily API key is not configured on this machine.' })
      return
    }

    const force = req.query.refresh === '1' || req.query.refresh === 'true'
    try {
      const session = await dailyManager.ensureSession({ force })
      res.json({
        roomName: session.roomName,
        roomUrl: session.roomUrl,
        token: session.token,
        expiresAt: session.expiresAt,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to prepare Daily session'
      console.error('Daily session provisioning failed:', message)
      res.status(502).json({ error: message })
    }
  })

  // Basic endpoints to set and broadcast stream configuration and commands
  app.get('/stream/config', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.json(currentStreamConfig ?? {})
  })

  app.post('/stream/config', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    const { rtmpEndpoint, facebookKey, youtubeKey } = req.body ?? {}
    currentStreamConfig = {
      ...(rtmpEndpoint ? { rtmpEndpoint } : {}),
      ...(facebookKey ? { facebookKey } : {}),
      ...(youtubeKey ? { youtubeKey } : {}),
      updatedAt: Date.now(),
    }
    io.emit('stream-config', currentStreamConfig)
    res.json({ ok: true })
  })

  app.post('/command', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    const { type, payload } = req.body ?? {}
    if (!type || typeof type !== 'string') {
      res.status(400).json({ error: 'Command type is required' })
      return
    }
    io.emit('command', { type, payload })
    res.json({ ok: true })
  })

  let port: number | undefined

  const getState = (): CommunicationState => {
    const lanAddresses = collectLanAddresses()
    const baseUrl = port ? `http://localhost:${port}` : ''

    return {
      port: port ?? 0,
      protocol: 'http',
      hostname: 'localhost',
      url: baseUrl,
      socketPath: SOCKET_PATH,
      lanAddresses: port
        ? lanAddresses.map((address) => `http://${address}:${port}`)
        : [],
    }
  }

  const start = async (): Promise<void> => {
    if (port) {
      return
    }

    await new Promise<void>((resolve, reject) => {
      const handleError = (error: Error) => {
        httpServer.off('listening', handleListening)
        reject(error)
      }

      const handleListening = () => {
        httpServer.off('error', handleError)
        const address = httpServer.address()
        if (typeof address === 'object' && address) {
          port = address.port
        }
        resolve()
      }

      httpServer.once('error', handleError)
      httpServer.once('listening', handleListening)
      httpServer.listen(0, '0.0.0.0')
    })
  }

  const stop = async (): Promise<void> => {
    if (!port) {
      return
    }

    await new Promise<void>((resolve, reject) => {
      io.sockets.sockets.forEach((socket) => socket.disconnect(true))
      io.removeAllListeners()

      httpServer.close((error) => {
        if (error) {
          reject(error)
          return
        }
        port = undefined
        resolve()
      })
    })
  }

  return {
    app,
    io,
    start,
    stop,
    getState,
  }
}

function collectLanAddresses(): string[] {
  const interfaces = networkInterfaces()
  const addresses = new Set<string>()

  Object.values(interfaces).forEach((ifaceList) => {
    ifaceList?.forEach((iface) => {
      if (!iface || iface.internal || iface.family !== 'IPv4') {
        return
      }
      addresses.add(iface.address)
    })
  })

  return Array.from(addresses)
}
