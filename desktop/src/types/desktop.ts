export interface DesktopSourceSummary {
  id: string
  name: string
  type: 'screen' | 'window'
  thumbnail: string | null
  displayId?: string
}
