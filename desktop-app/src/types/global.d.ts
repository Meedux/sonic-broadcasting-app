import type { CommunicationState } from '../../electron/server'
import type { DesktopSourceSummary } from './desktop'

declare global {
  interface Window {
    desktopBridge: {
      getCommunicationState: () => Promise<CommunicationState | null>
      onCommunicationState: (listener: (state: CommunicationState) => void) => () => void
      desktop: {
        getSources: (options: { types: Array<'screen' | 'window'> }) => Promise<DesktopSourceSummary[]>
      }
    }
  }
}

export {}
