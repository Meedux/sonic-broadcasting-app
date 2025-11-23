import express from 'express'
import http from 'node:http'
import { networkInterfaces } from 'node:os'
import { Server as SocketIOServer } from 'socket.io'
import QRCode from 'qrcode'

export interface LinkedSession {
  roomName: string
  roomUrl: string
  token: string | null
  linkedAt: number
}

export interface CommunicationState {
  port: number
  protocol: 'http'
  hostname: string
  url: string
  socketPath: string
  lanAddresses: string[]
  linkedSession: LinkedSession | null
  desktopParticipantId: string | null
  mobileParticipantId: string | null
  mobileCameraEnabled: boolean
  mobileCameraPosition: 'top' | 'bottom'
}

type CommunicationServerOptions = {
  onStateChange?: (state: CommunicationState) => void
}

export interface CommunicationServer {
  app: express.Express
  io: SocketIOServer
  start: () => Promise<void>
  stop: () => Promise<void>
  getState: () => CommunicationState
}

const SOCKET_PATH = '/socket.io'

export async function createCommunicationServer(options: CommunicationServerOptions = {}): Promise<CommunicationServer> {
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

  let linkedSession: LinkedSession | null = null
  let desktopParticipantId: string | null = null
  let mobileParticipantId: string | null = null
  let mobileCameraEnabled = false
  let mobileCameraPosition: 'top' | 'bottom' = 'top'

  const broadcastLinkedSession = (session: LinkedSession, meta?: Record<string, unknown>) => {
    io.emit('daily-session', {
      roomName: session.roomName,
      roomUrl: session.roomUrl,
      token: session.token,
      linkedAt: session.linkedAt,
      ...(meta ?? {}),
    })
  }

  const emitMobileParticipant = () => {
    io.emit('mobile-participant', {
      participantId: mobileParticipantId,
      cameraEnabled: mobileCameraEnabled,
      cameraPosition: mobileCameraPosition,
    })
  }

  const notifyStateChange = () => {
    options.onStateChange?.(getState())
  }

  const applyLinkedSessionPayload = (payload: { roomName?: unknown; roomUrl?: unknown; token?: unknown }) => {
    if (!payload || typeof payload.roomUrl !== 'string' || !payload.roomUrl.trim()) {
      return { error: 'roomUrl is required' }
    }

    const normalized: LinkedSession = {
      roomName:
        typeof payload.roomName === 'string' && payload.roomName.trim().length
          ? payload.roomName.trim()
          : 'Untitled Room',
      roomUrl: payload.roomUrl.trim(),
      token: typeof payload.token === 'string' && payload.token.trim().length ? payload.token.trim() : null,
      linkedAt: Date.now(),
    }

    linkedSession = normalized
    desktopParticipantId = null
    mobileParticipantId = null
    mobileCameraEnabled = false
    mobileCameraPosition = 'top'
    broadcastLinkedSession(normalized, { active: true })
    notifyStateChange()
    return { ok: true, session: normalized }
  }

  const clearLinkedSession = () => {
    linkedSession = null
    desktopParticipantId = null
    mobileParticipantId = null
    mobileCameraEnabled = false
    mobileCameraPosition = 'top'
    notifyStateChange()
  }

  const updateMobileParticipant = (payload: {
    participantId?: unknown
    cameraEnabled?: unknown
    cameraPosition?: unknown
  }) => {
    let changed = false

    if (payload.participantId !== undefined) {
      const normalizedId =
        typeof payload.participantId === 'string' && payload.participantId.trim().length
          ? payload.participantId.trim()
          : null
      if (mobileParticipantId !== normalizedId) {
        mobileParticipantId = normalizedId
        if (!mobileParticipantId) {
          mobileCameraEnabled = false
        }
        changed = true
      }
    }

    if (typeof payload.cameraEnabled === 'boolean') {
      if (mobileCameraEnabled !== payload.cameraEnabled) {
        mobileCameraEnabled = payload.cameraEnabled
        changed = true
      }
    } else if (!mobileParticipantId && mobileCameraEnabled) {
      mobileCameraEnabled = false
      changed = true
    }

    if (payload.cameraPosition === 'bottom' || payload.cameraPosition === 'top') {
      if (mobileCameraPosition !== payload.cameraPosition) {
        mobileCameraPosition = payload.cameraPosition
        changed = true
      }
    }

    if (changed) {
      emitMobileParticipant()
      notifyStateChange()
    }
  }

  // In-memory stream configuration shared with mobile controllers
  let currentStreamConfig: Record<string, unknown> | null = null

  io.on('connection', (socket) => {
    socket.emit('status', { state: 'connected' })
    if (currentStreamConfig) {
      socket.emit('stream-config', currentStreamConfig)
    }
    socket.emit('join-now', {})
    if (linkedSession) {
      socket.emit('daily-session', {
        roomName: linkedSession.roomName,
        roomUrl: linkedSession.roomUrl,
        token: linkedSession.token,
        linkedAt: linkedSession.linkedAt,
        active: true,
      })
    }
    if (desktopParticipantId) {
      socket.emit('desktop-participant', { participantId: desktopParticipantId })
    }
    if (mobileParticipantId || mobileCameraEnabled) {
      emitMobileParticipant()
    }

    socket.on('mobile-link-session', (payload) => {
      const result = applyLinkedSessionPayload(payload ?? {})
      if ('error' in result) {
        socket.emit('mobile-link-error', result)
      }
    })

    socket.on('mobile-participant', (payload) => {
      updateMobileParticipant(payload ?? {})
    })
  })

  app.get('/daily/session', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    if (!linkedSession) {
      res.status(404).json({ error: 'No linked session' })
      return
    }
    res.json(linkedSession)
  })

  app.post('/link/session', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    const result = applyLinkedSessionPayload(req.body ?? {})
    if ('error' in result) {
      res.status(400).json(result)
      return
    }
    res.json({ ok: true, linkedAt: result.session.linkedAt })
  })

  app.delete('/link/session', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    clearLinkedSession()
    res.json({ ok: true })
  })

  app.post('/link/desktop', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    const rawParticipantId = typeof req.body?.participantId === 'string' ? req.body.participantId.trim() : ''
    desktopParticipantId = rawParticipantId || null
    io.emit('desktop-participant', { participantId: desktopParticipantId })
    notifyStateChange()
    res.json({ ok: true })
  })

  app.post('/link/mobile', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    updateMobileParticipant(req.body ?? {})
    res.json({ ok: true })
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
      linkedSession,
      desktopParticipantId,
      mobileParticipantId,
      mobileCameraEnabled,
      mobileCameraPosition,
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
        notifyStateChange()
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
        notifyStateChange()
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

  // Helpful aliases for Android emulators:
  // Standard Android emulator maps host loopback to 10.0.2.2, some variants (Genymotion) use 10.0.3.2.
  // We always add them so the UI can display a directly usable address for emulator testing.
  addresses.add('10.0.2.2')
  addresses.add('10.0.3.2')

  return Array.from(addresses)
}
