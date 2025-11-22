import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native'

import { palette, spacing } from '@/src/constants/theme'

type TextFieldProps = {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  keyboardType?: KeyboardTypeOptions
  autoFocus?: boolean
  error?: string | null
}

export const TextField = ({ label, value, onChangeText, placeholder, keyboardType, autoFocus, error }: TextFieldProps) => (
  <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.35)"
      keyboardType={keyboardType}
      autoCapitalize="none"
      autoCorrect={false}
      autoFocus={autoFocus}
      style={[styles.input, error ? styles.inputError : null]}
      returnKeyType="done"
    />
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </View>
)

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    color: palette.muted,
    fontSize: 14,
    marginBottom: spacing.xs,
    letterSpacing: 0.4,
  },
  input: {
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: palette.text,
    fontSize: 16,
    backgroundColor: palette.surface,
  },
  inputError: {
    borderColor: palette.danger,
  },
  error: {
    color: palette.danger,
    marginTop: spacing.xs,
  },
})
