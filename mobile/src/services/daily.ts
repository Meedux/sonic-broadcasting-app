const DEFAULT_DAILY_API_URL = 'https://api.daily.co/v1'

export type DailyRoom = {
  name: string
  url: string
  token?: string
}

const dailyApiUrl = process.env.EXPO_PUBLIC_DAILY_API_URL || DEFAULT_DAILY_API_URL
const dailyApiKey = '1824c25b22b5dd9341d5100aa44f1183e8332eef0f480b8df9011879e123b71a'

const buildHeaders = () => {
  if (!dailyApiKey) {
    throw new Error('Missing API key required to create remote rooms.')
  }

  return {
    Authorization: `Bearer ${dailyApiKey}`,
    'Content-Type': 'application/json',
  }
}

export async function createDailyRoom(): Promise<DailyRoom> {
  const expiresInSeconds = 60 * 60 // one hour
  const exp = Math.round(Date.now() / 1000) + expiresInSeconds

  const response = await fetch(`${dailyApiUrl.replace(/\/$/, '')}/rooms`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      privacy: 'public',
      properties: {
        exp,
        enable_screenshare: true,
        enable_chat: false,
        enable_knocking: false,
        start_audio_off: true,
        start_video_off: true,
      },
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Failed to create session room (${response.status})`)
  }

  const payload = (await response.json()) as { name: string; url: string }

  return {
    name: payload.name,
    url: payload.url,
  }
}
