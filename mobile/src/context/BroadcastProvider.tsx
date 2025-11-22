import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Daily, { type DailyCall } from '@daily-co/react-native-daily-js'
import type { MediaStreamTrack } from '@daily-co/react-native-webrtc'
import type { Socket } from 'socket.io-client'

import { createDailyRoom, type DailyRoom } from '@/src/services/daily'
import { createDesktopSocket, linkSession, normalizeLanUrl } from '@/src/services/desktop'

export type BroadcastStage =
  | 'idle'
  | 'creating-room'
  | 'room-ready'
  | 'connecting-desktop'
  | 'joining-call'
  | 'connected'
  | 'preview-ready'
  | 'error'

export interface BroadcastContextValue {
  stage: BroadcastStage
  room: DailyRoom | null
  lanUrl: string
  desktopParticipantId: string | null
  remoteScreenTrack: MediaStreamTrack | null
  remoteAudioTrack: MediaStreamTrack | null
  errorMessage: string | null
  callObject: DailyCall | null
  createRoom: () => Promise<void>
  connectDesktop: (lanUrl: string) => Promise<void>
  readyForPreview: boolean
}

const BroadcastContext = createContext<BroadcastContextValue | undefined>(undefined)

export const BroadcastProvider = ({ children }: { children: ReactNode }) => {
  const [stage, setStage] = useState<BroadcastStage>('idle')
  const [room, setRoom] = useState<DailyRoom | null>(null)
  const [lanUrl, setLanUrl] = useState('')
  const [desktopParticipantId, setDesktopParticipantId] = useState<string | null>(null)
  const [remoteScreenTrack, setRemoteScreenTrack] = useState<MediaStreamTrack | null>(null)
  const [remoteAudioTrack, setRemoteAudioTrack] = useState<MediaStreamTrack | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [callObject, setCallObject] = useState<DailyCall | null>(null)

  const callRef = useRef<DailyCall | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const call = Daily.createCallObject()
    call.setLocalAudio(false)
    call.setLocalVideo(false)
    callRef.current = call
    setCallObject(call)

    return () => {
      socketRef.current?.removeAllListeners()
      socketRef.current?.disconnect()
      call.leave?.().catch(() => undefined)
      ;(call as DailyCall & { destroy?: () => void }).destroy?.()
    }
  }, [])

  const updateRemoteTracks = useCallback(() => {
    const call = callRef.current
    if (!call || !desktopParticipantId) {
      setRemoteScreenTrack(null)
      setRemoteAudioTrack(null)
      setStage((prev) => (prev === 'preview-ready' ? 'connected' : prev))
      return
    }
    const participant = call.participants?.()?.[desktopParticipantId]
    const nextScreen = participant?.tracks?.screenVideo?.state === 'playable' ? participant.tracks.screenVideo.track : null
    const nextAudio = participant?.tracks?.screenAudio?.state === 'playable' ? participant.tracks.screenAudio.track : null
    setRemoteScreenTrack(nextScreen ?? null)
    setRemoteAudioTrack(nextAudio ?? null)
    setStage((prev) => (nextScreen ? 'preview-ready' : prev === 'preview-ready' ? 'connected' : prev))
  }, [desktopParticipantId])

  useEffect(() => {
    const call = callRef.current
    if (!call) {
      return
    }

    const participantEvents: string[] = [
      'participant-joined',
      'participant-updated',
      'participant-left',
      'track-started',
      'track-stopped',
    ]

    const handleParticipantEvent = () => updateRemoteTracks()
    participantEvents.forEach((event) => {
      // @ts-expect-error event types align at runtime
      call.on(event, handleParticipantEvent)
    })

    const handleJoined = () => {
      setStage((prev) => (prev === 'joining-call' ? 'connected' : prev))
    }

    const handleError = (event: { errorMsg?: string }) => {
      setStage('error')
      setErrorMessage(event?.errorMsg || 'Session bridge error')
    }

    call.on('joined-meeting', handleJoined)
    call.on('error', handleError)

    return () => {
      participantEvents.forEach((event) => {
        // @ts-expect-error runtime event name
        call.off(event, handleParticipantEvent)
      })
      call.off('joined-meeting', handleJoined)
      call.off('error', handleError)
    }
  }, [updateRemoteTracks])

  const createRoomHandler = useCallback(async () => {
    setErrorMessage(null)
    setStage('creating-room')
    try {
      const nextRoom = await createDailyRoom()
      setRoom(nextRoom)
      setStage('room-ready')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create session room'
      setErrorMessage(message)
      setStage('error')
      throw error
    }
  }, [])

  const ensureJoined = useCallback(async () => {
    if (!room) {
      throw new Error('Create a room before joining the call.')
    }
    const call = callRef.current
    if (!call) {
      throw new Error('Session bridge not ready')
    }

    const state = call.meetingState?.()
    if (state && ['joining-meeting', 'joined-meeting'].includes(state)) {
      return
    }
    setStage('joining-call')
    try {
      await call.join({
        url: room.url,
        subscribeToTracksAutomatically: false,
      })
      call.setLocalAudio(false)
      call.setLocalVideo(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to join session room'
      setErrorMessage(message)
      setStage('error')
      throw error
    }
  }, [room])

  const subscribeToScreenshare = useCallback(
    async (participantId: string) => {
      const call = callRef.current
      if (!call) {
        return
      }
      try {
        await call.updateParticipant(participantId, {
          setSubscribedTracks: {
            video: false,
            audio: false,
            screenVideo: true,
            screenAudio: true,
          },
        })
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to subscribe to the desktop screenshare')
      }
    },
    [],
  )

  const attachSocket = useCallback(
    (baseUrl: string, activeRoom: DailyRoom) =>
      new Promise<void>((resolve, reject) => {
        socketRef.current?.removeAllListeners()
        socketRef.current?.disconnect()

        const socket = createDesktopSocket(baseUrl)
        socketRef.current = socket

        const cleanup = () => {
          socket.off('connect', handleConnect)
          socket.off('connect_error', handleError)
          socket.off('desktop-participant', handleDesktopParticipant)
        }

        const handleConnect = () => {
          const payload: Record<string, string> = {
            roomName: activeRoom.name,
            roomUrl: activeRoom.url,
          }
          if (activeRoom.token) {
            payload.token = activeRoom.token
          }
          socket.emit('mobile-link-session', payload)
          setStage('connected')
          resolve()
        }

        const handleDesktopParticipant = (payload: { participantId?: string | null }) => {
          const participantId = payload?.participantId ?? null
          setDesktopParticipantId(participantId)
          if (!participantId) {
            setRemoteAudioTrack(null)
            setRemoteScreenTrack(null)
            setStage((prev) => (prev === 'preview-ready' ? 'connected' : prev))
          }
        }

        const handleError = (error: Error) => {
          cleanup()
          setStage('error')
          setErrorMessage(error?.message || 'Failed to connect to desktop')
          reject(error)
        }

        socket.on('connect', handleConnect)
        socket.on('desktop-participant', handleDesktopParticipant)
        socket.on('connect_error', handleError)
      }),
    [],
  )

  useEffect(() => {
    if (!desktopParticipantId) {
      return
    }
    void subscribeToScreenshare(desktopParticipantId)
  }, [desktopParticipantId, subscribeToScreenshare])

  const connectDesktop = useCallback(
    async (rawLanUrl: string) => {
      if (!room) {
        throw new Error('Create a room first.')
      }
      const normalized = normalizeLanUrl(rawLanUrl)
      setLanUrl(normalized)
      setStage('connecting-desktop')
      setErrorMessage(null)
      try {
        await linkSession(normalized, room)
        await ensureJoined()
        await attachSocket(normalized, room)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Desktop connection failed'
        setStage('error')
        setErrorMessage(message)
        throw error
      }
    },
    [attachSocket, ensureJoined, room],
  )

  const value = useMemo<BroadcastContextValue>(
    () => ({
      stage,
      room,
      lanUrl,
      desktopParticipantId,
      remoteScreenTrack,
      remoteAudioTrack,
      errorMessage,
      callObject,
      createRoom: createRoomHandler,
      connectDesktop,
      readyForPreview: stage === 'preview-ready' && Boolean(remoteScreenTrack),
    }),
    [
      callObject,
      connectDesktop,
      createRoomHandler,
      desktopParticipantId,
      errorMessage,
      lanUrl,
      remoteAudioTrack,
      remoteScreenTrack,
      room,
      stage,
    ],
  )

  return <BroadcastContext.Provider value={value}>{children}</BroadcastContext.Provider>
}

export const useBroadcastContext = () => {
  const context = useContext(BroadcastContext)
  if (!context) {
    throw new Error('useBroadcastContext must be used within a BroadcastProvider')
  }
  return context
}
