import { useEffect, useState } from 'react'
import type { CommunicationState } from '../../electron/server'

interface CommunicationSnapshot {
  state: CommunicationState | null
  loading: boolean
  error: string | null
}

const defaultSnapshot: CommunicationSnapshot = {
  state: null,
  loading: true,
  error: null,
}

export function useCommunicationState(): CommunicationSnapshot {
  const [snapshot, setSnapshot] = useState<CommunicationSnapshot>(defaultSnapshot)

  useEffect(() => {
    const bridge = window.desktopBridge
    if (!bridge) {
      setSnapshot({ state: null, loading: false, error: 'Desktop bridge unavailable' })
      return
    }

    const hydrate = async () => {
      try {
        const state = await bridge.getCommunicationState()
        setSnapshot({ state, loading: false, error: null })
      } catch (error) {
        setSnapshot({
          state: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load communication state',
        })
      }
    }

    hydrate().catch((error) => {
      setSnapshot({
        state: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load communication state',
      })
    })

    const unsubscribe = bridge.onCommunicationState((state) => {
      setSnapshot({ state, loading: false, error: null })
    })

    return () => {
      unsubscribe?.()
    }
  }, [])

  return snapshot
}
