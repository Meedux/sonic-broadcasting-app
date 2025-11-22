import { useEffect, useMemo, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { PrimaryButton } from '@/src/components/PrimaryButton'
import { ScreenBackground } from '@/src/components/ScreenBackground'
import { useBroadcastContext } from '@/src/context/BroadcastProvider'
import { palette, spacing } from '@/src/constants/theme'

const flowSteps = [
  { title: 'Start controller link', description: 'Phone provisions the private session.' },
  { title: 'Link desktop over LAN', description: 'Desktop joins using the shared URL.' },
  { title: 'Preview the screenshare', description: 'Follow the desktop feed instantly.' },
]

export default function LandingScreen() {
  const router = useRouter()
  const { stage, createRoom, room, errorMessage } = useBroadcastContext()
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pulse])

  useEffect(() => {
    if (stage === 'room-ready' && room) {
      router.replace('/connect')
    }
  }, [stage, room, router])

  const glowStyle = useMemo(
    () => ({
      opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.95] }),
      transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] }) }],
    }),
    [pulse],
  )

  const isLoading = stage === 'creating-room'

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <View style={styles.heroBlock}>
          <Animated.View style={[styles.glow, glowStyle]} />
          <View>
            <Text style={styles.kicker}>SONIC BROADCASTING</Text>
            <Text style={styles.title}>Launch your livestream controller</Text>
            <Text style={styles.subtitle}>
              Spin up a secure controller session on your phone, pass the LAN link to the desktop, and monitor the feed in seconds.
            </Text>
          </View>
        </View>

        <View style={styles.stepList}>
          {flowSteps.map((step, index) => (
            <View key={step.title} style={styles.stepCard}>
              <View style={styles.stepIndex}>
                <Text style={styles.stepIndexText}>{index + 1}</Text>
              </View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <View style={styles.ctaBlock}>
          <PrimaryButton
            title={isLoading ? 'Provisioning session...' : 'Start broadcasting'}
            loading={isLoading}
            onPress={() => {
              void createRoom()
            }}
            icon={<Ionicons name="radio-outline" size={22} color={palette.text} />}
          />
          <Text style={styles.hint}>You will paste the desktop LAN URL next.</Text>
        </View>
      </View>
    </ScreenBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  heroBlock: {
    position: 'relative',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  glow: {
    position: 'absolute',
    top: spacing.sm,
    left: -spacing.md,
    right: -spacing.md,
    bottom: 0,
    backgroundColor: palette.accentDark,
    borderRadius: spacing.lg,
    opacity: 0.4,
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
    fontSize: 32,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  stepList: {
    marginBottom: spacing.lg,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: palette.card,
    borderRadius: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  stepIndex: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndexText: {
    color: palette.accentGlow,
    fontSize: 18,
    fontWeight: '700',
  },
  stepCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  stepTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '600',
  },
  stepDescription: {
    color: palette.muted,
    fontSize: 14,
    marginTop: 4,
  },
  error: {
    color: palette.danger,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  ctaBlock: {
    marginTop: spacing.md,
  },
  hint: {
    color: palette.muted,
    textAlign: 'center',
    fontSize: 13,
    marginTop: spacing.sm,
  },
})
