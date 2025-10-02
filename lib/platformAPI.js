// YouTube and Facebook API integration for stream management
export class PlatformAPI {
  constructor() {
    this.baseUrl = 'http://localhost:8080/api';
  }

  // YouTube API methods
  async createYouTubeStream(accessToken, title, description) {
    try {
      const response = await fetch(`${this.baseUrl}/youtube/create-broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken,
          title,
          description
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create YouTube stream');
      }

      return await response.json();
    } catch (error) {
      console.error('YouTube API error:', error);
      throw error;
    }
  }

  async getYouTubeAccessToken() {
    // In a real app, implement OAuth flow
    return new Promise((resolve, reject) => {
      // For now, prompt user to enter access token
      const token = prompt('Enter your YouTube access token (get from Google Cloud Console):');
      if (token) {
        resolve(token);
      } else {
        reject(new Error('No access token provided'));
      }
    });
  }

  // Facebook API methods
  async createFacebookStream(accessToken, title, description) {
    try {
      // Facebook Live API implementation
      const response = await fetch('https://graph.facebook.com/me/live_videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          title: title,
          description: description,
          status: 'LIVE_NOW'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Facebook stream');
      }

      return await response.json();
    } catch (error) {
      console.error('Facebook API error:', error);
      throw error;
    }
  }

  async getFacebookAccessToken() {
    // In a real app, implement OAuth flow
    return new Promise((resolve, reject) => {
      const token = prompt('Enter your Facebook access token (get from Facebook Developer Console):');
      if (token) {
        resolve(token);
      } else {
        reject(new Error('No access token provided'));
      }
    });
  }

  // Stream management
  async startStream(platform, streamKey, quality) {
    try {
      const response = await fetch(`${this.baseUrl}/start-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          streamKey,
          quality
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start stream');
      }

      return await response.json();
    } catch (error) {
      console.error('Stream start error:', error);
      throw error;
    }
  }

  async stopStream() {
    try {
      const response = await fetch(`${this.baseUrl}/stop-stream`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to stop stream');
      }

      return await response.json();
    } catch (error) {
      console.error('Stream stop error:', error);
      throw error;
    }
  }

  async getStreamStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/stream-status`);
      
      if (!response.ok) {
        throw new Error('Failed to get stream status');
      }

      return await response.json();
    } catch (error) {
      console.error('Stream status error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const platformAPI = new PlatformAPI();