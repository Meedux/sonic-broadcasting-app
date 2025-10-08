'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MeetingProvider, useMeeting, useParticipant } from '@videosdk.live/react-sdk';
import { VIDEOSDK_CONFIG, isValidTokenFormat, isTokenExpired } from '../config/videosdk';
import { useElectronScreenShare } from '../hooks/useElectronScreenShare';

interface StreamingStudioProps {
  meetingId: string;
  onStreamingEnd: () => void;
}

// Sonic Live Streaming Studio Component
function StreamingStudio({ meetingId, onStreamingEnd }: StreamingStudioProps) {
  const [isLive, setIsLive] = useState(false);
  const [captureActive, setCaptureActive] = useState(false);
  const [mobileConnected, setMobileConnected] = useState(false);
  const [studioReady, setStudioReady] = useState(false);
  const [streamConfig, setStreamConfig] = useState({
    platform: 'youtube',
    url: '',
    key: '',
  });
  const connectionRef = useRef(false);

  const {
    join,
    leave,
    toggleScreenShare,
    startHls,
    stopHls,
    participants,
    presenterId,
    localScreenShareOn
  } = useMeeting({
    onMeetingJoined: () => {
      console.log('🎬 Streaming studio connected');
      setStudioReady(true);
    },
    onMeetingLeft: () => {
      console.log('🚪 Streaming studio disconnected');
      setStudioReady(false);
      try {
        onStreamingEnd();
      } catch (error) {
        console.warn('Error in onStreamingEnd callback:', error);
      }
    },
    onParticipantJoined: (participant: unknown) => {
      console.log('📱 Mobile controller connected:', (participant as { id: string }).id);
      setMobileConnected(true);
    },
    onParticipantLeft: (participant: unknown) => {
      console.log('📱 Mobile controller disconnected:', (participant as { id: string }).id);
      setMobileConnected(false);
    },
    onHlsStateChanged: (data: { status: string; [key: string]: unknown }) => {
      console.log('📡 Stream status changed:', data);
      setIsLive(data.status === 'HLS_STARTED');
    },
    onError: (error: Error | unknown) => {
      console.error('❌ Streaming Studio Error:', error);
      // Handle specific token errors
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 401) {
        alert('Authentication Error: Your streaming token is invalid or expired. Please refresh the application.');
      }
    },
  }) || {};

  // Electron screen sharing hook
  const { startScreenShare: startElectronScreenShare, stopScreenShare: stopElectronScreenShare, isScreenSharing: isElectronScreenSharing } = useElectronScreenShare();

  // Track desktop capture state using localScreenShareOn or Electron state
  useEffect(() => {
    setCaptureActive(localScreenShareOn || isElectronScreenSharing);
  }, [localScreenShareOn, isElectronScreenSharing]);

  // Auto-connect studio on component mount (only once)
  useEffect(() => {
    if (join && !connectionRef.current) {
      connectionRef.current = true;
      // Add 500ms timeout to allow VideoSDK to properly initialize
      setTimeout(() => {
        try {
          join();
          console.log('🔌 Connecting to streaming studio...');
        } catch (error) {
          console.error('❌ Error connecting to studio:', error);
        }
      }, 500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Handle cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Only try to leave if we actually connected to the studio
      if (studioReady && connectionRef.current) {
        // Add timeout to ensure leave is called after component is properly unmounted
        setTimeout(() => {
          try {
            if (leave && typeof leave === 'function') {
              leave();
            }
          } catch (error) {
            console.warn('Error during meeting leave:', error);
          }
        }, 100);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studioReady]); // Only depend on studioReady to ensure we have the latest state

  const handleToggleDesktopCapture = useCallback(async () => {
    try {
      console.log('🔄 Toggle desktop capture clicked', { 
        studioReady, 
        captureActive, 
        isElectronScreenSharing,
        mobileConnected,
        isElectron: typeof window !== 'undefined' && window.navigator.userAgent.includes('Electron')
      });
      
      if (!studioReady) {
        alert('⏳ Studio is still loading. Please wait a moment before capturing your desktop.');
        return;
      }

      if (!mobileConnected) {
        alert('📱 Please connect your mobile controller first before capturing your desktop.');
        return;
      }
      
      // Check if we're in Electron environment and use our custom hook
      if (typeof window !== 'undefined' && window.navigator.userAgent.includes('Electron')) {
        console.log('🖥️ Electron environment detected, using custom screen share...');
        
        if (isElectronScreenSharing) {
          console.log('🛑 Stopping Electron screen sharing...');
          await stopElectronScreenShare();
          console.log('✅ Stopped Electron screen sharing');
        } else {
          console.log('📺 Starting Electron screen sharing...');
          const stream = await startElectronScreenShare();
          console.log('✅ Started Electron screen sharing:', stream);
        }
        return;
      }
      
      // Fallback to VideoSDK's screen sharing for browser environment
      if (toggleScreenShare && typeof toggleScreenShare === 'function') {
        console.log('🌐 Using VideoSDK screen sharing...');
        toggleScreenShare();
      } else {
        console.error('toggleScreenShare function not available - meeting might not be properly initialized');
        alert('Screen sharing is not available. Please check your VideoSDK token and meeting connection.');
      }
    } catch (error) {
      console.error('❌ Error toggling screen share:', error);
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 3013) {
          alert('Screen sharing failed: Your browser/device does not support screen sharing. Trying Electron fallback...');
          // Try Electron fallback even if VideoSDK fails
          try {
            console.log('🔄 Trying Electron fallback for error 3013...');
            if (isElectronScreenSharing) {
              await stopElectronScreenShare();
            } else {
              await startElectronScreenShare();
            }
          } catch (electronError) {
            console.error('❌ Electron screen share fallback also failed:', electronError);
            alert('All screen sharing methods failed. Please check Electron permissions.');
          }
        } else {
          const errorMessage = 'message' in error ? String(error.message) : 'Unknown error';
          alert(`Screen sharing failed: ${errorMessage}`);
        }
      } else if (error && typeof error === 'string' && error.includes('canProduce')) {
        alert('Screen sharing failed: Meeting connection issue. Please check your VideoSDK token.');
      } else {
        alert('Screen sharing failed. Please try again.');
      }
    }
  }, [toggleScreenShare, studioReady, isElectronScreenSharing, startElectronScreenShare, stopElectronScreenShare, captureActive, mobileConnected]);

  const handleStartBroadcast = useCallback(() => {
    try {
      if (!captureActive || !mobileConnected) {
        alert('🚨 Cannot start broadcast: Desktop capture and mobile controller must both be connected.');
        return;
      }

      if (!streamConfig.url || !streamConfig.key) {
        alert('📡 Please configure stream URL and key first');
        return;
      }

      if (!startHls || typeof startHls !== 'function') {
        console.error('startHls function not available');
        return;
      }

      const hlsConfig = {
        layout: {
          type: 'GRID' as const,
          priority: 'SPEAKER' as const,
          gridSize: 2,
        },
        orientation: 'landscape' as const,
        theme: 'DARK' as const,
        quality: 'high' as const,
        mode: 'video-and-audio' as const,
      };

      startHls(hlsConfig);
    } catch (error) {
      console.error('❌ Error starting broadcast:', error);
    }
  }, [streamConfig, startHls, captureActive, mobileConnected]);

  const handleStopBroadcast = useCallback(() => {
    try {
      if (stopHls && typeof stopHls === 'function') {
        stopHls();
      }
    } catch (error) {
      console.error('❌ Error stopping broadcast:', error);
    }
  }, [stopHls]);

  // Get platform-specific RTMP URLs
  const getStreamUrl = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return 'rtmp://a.rtmp.youtube.com/live2/';
      case 'facebook':
        return 'rtmps://live-api-s.facebook.com:443/rtmp/';
      case 'twitch':
        return 'rtmp://live.twitch.tv/live/';
      default:
        return '';
    }
  };

  useEffect(() => {
    setStreamConfig(prev => ({ ...prev, url: getStreamUrl(prev.platform) }));
  }, [streamConfig.platform]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-black border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">
                SL
              </div>
              <h1 className="text-xl font-bold text-white">Sonic Live Studio</h1>
            </div>
            <div className="flex items-center space-x-2 bg-gray-800 px-3 py-1.5 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
              <span className={`text-sm font-semibold ${isLive ? 'text-red-400' : 'text-gray-400'}`}>
                {isLive ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${studioReady ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'}`}>
              {studioReady ? '✅ Studio Ready' : '⏳ Loading Studio...'}
            </div>
            <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${mobileConnected ? 'bg-blue-900 text-blue-300' : 'bg-gray-800 text-gray-400'}`}>
              {mobileConnected ? '📱 Mobile Connected' : '📱 Mobile Disconnected'}
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Main Video Area */}
          <div className="xl:col-span-3 space-y-6">
            {/* Screen Share Area */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="flex justify-between items-center p-4 bg-gray-700 border-b border-gray-600">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-white">Desktop Capture</h3>
                  <span className="text-xs text-gray-400 bg-gray-600 px-2 py-1 rounded">Primary Source</span>
                </div>
                <button
                  onClick={handleToggleDesktopCapture}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    captureActive 
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
                  }`}
                >
                  {captureActive ? '🛑 Stop Capture' : '📺 Start Capture'}
                </button>
              </div>
              <div className="bg-black rounded-b-xl aspect-video flex items-center justify-center relative">
                {captureActive ? (
                  <DesktopCaptureView participantId={presenterId || 'local'} />
                ) : (
                  <div className="text-gray-400 text-center p-8">
                    <div className="text-6xl mb-4 opacity-50">🖥️</div>
                    <h4 className="text-xl font-semibold mb-2 text-white">Desktop Capture Inactive</h4>
                    <p className="text-gray-400 mb-4">Click &quot;Start Capture&quot; to begin recording your desktop</p>
                    <div className="text-sm text-gray-500">
                      {!mobileConnected 
                        ? "📱 Connect your mobile controller first" 
                        : "Your desktop will be the primary video source"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Camera Feed Area */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="flex justify-between items-center p-4 bg-gray-700 border-b border-gray-600">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${mobileConnected ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  <h3 className="text-lg font-semibold text-white">Mobile Controller</h3>
                  <span className="text-xs text-gray-400 bg-gray-600 px-2 py-1 rounded">Camera Feed</span>
                </div>
              </div>
              <div className="bg-black rounded-b-xl aspect-video w-full max-w-md flex items-center justify-center">
                {mobileConnected ? (
                  <MobileCameraView participants={participants} />
                ) : (
                  <div className="text-gray-400 text-center p-8">
                    <div className="text-5xl mb-4 opacity-50">📱</div>
                    <h4 className="text-lg font-semibold mb-2 text-white">Mobile Camera Disconnected</h4>
                    <p className="text-gray-400 text-sm">Waiting for mobile device to connect</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="xl:col-span-2 space-y-6">
            {/* Connection Status Panel */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-red-700 p-4">
                <h3 className="font-bold text-white text-lg">System Status</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Pairing ID</div>
                    <div className="font-mono text-sm text-white bg-gray-800 px-2 py-1 rounded">
                      {meetingId.slice(-8)}
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Connected</div>
                    <div className="text-lg font-bold text-white">{participants.size + 1}</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Desktop Capture</span>
                    <span className={`text-sm font-semibold px-2 py-1 rounded ${
                      captureActive ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                    }`}>
                      {captureActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Mobile Controller</span>
                    <span className={`text-sm font-semibold px-2 py-1 rounded ${
                      mobileConnected ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                    }`}>
                      {mobileConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Broadcast Status</span>
                    <span className={`text-sm font-semibold px-2 py-1 rounded ${
                      isLive ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-600 text-gray-300'
                    }`}>
                      {isLive ? 'BROADCASTING' : 'OFFLINE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stream Configuration Panel */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-red-700 p-4">
                <h3 className="font-bold text-white text-lg">Stream Configuration</h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Platform</label>
                  <select
                    value={streamConfig.platform}
                    onChange={(e) => setStreamConfig(prev => ({ ...prev, platform: e.target.value }))}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="youtube">YouTube Live</option>
                    <option value="facebook">Facebook Live</option>
                    <option value="twitch">Twitch</option>
                    <option value="custom">Custom RTMP</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Stream URL</label>
                  <input
                    type="text"
                    value={streamConfig.url}
                    onChange={(e) => setStreamConfig(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="rtmp://live.platform.com/live"
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 placeholder-gray-400"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Stream Key</label>
                  <input
                    type="password"
                    value={streamConfig.key}
                    onChange={(e) => setStreamConfig(prev => ({ ...prev, key: e.target.value }))}
                    placeholder="Enter your stream key"
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Stream Controls Panel */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-red-700 p-4">
                <h3 className="font-bold text-white text-lg">Broadcasting Controls</h3>
              </div>
              <div className="p-4 space-y-4">
                <button
                  onClick={isLive ? handleStopBroadcast : handleStartBroadcast}
                  disabled={!captureActive || !mobileConnected}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg ${
                    isLive
                      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white transform hover:scale-105'
                      : !captureActive || !mobileConnected
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white transform hover:scale-105'
                  }`}
                >
                  {isLive ? '🔴 STOP BROADCAST' : '▶️ START BROADCAST'}
                </button>
                
                {(!captureActive || !mobileConnected) && (
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-xs text-yellow-400 font-semibold mb-1">REQUIREMENTS</div>
                    <div className="text-xs text-gray-300">
                      {!captureActive && !mobileConnected ? 
                        '• Enable desktop capture and connect mobile controller' :
                        !captureActive ? '• Enable desktop capture to continue' :
                        '• Connect mobile controller to continue'
                      }
                    </div>
                  </div>
                )}

                {/* Live Indicator */}
                {isLive && (
                  <div className="bg-red-600 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
                      <span className="text-lg font-bold text-white tracking-wide">LIVE ON AIR</span>
                      <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-600 to-gray-700 p-4">
                <h3 className="font-bold text-white text-lg">Quick Actions</h3>
              </div>
              <div className="p-4 space-y-3">
                <button
                  onClick={() => navigator.clipboard.writeText(meetingId)}
                  className="w-full py-3 px-4 text-sm bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white transition-colors"
                >
                  📋 Copy Meeting ID
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-3 px-4 text-sm bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white transition-colors"
                >
                  🔄 Restart Session
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Desktop Capture Video Component
function DesktopCaptureView({ participantId }: { participantId: string }) {
  const { screenShareStream, screenShareOn } = useParticipant(participantId);
  const { screenStream: electronScreenStream, isScreenSharing: isElectronScreenSharing } = useElectronScreenShare();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      // Prioritize Electron screen stream if available, then VideoSDK stream
      const activeStream = electronScreenStream || screenShareStream;
      const isActive = isElectronScreenSharing || (screenShareOn && screenShareStream);
      
      if (activeStream && isActive) {
        if (electronScreenStream) {
          // Direct assignment for Electron stream
          videoRef.current.srcObject = electronScreenStream;
          console.log('Using Electron screen stream for preview');
        } else if (screenShareStream && screenShareStream.track) {
          // VideoSDK stream handling
          const mediaStream = new MediaStream();
          mediaStream.addTrack(screenShareStream.track);
          videoRef.current.srcObject = mediaStream;
          console.log('Using VideoSDK screen stream for preview');
        }
      } else {
        // Clear video if no active stream
        videoRef.current.srcObject = null;
      }
    }
  }, [screenShareStream, screenShareOn, electronScreenStream, isElectronScreenSharing]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      className="w-full h-full object-contain rounded-lg"
      style={{ transform: 'scaleX(-1)' }}
    />
  );
}

// Mobile Camera Video Component
function MobileCameraView({ participants }: { participants: Map<string, unknown> }) {
  const mobileParticipant = Array.from(participants.values()).find(p => 
    p && typeof p === 'object' && 'displayName' in p && 
    typeof (p as { displayName?: string }).displayName === 'string' && 
    (p as { displayName: string }).displayName.includes('Mobile')
  ) as { id: string; displayName: string } | undefined;
  
  if (!mobileParticipant) {
    return (
      <div className="text-gray-400 text-center">
        <div className="text-2xl mb-2">�</div>
        <p>No mobile controller detected</p>
        <p className="text-xs text-gray-500 mt-1">Connect your mobile app first</p>
      </div>
    );
  }

  return <ParticipantVideoView participantId={mobileParticipant.id} />;
}

// Participant Video Component
function ParticipantVideoView({ participantId }: { participantId: string }) {
  const { webcamStream, webcamOn } = useParticipant(participantId);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && webcamStream && webcamOn) {
      const mediaStream = new MediaStream();
      if (webcamStream.track) {
        mediaStream.addTrack(webcamStream.track);
      }
      videoRef.current.srcObject = mediaStream;
    }
  }, [webcamStream, webcamOn]);

  return webcamOn ? (
    <video
      ref={videoRef}
      autoPlay
      muted
      className="w-full h-full object-cover rounded-lg"
    />
  ) : (
    <div className="text-gray-400 text-center">
      <div className="text-2xl mb-2">📷</div>
      <p>Camera is off</p>
    </div>
  );
}

// Main wrapper component that provides the meeting context
export default function StreamingStudioWrapper({ meetingId, onStreamingEnd }: StreamingStudioProps) {
  const [error, setError] = useState<string | null>(null);

  // Validate token and meeting ID
  useEffect(() => {
    if (!VIDEOSDK_CONFIG.token) {
      setError('VideoSDK token is missing');
      return;
    }
    
    if (!isValidTokenFormat(VIDEOSDK_CONFIG.token)) {
      setError('VideoSDK token format is invalid');
      return;
    }
    
    if (isTokenExpired(VIDEOSDK_CONFIG.token)) {
      setError('VideoSDK token has expired');
      return;
    }
    
    if (!meetingId) {
      setError('Meeting ID is missing');
      return;
    }
    setError(null);
  }, [meetingId]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center p-8 bg-gray-800 rounded-xl border border-gray-700 max-w-2xl">
          <div className="text-6xl mb-6 opacity-50">⚠️</div>
          <h2 className="text-2xl font-bold text-red-400 mb-4">VideoSDK Configuration Error</h2>
          <p className="text-gray-300 text-lg mb-6">{error}</p>
          
          {error.includes('token') && (
            <div className="bg-gray-700 rounded-lg p-6 text-left mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">How to Get a Valid VideoSDK Token:</h3>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-start space-x-3">
                  <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                  <div>
                    <strong className="text-white">Sign up at VideoSDK:</strong>
                    <br />Visit <a href="https://videosdk.live" className="text-red-400 hover:text-red-300" target="_blank" rel="noopener noreferrer">https://videosdk.live</a> and create a free account
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                  <div>
                    <strong className="text-white">Get API Key:</strong>
                    <br />Go to Dashboard → API Keys → Copy your API Key
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                  <div>
                    <strong className="text-white">Generate Token:</strong>
                    <br />Use Dashboard → Generate Token with permissions: allow_join, allow_mod
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
                  <div>
                    <strong className="text-white">Update Code:</strong>
                    <br />Replace the VIDEOSDK_TOKEN constant with your new token
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex space-x-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
            >
              Retry Connection
            </button>
            <a
              href="https://videosdk.live"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-semibold transition-colors"
            >
              Get VideoSDK Token
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MeetingProvider
      config={{
        meetingId,
        micEnabled: true,
        webcamEnabled: false, // Desktop doesn't need webcam
        name: 'Desktop Host',
        mode: 'SEND_AND_RECV',
        debugMode: false,
      }}
      token={VIDEOSDK_CONFIG.token}
    >
      <StreamingStudio meetingId={meetingId} onStreamingEnd={onStreamingEnd} />
    </MeetingProvider>
  );
}
