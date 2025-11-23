import { create } from 'zustand'
import { nanoid } from 'nanoid/non-secure'

export type DailyConnectionStatus =
  | 'idle'
  | 'ready'
  | 'joining'
  | 'joined'
  | 'leaving'
  | 'error'

export type ScreenShareStatus = 'idle' | 'selecting' | 'starting' | 'sharing' | 'stopping' | 'error'

export type LivestreamStatus = 'idle' | 'starting' | 'live' | 'pausing' | 'paused' | 'stopping' | 'error'

export type LogLevel = 'info' | 'success' | 'warning' | 'error'

export interface LogEntry {
  id: string
  timestamp: number
  level: LogLevel
  message: string
  context?: Record<string, unknown>
}

export interface LivestreamConfig {
  platform: 'youtube' | 'facebook' | 'custom'
  rtmpUrl: string
  streamKey: string
  isPersistent: boolean
}

export interface BroadcastConfig {
  roomName: string
  roomUrl: string
  token: string
  linkedAt: number | null
  selfParticipantId: string
  desktopParticipantId: string
  mobileParticipantId: string
  mobileCameraEnabled: boolean
  cameraOverlayPosition: 'top' | 'bottom'
  selectedSourceId?: string
  isPreviewMuted: boolean
  livestream: LivestreamConfig
}

export interface BroadcastStoreState extends BroadcastConfig {
  dailyStatus: DailyConnectionStatus
  screenShareStatus: ScreenShareStatus
  livestreamStatus: LivestreamStatus
  logs: LogEntry[]
  addLog: (level: LogLevel, message: string, context?: Record<string, unknown>) => void
  setRoomName: (roomName: string) => void
  setRoomUrl: (roomUrl: string) => void
  setToken: (token: string) => void
  setLinkedAt: (linkedAt: number | null) => void
  setSelfParticipantId: (id: string) => void
  setDesktopParticipantId: (id: string) => void
  setMobileParticipantId: (id: string) => void
  setMobileCameraEnabled: (enabled: boolean) => void
  setCameraOverlayPosition: (position: 'top' | 'bottom') => void
  setDailyStatus: (status: DailyConnectionStatus) => void
  setScreenShareStatus: (status: ScreenShareStatus) => void
  setLivestreamStatus: (status: LivestreamStatus) => void
  setSelectedSource: (sourceId: string | undefined) => void
  setPreviewMuted: (muted: boolean) => void
  setLivestreamConfig: (config: Partial<LivestreamConfig>) => void
  resetLogs: () => void
}

const MAX_LOG_ENTRIES = 150

const sanitizeMessage = (message: string): string => {
  return message
    .replace(/(rtmp:\/\/[^\s]+|sk_live_[^\s]+)/gi, '[secure]')
    .replace(/[0-9a-f]{32,}/gi, '[secure]')
}

export const useBroadcastStore = create<BroadcastStoreState>((set) => ({
  roomName: '',
  roomUrl: '',
  token: '',
  linkedAt: null,
  selfParticipantId: '',
  desktopParticipantId: '',
  mobileParticipantId: '',
  mobileCameraEnabled: false,
  cameraOverlayPosition: 'top',
  selectedSourceId: undefined,
  isPreviewMuted: true,
  dailyStatus: 'idle',
  screenShareStatus: 'idle',
  livestreamStatus: 'idle',
  logs: [],
  livestream: {
    platform: 'youtube',
    rtmpUrl: '',
    streamKey: '',
    isPersistent: false,
  },
  addLog: (level, message, context) => {
    const entry: LogEntry = {
      id: nanoid(8),
      timestamp: Date.now(),
      level,
      message: sanitizeMessage(message),
      context,
    }
    set((state) => {
      const next = [...state.logs, entry]
      if (next.length > MAX_LOG_ENTRIES) {
        next.splice(0, next.length - MAX_LOG_ENTRIES)
      }
      return { logs: next }
    })
  },
  setRoomName: (roomName) => set({ roomName }),
  setRoomUrl: (roomUrl) => set({ roomUrl }),
  setToken: (token) => set({ token }),
  setLinkedAt: (linkedAt) => set({ linkedAt }),
  setSelfParticipantId: (selfParticipantId) => set({ selfParticipantId }),
  setDesktopParticipantId: (desktopParticipantId) => set({ desktopParticipantId }),
  setMobileParticipantId: (mobileParticipantId) => set({ mobileParticipantId }),
  setMobileCameraEnabled: (mobileCameraEnabled) => set({ mobileCameraEnabled }),
  setCameraOverlayPosition: (cameraOverlayPosition) => set({ cameraOverlayPosition }),
  setDailyStatus: (dailyStatus) => set({ dailyStatus }),
  setScreenShareStatus: (screenShareStatus) => set({ screenShareStatus }),
  setLivestreamStatus: (livestreamStatus) => set({ livestreamStatus }),
  setSelectedSource: (selectedSourceId) => set({ selectedSourceId }),
  setPreviewMuted: (isPreviewMuted) => set({ isPreviewMuted }),
  setLivestreamConfig: (partial) =>
    set((state) => ({
      livestream: {
        ...state.livestream,
        ...partial,
      },
    })),
  resetLogs: () => set({ logs: [] }),
}))
