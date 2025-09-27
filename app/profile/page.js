'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Camera, 
  Edit3, 
  Star, 
  Eye, 
  Heart,
  Users,
  Calendar,
  MapPin,
  Link as LinkIcon,
  Trophy,
  Zap,
  Play,
  Monitor,
  Gift,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import Link from 'next/link';

const achievements = [
  { icon: Trophy, title: 'First Stream', description: 'Completed your first stream', earned: true },
  { icon: Users, title: 'Popular Streamer', description: '1000+ followers', earned: true },
  { icon: Star, title: 'Rising Star', description: '10,000+ total views', earned: true },
  { icon: Monitor, title: 'Screen Share Master', description: '100+ screen shares', earned: false },
  { icon: Gift, title: 'Gift Receiver', description: 'Received 500+ virtual gifts', earned: false },
  { icon: Zap, title: 'Speed Demon', description: '<30ms average latency', earned: true }
];

const streamHistory = [
  { 
    id: 1, 
    title: 'Gaming Session #23', 
    viewers: 1234, 
    duration: '2h 45m', 
    date: '2025-09-25',
    thumbnail: 'gaming'
  },
  { 
    id: 2, 
    title: 'Screen Share Tutorial', 
    viewers: 890, 
    duration: '1h 20m', 
    date: '2025-09-24',
    thumbnail: 'tutorial'
  },
  { 
    id: 3, 
    title: 'Live Coding Stream', 
    viewers: 567, 
    duration: '3h 15m', 
    date: '2025-09-23',
    thumbnail: 'coding'
  }
];

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: 'Alex Johnson',
    username: '@alexj_streams',
    bio: 'Tech enthusiast and content creator passionate about sharing knowledge through live streaming and screen sharing.',
    location: 'San Francisco, CA',
    website: 'https://alexjohnson.dev',
    joinedDate: 'March 2024'
  });

  const stats = {
    followers: 15420,
    following: 89,
    totalViews: 234567,
    totalStreams: 156,
    avgViewers: 892,
    hoursStreamed: 345
  };

  const handleSaveProfile = () => {
    setIsEditing(false);
    // Save profile logic would go here
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="mb-8">
            <CardContent className="pt-8">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Avatar Section */}
                <div className="flex flex-col items-center">
                  <motion.div
                    className="relative group"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="w-32 h-32 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                      AJ
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute bottom-0 right-0 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </motion.div>
                  <div className="mt-4 text-center">
                    <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Online
                    </div>
                  </div>
                </div>

                {/* Profile Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.name}</h1>
                      <p className="text-lg text-gray-600 mb-2">{profile.username}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Joined {profile.joinedDate}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {profile.location}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit Profile
                    </Button>
                  </div>

                  <p className="text-gray-700 mb-6 leading-relaxed">{profile.bio}</p>

                  <div className="flex items-center gap-2 mb-6">
                    <LinkIcon className="h-4 w-4 text-red-600" />
                    <a 
                      href={profile.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-red-600 hover:text-red-700 transition-colors"
                    >
                      {profile.website}
                    </a>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-3">
                    <Link href="/stream">
                      <Button className="animate-pulse-red">
                        <Play className="h-4 w-4 mr-2" />
                        Start Stream
                      </Button>
                    </Link>
                    <Link href="/screen-share">
                      <Button variant="secondary">
                        <Monitor className="h-4 w-4 mr-2" />
                        Screen Share
                      </Button>
                    </Link>
                    <Link href="/settings">
                      <Button variant="ghost">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card hover className="text-center">
            <CardContent className="pt-6">
              <Users className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.followers.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Followers</div>
            </CardContent>
          </Card>
          
          <Card hover className="text-center">
            <CardContent className="pt-6">
              <Eye className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.totalViews.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Views</div>
            </CardContent>
          </Card>
          
          <Card hover className="text-center">
            <CardContent className="pt-6">
              <Play className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.totalStreams}</div>
              <div className="text-sm text-gray-600">Streams</div>
            </CardContent>
          </Card>
          
          <Card hover className="text-center">
            <CardContent className="pt-6">
              <Heart className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.avgViewers.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Avg Viewers</div>
            </CardContent>
          </Card>
          
          <Card hover className="text-center">
            <CardContent className="pt-6">
              <Zap className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.hoursStreamed}</div>
              <div className="text-sm text-gray-600">Hours</div>
            </CardContent>
          </Card>
          
          <Card hover className="text-center">
            <CardContent className="pt-6">
              <Users className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.following}</div>
              <div className="text-sm text-gray-600">Following</div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Streams */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Recent Streams</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {streamHistory.map((stream, index) => (
                      <motion.div
                        key={stream.id}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="w-16 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded flex items-center justify-center">
                          <Play className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{stream.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <span>{stream.viewers.toLocaleString()} viewers</span>
                            <span>{stream.duration}</span>
                            <span>{stream.date}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                  <Button variant="secondary" className="w-full mt-4">
                    View All Streams
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Achievements */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-red-600" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {achievements.map((achievement, index) => (
                      <motion.div
                        key={achievement.title}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          achievement.earned 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className={`p-2 rounded-full ${
                          achievement.earned 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          <achievement.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-medium text-sm ${
                            achievement.earned ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            {achievement.title}
                          </h4>
                          <p className="text-xs text-gray-500">{achievement.description}</p>
                        </div>
                        {achievement.earned && (
                          <div className="text-green-600">
                            <Trophy className="h-4 w-4" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Edit Profile Modal */}
        <Modal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          title="Edit Profile"
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveProfile}>
                Save Changes
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Display Name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
            <Input
              label="Username"
              value={profile.username}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Bio</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                rows={4}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              />
            </div>
            <Input
              label="Location"
              value={profile.location}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              icon={MapPin}
            />
            <Input
              label="Website"
              value={profile.website}
              onChange={(e) => setProfile({ ...profile, website: e.target.value })}
              icon={LinkIcon}
            />
          </div>
        </Modal>
      </div>
    </div>
  );
}