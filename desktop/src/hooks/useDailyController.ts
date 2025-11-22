import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useDaily, useDailyEvent } from '@daily-co/daily-react'
import type { DailyEventObject } from '@daily-co/daily-js'

import { useBroadcastStore } from '../state/broadcastStore'

type UseDailyControllerOptions = {
  onScreenStream?: (stream: MediaStream | null) => void
}

const buildRtmpEndpoint = (baseUrl: string, streamKey: string) => {
  const trimmedBase = baseUrl.trim().replace(/\/+$/, '')
  const trimmedKey = streamKey.trim().replace(/^\/+/, '')
  return trimmedKey ? `${trimmedBase}/${trimmedKey}` : trimmedBase
}

const stopMediaStream = (stream: MediaStream | null) => {
  if (!stream) {
    return
  }
  stream.getTracks().forEach((track) => {
    try {
      track.stop()
    } catch (error) {
      console.warn('Failed to stop track', error)
    }
  })
}

export function useDailyController(options: UseDailyControllerOptions = {}) {
  const { onScreenStream } = options
  const daily = useDaily()
  const activeScreenStreamRef = useRef<MediaStream | null>(null)
  const autoJoinRef = useRef(false)
  const communicationUrlRef = useRef<string | null>(null)

  const roomUrl = useBroadcastStore((state) => state.roomUrl)
  const token = useBroadcastStore((state) => state.token)
  const livestream = useBroadcastStore((state) => state.livestream)
  const selectedSourceId = useBroadcastStore((state) => state.selectedSourceId)
  const dailyStatus = useBroadcastStore((state) => state.dailyStatus)
  const screenShareStatus = useBroadcastStore((state) => state.screenShareStatus)
  const livestreamStatus = useBroadcastStore((state) => state.livestreamStatus)

  const addLog = useBroadcastStore((state) => state.addLog)
  const setSelfParticipantId = useBroadcastStore((state) => state.setSelfParticipantId)
  const setDailyStatus = useBroadcastStore((state) => state.setDailyStatus)
  const setScreenShareStatus = useBroadcastStore((state) => state.setScreenShareStatus)
  const setLivestreamStatus = useBroadcastStore((state) => state.setLivestreamStatus)

  const cleanupScreenStream = useCallback(() => {
    const stream = activeScreenStreamRef.current
    if (stream) {
      stopMediaStream(stream)
      activeScreenStreamRef.current = null
    }
  }, [])

  const refreshCommunicationUrl = useCallback(async () => {
    const bridge = window.desktopBridge
    if (!bridge) {
      throw new Error('Desktop bridge unavailable')
    }
    const state = await bridge.getCommunicationState()
    if (!state?.url) {
      throw new Error('Local communication server offline')
    }
    communicationUrlRef.current = state.url
    return state.url
  }, [])

  const resolveCommunicationUrl = useCallback(async () => {
    if (communicationUrlRef.current) {
      return communicationUrlRef.current
    }
    return refreshCommunicationUrl()
  }, [refreshCommunicationUrl])

  const announceParticipantId = useCallback(
    async (participantId: string | null) => {
      try {
        const baseUrl = await resolveCommunicationUrl()
        const url = new URL('/link/desktop', baseUrl)
        await fetch(url.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId }),
        })
      } catch (error) {
        addLog('warning', `Failed to announce desktop participant: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    },
    [addLog, resolveCommunicationUrl],
  )

  useEffect(() => {
    return () => {
      cleanupScreenStream()
      onScreenStream?.(null)
    }
  }, [cleanupScreenStream, onScreenStream])

  useEffect(() => {
    const bridge = window.desktopBridge
    if (!bridge?.onCommunicationState) {
      return
    }

    const unsubscribe = bridge.onCommunicationState((state) => {
      if (state?.url) {
        communicationUrlRef.current = state.url
      }
    })

    return () => {
      unsubscribe?.()
    }
  }, [])

  const joinRoom = useCallback(async () => {
    if (!daily) {
      addLog('error', 'Session bridge not ready yet')
      return
    }
    if (!roomUrl) {
      addLog('warning', 'Room URL missing. Create or paste a room URL before joining.')
      return
    }

    setDailyStatus('joining')
    try {
      // Wait for the underlying call object to finish its initial load to avoid
      // benign signaling race warnings (e.g., "sigChannel serverTSNow ...").
      try {
        const state = daily.meetingState?.()
        if (state === 'new' || state === 'loading') {
          await new Promise<void>((resolve) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const onLoaded: any = () => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              daily.off?.('loaded' as any, onLoaded)
              resolve()
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            daily.on?.('loaded' as any, onLoaded)
            // Fallback: continue after a short delay even if 'loaded' doesn't fire in time
            setTimeout(() => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              daily.off?.('loaded' as any, onLoaded)
              resolve()
            }, 300)
          })
        }
      } catch {
        // ignore – this is a best-effort guard
      }

      const joinOptions: Parameters<NonNullable<typeof daily>['join']>[0] = {
        url: roomUrl,
        subscribeToTracksAutomatically: true,
      }
      console.log('Joining session with options:', joinOptions)
      const trimmedToken = typeof token === 'string' ? token.trim() : ''
      if (trimmedToken.length) {
        joinOptions.token = trimmedToken
      }

      await daily.join(joinOptions)
      addLog('info', 'Joining paired session...')
    } catch (error) {
      setDailyStatus('error')
      addLog('error', `Failed to join paired session: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [daily, roomUrl, token, addLog, setDailyStatus])

  const leaveRoom = useCallback(async () => {
    if (!daily) {
      return
    }
    setDailyStatus('leaving')
    try {
      await daily.leave()
      addLog('info', 'Leaving paired session...')
    } catch (error) {
      setDailyStatus('error')
      addLog('error', `Failed to leave paired session: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      cleanupScreenStream()
      onScreenStream?.(null)
    }
  }, [daily, addLog, cleanupScreenStream, onScreenStream, setDailyStatus])

  const startScreenShare = useCallback(async () => {
    if (!daily) {
      addLog('error', 'Session bridge not ready yet')
      return
    }
    if (!selectedSourceId) {
      addLog('warning', 'Select a screen or window before starting screen share')
      return
    }
    if (screenShareStatus === 'sharing' || screenShareStatus === 'starting') {
      addLog('info', 'Screen share already in progress')
      return
    }

    setScreenShareStatus('starting')

    let stream: MediaStream | null = null
    try {
      const constraints = {
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSourceId,
          },
        },
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSourceId,
          },
        },
      } as unknown as MediaStreamConstraints

      stream = await navigator.mediaDevices.getUserMedia(constraints)
      await daily.startScreenShare({ mediaStream: stream })
      activeScreenStreamRef.current = stream
      onScreenStream?.(stream)
      addLog('success', 'Screen share stream captured and sent to the controller link')
    } catch (error) {
      stopMediaStream(stream)
      activeScreenStreamRef.current = null
      setScreenShareStatus('error')
      onScreenStream?.(null)
      addLog('error', `Screen share failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [daily, selectedSourceId, screenShareStatus, addLog, setScreenShareStatus, onScreenStream])

  const stopScreenShare = useCallback(async () => {
    if (!daily) {
      return
    }
    if (screenShareStatus !== 'sharing' && screenShareStatus !== 'starting' && screenShareStatus !== 'stopping') {
      return
    }

    setScreenShareStatus('stopping')
    try {
      await daily.stopScreenShare()
      addLog('info', 'Stopping screen share…')
    } catch (error) {
      setScreenShareStatus('error')
      addLog('error', `Failed to stop screen share: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      cleanupScreenStream()
      onScreenStream?.(null)
    }
  }, [daily, screenShareStatus, addLog, setScreenShareStatus, cleanupScreenStream, onScreenStream])

  const startLivestream = useCallback(async () => {
    if (!daily) {
      addLog('error', 'Session bridge not ready yet')
      return
    }
    if (!livestream.rtmpUrl || !livestream.streamKey) {
      addLog('warning', 'Provide RTMP URL and stream key before going live')
      return
    }

    setLivestreamStatus('starting')
    try {
      const target = buildRtmpEndpoint(livestream.rtmpUrl, livestream.streamKey)
      await daily.startLiveStreaming({
        rtmpUrl: target,
      })
      addLog('info', 'Requested session bridge to start RTMP livestream')
    } catch (error) {
      setLivestreamStatus('error')
      addLog('error', `Failed to start livestream: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [daily, livestream.rtmpUrl, livestream.streamKey, addLog, setLivestreamStatus])

  const stopLivestream = useCallback(async () => {
    if (!daily) {
      return
    }
    if (livestreamStatus !== 'live' && livestreamStatus !== 'starting') {
      return
    }

    setLivestreamStatus('stopping')
    try {
      await daily.stopLiveStreaming()
      addLog('info', 'Requested session bridge to stop RTMP livestream')
    } catch (error) {
      setLivestreamStatus('error')
      addLog('error', `Failed to stop livestream: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [daily, livestreamStatus, addLog, setLivestreamStatus])

  const handleJoiningMeeting = useCallback(() => {
    setDailyStatus('joining')
  }, [setDailyStatus])

  const handleJoinedMeeting = useCallback(
    (ev?: DailyEventObject<'joined-meeting'>) => {
      setDailyStatus('joined')
      const participants = ev?.participants ?? daily?.participants?.()
      const sessionId = participants?.local?.session_id || ''
      setSelfParticipantId(sessionId)
      void announceParticipantId(sessionId || null)
      addLog('success', sessionId ? `Session linked (ID ${sessionId})` : 'Session linked')
    },
    [addLog, announceParticipantId, daily, setDailyStatus, setSelfParticipantId],
  )

  const handleLeftMeeting = useCallback(() => {
    setDailyStatus('ready')
    setScreenShareStatus('idle')
    setLivestreamStatus('idle')
    setSelfParticipantId('')
    void announceParticipantId(null)
    cleanupScreenStream()
    onScreenStream?.(null)
    addLog('info', 'Session link cleared')
  }, [addLog, announceParticipantId, cleanupScreenStream, onScreenStream, setDailyStatus, setLivestreamStatus, setScreenShareStatus, setSelfParticipantId])

  const handleLocalScreenStarted = useCallback(() => {
    setScreenShareStatus('sharing')
    addLog('success', 'Screen feed is live to the controller')
  }, [addLog, setScreenShareStatus])

  const handleLocalScreenStopped = useCallback(() => {
    setScreenShareStatus('idle')
    cleanupScreenStream()
    onScreenStream?.(null)
    addLog('info', 'Screen share stopped')
  }, [addLog, cleanupScreenStream, onScreenStream, setScreenShareStatus])

  const handleLivestreamStarted = useCallback(() => {
    setLivestreamStatus('live')
    addLog('success', 'Livestream is live')
  }, [addLog, setLivestreamStatus])

  const handleLivestreamStopped = useCallback(() => {
    setLivestreamStatus('idle')
    addLog('info', 'Livestream stopped')
  }, [addLog, setLivestreamStatus])

  const handleLivestreamError = useCallback(
    (ev: DailyEventObject<'live-streaming-error'>) => {
      setLivestreamStatus('error')
      addLog('error', `Livestream error: ${ev.errorMsg || 'Unknown issue'}`)
    },
    [addLog, setLivestreamStatus],
  )

  const handleFatalError = useCallback(
    (ev: DailyEventObject<'error'>) => {
      setDailyStatus('error')
      addLog('error', `Daily error: ${ev.errorMsg || 'Unknown error'}`)
    },
    [addLog, setDailyStatus],
  )

  const handleNonFatalError = useCallback(
    (ev: DailyEventObject<'nonfatal-error'>) => {
      if (ev.type === 'screen-share-error') {
        setScreenShareStatus('error')
        addLog('error', `Screen share error: ${ev.errorMsg || 'Unknown issue'}`)
        cleanupScreenStream()
        onScreenStream?.(null)
      }
    },
    [addLog, cleanupScreenStream, onScreenStream, setScreenShareStatus],
  )

  useDailyEvent('joining-meeting', handleJoiningMeeting)
  useDailyEvent('joined-meeting', handleJoinedMeeting)
  useDailyEvent('left-meeting', handleLeftMeeting)
  useDailyEvent('local-screen-share-started', handleLocalScreenStarted)
  useDailyEvent('local-screen-share-stopped', handleLocalScreenStopped)
  useDailyEvent('local-screen-share-canceled', handleLocalScreenStopped)
  useDailyEvent('live-streaming-started', handleLivestreamStarted)
  useDailyEvent('live-streaming-stopped', handleLivestreamStopped)
  useDailyEvent('live-streaming-error', handleLivestreamError)
  useDailyEvent('error', handleFatalError)
  useDailyEvent('nonfatal-error', handleNonFatalError)

  const isJoined = dailyStatus === 'joined'

  useEffect(() => {
    if (roomUrl && dailyStatus === 'idle') {
      setDailyStatus('ready')
    }
  }, [dailyStatus, roomUrl, setDailyStatus])

  useEffect(() => {
    if (!daily || !roomUrl) {
      autoJoinRef.current = false
      return
    }
    if (isJoined || dailyStatus !== 'ready') {
      return
    }
    if (autoJoinRef.current) {
      return
    }

    autoJoinRef.current = true
    void (async () => {
      try {
        await joinRoom()
      } finally {
        autoJoinRef.current = false
      }
    })()
  }, [daily, roomUrl, dailyStatus, isJoined, joinRoom])

  const hasJoinableRoom = useMemo(() => Boolean(roomUrl), [roomUrl])
  const isReadyToJoin = useMemo(
    () => Boolean(roomUrl && dailyStatus !== 'joining' && dailyStatus !== 'joined'),
    [dailyStatus, roomUrl],
  )

  return {
    joinRoom,
    leaveRoom,
    startScreenShare,
    stopScreenShare,
    startLivestream,
    stopLivestream,
    dailyStatus,
    screenShareStatus,
    livestreamStatus,
    hasJoinableRoom,
    isReadyToJoin,
    isJoined,
  }
}
