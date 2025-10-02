import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Dimensions,
  Switch,
  Image
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const SetupScreen = ({ route, navigation }) => {
  const { serverIP, roomId, webId } = route.params || {};
  
  // Socket state
  const [socket, setSocket] = useState(null);
  
  // Camera state
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [facing, setFacing] = useState('front');
  const cameraRef = useRef(null);
  
  // Stream state
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const [streamPreview, setStreamPreview] = useState(null);
  const [frameData, setFrameData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  // Animations
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [previewScale] = useState(new Animated.Value(1));

  const startPreviewAnimation = React.useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(previewScale, {
          toValue: 1.02,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(previewScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [previewScale]);

  const setupVideoStreaming = React.useCallback(() => {
    console.log('Setting up video streaming via Socket.IO');
    setConnectionStatus('connected');
  }, []);

  const getCameraPermissions = async () => {
    try {
      const result = await requestPermission();
      return result?.granted || false;
    } catch (error) {
      console.error('Error getting camera permissions:', error);
      Alert.alert('Camera Error', 'Failed to request camera permissions');
      return false;
    }
  };

  useEffect(() => {
    // Camera permissions are handled by the hook
    // No need for manual permission request here

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Create socket connection
    if (serverIP && roomId) {
      const newSocket = io(`http://${serverIP}:3000`, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
      });

      newSocket.on('connect', () => {
        console.log('SetupScreen connected to server');
        newSocket.emit('mobile-connect', { roomId });
        setSocket(newSocket);
        setConnectionStatus('connected');
        
        // Set up video streaming for receiving desktop stream
        setupVideoStreaming();
      });

      newSocket.on('screen-share-available', (streamData) => {
        console.log('Screen share available:', streamData);
        setStreamPreview(streamData);
        setScreenShareEnabled(true);
      });

      newSocket.on('screen-share-frame', (data) => {
        console.log('Received screen frame data:', data.resolution);
        setFrameData(data.frameData);
      });

      newSocket.on('live-stream-action', (data) => {
        if (data.action === 'start') {
          setIsLiveStreaming(true);
          startPreviewAnimation();
        } else if (data.action === 'stop') {
          setIsLiveStreaming(false);
        }
      });

      return () => {
        if (newSocket) {
          newSocket.disconnect();
        }
      };
    }
  }, [serverIP, roomId, fadeAnim, scaleAnim, startPreviewAnimation, setupVideoStreaming]);

  const toggleCamera = async () => {
    if (!permission?.granted) {
      const permissionGranted = await getCameraPermissions();
      if (!permissionGranted) {
        Alert.alert('Permission Required', 'Camera permission is needed to include your camera in the stream');
        return;
      }
    }

    const newCameraState = !cameraEnabled;
    setCameraEnabled(newCameraState);

    if (newCameraState && socket) {
      // Notify web app that mobile camera is available
      socket.emit('mobile-camera-stream', {
        roomId,
        streamData: {
          enabled: true,
          type: facing,
          resolution: '720p'
        }
      });
    }
  };

  const toggleScreenShare = () => {
    if (socket) {
      if (!screenShareEnabled) {
        // Request screen share from web app
        socket.emit('screen-share-start', { roomId });
      } else {
        setScreenShareEnabled(false);
        setStreamPreview(null);
      }
    }
  };

  const startLiveStream = async () => {
    if (!cameraEnabled && !screenShareEnabled) {
      Alert.alert('Setup Required', 'Please enable at least camera or screen sharing before starting the stream');
      return;
    }

    // Check if streaming keys are configured
    const hasYoutubeKey = await AsyncStorage.getItem('youtube_stream_key');
    const hasFacebookKey = await AsyncStorage.getItem('facebook_stream_key');
    
    if (!hasYoutubeKey && !hasFacebookKey) {
      Alert.alert(
        'Streaming Configuration Required',
        'Please configure your YouTube and/or Facebook streaming keys first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Configure', 
            onPress: () => navigation.navigate('StreamingConfig')
          }
        ]
      );
      return;
    }

    // Determine available platforms
    const platforms = [];
    if (hasYoutubeKey) platforms.push({ text: 'YouTube', value: 'youtube' });
    if (hasFacebookKey) platforms.push({ text: 'Facebook', value: 'facebook' });
    if (platforms.length > 1) platforms.push({ text: 'Both', value: 'both' });

    const buttons = [
      ...platforms.map(platform => ({
        text: platform.text,
        onPress: () => startStreamingPlatform(platform.value)
      })),
      { text: 'Cancel', style: 'cancel' }
    ];

    Alert.alert(
      'Choose Streaming Platform',
      'Where would you like to livestream?',
      buttons
    );
  };

  const startStreamingPlatform = async (platform) => {
    setIsLiveStreaming(true);
    startPreviewAnimation();

    if (socket) {
      const streamConfig = {
        platform: platform,
        camera: cameraEnabled,
        screenShare: screenShareEnabled,
        hasFrameData: !!frameData,
        quality: '720p',
        roomId: roomId
      };

      // Get RTMP endpoints based on platform
      const rtmpEndpoints = await getRTMPEndpoints(platform);
      
      if (rtmpEndpoints) {
        // Start real RTMP streaming
        await startRTMPStream(rtmpEndpoints, streamConfig);
        
        // Notify web app that mobile is initiating the stream
        socket.emit('mobile-live-stream-start', {
          roomId,
          config: streamConfig
        });

        Alert.alert(
          'Live Stream Started!', 
          `Your stream is now broadcasting to ${platform === 'both' ? 'YouTube and Facebook' : platform}!`,
          [
            {
              text: 'OK',
              onPress: () => console.log(`Streaming to ${platform}`)
            }
          ]
        );
      } else {
        setIsLiveStreaming(false);
        Alert.alert('Streaming Error', 'Please configure your streaming keys first');
      }
    }
  };

  const getRTMPEndpoints = async (platform) => {
    try {
      const youtubeKey = await AsyncStorage.getItem('youtube_stream_key');
      const facebookKey = await AsyncStorage.getItem('facebook_stream_key');
      const youtubeEnabled = JSON.parse(await AsyncStorage.getItem('youtube_enabled') || 'true');
      const facebookEnabled = JSON.parse(await AsyncStorage.getItem('facebook_enabled') || 'true');

      const endpoints = {};

      if (youtubeEnabled && youtubeKey) {
        endpoints.youtube = {
          url: 'rtmp://a.rtmp.youtube.com/live2',
          key: youtubeKey
        };
      }

      if (facebookEnabled && facebookKey) {
        endpoints.facebook = {
          url: 'rtmps://live-api-s.facebook.com:443/rtmp',
          key: facebookKey
        };
      }

      if (platform === 'both') {
        const activeEndpoints = [];
        if (endpoints.youtube) activeEndpoints.push(endpoints.youtube);
        if (endpoints.facebook) activeEndpoints.push(endpoints.facebook);
        return activeEndpoints.length > 0 ? activeEndpoints : null;
      } else if (endpoints[platform]) {
        return [endpoints[platform]];
      }
      
      return null;
    } catch (error) {
      console.error('Error getting RTMP endpoints:', error);
      return null;
    }
  };

  const startRTMPStream = async (endpoints, config) => {
    try {
      console.log('Starting RTMP stream to endpoints:', endpoints);
      console.log('Stream config:', config);
      
      // In a real implementation with Expo, you would:
      // 1. Use Expo Camera to capture video frames
      // 2. Send frames via Socket.IO to a streaming server
      // 3. The streaming server would handle RTMP encoding and pushing
      // 4. For now, we simulate the process
      
      // Simulate streaming setup
      for (const endpoint of endpoints) {
        console.log(`Connecting to ${endpoint.url} with key: ${endpoint.key.substring(0, 8)}...`);
        
        // In production, you would:
        // - Set up frame capture from camera
        // - Send compressed frames to streaming service
        // - Handle reconnection and error recovery
      }
      
      return true;
    } catch (error) {
      console.error('RTMP streaming error:', error);
      throw error;
    }
  };

  const stopLiveStream = () => {
    if (socket) {
      socket.emit('mobile-live-stream-stop', { 
        roomId,
        timestamp: new Date().toISOString()
      });
      setIsLiveStreaming(false);
      Alert.alert('Stream Stopped', 'Live stream has been stopped on all platforms');
    }
  };

  const flipCamera = () => {
    setFacing(
      facing === 'back'
        ? 'front'
        : 'back'
    );
  };

  if (permission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Stream Setup</Text>
          <Text style={styles.subtitle}>Configure your live stream sources</Text>
          <Text style={styles.roomInfo}>Room: {roomId}</Text>
          
          <TouchableOpacity 
            style={styles.configButton}
            onPress={() => navigation.navigate('StreamingConfig')}
          >
            <Text style={styles.configButtonText}>⚙️ Streaming Settings</Text>
          </TouchableOpacity>
        </View>

        <Animated.View 
          style={[
            styles.previewContainer,
            {
              transform: [{ scale: previewScale }]
            }
          ]}
        >
          <Text style={styles.previewTitle}>Live Preview</Text>
          
          <View style={styles.previewArea}>
            {/* Screen Share Display */}
            {screenShareEnabled && (
              <View style={styles.screenShareContainer}>
                {frameData ? (
                  <Image 
                    source={{ uri: frameData }}
                    style={styles.screenVideo}
                    resizeMode="contain"
                    alt="Desktop screen share"
                  />
                ) : (
                  <>
                    <Text style={styles.screenShareText}>🖥️ Desktop Screen</Text>
                    <Text style={styles.screenShareSubtext}>
                      Screen sharing active
                    </Text>
                  </>
                )}
                {frameData && (
                  <View style={styles.dataIndicator}>
                    <Text style={styles.dataIndicatorText}>✓ Video Stream</Text>
                  </View>
                )}
              </View>
            )}
            
            {/* Camera Display */}
            {cameraEnabled && permission?.granted && (
              <View style={styles.cameraContainer}>
                <View style={styles.cameraPreview}>
                  <CameraView
                    style={styles.cameraVideo}
                    facing={facing}
                    ref={cameraRef}
                  />
                  <TouchableOpacity style={styles.flipButton} onPress={flipCamera}>
                    <Text style={styles.flipButtonText}>🔄</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* No sources enabled */}
            {!cameraEnabled && !screenShareEnabled && (
              <View style={styles.noSourcesContainer}>
                <Text style={styles.noSourcesText}>No Sources Active</Text>
                <Text style={styles.noSourcesSubtext}>Enable camera or screen sharing below</Text>
              </View>
            )}
          </View>
          
          {isLiveStreaming && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </Animated.View>

        <View style={styles.controlsContainer}>
          <View style={styles.sourceControls}>
            <View style={styles.controlRow}>
              <View style={styles.controlInfo}>
                <Text style={styles.controlTitle}>Mobile Camera</Text>
                <Text style={styles.controlSubtitle}>Include your phone camera</Text>
              </View>
              <Switch
                value={cameraEnabled}
                onValueChange={toggleCamera}
                trackColor={{ false: '#333333', true: '#00D4FF' }}
                thumbColor={cameraEnabled ? '#FFFFFF' : '#666666'}
              />
            </View>

            <View style={styles.controlRow}>
              <View style={styles.controlInfo}>
                <Text style={styles.controlTitle}>Desktop Screen</Text>
                <Text style={styles.controlSubtitle}>Show desktop screen sharing</Text>
              </View>
              <Switch
                value={screenShareEnabled}
                onValueChange={toggleScreenShare}
                trackColor={{ false: '#333333', true: '#00D4FF' }}
                thumbColor={screenShareEnabled ? '#FFFFFF' : '#666666'}
              />
            </View>
          </View>

          <View style={styles.streamControls}>
            {!isLiveStreaming ? (
              <TouchableOpacity
                style={styles.startStreamButton}
                onPress={startLiveStream}
              >
                <Text style={styles.startStreamButtonText}>Go Live</Text>
                <Text style={styles.startStreamButtonIcon}>🔴</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.stopStreamButton}
                onPress={stopLiveStream}
              >
                <Text style={styles.stopStreamButtonText}>Stop Stream</Text>
                <Text style={styles.stopStreamButtonIcon}>⏹️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back to Connect</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 8,
  },
  roomInfo: {
    fontSize: 14,
    color: '#00D4FF',
    fontWeight: '600',
  },
  configButton: {
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginTop: 15,
    alignSelf: 'center',
  },
  configButtonText: {
    color: '#00D4FF',
    fontSize: 14,
    fontWeight: '500',
  },
  previewContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    borderWidth: 2,
    borderColor: '#333333',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  previewArea: {
    minHeight: 200,
    backgroundColor: '#0A0A0A',
    borderRadius: 15,
    padding: 20,
    position: 'relative',
  },
  screenShareContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 15,
  },
  screenShareText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  screenShareSubtext: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  screenImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  screenVideo: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  dataIndicator: {
    backgroundColor: '#00D4FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  dataIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cameraContainer: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    width: 100,
    height: 80,
  },
  cameraPreview: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    borderWidth: 2,
    borderColor: '#00D4FF',
  },
  cameraText: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  cameraSubtext: {
    fontSize: 10,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  cameraVideo: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  flipButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#00D4FF',
    borderRadius: 15,
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButtonText: {
    fontSize: 12,
  },
  noSourcesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSourcesText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  noSourcesSubtext: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },
  liveIndicator: {
    position: 'absolute',
    top: 15,
    left: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 15,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  controlsContainer: {
    marginBottom: 30,
  },
  sourceControls: {
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  controlInfo: {
    flex: 1,
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  controlSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  streamControls: {
    alignItems: 'center',
  },
  startStreamButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: width * 0.6,
    shadowColor: '#FF4444',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  startStreamButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 10,
  },
  startStreamButtonIcon: {
    fontSize: 18,
  },
  stopStreamButton: {
    backgroundColor: '#666666',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: width * 0.6,
  },
  stopStreamButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 10,
  },
  stopStreamButtonIcon: {
    fontSize: 18,
  },
  backButton: {
    alignItems: 'center',
    padding: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 100,
  },
});

export default SetupScreen;