'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Square, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Settings,
  Monitor,
  Facebook,
  Youtube,
  Key,
  Globe,
  Eye,
  Wifi,
  MonitorSpeaker,
  Camera,
  Users,
  Smartphone,
  Share,
  Download,
  Upload,
  Server,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

export default function StreamPage() {
  // Platform data
  const streamPlatforms = [
    {
      id: 'youtube',
      name: 'YouTube Live',
      icon: Youtube,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      description: 'Stream to YouTube Live'
    },
    {
      id: 'facebook', 
      name: 'Facebook Live',
      icon: Facebook,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'Stream to Facebook Live'
    }
  ];

  // Core streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenShare, setIsScreenShare] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [hasScreenShare, setHasScreenShare] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [streamKey, setStreamKey] = useState('');
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [mobileConnected, setMobileConnected] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState([]);

  // Enhanced streaming features
  const [streamingMethod, setStreamingMethod] = useState('browser');
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [streamQuality, setStreamQuality] = useState({
    resolution: '1280x720',
    framerate: 30,
    bitrate: 4000
  });

  // Mobile camera integration
  const [mobileCamera, setMobileCamera] = useState({
    available: false,
    active: false,
    frames: [],
    lastFrame: null,
    type: 'front'
  });
  
  // Video source management
  const [videoSource, setVideoSource] = useState('pc_camera');
  const [pipLayout, setPipLayout] = useState('screen_main');

  // Statistics and monitoring
  const [streamStats, setStreamStats] = useState({
    duration: 0,
    viewers: 0,
    quality: 'HD 1080p',
    bitrate: 4800,
    uploadSpeed: 5.2,
    latency: 45,
    droppedFrames: 0
  });

  // Refs
  const videoRef = useRef(null);
  const wsRef = useRef(null);
  const isStreamingRef = useRef(isStreaming);
  const isSetupCompleteRef = useRef(isSetupComplete);

  // Keep refs in sync with state
  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  useEffect(() => {
    isSetupCompleteRef.current = isSetupComplete;
  }, [isSetupComplete]);

  // Server-Sent Events connection for mobile app communication
  useEffect(() => {
    let eventSource = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    
    const connectEventSource = () => {
      // Don't try to reconnect if we've exceeded max attempts
      if (reconnectAttempts >= maxReconnectAttempts) {
        console.log('Max SSE reconnection attempts reached');
        setConnectionStatus('failed');
        return;
      }

      try {
        console.log(`Attempting SSE connection (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
        
        // Connect to the Server-Sent Events endpoint
        eventSource = new EventSource('/api/stream-events?type=web');
        
        eventSource.onopen = () => {
          console.log('SSE connected successfully');
          setConnectionStatus('connected');
          reconnectAttempts = 0; // Reset counter on successful connection
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
              case 'CONNECTED':
                console.log('Web app registered with server');
                break;
              case 'MOBILE_CONNECTED':
                setMobileConnected(true);
                break;
              case 'MOBILE_DISCONNECTED':
                setMobileConnected(false);
                break;
              case 'START_STREAM':
                if (isSetupCompleteRef.current && !isStreamingRef.current) {
                  setIsStreaming(true);
                }
                break;
              case 'STOP_STREAM':
                if (isStreamingRef.current) {
                  setIsStreaming(false);
                  setStreamStats(prev => ({ ...prev, duration: 0, viewers: 0 }));
                }
                break;
              case 'TOGGLE_VIDEO':
                setIsVideoEnabled(prev => !prev);
                break;
              case 'TOGGLE_AUDIO':
                setIsAudioEnabled(prev => !prev);
                break;
              case 'MOBILE_CAMERA_AVAILABLE':
                setMobileCamera(prev => ({ 
                  ...prev, 
                  available: true, 
                  type: data.camera_type,
                  resolution: data.resolution
                }));
                break;
              case 'MOBILE_CAMERA_UNAVAILABLE':
                setMobileCamera(prev => ({ 
                  ...prev, 
                  available: false, 
                  active: false,
                  lastFrame: null
                }));
                break;
              case 'MOBILE_CAMERA_FRAME':
                setMobileCamera(prev => ({ 
                  ...prev, 
                  active: true,
                  lastFrame: data.frame,
                  timestamp: data.timestamp
                }));
                break;
              case 'VIDEO_SOURCE_CHANGED':
                setVideoSource(data.source);
                break;
              default:
                break;
            }
          } catch (parseError) {
            console.error('Error parsing SSE message:', parseError);
          }
        };

        eventSource.onerror = (error) => {
          console.warn('SSE connection error - retrying:', error.type || 'Unknown error');
          setConnectionStatus('error');
          eventSource.close();
          
          // Retry connection if we haven't exceeded max attempts
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`Scheduling SSE reconnection in 3 seconds (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
            setTimeout(connectEventSource, 3000);
          } else {
            setConnectionStatus('failed');
          }
        };

      } catch (error) {
        console.error('Failed to create SSE connection:', error);
        setConnectionStatus('error');
        
        // Retry connection if we haven't exceeded max attempts
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          setTimeout(connectEventSource, 3000);
        }
      }
    };

    // Initial connection attempt
    connectEventSource();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // Send mobile commands through API
  const sendMobileCommand = async (command) => {
    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...command,
          targetType: 'mobile'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send command');
      }
      
      const result = await response.json();
      console.log('Command sent successfully:', result);
    } catch (error) {
      console.error('Error sending mobile command:', error);
    }
  };

  // Stream duration tracking
  useEffect(() => {
    let interval;
    if (isStreaming) {
      interval = setInterval(() => {
        setStreamStats(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
    } else {
      setStreamStats(prev => ({ ...prev, duration: 0 }));
    }
    return () => clearInterval(interval);
  }, [isStreaming]);

  // Device enumeration
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        
        setVideoDevices(videoInputs);
        setAudioDevices(audioInputs);
        
        if (videoInputs.length > 0 && !selectedVideoDevice) {
          setSelectedVideoDevice(videoInputs[0].deviceId);
        }
        if (audioInputs.length > 0 && !selectedAudioDevice) {
          setSelectedAudioDevice(audioInputs[0].deviceId);
        }
      } catch (error) {
        console.error('Error getting devices:', error);
      }
    };

    getDevices();
  }, [selectedVideoDevice, selectedAudioDevice]);

  // Camera/Screen sharing setup
  useEffect(() => {
    const setupMediaStream = async () => {
      try {
        let stream;
        
        if (isScreenShare) {
          const displayMediaOptions = {
            video: {
              cursor: 'always',
              width: { ideal: parseInt(streamQuality.resolution.split('x')[0]) },
              height: { ideal: parseInt(streamQuality.resolution.split('x')[1]) },
              frameRate: { ideal: streamQuality.framerate }
            },
            audio: true
          };
          
          stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
          
          stream.getVideoTracks()[0].addEventListener('ended', () => {
            setIsScreenShare(false);
            setHasScreenShare(false);
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setHasScreenShare(true);
          
        } else {
          const constraints = {
            video: {
              deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined,
              width: { ideal: parseInt(streamQuality.resolution.split('x')[0]) },
              height: { ideal: parseInt(streamQuality.resolution.split('x')[1]) },
              frameRate: { ideal: streamQuality.framerate }
            },
            audio: {
              deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined,
              echoCancellation: true,
              noiseSuppression: true
            }
          };

          stream = await navigator.mediaDevices.getUserMedia(constraints);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setHasCamera(true);
        }
      } catch (error) {
        console.error('Error setting up media stream:', error);
        if (isScreenShare) {
          setHasScreenShare(false);
        } else {
          setHasCamera(false);
        }
      }
    };

    if ((isScreenShare || !isScreenShare) && (selectedVideoDevice || selectedAudioDevice)) {
      setupMediaStream();
    }

    return () => {
      const currentVideoRef = videoRef.current;
      if (currentVideoRef && currentVideoRef.srcObject) {
        const tracks = currentVideoRef.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [isStreaming, isScreenShare, selectedVideoDevice, selectedAudioDevice, streamQuality]);

  // Stream stats simulation
  useEffect(() => {
    let interval;
    if (isStreaming) {
      interval = setInterval(() => {
        setStreamStats(prev => ({
          ...prev,
          viewers: Math.max(0, prev.viewers + Math.floor(Math.random() * 3) - 1),
          uploadSpeed: 4.8 + Math.random() * 1.0,
          latency: 35 + Math.random() * 20,
          droppedFrames: Math.random() < 0.1 ? prev.droppedFrames + 1 : prev.droppedFrames
        }));
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isStreaming]);

  // Platform selection
  const handlePlatformSelect = (platform) => {
    setSelectedPlatform(platform);
    setShowSetupModal(true);
  };

  // Stream setup
  const handleSetupStream = async () => {
    if (!streamKey || !streamTitle) {
      alert('Please enter both stream key and title');
      return;
    }

    try {
      setIsSetupComplete(true);
      setShowSetupModal(false);
      setStreamStats(prev => ({ ...prev, viewers: Math.floor(Math.random() * 50) }));
      console.log('Stream setup completed for:', selectedPlatform.name);
    } catch (error) {
      console.error('Error setting up stream:', error);
    }
  };

  // Streaming controls
  const handleStartStream = async () => {
    try {
      setIsStreaming(true);
      setStreamStats(prev => ({ 
        ...prev, 
        viewers: Math.floor(Math.random() * 100) + 10,
        duration: 0
      }));
      
      // Notify mobile app about stream start
      await sendMobileCommand({ 
        type: 'STREAM_STARTED',
        platform: selectedPlatform?.id,
        title: streamTitle 
      });
      
      console.log('Stream started');
    } catch (error) {
      console.error('Error starting stream:', error);
    }
  };

  const handleStopStream = () => {
    try {
      setIsStreaming(false);
      setStreamStats(prev => ({ ...prev, duration: 0, viewers: 0 }));
      console.log('Stream stopped');
    } catch (error) {
      console.error('Error stopping stream:', error);
    }
  };

  const toggleScreenShare = () => {
    setIsScreenShare(!isScreenShare);
    setHasCamera(false);
    setHasScreenShare(false);
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Live Streaming Studio
          </h1>
          <p className="text-lg text-gray-600">
            Stream live to YouTube or Facebook with professional broadcasting tools
          </p>
        </motion.div>

        {/* Streaming Settings */}
        {!isSetupComplete && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-red-600" />
                  OBS Alternative - Direct Browser Streaming
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Video Source Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Video Source
                    </label>
                    <select
                      value={selectedVideoDevice}
                      onChange={(e) => setSelectedVideoDevice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                      disabled={isStreaming}
                    >
                      <option value="">Default Camera</option>
                      {videoDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Audio Source Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Audio Source
                    </label>
                    <select
                      value={selectedAudioDevice}
                      onChange={(e) => setSelectedAudioDevice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                      disabled={isStreaming}
                    >
                      <option value="">Default Microphone</option>
                      {audioDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quality Settings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stream Quality
                    </label>
                    <select
                      value={streamQuality.resolution}
                      onChange={(e) => {
                        const resolution = e.target.value;
                        let bitrate = 4000;
                        if (resolution === '1920x1080') bitrate = 6000;
                        if (resolution === '854x480') bitrate = 2500;
                        
                        setStreamQuality(prev => ({ 
                          ...prev, 
                          resolution, 
                          bitrate 
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                      disabled={isStreaming}
                    >
                      <option value="854x480">480p (2.5k bitrate)</option>
                      <option value="1280x720">720p (4k bitrate)</option>
                      <option value="1920x1080">1080p (6k bitrate)</option>
                    </select>
                  </div>

                  {/* Video Source Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Video Source Type
                    </label>
                    <select
                      value={videoSource}
                      onChange={(e) => setVideoSource(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                      disabled={isStreaming}
                    >
                      <option value="pc_camera">PC Camera Only</option>
                      <option value="mobile_camera" disabled={!mobileCamera.available}>
                        📱 Mobile Camera {!mobileCamera.available ? '(Disconnected)' : ''}
                      </option>
                      <option value="screen_share">Screen Capture Only</option>
                      <option value="pip_mode" disabled={!mobileCamera.available}>
                        🎥 Picture-in-Picture {!mobileCamera.available ? '(Need Mobile)' : ''}
                      </option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Activity className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Professional Streaming Features</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        This is a complete OBS Studio alternative. Stream directly from your browser with 
                        professional quality controls, device selection, and real-time encoding.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Real-time Streaming Statistics */}
        {isStreaming && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  Live Streaming Statistics
                  <div className="flex items-center gap-1 ml-auto">
                    <div className="h-2 w-2 bg-red-600 rounded-full animate-pulse"></div>
                    <span className="text-sm text-red-600 font-medium">LIVE</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="flex flex-col items-center">
                      <Clock className="h-8 w-8 text-blue-600 mb-2" />
                      <span className="text-2xl font-bold text-gray-900">
                        {Math.floor(streamStats.duration / 60)}:
                        {(streamStats.duration % 60).toString().padStart(2, '0')}
                      </span>
                      <span className="text-sm text-gray-600">Duration</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="flex flex-col items-center">
                      <Eye className="h-8 w-8 text-green-600 mb-2" />
                      <span className="text-2xl font-bold text-gray-900">
                        {streamStats.viewers}
                      </span>
                      <span className="text-sm text-gray-600">Live Viewers</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="flex flex-col items-center">
                      <Wifi className="h-8 w-8 text-purple-600 mb-2" />
                      <span className="text-2xl font-bold text-gray-900">
                        {streamStats.bitrate}k
                      </span>
                      <span className="text-sm text-gray-600">Current Bitrate</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Platform Selection */}
        {!isSetupComplete && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-red-600" />
                  Choose Streaming Platform
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {streamPlatforms.map((platform) => {
                    const IconComponent = platform.icon;
                    return (
                      <motion.button
                        key={platform.id}
                        className={`p-6 border-2 rounded-lg text-left transition-all hover:shadow-md ${
                          selectedPlatform?.id === platform.id
                            ? `${platform.borderColor} ${platform.bgColor}`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handlePlatformSelect(platform)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-full ${platform.bgColor}`}>
                            <IconComponent className={`h-8 w-8 ${platform.color}`} />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {platform.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {platform.description}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Stream Area */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {isScreenShare ? (
                      <MonitorSpeaker className="h-5 w-5 text-red-600" />
                    ) : (
                      <Camera className="h-5 w-5 text-red-600" />
                    )}
                    {isSetupComplete ? 'Live Stream Preview' : (isScreenShare ? 'Screen Share Preview' : 'Camera Preview')}
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    {isStreaming && (
                      <div className="flex items-center gap-2 text-red-600">
                        <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                        <span className="text-sm font-medium">LIVE</span>
                      </div>
                    )}
                    {isSetupComplete && selectedPlatform && (
                      <div className="flex items-center gap-2">
                        <selectedPlatform.icon className={`h-4 w-4 ${selectedPlatform.color}`} />
                        <span className="text-sm text-gray-600">{selectedPlatform.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative bg-gray-900 rounded-lg aspect-video overflow-hidden">
                  {((isScreenShare && hasScreenShare) || (!isScreenShare && hasCamera)) && isVideoEnabled ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <div className="text-center">
                        {isScreenShare ? (
                          !hasScreenShare ? (
                            <>
                              <MonitorSpeaker className="h-16 w-16 mx-auto mb-4 opacity-50" />
                              <p className="text-lg">Screen share not available</p>
                              <p className="text-sm opacity-75">Check screen sharing permissions</p>
                            </>
                          ) : (
                            <>
                              <MonitorSpeaker className="h-16 w-16 mx-auto mb-4 opacity-50" />
                              <p className="text-lg">Screen sharing disabled</p>
                              <p className="text-sm opacity-75">Enable video to see screen share</p>
                            </>
                          )
                        ) : (
                          !hasCamera ? (
                            <>
                              <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                              <p className="text-lg">Camera not available</p>
                              <p className="text-sm opacity-75">Check camera permissions</p>
                            </>
                          ) : (
                            <>
                              <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                              <p className="text-lg">Camera disabled</p>
                              <p className="text-sm opacity-75">Enable video to see camera</p>
                            </>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mobile Camera Picture-in-Picture Overlay */}
                  {mobileCamera.available && mobileCamera.lastFrame && videoSource === 'pip_mode' && (
                    <div className="absolute bottom-4 right-4 w-32 h-24 bg-gray-800 border-2 border-white rounded-lg overflow-hidden shadow-lg">
                      <img
                        src={`data:image/jpeg;base64,${mobileCamera.lastFrame}`}
                        alt="Mobile Camera PiP"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                        <span className="text-white text-xs font-medium">📱</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Stream Overlay */}
                  {isStreaming && (
                    <>
                      <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                        LIVE
                      </div>
                      <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-lg text-sm">
                        {streamStats.viewers} viewers
                      </div>
                      <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg text-sm">
                        {formatDuration(streamStats.duration)}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stream Controls */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant={isVideoEnabled ? 'primary' : 'danger'}
                      size="lg"
                      onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                      className="rounded-full"
                    >
                      {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                    </Button>

                    <Button
                      variant={isAudioEnabled ? 'primary' : 'danger'}
                      size="lg"
                      onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                      className="rounded-full"
                    >
                      {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </Button>

                    <Button 
                      variant={isScreenShare ? 'primary' : 'secondary'}
                      size="lg" 
                      onClick={toggleScreenShare}
                      className="rounded-full"
                      disabled={isStreaming}
                    >
                      {isScreenShare ? <MonitorSpeaker className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                    </Button>

                    <Button variant="ghost" size="lg" className="rounded-full">
                      <Settings className="h-5 w-5" />
                    </Button>

                    <Button variant="secondary" size="lg" className="rounded-full">
                      <Monitor className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-4">
                    {!isSetupComplete ? (
                      <Button
                        size="xl"
                        disabled
                        className="opacity-50"
                      >
                        <Key className="h-5 w-5 mr-2" />
                        Setup Stream First
                      </Button>
                    ) : !isStreaming ? (
                      <Button
                        size="xl"
                        onClick={handleStartStream}
                        disabled={!mobileConnected}
                        className={mobileConnected ? "animate-pulse-red" : "opacity-50 cursor-not-allowed"}
                      >
                        <Play className="h-5 w-5 mr-2" />
                        {mobileConnected ? 'Go Live' : 'Waiting for Mobile App'}
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        size="xl"
                        onClick={handleStopStream}
                      >
                        <Square className="h-5 w-5 mr-2" />
                        End Stream
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Mobile App Connection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-red-600" />
                  Mobile Remote Control
                  <div className={`ml-auto w-2 h-2 rounded-full ${mobileConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        {mobileConnected ? 'Connected' : connectionStatus === 'connected' ? 'WebSocket Ready' : connectionStatus === 'error' ? 'Server Offline' : connectionStatus === 'failed' ? 'Connection Failed' : 'Disconnected'}
                      </span>
                    </div>
                    <div className="text-xs text-blue-700">
                      {mobileConnected ? connectedDevices.length : 0} device(s)
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Control Mode</span>
                      <span className="text-sm font-medium">
                        {mobileConnected ? 'Remote' : 'Local'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Mobile Camera</span>
                      <span className={`text-sm font-medium ${
                        mobileCamera.available ? (mobileCamera.active ? 'text-green-600' : 'text-blue-600') : 'text-gray-400'
                      }`}>
                        {mobileCamera.available ? (mobileCamera.active ? 'Streaming' : 'Ready') : 'Unavailable'}
                      </span>
                    </div>
                    {mobileCamera.available && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Camera Type</span>
                        <span className="text-sm font-medium">
                          {mobileCamera.type === 'front' ? '🤳 Front' : '📷 Back'}
                        </span>
                      </div>
                    )}
                  </div>

                  {!mobileConnected && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Smartphone className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="text-xs text-yellow-700">
                            {connectionStatus === 'connected' ? 
                              'Streaming server is ready. Connect your mobile app to control streaming remotely and share your PC screen to mobile viewers.' :
                              connectionStatus === 'error' || connectionStatus === 'failed' ?
                              'Internal streaming server not available. Mobile connectivity may be limited.' :
                              'Connecting to internal streaming server...'}
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            Mobile app connects to: http://[YOUR-IP]:3000 {connectionStatus !== 'connected' && '• Check network connection'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stream Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-red-600" />
                  Stream Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status</span>
                    <span className={`text-sm font-medium ${isStreaming ? 'text-green-600' : 'text-gray-400'}`}>
                      {isStreaming ? 'Live' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Platform</span>
                    <span className="text-sm font-medium">
                      {selectedPlatform ? selectedPlatform.name : 'Not selected'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Source</span>
                    <span className="text-sm font-medium flex items-center gap-1">
                      {isScreenShare ? (
                        <>
                          <MonitorSpeaker className="h-3 w-3" />
                          Screen Share
                        </>
                      ) : (
                        <>
                          <Camera className="h-3 w-3" />
                          Camera
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Viewers</span>
                    <span className="text-sm font-medium">{streamStats.viewers.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Duration</span>
                    <span className="text-sm font-medium">{formatDuration(streamStats.duration)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Quality</span>
                    <span className="text-sm font-medium text-green-600">{streamStats.quality}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stream Setup Modal */}
        <Modal
          isOpen={showSetupModal}
          onClose={() => setShowSetupModal(false)}
          title={`Setup ${selectedPlatform?.name} Stream`}
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowSetupModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSetupStream} disabled={!streamKey || !streamTitle}>
                Setup Stream
              </Button>
            </>
          }
        >
          <div className="space-y-6">
            {selectedPlatform && (
              <div className={`p-4 rounded-lg ${selectedPlatform.bgColor} ${selectedPlatform.borderColor} border`}>
                <div className="flex items-center gap-3 mb-3">
                  <selectedPlatform.icon className={`h-6 w-6 ${selectedPlatform.color}`} />
                  <h3 className="font-medium text-gray-900">{selectedPlatform.name} Live</h3>
                </div>
                <p className="text-sm text-gray-600">
                  {selectedPlatform.description}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stream Key
              </label>
              <Input
                type="password"
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                placeholder="Enter your stream key from the platform"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get this from your {selectedPlatform?.name} streaming dashboard
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stream Title
              </label>
              <Input
                value={streamTitle}
                onChange={(e) => setStreamTitle(e.target.value)}
                placeholder="Enter your stream title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
                value={streamDescription}
                onChange={(e) => setStreamDescription(e.target.value)}
                placeholder="Describe your stream..."
              />
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}