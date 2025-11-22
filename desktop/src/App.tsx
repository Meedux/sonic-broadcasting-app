import { useEffect, useMemo, type FC } from 'react'
import { DailyProvider } from '@daily-co/daily-react'
import DailyIframe, { type DailyCall } from '@daily-co/daily-js'
import { ThemeProvider } from 'styled-components'

import { BroadcastApp } from './modules/BroadcastApp'
import { GlobalStyle } from './styles/GlobalStyle'
import { theme } from './styles/theme'

let callObjectSingleton: DailyCall | null = null

const getCallObject = (): DailyCall => {
  if (!callObjectSingleton && typeof DailyIframe.createCallObject === 'function') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (DailyIframe as any)?.setLogLevel?.('error')
    } catch {
      /* ignore: log level API not available in this SDK version */
    }
    callObjectSingleton = DailyIframe.createCallObject()
    if (typeof callObjectSingleton?.on === 'function') {
      callObjectSingleton.on('call-instance-destroyed', () => {
        callObjectSingleton = null
      })
    }
  }

  if (!callObjectSingleton) {
    throw new Error('Unable to initialise Daily call object')
  }

  return callObjectSingleton
}

const App: FC = () => {
  const callObject = useMemo(getCallObject, [])

  useEffect(() => {
    return () => {
      callObject.leave().catch(() => undefined)
      if (import.meta.env.PROD) {
        callObject.destroy()
        callObjectSingleton = null
      }
    }
  }, [callObject])

  return (
    <DailyProvider callObject={callObject}>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <BroadcastApp />
      </ThemeProvider>
    </DailyProvider>
  )
}

export default App
