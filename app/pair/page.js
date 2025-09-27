'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Smartphone, 
  Monitor, 
  Wifi, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Copy,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/Loading';

const steps = [
  {
    step: 1,
    title: 'Generate QR Code',
    description: 'Click to generate a unique pairing code',
    icon: Zap
  },
  {
    step: 2,
    title: 'Scan on Mobile',
    description: 'Open camera app and scan the QR code',
    icon: Smartphone
  },
  {
    step: 3,
    title: 'Confirm Connection',
    description: 'Accept the pairing request on your mobile',
    icon: CheckCircle
  },
  {
    step: 4,
    title: 'Start Streaming',
    description: 'Begin screen sharing from PC to mobile',
    icon: Monitor
  }
];

export default function PairPage() {
  const [connectionId, setConnectionId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null);

  const generatePairingCode = async () => {
    setIsGenerating(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    const newId = `SONIC-${Date.now().toString().slice(-6)}`;
    setConnectionId(newId);
    setIsGenerating(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`http://localhost:3000/pair/${connectionId}`);
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Pair Your Device
          </h1>
          <p className="text-lg text-gray-600">
            Connect your mobile device to start screen sharing from your PC
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* QR Code Section */}
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Smartphone className="h-5 w-5 text-red-600" />
                Mobile Connection
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!connectionId ? (
                <div className="py-12">
                  <div className="w-32 h-32 mx-auto mb-6 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Zap className="h-12 w-12 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-6">
                    Generate a QR code to connect your mobile device
                  </p>
                  <Button
                    size="lg"
                    onClick={generatePairingCode}
                    loading={isGenerating}
                    className="animate-pulse-red"
                  >
                    Generate QR Code
                  </Button>
                </div>
              ) : (
                <div className="py-6">
                  <div className="w-64 h-64 mx-auto mb-6 p-4 bg-white border-2 border-gray-200 rounded-lg">
                    <QRCodeSVG
                      value={`http://localhost:3000/pair/${connectionId}`}
                      size={224}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                      <span className="font-mono">{connectionId}</span>
                      <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={generatePairingCode}
                        loading={isGenerating}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate
                      </Button>
                      <Button size="sm" disabled>
                        <Wifi className="h-4 w-4 mr-2" />
                        Waiting for connection...
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Monitor className="h-5 w-5 text-red-600" />
                Connection Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {!isConnected ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="h-8 w-8 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Device Connected
                    </h3>
                    <p className="text-sm text-gray-500">
                      Scan the QR code with your mobile device to establish connection
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Device Connected
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {connectedDevice || 'iPhone 15 Pro'} is ready for screen sharing
                    </p>
                    <Button className="animate-glow">
                      Start Screen Share
                    </Button>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Connection Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Network</span>
                      <span className="font-medium">WiFi Connected</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Security</span>
                      <span className="font-medium text-green-600">Encrypted</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Latency</span>
                      <span className="font-medium">&lt; 50ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Steps Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">How to Connect</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6">
              {steps.map((step, index) => (
                <motion.div
                  key={step.step}
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                    <step.icon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="text-sm font-semibold text-red-600 mb-2">
                    Step {step.step}
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}