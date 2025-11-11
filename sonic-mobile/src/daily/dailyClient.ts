import Daily, { DailyCall } from '@daily-co/react-native-daily-js'
import { useEffect, useRef } from 'react'
import { useSessionStore } from '../state/sessionStore'

let callObject: DailyCall | null = null

export function getCallObject(): DailyCall {
  if (!callObject) {
    callObject = Daily.createCallObject()
  }
  return callObject
}

export function useDailyEvents() {
  const log = useSessionStore((s) => s.log)
  const setParticipants = useSessionStore((s) => s.setParticipants)
  const setScreenshareActive = useSessionStore((s) => s.setScreenshareActive)

  const coRef = useRef<DailyCall>(getCallObject())

  useEffect(() => {
    const co = coRef.current
    function handleParticipantChange() {
      const participants = Object.keys(co.participants() || {}).length
      setParticipants(participants)
    }
    function handleJoined() {
      log('Joined Daily room')
      handleParticipantChange()
    }
    function handleLeft() {
      log('Left Daily room')
    }
    function handleReconnecting() {
      log('Daily reconnecting…')
    }
    function handleReconnected() {
      log('Daily reconnected')
      handleParticipantChange()
    }
    function handleError(e: any) {
      log('Daily error: ' + (e?.errorMsg || e?.toString?.() || 'unknown'))
    }
    function handleTrackStarted(ev: any) {
      if (ev?.track?.kind === 'video' && ev?.type === 'screenshare') {
        const sid = ev?.participant?.session_id
        setScreenshareActive(true, sid)
        log('Screenshare video track started')
      }
    }
    function handleTrackStopped(ev: any) {
      if (ev?.track?.kind === 'video' && ev?.type === 'screenshare') {
        setScreenshareActive(false)
        log('Screenshare video track stopped')
      }
    }
    co.on('joined-meeting', handleJoined)
    co.on('left-meeting', handleLeft)
  // Cast to any to allow experimental reconnect events without TS mismatch
  ;(co as any).on?.('reconnecting', handleReconnecting)
  ;(co as any).on?.('reconnected', handleReconnected)
    co.on('participant-joined', handleParticipantChange)
    co.on('participant-updated', handleParticipantChange)
    co.on('participant-left', handleParticipantChange)
    co.on('error', handleError)
    co.on('track-started', handleTrackStarted)
    co.on('track-stopped', handleTrackStopped)
    return () => {
      co.off('joined-meeting', handleJoined)
      co.off('left-meeting', handleLeft)
  ;(co as any).off?.('reconnecting', handleReconnecting)
  ;(co as any).off?.('reconnected', handleReconnected)
      co.off('participant-joined', handleParticipantChange)
      co.off('participant-updated', handleParticipantChange)
      co.off('participant-left', handleParticipantChange)
      co.off('error', handleError)
      co.off('track-started', handleTrackStarted)
      co.off('track-stopped', handleTrackStopped)
    }
  }, [])
}

export async function joinDaily(roomUrl: string, token?: string) {
  const { setSession, setJoined, log } = useSessionStore.getState()
  const co = getCallObject()
  try {
    log('Attempting join...')
    await co.join({ url: roomUrl, token })
    setSession({ roomUrl, token })
    setJoined(true)
  } catch (e: any) {
    log('Join failed: ' + (e?.message || e?.toString?.()))
    throw e
  }
}

export async function leaveDaily() {
  const { setJoined, reset, log } = useSessionStore.getState()
  const co = getCallObject()
  try {
    await co.leave()
    setJoined(false)
    reset()
  } catch (e: any) {
    log('Leave failed: ' + (e?.message || e?.toString?.()))
  }
}
