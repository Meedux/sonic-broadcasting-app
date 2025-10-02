'use client';

import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import styles from './page.module.css';

export default function Home() {
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [mobileConnected, setMobileConnected] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [stream, setStream] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [peerConnection, setPeerConnection] = useState(null);
  const peerConnectionRef = useRef(null);

  useEffect(() => {
    peerConnectionRef.current = peerConnection;
  }, [peerConnection]);

  useEffect(() => {
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(newRoomId);

    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    const setupPeerConnection = async (socketConnection) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketConnection.emit('webrtc-ice-candidate', {
            roomId: newRoomId,
            candidate: event.candidate
          });
        }
      };

      setPeerConnection(pc);
      return pc;
    };

    newSocket.on('connect', () => {
      console.log('Connected to server');
      newSocket.emit('web-join', { roomId: newRoomId });
    });

    newSocket.on('mobile-connected', (data) => {
      console.log('Mobile connected:', data);
      setMobileConnected(true);
    });

    newSocket.on('connection-established', (data) => {
      console.log('Connection established:', data);
      setMobileConnected(true);
      
      // Set up WebRTC peer connection for screen sharing
      setupPeerConnection(newSocket);
    });

    newSocket.on('webrtc-answer', async (data) => {
      console.log('Received WebRTC answer:', data);
      if (peerConnectionRef.current && data.answer) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log('WebRTC answer set successfully');
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      }
    });

    newSocket.on('webrtc-ice-candidate', async (data) => {
      console.log('Received ICE candidate:', data);
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log('ICE candidate added successfully');
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    newSocket.on('peer-disconnected', () => {
      setMobileConnected(false);
    });

    newSocket.on('mobile-stream-started', (data) => {
      console.log('Mobile started livestream:', data);
      setIsStreaming(true);
      alert(`Mobile app started livestreaming to ${data.platform}!`);
    });

    newSocket.on('mobile-stream-stopped', (data) => {
      console.log('Mobile stopped livestream:', data);
      setIsStreaming(false);
      alert('Mobile app stopped the livestream');
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const startScreenShare = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      });
      
      setStream(mediaStream);
      setIsScreenSharing(true);

      if (socket) {
        // Set up peer connection if not already done
        let pc = peerConnectionRef.current;
        if (!pc) {
          pc = await setupPeerConnection(socket);
        }

        // Add stream to peer connection for WebRTC transmission
        mediaStream.getTracks().forEach(track => {
          pc.addTrack(track, mediaStream);
        });

        // Create and send offer to mobile
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        socket.emit('webrtc-offer', {
          roomId,
          offer: offer,
          target: 'mobile'
        });

        // Send screen share data for React Native compatibility
        const videoTrack = mediaStream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        
        socket.emit('screen-share-start', {
          roomId,
          streamData: { 
            active: true, 
            resolution: `${settings.width}x${settings.height}`,
            width: settings.width,
            height: settings.height
          }
        });

        // Send periodic frame data for React Native
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const video = document.createElement('video');
        video.srcObject = mediaStream;
        video.play();
        
        let frameIntervalActive = true;

        const sendFrameData = () => {
          if (frameIntervalActive && video.videoWidth > 0) {
            canvas.width = Math.min(video.videoWidth, 640); // Limit size for performance
            canvas.height = Math.min(video.videoHeight, 360);
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frameData = canvas.toDataURL('image/jpeg', 0.5); // Compressed
            
            socket.emit('screen-share-frame', {
              roomId,
              frameData,
              resolution: `${canvas.width}x${canvas.height}`
            });
          }
        };

        // Send frames every 500ms for React Native compatibility
        const frameInterval = setInterval(sendFrameData, 500);
        
        mediaStream.getVideoTracks()[0].addEventListener('ended', () => {
          frameIntervalActive = false;
          clearInterval(frameInterval);
        });
      }

      mediaStream.getVideoTracks()[0].addEventListener('ended', () => {
        setIsScreenSharing(false);
        setStream(null);
        if (peerConnection) {
          peerConnection.getSenders().forEach(sender => {
            peerConnection.removeTrack(sender);
          });
        }
      });
    } catch (error) {
      console.error('Error starting screen share:', error);
      alert('Failed to start screen sharing');
    }
  };

  const stopScreenShare = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsScreenSharing(false);
    }
  };

  const startLiveStream = () => {
    if (socket) {
      socket.emit('live-stream-control', { roomId, action: 'start' });
      setIsStreaming(true);
    }
  };

  const stopLiveStream = () => {
    if (socket) {
      socket.emit('live-stream-control', { roomId, action: 'stop' });
      setIsStreaming(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.titleBar}>
        <div className={styles.titleBarLeft}>
          <div className={styles.windowControls}>
            <span className={styles.windowControl} style={{backgroundColor: '#FF5F57'}}></span>
            <span className={styles.windowControl} style={{backgroundColor: '#FFBD2E'}}></span>
            <span className={styles.windowControl} style={{backgroundColor: '#28CA42'}}></span>
          </div>
          <h1 className={styles.appTitle}>
            <span className={styles.appIcon}>📡</span>
            Sonic Broadcaster Pro
          </h1>
        </div>
        <div className={styles.titleBarRight}>
          <div className={styles.connectionStatus}>
            <div className={`${styles.statusDot} ${mobileConnected ? styles.connected : styles.disconnected}`}></div>
            <span className={styles.statusText}>
              {mobileConnected ? 'Mobile Connected' : 'Waiting for Mobile'}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <h3 className={styles.sectionTitle}>🚀 Streaming Setup</h3>
            
            {/* Step 1: Mobile Connection */}
            <div className={styles.stepContainer}>
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber}>1</span>
                <span className={styles.stepTitle}>Pair Mobile Device</span>
                <div className={`${styles.stepStatus} ${mobileConnected ? styles.stepComplete : styles.stepPending}`}>
                  {mobileConnected ? '✓' : '○'}
                </div>
              </div>
              <div className={styles.roomInfo}>
                <label className={styles.label}>Room ID</label>
                <div className={styles.roomIdDisplay}>
                  <span className={styles.roomIdValue}>{roomId}</span>
                  <button 
                    className={styles.copyButton}
                    onClick={() => navigator.clipboard.writeText(roomId)}
                  >
                    📋
                  </button>
                </div>
                <p className={styles.helpText}>
                  {mobileConnected ? '📱 Mobile device connected!' : 'Enter this Room ID in your mobile app'}
                </p>
              </div>
            </div>

            {/* Step 2: Screen Share */}
            <div className={styles.stepContainer}>
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber}>2</span>
                <span className={styles.stepTitle}>Share Your Screen</span>
                <div className={`${styles.stepStatus} ${isScreenSharing ? styles.stepComplete : styles.stepPending}`}>
                  {isScreenSharing ? '✓' : '○'}
                </div>
              </div>
              <div className={styles.controlGroup}>
                {!isScreenSharing ? (
                  <button 
                    className={`${styles.primaryButton} ${!mobileConnected ? styles.disabled : ''}`}
                    onClick={startScreenShare}
                    disabled={!mobileConnected}
                  >
                    <span className={styles.buttonIcon}>🖥️</span>
                    Start Screen Share
                  </button>
                ) : (
                  <button 
                    className={styles.dangerButton}
                    onClick={stopScreenShare}
                  >
                    <span className={styles.buttonIcon}>⏹️</span>
                    Stop Screen Share
                  </button>
                )}
                <p className={styles.helpText}>
                  {!mobileConnected ? 'Connect mobile device first' : 
                   isScreenSharing ? '🖥️ Screen sharing active' : 'Share your screen to mobile'}
                </p>
              </div>
            </div>

            {/* Step 3: Go Live */}
            <div className={styles.stepContainer}>
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber}>3</span>
                <span className={styles.stepTitle}>Start Live Stream</span>
                <div className={`${styles.stepStatus} ${isStreaming ? styles.stepComplete : styles.stepPending}`}>
                  {isStreaming ? '✓' : '○'}
                </div>
              </div>
              <div className={styles.controlGroup}>
                {!isStreaming ? (
                  <button 
                    className={`${styles.liveButton} ${!mobileConnected || !isScreenSharing ? styles.disabled : ''}`}
                    onClick={startLiveStream}
                    disabled={!mobileConnected || !isScreenSharing}
                  >
                    <span className={styles.buttonIcon}>🔴</span>
                    Go Live
                  </button>
                ) : (
                  <button 
                    className={styles.dangerButton}
                    onClick={stopLiveStream}
                  >
                    <span className={styles.buttonIcon}>⏹️</span>
                    Stop Stream
                  </button>
                )}
                <p className={styles.helpText}>
                  {!mobileConnected ? 'Complete steps 1 & 2 first' : 
                   !isScreenSharing ? 'Start screen sharing first' : 
                   isStreaming ? '🔴 Live streaming active!' : 'Ready to go live!'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.previewArea}>
          <div className={styles.previewHeader}>
            <h2 className={styles.previewTitle}>Live Preview</h2>
            {isStreaming && (
              <div className={styles.liveIndicator}>
                <div className={styles.liveDot}></div>
                <span className={styles.liveText}>LIVE</span>
              </div>
            )}
          </div>
          
          <div className={styles.previewContainer}>
            {isScreenSharing && stream ? (
              <video 
                className={styles.previewVideo}
                ref={(video) => {
                  if (video && stream) {
                    video.srcObject = stream;
                  }
                }}
                autoPlay
                muted
              />
            ) : (
              <div className={styles.previewPlaceholder}>
                <div className={styles.placeholderIcon}>🖥️</div>
                <h3 className={styles.placeholderTitle}>No Screen Share Active</h3>
                <p className={styles.placeholderText}>
                  Click Start Screen Share to begin capturing your screen
                </p>
              </div>
            )}
            
            {mobileConnected && (
              <div className={styles.mobileOverlay}>
                <div className={styles.mobileIndicator}>
                  <span className={styles.mobileIcon}>📱</span>
                  <span className={styles.mobileText}>Mobile Connected</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={styles.statusItem}>
            Room: <strong>{roomId}</strong>
          </span>
          <span className={styles.statusItem}>
            Screen: <strong>{isScreenSharing ? 'Active' : 'Inactive'}</strong>
          </span>
          <span className={styles.statusItem}>
            Stream: <strong>{isStreaming ? 'Live' : 'Offline'}</strong>
          </span>
        </div>
        <div className={styles.statusRight}>
          <span className={styles.statusItem}>Sonic Broadcaster Pro v1.0</span>
        </div>
      </div>
    </div>
  );
}
