import { contextBridge, desktopCapturer, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from './messaging'
import type { CommunicationState } from './server'

type DesktopSource = {
  id: string
  name: string
  type: 'screen' | 'window'
  thumbnail: string | null
  displayId?: string
}

type Unsubscribe = () => void

const desktopBridge = {
  getCommunicationState: (): Promise<CommunicationState | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_COMMUNICATION_STATE) as Promise<CommunicationState | null>,
  onCommunicationState: (listener: (state: CommunicationState) => void): Unsubscribe => {
    const channel = IPC_CHANNELS.COMMUNICATION_STATUS
    const handler = (_event: Electron.IpcRendererEvent, state: CommunicationState) => listener(state)

    ipcRenderer.on(channel, handler)

    return () => ipcRenderer.removeListener(channel, handler)
  },
  desktop: {
    async getSources({ types }: { types: Array<'screen' | 'window'> }): Promise<DesktopSource[]> {
      if (desktopCapturer?.getSources) {
        const sources = await desktopCapturer.getSources({
          types,
          fetchWindowIcons: true,
          thumbnailSize: { width: 320, height: 180 },
        })

        return sources.map((source) => ({
          id: source.id,
          name: source.name,
          type: source.id.startsWith('screen:') ? 'screen' : 'window',
          thumbnail: source.thumbnail?.getSize()?.width ? source.thumbnail.toDataURL() : null,
          displayId: (source as unknown as { display_id?: string }).display_id,
        }))
      }

      const sources = (await ipcRenderer.invoke(IPC_CHANNELS.GET_DESKTOP_SOURCES, {
        types,
      })) as DesktopSource[]

      return sources
    },
  },
}

contextBridge.exposeInMainWorld('desktopBridge', desktopBridge)

declare global {
  interface Window {
    desktopBridge: typeof desktopBridge
  }
}
