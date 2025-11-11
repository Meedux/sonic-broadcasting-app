import { create } from 'zustand'

export type StreamConfig = {
  facebookKey?: string
  youtubeKey?: string
  rtmpEndpoint?: string
}

export interface SessionState {
  roomUrl?: string
  token?: string
  joined: boolean
  participants: number
  screenshareActive: boolean
  screenSessionId?: string
  streamConfig: StreamConfig
  logs: string[]
  livestreamPaused: boolean
  setSession: (partial: Partial<Pick<SessionState,'roomUrl'|'token'>>) => void
  setJoined: (joined: boolean) => void
  setParticipants: (count: number) => void
  setScreenshareActive: (active: boolean, sessionId?: string) => void
  setStreamConfig: (cfg: StreamConfig) => void
  setLivestreamPaused: (paused: boolean) => void
  log: (line: string) => void
  reset: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  roomUrl: undefined,
  token: undefined,
  joined: false,
  participants: 0,
  screenshareActive: false,
  screenSessionId: undefined,
  streamConfig: {},
  logs: [],
  livestreamPaused: false,
  setSession: (partial) => set((s) => ({ ...s, ...partial })),
  setJoined: (joined) => set({ joined }),
  setParticipants: (participants) => set({ participants }),
  setScreenshareActive: (screenshareActive, sessionId) => set({ screenshareActive, screenSessionId: sessionId }),
  setStreamConfig: (streamConfig) => set({ streamConfig }),
  setLivestreamPaused: (livestreamPaused) => set({ livestreamPaused }),
  log: (line) => set((s) => ({ logs: [line, ...s.logs].slice(0, 200) })),
  reset: () => set({
    roomUrl: undefined,
    token: undefined,
    joined: false,
    participants: 0,
    screenshareActive: false,
    screenSessionId: undefined,
    streamConfig: {},
    logs: [],
    livestreamPaused: false,
  }),
}))
