import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Card, CardHeader, CardTitle, CardContent} from '../components/Card';
import Button from '../components/Button';
import {Loading} from '../components/Loading';

const HomeScreen = ({navigation}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [pcStatus, setPcStatus] = useState('offline');
  const [streamStatus, setStreamStatus] = useState('offline');
  const [refreshing, setRefreshing] = useState(false);
  const [recentStreams] = useState([
    {
      id: 1,
      title: 'Gaming Session - Fortnite',
      platform: 'YouTube',
      duration: '2:34:12',
      viewers: '1,234',
      date: '2025-09-29',
    },
    {
      id: 2,
      title: 'Coding Tutorial - React Native',
      platform: 'Facebook',
      duration: '1:45:30',
      viewers: '567',
      date: '2025-09-28',
    },
    {
      id: 3,
      title: 'Product Demo - Sonic Broadcasting',
      platform: 'YouTube',
      duration: '45:22',
      viewers: '2,156',
      date: '2025-09-27',
    },
  ]);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setIsConnecting(true);
    // Simulate connection check
    setTimeout(() => {
      setIsConnected(Math.random() > 0.3);
      setPcStatus(Math.random() > 0.5 ? 'online' : 'offline');
      setStreamStatus(Math.random() > 0.7 ? 'live' : 'offline');
      setIsConnecting(false);
    }, 2000);
  };

  const onRefresh = () => {
    setRefreshing(true);
    checkConnection().finally(() => setRefreshing(false));
  };

  const handleQuickStream = () => {
    if (!isConnected) {
      Alert.alert(
        'Not Connected',
        'Please connect to your PC first to start streaming.',
        [{text: 'OK'}]
      );
      return;
    }
    navigation.navigate('Stream Control');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
      case 'live':
        return '#10b981';
      case 'offline':
        return '#6b7280';
      default:
        return '#f59e0b';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'live':
        return 'Live';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  const getPlatformIcon = (platform) => {
    return platform === 'YouTube' ? 'play-circle-filled' : 'facebook';
  };

  if (isConnecting && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Loading message="Checking connection..." />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Connection Status */}
      <Card style={styles.statusCard}>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
        </CardHeader>
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
              <View style={[styles.statusDot, {backgroundColor: getStatusColor(pcStatus)}]} />
              <Text style={styles.statusLabel}>PC Status</Text>
              <Text style={[styles.statusValue, {color: getStatusColor(pcStatus)}]}>
                {getStatusText(pcStatus)}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, {backgroundColor: getStatusColor(streamStatus)}]} />
              <Text style={styles.statusLabel}>Stream Status</Text>
              <Text style={[styles.statusValue, {color: getStatusColor(streamStatus)}]}>
                {getStatusText(streamStatus)}
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card style={styles.card}>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <View style={styles.actionGrid}>
            <Button
              title="Start Stream"
              icon="play-circle-filled"
              onPress={handleQuickStream}
              style={styles.actionButton}
            />
            <Button
              title="View Screen"
              icon="screen-share"
              variant="secondary"
              onPress={() => navigation.navigate('Screen View')}
              style={styles.actionButton}
            />
          </View>
          <View style={styles.actionGrid}>
            <Button
              title="Stream Control"
              icon="settings"
              variant="secondary"
              onPress={() => navigation.navigate('Stream Control')}
              style={styles.actionButton}
            />
            <Button
              title="Settings"
              icon="settings"
              variant="secondary"
              onPress={() => navigation.navigate('Settings')}
              style={styles.actionButton}
            />
          </View>
        </CardContent>
      </Card>

      {/* Recent Streams */}
      <Card style={styles.card}>
        <CardHeader>
          <CardTitle>Recent Streams</CardTitle>
        </CardHeader>
        <CardContent>
          {recentStreams.map((stream) => (
            <TouchableOpacity key={stream.id} style={styles.streamItem}>
              <View style={styles.streamHeader}>
                <Icon
                  name={getPlatformIcon(stream.platform)}
                  size={24}
                  color={stream.platform === 'YouTube' ? '#dc2626' : '#1877f2'}
                />
                <View style={styles.streamInfo}>
                  <Text style={styles.streamTitle} numberOfLines={1}>
                    {stream.title}
                  </Text>
                  <Text style={styles.streamMeta}>
                    {stream.platform} • {stream.date}
                  </Text>
                </View>
              </View>
              <View style={styles.streamStats}>
                <Text style={styles.statText}>
                  <Icon name="visibility" size={14} color="#6b7280" /> {stream.viewers}
                </Text>
                <Text style={styles.statText}>
                  <Icon name="access-time" size={14} color="#6b7280" /> {stream.duration}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </CardContent>
      </Card>

      {/* Connection Help */}
      {!isConnected && (
        <Card style={[styles.card, styles.helpCard]}>
          <CardContent>
            <View style={styles.helpContent}>
              <Icon name="help-outline" size={32} color="#f59e0b" />
              <Text style={styles.helpTitle}>Need Help Connecting?</Text>
              <Text style={styles.helpText}>
                Make sure your PC and mobile device are on the same network and the Sonic Broadcasting desktop app is running.
              </Text>
              <Button
                title="Connection Guide"
                variant="secondary"
                size="sm"
                onPress={() => {/* Navigate to help */}}
                style={styles.helpButton}
              />
            </View>
          </CardContent>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  statusCard: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
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
  actionGrid: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  streamItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  streamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  streamInfo: {
    flex: 1,
    marginLeft: 12,
  },
  streamTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  streamMeta: {
    fontSize: 14,
    color: '#6b7280',
  },
  streamStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
    alignItems: 'center',
  },
  helpCard: {
    borderColor: '#fbbf24',
    borderWidth: 1,
  },
  helpContent: {
    alignItems: 'center',
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400e',
    marginTop: 12,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  helpButton: {
    alignSelf: 'center',
  },
});

export default HomeScreen;