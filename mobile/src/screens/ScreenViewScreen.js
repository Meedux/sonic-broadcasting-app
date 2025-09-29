import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Card, CardContent} from '../components/Card';
import Button from '../components/Button';
import {Loading} from '../components/Loading';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

const ScreenViewScreen = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [isReceivingStream, setIsReceivingStream] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [streamStats, setStreamStats] = useState({
    resolution: '1920x1080',
    fps: 30,
    bitrate: '4.8 Mbps',
    latency: '45ms',
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate connection status changes
    const interval = setInterval(() => {
      setConnectionQuality(prev => {
        const qualities = ['excellent', 'good', 'fair', 'poor'];
        const currentIndex = qualities.indexOf(prev);
        const nextIndex = Math.floor(Math.random() * qualities.length);
        return qualities[nextIndex];
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleStartScreenView = async () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to your PC first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Simulate WebRTC connection setup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (Math.random() > 0.8) { // 20% chance of failure for demo
        throw new Error('Failed to connect to screen share');
      }

      setIsReceivingStream(true);
    } catch (err) {
      setError(err.message);
      Alert.alert('Connection Failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopScreenView = () => {
    setIsReceivingStream(false);
    setIsFullscreen(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'excellent':
        return '#10b981';
      case 'good':
        return '#10b981';
      case 'fair':
        return '#f59e0b';
      case 'poor':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getQualityIcon = (quality) => {
    switch (quality) {
      case 'excellent':
        return 'signal-cellular-4-bar';
      case 'good':
        return 'signal-cellular-4-bar';
      case 'fair':
        return 'signal-cellular-2-bar';
      case 'poor':
        return 'signal-cellular-1-bar';
      default:
        return 'signal-cellular-off';
    }
  };

  if (!isConnected) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="wifi-off" size={64} color="#6b7280" />
        <Text style={styles.centerTitle}>Not Connected</Text>
        <Text style={styles.centerText}>
          Connect to your PC to view screen sharing
        </Text>
        <Button
          title="Retry Connection"
          onPress={() => setIsConnected(true)}
          style={styles.centerButton}
        />
      </View>
    );
  }

  if (isFullscreen && isReceivingStream) {
    return (
      <View style={styles.fullscreenContainer}>
        <StatusBar hidden />
        
        {/* Mock screen content */}
        <View style={styles.screenContent}>
          <View style={styles.mockDesktop}>
            <Text style={styles.mockText}>PC Desktop Content</Text>
            <Text style={styles.mockSubtext}>Screen sharing active...</Text>
          </View>
        </View>

        {/* Fullscreen controls */}
        <TouchableOpacity
          style={styles.fullscreenControls}
          onPress={toggleFullscreen}>
          <Icon name="fullscreen-exit" size={24} color="#ffffff" />
        </TouchableOpacity>

        {/* Quality indicator */}
        <View style={styles.qualityIndicator}>
          <Icon 
            name={getQualityIcon(connectionQuality)} 
            size={16} 
            color={getQualityColor(connectionQuality)} 
          />
          <Text style={styles.qualityText}>{connectionQuality}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Connection Status */}
      <Card style={styles.card}>
        <CardContent>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, {backgroundColor: isConnected ? '#10b981' : '#ef4444'}]} />
              <Text style={styles.statusLabel}>PC Connection</Text>
              <Text style={[styles.statusValue, {color: isConnected ? '#10b981' : '#ef4444'}]}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Icon 
                name={getQualityIcon(connectionQuality)} 
                size={16} 
                color={getQualityColor(connectionQuality)} 
              />
              <Text style={styles.statusLabel}>Connection Quality</Text>
              <Text style={[styles.statusValue, {color: getQualityColor(connectionQuality)}]}>
                {connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, {backgroundColor: isReceivingStream ? '#10b981' : '#6b7280'}]} />
              <Text style={styles.statusLabel}>Screen Share</Text>
              <Text style={[styles.statusValue, {color: isReceivingStream ? '#10b981' : '#6b7280'}]}>
                {isReceivingStream ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Screen Share Display */}
      <Card style={styles.screenCard}>
        <CardContent style={styles.screenCardContent}>
          {isLoading ? (
            <View style={styles.screenPlaceholder}>
              <Loading message="Connecting to screen share..." />
            </View>
          ) : isReceivingStream ? (
            <TouchableOpacity 
              style={styles.screenDisplay} 
              onPress={toggleFullscreen}
              activeOpacity={0.8}>
              {/* Mock screen content */}
              <View style={styles.mockScreen}>
                <Text style={styles.mockScreenText}>PC Desktop</Text>
                <Text style={styles.mockScreenSubtext}>Tap to view fullscreen</Text>
                <Icon name="fullscreen" size={32} color="#ffffff" style={styles.fullscreenIcon} />
              </View>
              
              {/* Screen overlay with stats */}
              <View style={styles.screenOverlay}>
                <Text style={styles.overlayText}>{streamStats.resolution}</Text>
                <Text style={styles.overlayText}>{streamStats.fps} fps</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.screenPlaceholder}>
              <Icon name="desktop-windows" size={64} color="#6b7280" />
              <Text style={styles.placeholderTitle}>No Screen Share</Text>
              <Text style={styles.placeholderText}>
                Start screen sharing from your PC to view here
              </Text>
            </View>
          )}
        </CardContent>
      </Card>

      {/* Stream Statistics */}
      {isReceivingStream && (
        <Card style={styles.card}>
          <CardContent>
            <Text style={styles.statsTitle}>Stream Statistics</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Resolution</Text>
                <Text style={styles.statValue}>{streamStats.resolution}</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Frame Rate</Text>
                <Text style={styles.statValue}>{streamStats.fps} fps</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Bitrate</Text>
                <Text style={styles.statValue}>{streamStats.bitrate}</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Latency</Text>
                <Text style={styles.statValue}>{streamStats.latency}</Text>
              </View>
            </View>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <Card style={styles.card}>
        <CardContent>
          {!isReceivingStream ? (
            <Button
              title="Start Screen View"
              icon="screen-share"
              onPress={handleStartScreenView}
              loading={isLoading}
              style={styles.controlButton}
            />
          ) : (
            <View style={styles.controlGrid}>
              <Button
                title="Fullscreen"
                icon="fullscreen"
                variant="secondary"
                onPress={toggleFullscreen}
                style={styles.halfButton}
              />
              <Button
                title="Stop View"
                icon="stop"
                variant="danger"
                onPress={handleStopScreenView}
                style={styles.halfButton}
              />
            </View>
          )}
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <Card style={[styles.card, styles.errorCard]}>
          <CardContent>
            <View style={styles.errorContent}>
              <Icon name="error" size={24} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
              <Button
                title="Retry"
                variant="secondary"
                size="sm"
                onPress={handleStartScreenView}
                style={styles.errorButton}
              />
            </View>
          </CardContent>
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 32,
  },
  centerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  centerText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  centerButton: {
    marginTop: 16,
  },
  card: {
    marginBottom: 16,
  },
  screenCard: {
    flex: 1,
    minHeight: 250,
  },
  screenCardContent: {
    flex: 1,
    padding: 0,
  },
  screenDisplay: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  screenPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 32,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  mockScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e40af',
  },
  mockScreenText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  mockScreenSubtext: {
    fontSize: 14,
    color: '#93c5fd',
    marginBottom: 16,
  },
  fullscreenIcon: {
    opacity: 0.7,
  },
  screenOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  overlayText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  screenContent: {
    flex: 1,
  },
  mockDesktop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e40af',
  },
  mockText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  mockSubtext: {
    fontSize: 18,
    color: '#93c5fd',
  },
  fullscreenControls: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 8,
  },
  qualityIndicator: {
    position: 'absolute',
    top: 40,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  statusRow: {
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  statusLabel: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  controlButton: {
    marginBottom: 8,
  },
  controlGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  halfButton: {
    flex: 1,
  },
  errorCard: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    color: '#dc2626',
    fontSize: 14,
  },
  errorButton: {
    alignSelf: 'flex-start',
  },
});

export default ScreenViewScreen;