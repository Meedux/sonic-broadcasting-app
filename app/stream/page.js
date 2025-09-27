'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

const streamPlatforms = [
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    description: 'Stream to YouTube Live'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Stream to Facebook Live'
  }
];

export default function StreamPage() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [streamKey, setStreamKey] = useState('');
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [streamStats, setStreamStats] = useState({
    duration: 0,
    bitrate: 0,
    viewers: 0,
    quality: 'HD 1080p'
  });
  const [isScreenShare, setIsScreenShare] = useState(false);
  const videoRef = useRef(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [hasScreenShare, setHasScreenShare] = useState(false);

  // Mock camera and screen share preview
  useEffect(() => {
    const currentVideoRef = videoRef.current;
    
    const startMediaPreview = async () => {
      try {
        let stream;
        if (isScreenShare) {
          // Screen sharing
          stream = await navigator.mediaDevices.getDisplayMedia({ 
            video: true, 
            audio: true 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setHasScreenShare(true);
          }
        } else {
          // Camera
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setHasCamera(true);
          }
        }
      } catch (error) {
        console.error('Error accessing media:', error);
        if (isScreenShare) {
          setHasScreenShare(false);
        } else {
          setHasCamera(false);
        }
      }
    };

    if (!isStreaming) {
      startMediaPreview();
    }

    return () => {
      if (currentVideoRef && currentVideoRef.srcObject) {
        const tracks = currentVideoRef.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [isStreaming, isScreenShare]);

  // Mock streaming stats update
  useEffect(() => {
    let interval;
    if (isStreaming) {
      interval = setInterval(() => {
        setStreamStats(prev => ({
          ...prev,
          duration: prev.duration + 1,
          bitrate: 4800 + Math.random() * 400,
          viewers: Math.max(0, prev.viewers + Math.floor(Math.random() * 5 - 2))
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStreaming]);

  const handlePlatformSelect = (platform) => {
    setSelectedPlatform(platform);
    setShowSetupModal(true);
  };

  const handleSetupStream = () => {
    if (streamKey && streamTitle) {
      setIsSetupComplete(true);
      setShowSetupModal(false);
      setStreamStats(prev => ({ ...prev, viewers: Math.floor(Math.random() * 50) + 10 }));
    }
  };

  const handleStartStream = () => {
    if (isSetupComplete) {
      setIsStreaming(true);
    }
  };

  const handleStopStream = () => {
    setIsStreaming(false);
    setStreamStats(prev => ({ ...prev, duration: 0, viewers: 0 }));
  };

  const toggleScreenShare = () => {
    setIsScreenShare(!isScreenShare);
    // Reset media states when switching
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
                              <VideoOff className="h-16 w-16 mx-auto mb-4 opacity-50" />
                              <p className="text-lg">Camera disabled</p>
                              <p className="text-sm opacity-75">Enable camera to see preview</p>
                            </>
                          )
                        )}
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
                        className="animate-pulse-red"
                      >
                        <Play className="h-5 w-5 mr-2" />
                        Go Live
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
            <Card>
              <CardHeader>
                <CardTitle>Stream Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status</span>
                    <span className={`text-sm font-medium ${isStreaming ? 'text-red-600' : 'text-gray-400'}`}>
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-red-600" />
                  Connection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-green-600">Connected</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Upload Speed</span>
                    <span className="text-sm font-medium">25 Mbps</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Latency</span>
                    <span className="text-sm font-medium text-green-600">42ms</span>
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
                  You will need your {selectedPlatform.name} stream key to broadcast. 
                  Get it from your {selectedPlatform.name} Creator Studio.
                </p>
              </div>
            )}

            <Input
              label="Stream Key"
              type="password"
              value={streamKey}
              onChange={(e) => setStreamKey(e.target.value)}
              placeholder={`Enter your ${selectedPlatform?.name} stream key`}
              icon={Key}
            />

            <Input
              label="Stream Title"
              value={streamTitle}
              onChange={(e) => setStreamTitle(e.target.value)}
              placeholder="Give your stream a catchy title"
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Stream Description</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                rows={3}
                value={streamDescription}
                onChange={(e) => setStreamDescription(e.target.value)}
                placeholder="Tell viewers what your stream is about..."
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Eye className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900">Stream Preview</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Your stream will be visible to your {selectedPlatform?.name} audience once you go live. 
                    Make sure your camera and microphone are working properly.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <MonitorSpeaker className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Screen Sharing</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Switch between camera and screen sharing using the toggle button in the controls. 
                    Screen sharing is perfect for tutorials, presentations, or gameplay streaming.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
