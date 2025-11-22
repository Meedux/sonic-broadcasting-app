import { useCallback, useEffect, useState } from 'react'

import type { DesktopSourceSummary } from '../types/desktop'

interface UseDesktopSourcesOptions {
  autoLoad?: boolean
}

const hasDesktopBridge = (): boolean => {
  return typeof window !== 'undefined' && !!window.desktopBridge && !!window.desktopBridge.desktop
}

export function useDesktopSources(options: UseDesktopSourcesOptions = {}) {
  const { autoLoad = true } = options
  const [sources, setSources] = useState<DesktopSourceSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const bridge = window.desktopBridge
    if (!bridge?.desktop?.getSources) {
      setError('Desktop bridge unavailable. Launch the Electron shell to enable screen capture.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const nextSources = await bridge.desktop.getSources({ types: ['screen', 'window'] })
      setSources(nextSources)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load screen sources')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (autoLoad) {
      if (!hasDesktopBridge()) {
        setError('Desktop bridge unavailable. Launch the Electron shell to enable screen capture.')
        setSources([])
        setLoading(false)
        return
      }
      load().catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'Failed to load screen sources')
        setLoading(false)
      })
    }
  }, [autoLoad, load])

  return {
    sources,
    loading,
    error,
    refresh: load,
  }
}
