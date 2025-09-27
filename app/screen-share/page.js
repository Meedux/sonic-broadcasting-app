'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Monitor, 
  Maximize, 
  Minimize, 
  Square, 
  Play, 
  Pause,
  Volume2,
  VolumeX,
  Settings,
  Cast,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LoadingOverlay } from '@/components/ui/Loading';

export default function ScreenSharePage() {
  const [isSharing, setIsSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [connectedDevices] = useState(['iPhone 15 Pro', 'Samsung Galaxy S24']);

  const handleStartSharing = () => {
    setIsSharing(true);
  };

  const handleStopSharing = () => {
    setIsSharing(false);
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            PC to Mobile Screen Share
          </h1>
          <p className="text-lg text-gray-600">
            Share your PC screen directly to your mobile device with ultra-low latency
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Screen Share Area */}
          <div className="lg:col-span-3">
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-red-600" />
                    Screen Preview
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {isSharing && (
                      <div className="flex items-center gap-2 text-green-600">
                        <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse" />
                        <span className="text-sm font-medium">SHARING</span>
                      </div>
                    )}
                    <span className="text-sm text-gray-500">
                      {connectedDevices.length} device(s) connected
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <LoadingOverlay loading={false}>
                  <div className="relative bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 rounded-lg aspect-video flex items-center justify-center overflow-hidden">
                    {!isSharing ? (
                      <div className="text-center text-white">
                        <Monitor className="h-20 w-20 mx-auto mb-6 opacity-60" />
                        <h3 className="text-xl font-semibold mb-2">Ready to Share</h3>
                        <p className="text-sm opacity-80 mb-6">
                          Your desktop will appear here when screen sharing starts
                        </p>
                        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                            <div className="w-8 h-8 bg-white/20 rounded mx-auto mb-2" />
                            <p className="text-xs opacity-80">Apps</p>
                          </div>
                          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                            <div className="w-8 h-8 bg-white/20 rounded mx-auto mb-2" />
                            <p className="text-xs opacity-80">Files</p>
                          </div>
                          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                            <div className="w-8 h-8 bg-white/20 rounded mx-auto mb-2" />
                            <p className="text-xs opacity-80">Browser</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-white">
                        <div className="animate-pulse space-y-4 w-full max-w-md">
                          <div className="bg-white/20 rounded-lg p-6">
                            <div className="bg-white/30 h-4 rounded mb-2" />
                            <div className="bg-white/30 h-4 rounded w-3/4" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/20 rounded-lg p-4">
                              <div className="bg-white/30 h-8 w-8 rounded mb-2" />
                              <div className="bg-white/30 h-3 rounded" />
                            </div>
                            <div className="bg-white/20 rounded-lg p-4">
                              <div className="bg-white/30 h-8 w-8 rounded mb-2" />
                              <div className="bg-white/30 h-3 rounded" />
                            </div>
                          </div>
                        </div>
                        <p className="text-sm opacity-80 mt-6">
                          Screen sharing active - Streaming to mobile devices
                        </p>
                      </div>
                    )}
                    
                    {/* Fullscreen Toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-4 right-4 text-white hover:bg-white/20"
                      onClick={() => setIsFullscreen(!isFullscreen)}
                    >
                      {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </Button>
                  </div>
                </LoadingOverlay>
              </CardContent>
            </Card>

            {/* Controls */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant={isMuted ? 'danger' : 'primary'}
                      size="lg"
                      onClick={() => setIsMuted(!isMuted)}
                      className="rounded-full"
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>

                    <Button variant="ghost" size="lg" className="rounded-full">
                      <Settings className="h-5 w-5" />
                    </Button>

                    <Button variant="secondary" size="lg" className="rounded-full">
                      <Cast className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-4">
                    {!isSharing ? (
                      <Button
                        size="xl"
                        onClick={handleStartSharing}
                        className="animate-pulse-red"
                      >
                        <Play className="h-5 w-5 mr-2" />
                        Start Screen Share
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        size="xl"
                        onClick={handleStopSharing}
                      >
                        <Square className="h-5 w-5 mr-2" />
                        Stop Sharing
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Connected Devices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-red-600" />
                  Connected Devices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {connectedDevices.map((device, index) => (
                    <motion.div
                      key={device}
                      className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{device}</p>
                        <p className="text-xs text-gray-500">Connected • High Quality</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50">
                        Disconnect
                      </Button>
                    </motion.div>
                  ))}
                </div>
                
                {connectedDevices.length === 0 && (
                  <div className="text-center py-6">
                    <Smartphone className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm text-gray-500">No devices connected</p>
                    <Button variant="secondary" size="sm" className="mt-3">
                      Pair Device
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Share Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Share Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Quality</span>
                    <select className="text-sm border border-gray-300 rounded px-2 py-1">
                      <option>HD 1080p</option>
                      <option>HD 720p</option>
                      <option>SD 480p</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Frame Rate</span>
                    <select className="text-sm border border-gray-300 rounded px-2 py-1">
                      <option>60 FPS</option>
                      <option>30 FPS</option>
                      <option>15 FPS</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Audio</span>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Include Audio</span>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Low Latency</span>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Enabled</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Latency</span>
                    <span className="text-sm font-medium text-green-600">42ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Bitrate</span>
                    <span className="text-sm font-medium">8.5 Mbps</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">CPU Usage</span>
                    <span className="text-sm font-medium">23%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Network</span>
                    <span className="text-sm font-medium text-green-600">Stable</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}