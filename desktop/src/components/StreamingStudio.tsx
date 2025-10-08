'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MeetingProvider, useMeeting, useParticipant, usePubSub } from '@videosdk.live/react-sdk';
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

  // Subscribe to CONTROL pubsub channel to receive commands from mobile controller
  // ...control pubsub listener moved below broadcast handlers to avoid hook ordering issues

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

  // CONTROL pubsub polling: read messages array periodically and handle commands
  const controlPubsub = usePubSub('CONTROL', {});

  useEffect(() => {
    let lastIndex = 0;
    const id = setInterval(async () => {
      try {
        const msgs = controlPubsub?.messages || [];
        while (lastIndex < msgs.length) {
          const m = msgs[lastIndex];
          lastIndex++;
          try {
            const raw = m?.message || m?.payload || m;
            const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const action = (payload?.action || payload?.type || '').toString().toUpperCase();
            const data = payload?.payload || {};
            console.log('📨 CONTROL (poll) received:', action, data);
            switch (action) {
              case 'START':
                if (data?.rmtp || data?.rtmp || data?.rmtpUrl) {
                  const url = data.rmtp || data.rtmp || data.rmtpUrl;
                  setStreamConfig((prev) => ({ ...prev, url: url, key: data.key || prev.key }));
                }
                handleStartBroadcast();
                break;
              case 'STOP':
                handleStopBroadcast();
                break;
              case 'PAUSE':
                handleStopBroadcast();
                break;
              case 'START_CAPTURE':
              case 'STOP_CAPTURE':
                await handleToggleDesktopCapture();
                break;
              default:
                console.log('Unknown CONTROL action (poll):', action);
            }
          } catch (e) {
            console.error('CONTROL message handling error:', e);
          }
        }
      } catch (e) {
        console.error('CONTROL poll error', e);
      }
    }, 600);
    return () => clearInterval(id);
  }, [controlPubsub, handleStartBroadcast, handleStopBroadcast, handleToggleDesktopCapture]);

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
    <div className="app-window">
      <div className="topbar">
        <div className="brand">
          <div style={{width:36, height:36, borderRadius:8, background:'#E11D48', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700}}>SL</div>
          <div style={{fontSize:16, fontWeight:700}}>Sonic Live Studio</div>
        </div>
        <div style={{display:'flex', gap:12, alignItems:'center'}}>
          <div className="status-pill">{studioReady ? 'Studio Ready' : 'Loading Studio...'}</div>
          <div className="status-pill">{mobileConnected ? 'Mobile Connected' : 'Mobile Disconnected'}</div>
        </div>
      </div>

      <div className="sidebar-main">
        <aside className="left-sidebar">
          <h4 style={{marginBottom:12}}>Navigation</h4>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            <button className="control-button">Dashboard</button>
            <button className="control-button">Streams</button>
            <button className="control-button">Settings</button>
          </div>
        </aside>

        <main className="main-content">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{fontSize:18, fontWeight:700}}>Stream Preview</div>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <div style={{width:10, height:10, borderRadius:6, background:isLive ? '#E11D48' : '#444'}} />
              <div style={{color:'#bbb'}}>{isLive ? 'LIVE' : 'OFFLINE'}</div>
            </div>
          </div>

          <div className="preview-area">
            <div className="preview-box">
              {mobileConnected ? <MobileCameraView participants={participants} /> : <div>Mobile Camera disconnected</div>}
            </div>
            <div className="preview-box">
              {captureActive ? <DesktopCaptureView participantId={presenterId || 'local'} /> : <div>Desktop Capture inactive</div>}
            </div>
          </div>
        </main>

        <aside className="right-panel">
          <h4>System Status</h4>
          <div style={{marginTop:12}}>
            <div style={{marginBottom:8}}>Meeting ID</div>
            <div style={{fontFamily:'monospace', background:'#070707', padding:8, borderRadius:6}}>{meetingId}</div>
          </div>

          <div style={{marginTop:18}}>
            <button className="control-button" onClick={isLive ? handleStopBroadcast : handleStartBroadcast}>{isLive ? 'Stop Broadcast' : 'Start Broadcast'}</button>
          </div>

          <div style={{marginTop:12}}>
            <button style={{width:'100%', padding:8, borderRadius:8, background:'#222', color:'#fff'}} onClick={() => navigator.clipboard.writeText(meetingId)}>Copy Meeting ID</button>
          </div>
        </aside>
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
