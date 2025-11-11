import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, View, Modal, Pressable } from 'react-native'
import { BarCodeScanner } from 'expo-barcode-scanner'
import Daily, { DailyMediaView as RNMediaView } from '@daily-co/react-native-daily-js'
import { connectSocket, loadPersistedBaseUrl } from '../socket/socketClient'
import { joinDaily, getCallObject, useDailyEvents } from '../daily/dailyClient'
import { useSessionStore } from '../state/sessionStore'

async function fetchDailySession(baseUrl: string) {
  const res = await fetch(`${baseUrl}/daily/session`)
  if (!res.ok) {
    throw new Error(`Server returned ${res.status}`)
  }
  return (await res.json()) as { roomUrl: string; token?: string }
}

const MediaView: any = RNMediaView as any

export const MainScreen: React.FC = () => {
  useDailyEvents()
  const [baseUrl, setBaseUrl] = useState('')
  const [connecting, setConnecting] = useState(false)
  const logs = useSessionStore((s) => s.logs)
  const screenshareActive = useSessionStore((s) => s.screenshareActive)
  const streamConfig = useSessionStore((s) => s.streamConfig)
  const livestreamPaused = useSessionStore((s) => s.livestreamPaused)
  const setLivestreamPaused = useSessionStore((s) => s.setLivestreamPaused)
  const joined = useSessionStore((s) => s.joined)
  const [qrVisible, setQrVisible] = useState(false)
  const [qrPermStatus, setQrPermStatus] = useState<'granted'|'denied'|'undetermined'>('undetermined')

  useEffect(() => {
    let cancelled = false
    loadPersistedBaseUrl().then((saved) => {
      if (cancelled) return
      if (saved) {
        setBaseUrl(saved)
        // attempt auto-connect
        void handleConnect(saved)
      }
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!qrVisible || qrPermStatus !== 'undetermined') return
    BarCodeScanner.requestPermissionsAsync().then(({ status }) => {
      setQrPermStatus(status === 'granted' ? 'granted' : 'denied')
    })
  }, [qrVisible, qrPermStatus])

  const callObject = useMemo(() => getCallObject(), [])

  const handleConnect = useCallback(async (forcedUrl?: string) => {
    const urlToUse = forcedUrl ?? baseUrl
    if (!urlToUse) {
      Alert.alert('Enter server URL', 'Example: http://192.168.1.23:51234')
      return
    }
    setConnecting(true)
    try {
      const attemptJoin = async () => {
        const session = await fetchDailySession(urlToUse)
        await joinDaily(session.roomUrl, session.token)
      }
      // retry with backoff up to 4 attempts
      let attempt = 0
      let lastErr: any
      while (attempt < 4) {
        try {
          await attemptJoin()
          lastErr = undefined
          break
        } catch (e) {
          lastErr = e
          const delay = 750 * Math.pow(2, attempt) // 0.75s, 1.5s, 3s, 6s
          await new Promise((r) => setTimeout(r, delay))
          attempt++
        }
      }
      if (lastErr) throw lastErr

      connectSocket(urlToUse, async () => {
        if (!useSessionStore.getState().joined) {
          try {
            await attemptJoin()
          } catch (e) {
            // will retry on next reconnect or manual connect
          }
        }
      })
    } catch (e: any) {
      Alert.alert('Connection failed', e?.message || e?.toString?.())
    } finally {
      setConnecting(false)
    }
  }, [baseUrl, joinDaily])

  const handleStartLivestream = async () => {
    try {
      if (!streamConfig?.rtmpEndpoint) {
        Alert.alert('Missing config', 'No RTMP endpoint received from desktop app yet.')
        return
      }
      if (livestreamPaused) {
        // Daily currently uses startLiveStreaming to begin; no resume API, so re-init
        await callObject.startLiveStreaming({ rtmpUrl: streamConfig.rtmpEndpoint })
        setLivestreamPaused(false)
        useSessionStore.getState().log('Resumed livestream')
      } else {
        await callObject.startLiveStreaming({ rtmpUrl: streamConfig.rtmpEndpoint })
        useSessionStore.getState().log('Started livestream')
      }
    } catch (e: any) {
      useSessionStore.getState().log('Start livestream failed: ' + (e?.message || e?.toString?.()))
      Alert.alert('Start livestream failed', e?.message || e?.toString?.())
    }
  }

  const handlePauseLivestream = async () => {
    try {
      // Daily has no native pause; we mark state and stop streaming so Start can re-init
      await callObject.stopLiveStreaming()
      setLivestreamPaused(true)
      useSessionStore.getState().log('Paused livestream (stopped underlying stream)')
    } catch (e: any) {
      useSessionStore.getState().log('Pause livestream failed: ' + (e?.message || e?.toString?.()))
      Alert.alert('Pause livestream failed', e?.message || e?.toString?.())
    }
  }

  const handleEndLivestream = async () => {
    try {
      await callObject.stopLiveStreaming()
      setLivestreamPaused(false)
      useSessionStore.getState().log('Ended livestream')
    } catch (e: any) {
      useSessionStore.getState().log('End livestream failed: ' + (e?.message || e?.toString?.()))
      Alert.alert('End livestream failed', e?.message || e?.toString?.())
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Sonic Mobile Controller</Text>

      <View style={styles.connectionRow}>
        <TextInput
          style={styles.input}
          placeholder="http://192.168.0.12:51234"
          placeholderTextColor="#777"
          value={baseUrl}
          onChangeText={setBaseUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={{ width: 12 }} />
  <Button title={connecting ? 'Connecting…' : joined ? 'Connected' : 'Connect'} onPress={() => handleConnect()} disabled={connecting || joined} />
        <View style={{ width: 12 }} />
        <Button title="Scan QR" onPress={() => setQrVisible(true)} />
      </View>

      <View style={styles.preview}>
        {joined ? (
          <MediaView
            style={styles.video}
            callObject={callObject as any}
            videoSource="screenVideo"
            zOrder={0}
          />
        ) : (
          <View style={styles.previewPlaceholder}>
            {connecting ? <ActivityIndicator color="#c0162b" /> : <Text style={styles.placeholderText}>Connect to desktop to view screenshare</Text>}
          </View>
        )}
      </View>

      <View style={styles.controls}>
  <Button color="#c0162b" title={livestreamPaused ? 'Resume Livestream' : 'Start Livestream'} onPress={handleStartLivestream} />
        <View style={{ height: 12 }} />
        <Button color="#a51425" title="Pause Livestream" onPress={handlePauseLivestream} />
        <View style={{ height: 12 }} />
        <Button color="#6a0f1a" title="End Livestream" onPress={handleEndLivestream} />
      </View>

      <View style={styles.logs}>
        <Text style={styles.logsTitle}>Logs</Text>
        {logs.slice(0, 6).map((l, idx) => (
          <Text key={idx} style={styles.logLine}>{l}</Text>
        ))}
      </View>

      <Modal visible={qrVisible} animationType="slide" onRequestClose={() => setQrVisible(false)}>
        <View style={styles.qrModal}>
          <Text style={styles.qrTitle}>Scan Desktop QR</Text>
          {qrPermStatus === 'denied' && (
            <Text style={styles.qrError}>Camera permission denied.</Text>
          )}
          {qrPermStatus === 'granted' && (
            <BarCodeScanner
              style={styles.qrScanner}
              onBarCodeScanned={(ev) => {
                const txt = ev.data?.trim()
                if (txt && /^https?:\/\//i.test(txt)) {
                  setBaseUrl(txt)
                  setQrVisible(false)
                  void handleConnect(txt)
                } else {
                  Alert.alert('Invalid QR', 'QR does not contain a valid URL.')
                }
              }}
            />
          )}
          <Pressable style={styles.qrClose} onPress={() => setQrVisible(false)}>
            <Text style={styles.qrCloseText}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0c0c0f', padding: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  connectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  input: { flex: 1, backgroundColor: '#15151a', color: '#fff', borderColor: '#2a2a2f', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 44 },
  preview: { flex: 1, backgroundColor: '#111114', borderRadius: 12, overflow: 'hidden', borderColor: '#2a2a2f', borderWidth: 1 },
  video: { width: '100%', height: '100%' },
  previewPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: '#888' },
  controls: { paddingVertical: 16 },
  logs: { borderTopColor: '#2a2a2f', borderTopWidth: 1, paddingTop: 12 },
  logsTitle: { color: '#c2c2c6', marginBottom: 6 },
  logLine: { color: '#9a9aa0', fontSize: 12 },
  qrModal: { flex: 1, backgroundColor: '#0c0c0f', padding: 16 },
  qrTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  qrError: { color: '#c0162b' },
  qrScanner: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  qrClose: { marginTop: 16, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#15151a', borderRadius: 8 },
  qrCloseText: { color: '#fff' },
})
