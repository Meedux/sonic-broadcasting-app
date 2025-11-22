import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { DailyMediaView } from '@daily-co/react-native-daily-js'

import { PrimaryButton } from '@/src/components/PrimaryButton'
import { ScreenBackground } from '@/src/components/ScreenBackground'
import { useBroadcastContext } from '@/src/context/BroadcastProvider'
import { palette, spacing } from '@/src/constants/theme'

export default function PreviewScreen() {
  const router = useRouter()
  const {
    room,
    lanUrl,
    desktopParticipantId,
    remoteScreenTrack,
    remoteAudioTrack,
    readyForPreview,
  } = useBroadcastContext()

  useEffect(() => {
    if (!readyForPreview) {
      router.replace('/connect')
    }
  }, [readyForPreview, router])

  const handleRestart = () => {
    router.replace('/')
  }

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <View>
          <Text style={styles.kicker}>LIVE PREVIEW</Text>
          <Text style={styles.title}>You are monitoring the desktop screenshare</Text>
        </View>

        <View style={styles.previewCard}>
          {remoteScreenTrack ? (
            <DailyMediaView
              videoTrack={remoteScreenTrack}
              audioTrack={remoteAudioTrack ?? null}
              objectFit="contain"
              mirror={false}
              style={styles.media}
            />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="desktop-outline" size={42} color={palette.muted} />
              <Text style={styles.placeholderText}>Waiting for the desktop to share its screen...</Text>
            </View>
          )}
        </View>

        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>LAN URL</Text>
            <Text style={styles.metaValue}>{lanUrl || '—'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Desktop participant</Text>
            <Text style={styles.metaValue}>{desktopParticipantId || '—'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Session URL</Text>
            <Text style={styles.metaValue}>{room?.url ?? '—'}</Text>
          </View>
        </View>

        <PrimaryButton
          title="Restart session"
          onPress={handleRestart}
          icon={<Ionicons name="refresh-outline" size={22} color={palette.text} />}
        />
      </View>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  kicker: {
    color: palette.accentGlow,
    letterSpacing: 4,
    fontWeight: '600',
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  title: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '700',
  },
  previewCard: {
    flex: 1,
    backgroundColor: palette.card,
    borderRadius: spacing.lg,
    marginVertical: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  media: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  placeholderText: {
    color: palette.muted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  metaCard: {
    backgroundColor: palette.surface,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing.lg,
  },
  metaRow: {
    marginBottom: spacing.sm,
  },
  metaLabel: {
    color: palette.muted,
    fontSize: 13,
    marginBottom: 4,
  },
  metaValue: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
  },
})
