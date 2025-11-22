export const theme = {
  colors: {
    backgroundPrimary: '#080809',
    backgroundSecondary: '#121217',
    backgroundRaised: '#1c1c24',
    accent: '#c0162b',
    accentMuted: '#8f0f20',
    accentBright: '#ff3959',
    textPrimary: '#f5f5f5',
    textSecondary: '#b0b0b8',
    textMuted: '#7a7a80',
    border: '#2b2b33',
    success: '#32cd70',
    warning: '#ffb347',
    danger: '#ff4f4d',
    info: '#4db1ff',
  },
  fonts: {
    heading: '"Rajdhani", "Segoe UI", sans-serif',
    body: '"Inter", "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", "Consolas", monospace',
  },
  layout: {
    headerHeight: '64px',
    sidebarWidth: '360px',
    borderRadius: '12px',
    gutter: '16px',
  },
} as const

export type AppTheme = typeof theme
