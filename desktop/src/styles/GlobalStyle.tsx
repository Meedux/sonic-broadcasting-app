import { createGlobalStyle } from 'styled-components'

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  :root {
    color-scheme: dark;
  }

  html, body, #root {
    margin: 0;
    padding: 0;
    height: 100%;
    background-color: ${({ theme }) => theme.colors.backgroundPrimary};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-family: ${({ theme }) => theme.fonts.body};
  }

  body {
    overflow: hidden;
  }

  a {
    color: ${({ theme }) => theme.colors.accentBright};
  }

  ::selection {
    background-color: ${({ theme }) => theme.colors.accent};
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`
