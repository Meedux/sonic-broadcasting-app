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
  const provisioningRef = useRef(false)
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
  const setRoomUrl = useBroadcastStore((state) => state.setRoomUrl)
  const setRoomName = useBroadcastStore((state) => state.setRoomName)
  const setToken = useBroadcastStore((state) => state.setToken)
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

  const requestManagedSession = useCallback(
    async ({ refresh = false }: { refresh?: boolean } = {}) => {
      const baseUrl = await resolveCommunicationUrl()
      const url = new URL('/daily/session', baseUrl)
      if (refresh) {
        url.searchParams.set('refresh', '1')
      }

      const response = await fetch(url.toString())
      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Daily manager responded with status ${response.status}`)
      }

      const payload = (await response.json()) as {
        roomName: string
        roomUrl: string
        token: string | null
      }

      setRoomName(payload.roomName)
      setRoomUrl(payload.roomUrl)
      setToken(payload.token ?? '')

      return payload
    },
    [resolveCommunicationUrl, setRoomName, setRoomUrl, setToken],
  )

  const createRoom = useCallback(async () => {
    setDailyStatus('creating-room')
    try {
      const session = await requestManagedSession({ refresh: true })
      setDailyStatus('ready')
      addLog('success', `Managed Daily room refreshed (${session.roomName})`)
    } catch (error) {
      setDailyStatus('error')
      setToken('')
      addLog('error', `Failed to create Daily room: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [addLog, requestManagedSession, setDailyStatus, setToken])

  const joinRoom = useCallback(async () => {
    if (!daily) {
      addLog('error', 'Daily call object not ready yet')
      return
    }
    if (!roomUrl) {
      addLog('warning', 'Room URL missing. Create or paste a room URL before joining.')
      return
    }

    setDailyStatus('joining')
    try {
      await daily.join({
        url: roomUrl,
        token: token || undefined,
        subscribeToTracksAutomatically: true,
      })
      addLog('info', 'Joining Daily room…')
    } catch (error) {
      setDailyStatus('error')
      addLog('error', `Failed to join Daily room: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [daily, roomUrl, token, addLog, setDailyStatus])

  const leaveRoom = useCallback(async () => {
    if (!daily) {
      return
    }
    setDailyStatus('leaving')
    try {
      await daily.leave()
      addLog('info', 'Leaving Daily room…')
    } catch (error) {
      setDailyStatus('error')
      addLog('error', `Failed to leave Daily room: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      cleanupScreenStream()
      onScreenStream?.(null)
    }
  }, [daily, addLog, cleanupScreenStream, onScreenStream, setDailyStatus])

  const startScreenShare = useCallback(async () => {
    if (!daily) {
      addLog('error', 'Daily call object not ready yet')
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
      addLog('success', 'Screen share stream captured and sent to Daily')
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
      addLog('error', 'Daily call object not ready yet')
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
      addLog('info', 'Requested Daily to start RTMP livestream')
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
      addLog('info', 'Requested Daily to stop RTMP livestream')
    } catch (error) {
      setLivestreamStatus('error')
      addLog('error', `Failed to stop livestream: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [daily, livestreamStatus, addLog, setLivestreamStatus])

  const handleJoiningMeeting = useCallback(() => {
    setDailyStatus('joining')
  }, [setDailyStatus])

  const handleJoinedMeeting = useCallback(() => {
    setDailyStatus('joined')
    addLog('success', 'Joined Daily room')
  }, [addLog, setDailyStatus])

  const handleLeftMeeting = useCallback(() => {
    setDailyStatus('ready')
    setScreenShareStatus('idle')
    setLivestreamStatus('idle')
    cleanupScreenStream()
    onScreenStream?.(null)
    addLog('info', 'Left Daily room')
  }, [addLog, cleanupScreenStream, onScreenStream, setDailyStatus, setLivestreamStatus, setScreenShareStatus])

  const handleLocalScreenStarted = useCallback(() => {
    setScreenShareStatus('sharing')
    addLog('success', 'Daily is broadcasting your screen')
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

  useEffect(() => {
    if (roomUrl || dailyStatus !== 'idle') {
      return
    }
    if (provisioningRef.current) {
      return
    }

    provisioningRef.current = true
    void (async () => {
      try {
        setDailyStatus('creating-room')
        await requestManagedSession()
        setDailyStatus('ready')
        addLog('success', 'Managed Daily room prepared automatically')
      } catch (error) {
        setDailyStatus('error')
        addLog(
          'error',
          `Failed to prepare Daily room automatically: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      } finally {
        provisioningRef.current = false
      }
    })()
  }, [roomUrl, dailyStatus, requestManagedSession, setDailyStatus, addLog])

  const isJoined = dailyStatus === 'joined'

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
    createRoom,
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
