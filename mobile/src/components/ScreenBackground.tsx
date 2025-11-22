import type { ReactNode } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StyleSheet } from 'react-native'

import { gradients } from '@/src/constants/theme'

type ScreenBackgroundProps = {
  children: ReactNode
}

export const ScreenBackground = ({ children }: ScreenBackgroundProps) => {
  const colors = (gradients.hero.length >= 2
    ? gradients.hero
    : ['#000000', '#111111']) as unknown as readonly [string, string, ...string[]];

  return (
    <LinearGradient colors={colors} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>{children}</SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
})
