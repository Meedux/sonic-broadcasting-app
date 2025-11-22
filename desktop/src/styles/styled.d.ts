import 'styled-components'

import type { AppTheme } from './theme'

declare module 'styled-components' {
  export interface DefaultTheme {
    colors: AppTheme['colors']
    fonts: AppTheme['fonts']
    layout: AppTheme['layout']
  }
}
