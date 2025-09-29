import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Card, CardHeader, CardTitle, CardContent} from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import {Loading} from '../components/Loading';

const StreamControlScreen = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenShare, setIsScreenShare] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [streamKey, setStreamKey] = useState('');
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [streamStats, setStreamStats] = useState({
    duration: 0,
    viewers: 0,
    quality: 'HD 1080p',
    bitrate: '4800 kbps',
  });

  const platforms = [
    {
      id: 'youtube',
      name: 'YouTube',
      icon: 'play-circle-filled',
      color: '#dc2626',
      description: 'Stream to YouTube Live',
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'facebook',
      color: '#1877f2',
      description: 'Stream to Facebook Live',
    },
  ];

  useEffect(() => {
    let interval;
    if (isStreaming) {
      interval = setInterval(() => {
        setStreamStats(prev => ({
          ...prev,
          duration: prev.duration + 1,
          viewers: Math.max(0, prev.viewers + Math.floor(Math.random() * 5 - 2)),
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStreaming]);

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to your PC first.');
      return;
    }
    if (!isSetupComplete) {
      Alert.alert('Setup Required', 'Please setup your stream first.');
      return;
    }
    setIsStreaming(true);
  };

  const handleStopStream = () => {
    Alert.alert(
      'Stop Stream',
      'Are you sure you want to stop the stream?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Stop',
          style: 'destructive',
          onPress: () => {
            setIsStreaming(false);
            setStreamStats(prev => ({ ...prev, duration: 0, viewers: 0 }));
          },
        },
      ]
    );
  };

  const toggleScreenShare = () => {
    if (isStreaming) {
      Alert.alert('Cannot Change', 'Cannot change source while streaming.');
      return;
    }
    setIsScreenShare(!isScreenShare);
  };

  if (!isConnected) {
    return (
      <View style={styles.disconnectedContainer}>
        <Icon name="wifi-off" size={64} color="#6b7280" />
        <Text style={styles.disconnectedTitle}>Not Connected</Text>
        <Text style={styles.disconnectedText}>
          Connect to your PC to control streaming
        </Text>
        <Button
          title="Retry Connection"
          onPress={() => setIsConnected(true)}
          style={styles.retryButton}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Platform Selection */}
      {!isSetupComplete && (
        <Card style={styles.card}>
          <CardHeader>
            <CardTitle>Choose Streaming Platform</CardTitle>
          </CardHeader>
          <CardContent>
            {platforms.map((platform) => (
              <Button
                key={platform.id}
                title={platform.name}
                icon={platform.icon}
                variant={selectedPlatform?.id === platform.id ? 'primary' : 'secondary'}
                onPress={() => handlePlatformSelect(platform)}
                style={styles.platformButton}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stream Information */}
      <Card style={styles.card}>
        <CardHeader>
          <CardTitle>Stream Information</CardTitle>
        </CardHeader>
        <CardContent>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, {backgroundColor: isStreaming ? '#dc2626' : '#6b7280'}]} />
              <Text style={[styles.infoValue, {color: isStreaming ? '#dc2626' : '#6b7280'}]}>
                {isStreaming ? 'Live' : 'Offline'}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Platform</Text>
            <Text style={styles.infoValue}>
              {selectedPlatform ? selectedPlatform.name : 'Not selected'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Source</Text>
            <Text style={styles.infoValue}>
              {isScreenShare ? 'Screen Share' : 'Camera'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Viewers</Text>
            <Text style={styles.infoValue}>{streamStats.viewers.toLocaleString()}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>{formatDuration(streamStats.duration)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Quality</Text>
            <Text style={[styles.infoValue, {color: '#10b981'}]}>{streamStats.quality}</Text>
          </View>
        </CardContent>
      </Card>

      {/* Stream Controls */}
      <Card style={styles.card}>
        <CardHeader>
          <CardTitle>Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Video</Text>
            <Switch
              value={isVideoEnabled}
              onValueChange={setIsVideoEnabled}
              trackColor={{false: '#d1d5db', true: '#fca5a5'}}
              thumbColor={isVideoEnabled ? '#dc2626' : '#9ca3af'}
            />
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Audio</Text>
            <Switch
              value={isAudioEnabled}
              onValueChange={setIsAudioEnabled}
              trackColor={{false: '#d1d5db', true: '#fca5a5'}}
              thumbColor={isAudioEnabled ? '#dc2626' : '#9ca3af'}
            />
          </View>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Screen Share</Text>
            <Switch
              value={isScreenShare}
              onValueChange={toggleScreenShare}
              trackColor={{false: '#d1d5db', true: '#fca5a5'}}
              thumbColor={isScreenShare ? '#dc2626' : '#9ca3af'}
              disabled={isStreaming}
            />
          </View>
        </CardContent>
      </Card>

      {/* Stream Actions */}
      <Card style={styles.card}>
        <CardContent>
          {!isSetupComplete ? (
            <Button
              title="Setup Stream First"
              icon="settings"
              disabled
              style={styles.actionButton}
            />
          ) : !isStreaming ? (
            <Button
              title="Go Live"
              icon="play-circle-filled"
              onPress={handleStartStream}
              style={styles.actionButton}
            />
          ) : (
            <Button
              title="End Stream"
              icon="stop"
              variant="danger"
              onPress={handleStopStream}
              style={styles.actionButton}
            />
          )}
        </CardContent>
      </Card>

      {/* Stream Setup Modal */}
      <Modal
        visible={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        title={`Setup ${selectedPlatform?.name} Stream`}
        footer={
          <>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => setShowSetupModal(false)}
            />
            <Button
              title="Setup Stream"
              onPress={handleSetupStream}
              disabled={!streamKey || !streamTitle}
            />
          </>
        }>
        <View style={styles.modalContent}>
          {selectedPlatform && (
            <View style={styles.platformInfo}>
              <Icon 
                name={selectedPlatform.icon} 
                size={24} 
                color={selectedPlatform.color} 
              />
              <Text style={styles.platformName}>{selectedPlatform.name} Live</Text>
            </View>
          )}

          <Input
            label="Stream Key"
            value={streamKey}
            onChangeText={setStreamKey}
            placeholder={`Enter your ${selectedPlatform?.name} stream key`}
            secureTextEntry
            icon="key"
          />

          <Input
            label="Stream Title"
            value={streamTitle}
            onChangeText={setStreamTitle}
            placeholder="Give your stream a catchy title"
          />

          <Input
            label="Stream Description"
            value={streamDescription}
            onChangeText={setStreamDescription}
            placeholder="Tell viewers what your stream is about..."
            multiline
            numberOfLines={3}
          />

          <View style={styles.infoBox}>
            <Icon name="info" size={20} color="#3b82f6" />
            <Text style={styles.infoBoxText}>
              Your stream will be visible to your {selectedPlatform?.name} audience once you go live.
            </Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  disconnectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 32,
  },
  disconnectedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  disconnectedText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    marginTop: 16,
  },
  card: {
    marginBottom: 16,
  },
  platformButton: {
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  controlLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  actionButton: {
    marginBottom: 8,
  },
  modalContent: {
    gap: 16,
  },
  platformInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 8,
  },
  platformName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderColor: '#93c5fd',
    borderWidth: 1,
  },
  infoBoxText: {
    fontSize: 14,
    color: '#1e40af',
    marginLeft: 8,
    flex: 1,
  },
});

export default StreamControlScreen;