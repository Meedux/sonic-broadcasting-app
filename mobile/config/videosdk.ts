// VideoSDK Configuration and Service with Complete Expo Go Isolation
import { Platform, View, Text } from 'react-native';
import React from 'react';

// VideoSDK modules will be loaded conditionally
let VideoSDK: any = null;

export const VIDEOSDK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiI4YzI3ZTFkMS0yNzE4LTQ4NWQtYWNlMy0wMmU5ZmY0ZjM3ZTAiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTc1OTgxMjY4MSwiZXhwIjoxOTE3NjAwNjgxfQ.c9TgjpfQNwDBbKbylBFkclv57qMTTY8OibfQCYtSWl4";

export const VIDEOSDK_CONFIG = {
  token: VIDEOSDK_TOKEN,
  name: 'Mobile Controller',
  micEnabled: false,
  webcamEnabled: true,
  participantCanToggleSelfWebcam: true,
  participantCanToggleSelfMic: true,
  joinScreenShareOnJoin: false,
  debugMode: __DEV__,
};

// Detect if we're running in Expo Go (which can't handle native modules)
function isExpoGo(): boolean {
  try {
    // @ts-ignore
    return typeof expo !== 'undefined' && expo?.modules?.ExpoGo;
  } catch {
    // Fallback detection methods
    try {
      // Check for Expo Go specific environment
      // @ts-ignore
      return global.__expo_module_map__ !== undefined;
    } catch {
      // Final fallback - assume Expo Go if we can't determine
      return true;
    }
  }
}

// VideoSDK service that completely avoids loading in Expo Go
class VideoSDKService {
  private sdk: any = null;
  private initialized = false;
  private available = false;
  private isExpoGo = isExpoGo();

  async initialize() {
    if (this.initialized) return this.available;

    // Try to load the real VideoSDK module. We prefer the real native SDK.
    // If it fails, initialization will throw so callers know to run a development build.

    // Add a small delay to allow environment to settle
    await new Promise(resolve => setTimeout(resolve, 300));

    // Try to import the native VideoSDK module. If this fails, it's likely
    // because the app is running in Expo Go or the native module isn't linked.
    try {
      if (!VideoSDK) {
        const videoSDKModule = await import('@videosdk.live/react-native-sdk');
        VideoSDK = videoSDKModule.default || videoSDKModule;
      }
      this.sdk = VideoSDK;
      this.available = true;
      console.log('✅ VideoSDK loaded successfully with full native functionality');
    } catch (error: any) {
      console.error('❌ Failed to load VideoSDK native module:', error?.message || error);
      this.available = false;
      this.initialized = true;
      // Throw a clear error so callers know real SDK is required for proper behavior
      throw new Error('VideoSDK native module not available. Use a development build (npx expo run:android) instead of Expo Go.');
    }

    this.initialized = true;
    return this.available;
  }

  isAvailable() {
    return this.available && !this.isExpoGo;
  }

  getSDK() {
    return this.isExpoGo ? null : this.sdk;
  }

  // Create mock components for Expo Go and fallback
  // No mock components by default — the app should use the real SDK.
  // If you need mock behavior for Expo Go, call `getMockComponents()` explicitly.
  getMockComponents() {
    return {
      MeetingProvider: ({ children }: any) => React.createElement(View, { style: { flex: 1 } }, children),
      useMeeting: () => ({
        join: () => console.log('Mock: Joining meeting'),
        leave: () => console.log('Mock: Leaving meeting'),
        toggleWebcam: () => console.log('Mock: Toggle webcam'),
        localWebcamOn: false,
        participants: new Map(),
        meetingId: 'mock-meeting-id',
      }),
      RTCView: ({ style }: any) => React.createElement(View, { style: [style, { backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center', borderRadius: 12 }] },
        React.createElement(Text, { style: { color: '#9ca3af', textAlign: 'center', fontSize: 16, fontWeight: '500' } }, '📱 VideoSDK Mock')),
    };
  }

  // Get VideoSDK token
  getToken() {
    return VIDEOSDK_TOKEN;
  }

  // Real VideoSDK methods for development builds
  async createMeeting() {
    if (!this.isAvailable()) return null;
    
    try {
      const response = await fetch('https://api.videosdk.live/v2/rooms', {
        method: 'POST',
        headers: {
          'Authorization': VIDEOSDK_TOKEN,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      return data.roomId;
    } catch (error) {
      console.error('Failed to create meeting:', error);
      return null;
    }
  }

  // Get VideoSDK components (real or mock)
  getComponents() {
    if (!this.available || !this.sdk) {
      throw new Error('VideoSDK not initialized. Call videoSDKService.initialize() and ensure native modules are available (development build).');
    }

    return {
      MeetingProvider: this.sdk.MeetingProvider,
      useMeeting: this.sdk.useMeeting,
      RTCView: this.sdk.RTCView,
      useParticipant: this.sdk.useParticipant,
    };
  }

  // Get runtime environment info
  getRuntimeInfo() {
    return {
      isExpoGo: this.isExpoGo,
      platform: Platform.OS,
      isAvailable: this.available,
      initialized: this.initialized,
    };
  }
}

export const videoSDKService = new VideoSDKService();

// Validation functions
export const isValidTokenFormat = (token: string): boolean => {
  try {
    const parts = token.split('.');
    return parts.length === 3;
  } catch {
    return false;
  }
};

export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch {
    return true;
  }
};

