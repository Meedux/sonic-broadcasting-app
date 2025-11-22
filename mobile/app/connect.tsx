import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { PrimaryButton } from '@/src/components/PrimaryButton'
import { ScreenBackground } from '@/src/components/ScreenBackground'
import { TextField } from '@/src/components/TextField'
import { useBroadcastContext } from '@/src/context/BroadcastProvider'
import { palette, spacing } from '@/src/constants/theme'

const stageLabels: Record<string, string> = {
  idle: 'Awaiting session',
  'creating-room': 'Provisioning session link',
  'room-ready': 'Session ready',
  'connecting-desktop': 'Handshaking with desktop',
  'joining-call': 'Joining secure session',
  connected: 'Connected to desktop',
  'preview-ready': 'Screenshare ready',
  error: 'Needs attention',
}

export default function ConnectScreen() {
  const router = useRouter()
  const { room, stage, connectDesktop, errorMessage, lanUrl, readyForPreview } = useBroadcastContext()
  const [input, setInput] = useState(lanUrl)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!room) {
      router.replace('/')
    }
  }, [room, router])

  useEffect(() => {
    if (readyForPreview) {
      router.replace('/preview')
    }
  }, [readyForPreview, router])

  useEffect(() => {
    if (lanUrl) {
      setInput(lanUrl)
    }
  }, [lanUrl])

  const connecting = useMemo(
    () => ['connecting-desktop', 'joining-call', 'connected'].includes(stage),
    [stage],
  )

  const handleConnect = async () => {
    if (!input.trim()) {
      setLocalError('Enter the desktop LAN URL displayed on the desktop app.')
      return
    }
    setLocalError(null)
    try {
      await connectDesktop(input)
    } catch (error) {
      if (error instanceof Error) {
        setLocalError(error.message)
      }
    }
  }

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>SESSION LINK</Text>
            <Text style={styles.roomUrl}>{room?.url ?? 'Room provisioning...'}</Text>
          </View>
          <View style={styles.statusPill}>
            <Ionicons
              name={stage === 'error' ? 'warning-outline' : 'wifi-outline'}
              size={16}
              color={stage === 'error' ? palette.danger : palette.success}
            />
            <Text
              style={[
                styles.statusText,
                { color: stage === 'error' ? palette.danger : palette.success },
              ]}
            >
              {stageLabels[stage] ?? stage}
            </Text>
          </View>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Paste the LAN URL from the desktop</Text>
          <Text style={styles.instructionsBody}>
            The desktop Electron app now displays its LAN URL. Enter it here so we can connect over Socket.IO and
            share the session metadata automatically.
          </Text>
        </View>

        <View style={styles.formBlock}>
          <TextField
            label="Desktop LAN URL"
            value={input}
            onChangeText={setInput}
            placeholder="http://192.168.1.24:3000"
            autoFocus
            keyboardType="url"
            error={localError || errorMessage}
          />
        </View>

        <View style={styles.buttonBlock}>
          <PrimaryButton
            title={connecting ? 'Linking desktop...' : 'Link desktop & join'}
            loading={connecting}
            onPress={() => {
              void handleConnect()
            }}
            icon={<Ionicons name="link-outline" size={22} color={palette.text} />}
            disabled={connecting}
          />
        </View>
      </View>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  kicker: {
    color: palette.muted,
    letterSpacing: 3,
    fontSize: 12,
  },
  roomUrl: {
    color: palette.text,
    fontSize: 16,
    marginTop: spacing.xs,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  instructions: {
    backgroundColor: palette.card,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing.lg,
  },
  instructionsTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  instructionsBody: {
    color: palette.muted,
    lineHeight: 22,
  },
  formBlock: {
    marginBottom: spacing.md,
  },
  buttonBlock: {
    marginTop: spacing.sm,
  },
})
