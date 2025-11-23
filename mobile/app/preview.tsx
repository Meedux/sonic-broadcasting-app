import { useEffect } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
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
    localCameraTrack,
    cameraEnabled,
    cameraBusy,
    cameraPosition,
    setCameraEnabled,
    setCameraPosition,
  } = useBroadcastContext()

  useEffect(() => {
    if (!readyForPreview) {
      router.replace('/connect')
    }
  }, [readyForPreview, router])

  const handleRestart = () => {
    router.replace('/')
  }

  const handleCameraToggle = () => {
    void setCameraEnabled(!cameraEnabled)
  }

  const handlePositionChange = (position: 'top' | 'bottom') => {
    setCameraPosition(position)
  }

  const cameraStatusLabel = cameraBusy ? 'Switching camera…' : cameraEnabled ? 'Camera on' : 'Camera off'

  const cameraPane = (
    <View style={styles.pane}>
      <Text style={styles.paneLabel}>Mobile camera feed</Text>
      <View style={styles.cameraSurface}>
        {cameraEnabled ? (
          localCameraTrack ? (
            <DailyMediaView
              videoTrack={localCameraTrack}
              audioTrack={null}
              objectFit="cover"
              mirror
              style={styles.cameraMedia}
            />
          ) : (
            <View style={styles.panePlaceholder}>
              <Text style={styles.panePlaceholderText}>Waiting for the mobile camera…</Text>
            </View>
          )
        ) : (
          <View style={styles.panePlaceholder}>
            <Text style={styles.panePlaceholderText}>Camera is currently turned off.</Text>
          </View>
        )}
      </View>
    </View>
  )

  const screenPane = (
    <View style={styles.pane}>
      <Text style={styles.paneLabel}>Desktop screen feed</Text>
      <View style={styles.screenSurface}>
        {remoteScreenTrack ? (
          <DailyMediaView
            videoTrack={remoteScreenTrack}
            audioTrack={remoteAudioTrack ?? null}
            objectFit="contain"
            mirror={false}
            style={styles.screenMedia}
          />
        ) : (
          <View style={styles.panePlaceholder}>
            <Ionicons name="desktop-outline" size={42} color={palette.muted} />
            <Text style={styles.panePlaceholderText}>Waiting for the desktop to share its screen…</Text>
          </View>
        )}
      </View>
    </View>
  )

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.kicker}>LIVE PREVIEW</Text>
          <Text style={styles.heroTitle}>You are monitoring the desktop screenshare</Text>
          <Text style={styles.heroSubtitle}>
            Keep the meme energy by stacking the mobile cam over the widescreen game feed.
          </Text>
        </View>

        <View style={styles.previewCard}>
          <View style={styles.previewStack}>
            {cameraPosition === 'top' ? (
              <>
                {cameraPane}
                {screenPane}
              </>
            ) : (
              <>
                {screenPane}
                {cameraPane}
              </>
            )}
          </View>
        </View>

        <View style={styles.controlsCard}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.metaLabel}>Mobile camera</Text>
              <Text style={styles.metaValue}>{cameraStatusLabel}</Text>
            </View>
            <Pressable
              disabled={cameraBusy}
              onPress={handleCameraToggle}
              style={[styles.toggleButton, cameraEnabled ? styles.toggleButtonActive : null]}
            >
              <Text style={[styles.toggleButtonText, cameraEnabled ? styles.toggleButtonTextActive : null]}>
                {cameraEnabled ? 'Turn off' : 'Turn on'}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.controlsHint}>Stream your face cam to the preview and park it on either edge.</Text>
          <View style={styles.positionRow}>
            <Pressable
              onPress={() => handlePositionChange('top')}
              style={[styles.positionButton, cameraPosition === 'top' ? styles.positionButtonActive : null]}
            >
              <Text
                style={[styles.positionButtonText, cameraPosition === 'top' ? styles.positionButtonTextActive : null]}
              >
                Pin top
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handlePositionChange('bottom')}
              style={[
                styles.positionButton,
                styles.positionButtonLast,
                cameraPosition === 'bottom' ? styles.positionButtonActive : null,
              ]}
            >
              <Text
                style={[styles.positionButtonText, cameraPosition === 'bottom' ? styles.positionButtonTextActive : null]}
              >
                Pin bottom
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.metaCard}>
          <Text style={styles.metaCardTitle}>Link diagnostics</Text>
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

        <View style={styles.cta}>
          <PrimaryButton
            title="Restart session"
            onPress={handleRestart}
            icon={<Ionicons name="refresh-outline" size={22} color={palette.text} />}
          />
        </View>
      </ScrollView>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    
  },
  scrollContent: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  headerBlock: {
    gap: spacing.sm,
  },
  kicker: {
    color: palette.accentGlow,
    letterSpacing: 4,
    fontWeight: '600',
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    color: palette.text,
    fontSize: 24,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  previewCard: {
    flex: 1,
    backgroundColor: palette.card,
    borderRadius: spacing.lg,
    marginVertical: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.lg,
  },
  previewCardTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  previewCardSubtitle: {
    color: palette.muted,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontSize: 13,
  },
  previewStack: {
    flex: 1,
  },
  pane: {
    marginBottom: spacing.lg,
  },
  paneLabel: {
    color: palette.muted,
    letterSpacing: 3,
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  cameraSurface: {
    height: 160,
    borderRadius: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cameraMedia: {
    flex: 1,
  },
  screenSurface: {
    minHeight: 260,
    borderRadius: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  screenMedia: {
    flex: 1,
  },
  panePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  panePlaceholderText: {
    color: palette.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  controlsCard: {
    backgroundColor: palette.surface,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  toggleButtonActive: {
    backgroundColor: palette.accentDark,
    borderColor: palette.accentGlow,
  },
  toggleButtonText: {
    color: palette.muted,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  toggleButtonTextActive: {
    color: palette.text,
  },
  controlsHint: {
    color: palette.muted,
    marginBottom: spacing.md,
  },
  positionRow: {
    flexDirection: 'row',
  },
  positionButton: {
    flex: 1,
    borderRadius: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  positionButtonLast: {
    marginRight: 0,
  },
  positionButtonActive: {
    borderColor: palette.accentGlow,
    backgroundColor: 'rgba(192, 22, 43, 0.14)',
  },
  positionButtonText: {
    color: palette.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  positionButtonTextActive: {
    color: palette.text,
  },
  metaCard: {
    backgroundColor: palette.surface,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  metaCardTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
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
  cta: {
    paddingBottom: spacing.xl,
  },
})
