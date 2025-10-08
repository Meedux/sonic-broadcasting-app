'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { VIDEOSDK_CONFIG, createVideoSDKMeeting, isValidTokenFormat, isTokenExpired } from '../config/videosdk';

// Dynamically import the streaming studio wrapper to avoid SSR issues
const StreamingStudioWrapper = dynamic(
  () => import('../components/StreamingStudio'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold">Loading Streaming Studio...</h2>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState<string>('');
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create meeting through VideoSDK API
  const createMeeting = useCallback(async () => {
    try {
      setIsCreatingMeeting(true);
      setError(null);

      // Validate token first
      if (!isValidTokenFormat(VIDEOSDK_CONFIG.token)) {
        throw new Error('Invalid VideoSDK token format. Please update the token in src/config/videosdk.ts');
      }

      if (isTokenExpired(VIDEOSDK_CONFIG.token)) {
        throw new Error('VideoSDK token has expired. Please generate a new token from videosdk.live dashboard');
      }

      const data = await createVideoSDKMeeting(VIDEOSDK_CONFIG.token);
      setMeetingId(data.roomId);
      console.log('Created meeting with ID:', data.roomId);
      
      // Set pair code to the actual meeting ID
      setPairCode(data.roomId);
      
    } catch (error) {
      console.error('Error creating meeting:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsCreatingMeeting(false);
    }
  }, []);

  // Generate pair code and create meeting
  useEffect(() => {
    // Create meeting through VideoSDK API first
    createMeeting();
    // Note: pairCode will be set to meetingId after meeting creation
  }, [createMeeting]);

  // Set pair code to meeting ID once meeting is created
  useEffect(() => {
    if (meetingId) {
      setPairCode(meetingId);
    }
  }, [meetingId]);

  const handleStreamingEnd = () => {
    console.log('🔴 Streaming ended, cleaning up...');
    setMeetingId(null);
    setPairCode(''); // Clear pair code (which is now the meeting ID)
  };

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4 opacity-50">⚠️</div>
          <h2 className="text-2xl font-bold text-red-400 mb-4">Studio Connection Failed</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null);
              createMeeting();
            }}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
          >
            Reconnect Studio
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (!meetingId || isCreatingMeeting) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold">
            {isCreatingMeeting ? 'Initializing Studio...' : 'Starting Streaming Studio...'}
          </h2>
          <p className="text-gray-400 mt-2">Setting up your broadcast environment</p>
          {pairCode && (
            <div className="mt-4 p-4 bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Meeting ID (for mobile pairing):</p>
              <p className="text-lg font-mono font-bold text-red-400">{pairCode}</p>
              <p className="text-xs text-gray-500 mt-1">Share this ID with your mobile device</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <StreamingStudioWrapper meetingId={meetingId} onStreamingEnd={handleStreamingEnd} />
  );
}
