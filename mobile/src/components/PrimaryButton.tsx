import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import type { ReactNode } from 'react'

import { palette, spacing } from '@/src/constants/theme'

type PrimaryButtonProps = {
  title: string
  onPress: () => void | Promise<void>
  loading?: boolean
  disabled?: boolean
  icon?: ReactNode
}

export const PrimaryButton = ({ title, onPress, loading, disabled, icon }: PrimaryButtonProps) => (
  <Pressable
    accessibilityRole="button"
    disabled={disabled || loading}
    onPress={onPress}
    style={({ pressed }) => [
      styles.button,
      (pressed && !disabled && !loading) ? styles.pressed : null,
      disabled || loading ? styles.disabled : null,
    ]}
  >
    {loading ? (
      <ActivityIndicator color={palette.text} />
    ) : (
      <>
        {icon ? <View style={styles.iconSlot}>{icon}</View> : null}
        <Text style={styles.label}>{title}</Text>
      </>
    )}
  </Pressable>
)

const styles = StyleSheet.create({
  button: {
    backgroundColor: palette.accent,
    paddingVertical: spacing.md,
    borderRadius: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: palette.accentGlow,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.45,
  },
  iconSlot: {
    marginRight: spacing.sm,
  },
  label: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})
