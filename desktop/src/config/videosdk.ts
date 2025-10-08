// VideoSDK Configuration
// To get a new token:
// 1. Go to https://videosdk.live
// 2. Sign up/Login to your account
// 3. Go to Dashboard -> API Keys
// 4. Generate a new token with permissions: allow_join, allow_mod
// 5. Replace the token below

export const VIDEOSDK_CONFIG = {
  // Replace this with your actual VideoSDK token from the dashboard
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiI4YzI3ZTFkMS0yNzE4LTQ4NWQtYWNlMy0wMmU5ZmY0ZjM3ZTAiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTc1OTg5NTM0MCwiZXhwIjoxNzY3NjcxMzQwfQ.4cjSheoIUJTq6mJP9xtZ4poF0Htd0SNRNOvWyUjPvzk',
  
  // API endpoint for creating meetings
  apiEndpoint: 'https://api.videosdk.live/v2/rooms',
  
  // Default region for meetings
  region: 'us-east-1',
  
  // Meeting configuration
  meetingConfig: {
    micEnabled: true,
    webcamEnabled: false, // Desktop doesn't need webcam
    name: 'Desktop Host',
    mode: 'SEND_AND_RECV' as const,
    debugMode: false,
  },
  
  // Screen sharing configuration for Electron
  screenShareConfig: {
    optimizeFor: 'motion' as const,
    quality: 'medium' as const,
    encodeBase64: false,
  }
};

// Function to validate token format
export const isValidTokenFormat = (token: string): boolean => {
  return !!(token && token.split('.').length === 3 && token !== 'YOUR_VIDEOSDK_TOKEN_HERE' && token.length > 50);
};

// Function to check if token is expired
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch {
    return true;
  }
};

// Function to create a new meeting
export const createVideoSDKMeeting = async (token: string): Promise<{ roomId: string }> => {
  const response = await fetch(VIDEOSDK_CONFIG.apiEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      region: VIDEOSDK_CONFIG.region,
      // Request a one-to-one / p2p meeting when creating from the Desktop studio.
      // NOTE: VideoSDK API accepts additional properties; using `properties.roomType` and `template: 'p2p'` as hints.
      // If your VideoSDK account uses a different parameter name for one-to-one rooms, adjust accordingly.
      template: 'p2p',
      properties: {
        roomType: 'ONE_TO_ONE',
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Failed to create meeting: ${response.status} ${response.statusText}. ${errorData.error || ''}`);
  }

  const data = await response.json();
  if (!data.roomId) {
    throw new Error('No room ID returned from VideoSDK API');
  }

  return data;
};