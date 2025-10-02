'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings,
  User,
  Video,
  Audio,
  Monitor,
  Wifi,
  Shield,
  Bell,
  Palette,
  Globe,
  Key,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Volume2,
  Mic,
  Camera,
  Download,
  Upload,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

const settingsCategories = [
  {
    id: 'profile',
    title: 'Profile & Account',
    icon: User,
    description: 'Manage your profile information and account settings'
  },
  {
    id: 'streaming',
    title: 'Streaming Settings',
    icon: Video,
    description: 'Configure video, audio, and streaming preferences'
  },
  {
    id: 'screenshare',
    title: 'Screen Share',
    icon: Monitor,
    description: 'Optimize screen sharing quality and performance'
  },
  {
    id: 'network',
    title: 'Network & Connection',
    icon: Wifi,
    description: 'Network settings and connection optimization'
  },
  {
    id: 'privacy',
    title: 'Privacy & Security',
    icon: Shield,
    description: 'Control your privacy settings and security preferences'
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: Bell,
    description: 'Manage notification preferences and alerts'
  },
  {
    id: 'appearance',
    title: 'Appearance',
    icon: Palette,
    description: 'Customize the look and feel of the app'
  }
];

export default function SettingsPage() {
  const [activeCategory, setActiveCategory] = useState('profile');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [settings, setSettings] = useState({
    // Profile settings
    displayName: 'Alex Johnson',
    email: 'alex@example.com',
    bio: 'Tech enthusiast and content creator',
    
    // Streaming settings
    videoQuality: '1080p',
    frameRate: '60fps',
    bitrate: 'auto',
    audioQuality: 'high',
    
    // Screen share settings
    screenQuality: 'high',
    shareAudio: true,
    lowLatency: true,
    
    // Network settings
    serverRegion: 'auto',
    bandwidthLimit: 'unlimited',
    adaptiveBitrate: true,
    
    // Privacy settings
    profileVisibility: 'public',
    allowDirectMessages: true,
    showOnlineStatus: true,
    
    // Notifications
    streamNotifications: true,
    chatNotifications: true,
    followerNotifications: true,
    
    // Appearance
    theme: 'light',
    language: 'english',
    compactMode: false
  });

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
        <div className="grid gap-4">
          <Input
            label="Display Name"
            value={settings.displayName}
            onChange={(e) => updateSetting('displayName', e.target.value)}
            icon={User}
          />
          <Input
            label="Email Address"
            value={settings.email}
            onChange={(e) => updateSetting('email', e.target.value)}
            type="email"
          />
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Bio</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              rows={3}
              value={settings.bio}
              onChange={(e) => updateSetting('bio', e.target.value)}
              placeholder="Tell us about yourself..."
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Actions</h3>
        <div className="space-y-3">
          <Button variant="secondary" className="w-full justify-start">
            <Download className="h-4 w-4 mr-2" />
            Download My Data
          </Button>
          <Button variant="secondary" className="w-full justify-start">
            <Key className="h-4 w-4 mr-2" />
            Change Password
          </Button>
          <Button
            variant="danger"
            className="w-full justify-start"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Account
          </Button>
        </div>
      </div>
    </div>
  );

  const renderStreamingSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Video Settings</h3>
        <div className="grid gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Video Quality</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              value={settings.videoQuality}
              onChange={(e) => updateSetting('videoQuality', e.target.value)}
            >
              <option value="720p">720p HD</option>
              <option value="1080p">1080p Full HD</option>
              <option value="1440p">1440p 2K</option>
              <option value="2160p">2160p 4K</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Frame Rate</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              value={settings.frameRate}
              onChange={(e) => updateSetting('frameRate', e.target.value)}
            >
              <option value="15fps">15 FPS</option>
              <option value="30fps">30 FPS</option>
              <option value="60fps">60 FPS</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Bitrate</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              value={settings.bitrate}
              onChange={(e) => updateSetting('bitrate', e.target.value)}
            >
              <option value="auto">Auto</option>
              <option value="2500">2.5 Mbps</option>
              <option value="5000">5 Mbps</option>
              <option value="10000">10 Mbps</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Audio Settings</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Audio Quality</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              value={settings.audioQuality}
              onChange={(e) => updateSetting('audioQuality', e.target.value)}
            >
              <option value="low">Low (64 kbps)</option>
              <option value="medium">Medium (128 kbps)</option>
              <option value="high">High (320 kbps)</option>
            </select>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Mic className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Microphone Test</p>
              <p className="text-sm text-gray-600">Test your microphone audio quality</p>
            </div>
            <Button variant="secondary" size="sm">Test</Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderScreenShareSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Screen Share Quality</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Screen Quality</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              value={settings.screenQuality}
              onChange={(e) => updateSetting('screenQuality', e.target.value)}
            >
              <option value="low">Low (faster performance)</option>
              <option value="medium">Medium (balanced)</option>
              <option value="high">High (best quality)</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Volume2 className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-gray-900">Share Audio</p>
                <p className="text-sm text-gray-600">Include computer audio in screen share</p>
              </div>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.shareAudio}
                onChange={(e) => updateSetting('shareAudio', e.target.checked)}
                className="sr-only"
              />
              <div className={`w-12 h-6 rounded-full transition-colors ${settings.shareAudio ? 'bg-red-600' : 'bg-gray-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${settings.shareAudio ? 'translate-x-6' : 'translate-x-1'} mt-0.5`} />
              </div>
            </label>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-gray-900">Low Latency Mode</p>
                <p className="text-sm text-gray-600">Reduce delay for real-time sharing</p>
              </div>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.lowLatency}
                onChange={(e) => updateSetting('lowLatency', e.target.checked)}
                className="sr-only"
              />
              <div className={`w-12 h-6 rounded-full transition-colors ${settings.lowLatency ? 'bg-red-600' : 'bg-gray-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${settings.lowLatency ? 'translate-x-6' : 'translate-x-1'} mt-0.5`} />
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Theme</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            className={`p-4 border-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
              settings.theme === 'light' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => updateSetting('theme', 'light')}
          >
            <Sun className="h-5 w-5" />
            Light
          </button>
          <button
            className={`p-4 border-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
              settings.theme === 'dark' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => updateSetting('theme', 'dark')}
          >
            <Moon className="h-5 w-5" />
            Dark
          </button>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Language & Region</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Language</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              value={settings.language}
              onChange={(e) => updateSetting('language', e.target.value)}
            >
              <option value="english">English</option>
              <option value="spanish">Español</option>
              <option value="french">Français</option>
              <option value="german">Deutsch</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettingsContent = () => {
    switch (activeCategory) {
      case 'profile':
        return renderProfileSettings();
      case 'streaming':
        return renderStreamingSettings();
      case 'screenshare':
        return renderScreenShareSettings();
      case 'appearance':
        return renderAppearanceSettings();
      default:
        return (
          <div className="text-center py-12">
            <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
            <p className="text-gray-600">This settings category is under development.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Settings</h1>
          <p className="text-lg text-gray-600">
            Manage your account, streaming preferences, and app settings
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <nav className="space-y-2">
                  {settingsCategories.map((category, index) => (
                    <motion.button
                      key={category.id}
                      className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
                        activeCategory === category.id
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setActiveCategory(category.id)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <category.icon className="h-5 w-5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{category.title}</div>
                        <div className="text-xs text-gray-500 truncate">{category.description}</div>
                      </div>
                    </motion.button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {(() => {
                      const category = settingsCategories.find(cat => cat.id === activeCategory);
                      const IconComponent = category?.icon;
                      return IconComponent ? <IconComponent className="h-5 w-5 text-red-600" /> : null;
                    })()}
                    {settingsCategories.find(cat => cat.id === activeCategory)?.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderSettingsContent()}
                </CardContent>
              </Card>
            </motion.div>

            {/* Save Button */}
            <motion.div
              className="mt-6 flex justify-end gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Button variant="secondary">
                Reset to Default
              </Button>
              <Button className="animate-glow">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Delete Account Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Account"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button variant="danger">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-900">This action cannot be undone</p>
                <p className="text-sm text-red-700">
                  All your data, streams, and followers will be permanently deleted.
                </p>
              </div>
            </div>
            <p className="text-gray-600">
              To confirm deletion, please type <strong>DELETE</strong> in the field below:
            </p>
            <Input placeholder="Type DELETE to confirm" />
          </div>
        </Modal>
      </div>
    </div>
  );
}