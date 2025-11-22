import { DarkTheme, type Theme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { BroadcastProvider } from '@/src/context/BroadcastProvider';
import { palette } from '@/src/constants/theme';

export default function RootLayout() {
  const navigationTheme = useMemo<Theme>(
    () => ({
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        primary: palette.accent,
        background: palette.background,
        card: palette.surface,
        text: palette.text,
        border: palette.accentDark,
        notification: palette.accentGlow,
      },
    }),
    [],
  );

  return (
    <BroadcastProvider>
      <SafeAreaProvider>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="connect" />
            <Stack.Screen name="preview" />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </BroadcastProvider>
  );
}
