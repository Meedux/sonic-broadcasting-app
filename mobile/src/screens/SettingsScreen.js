import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Linking,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Card, CardContent} from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';

const SettingsScreen = () => {
  const [pcSettings, setPcSettings] = useState({
    ipAddress: '192.168.1.100',
    port: '8080',
    autoConnect: true,
    useSSL: false,
  });

  const [streamSettings, setStreamSettings] = useState({
    maxResolution: '1080p',
    maxFramerate: '30fps',
    adaptiveQuality: true,
    autoReconnect: true,
  });

  const [appSettings, setAppSettings] = useState({
    notifications: true,
    keepScreenOn: true,
    darkMode: false,
    hapticFeedback: true,
  });

  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [tempIpAddress, setTempIpAddress] = useState(pcSettings.ipAddress);
  const [tempPort, setTempPort] = useState(pcSettings.port);

  const handleSavePcSettings = () => {
    if (!tempIpAddress || !tempPort) {
      Alert.alert('Invalid Input', 'Please enter valid IP address and port.');
      return;
    }

    setPcSettings(prev => ({
      ...prev,
      ipAddress: tempIpAddress,
      port: tempPort,
    }));

    setShowConnectionModal(false);
    Alert.alert('Settings Saved', 'PC connection settings have been updated.');
  };

  const handleTestConnection = async () => {
    Alert.alert(
      'Testing Connection',
      `Testing connection to ${tempIpAddress}:${tempPort}...`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'OK',
          onPress: () => {
            // Simulate connection test
            setTimeout(() => {
              const success = Math.random() > 0.3; // 70% success rate
              Alert.alert(
                success ? 'Connection Successful' : 'Connection Failed',
                success 
                  ? 'Successfully connected to your PC.' 
                  : 'Unable to connect. Please check your settings.',
              );
            }, 2000);
          }
        }
      ]
    );
  };

  const handleShareApp = () => {
    Share.share({
      message: 'Check out the Sonic Broadcasting mobile app! Control your PC streaming remotely and view screen sharing from anywhere.',
      title: 'Sonic Broadcasting Mobile',
    });
  };

  const handleOpenSupport = () => {
    Linking.openURL('https://support.sonicbroadcasting.app');
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset All Settings',
      'Are you sure you want to reset all settings to default values? This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setPcSettings({
              ipAddress: '192.168.1.100',
              port: '8080',
              autoConnect: true,
              useSSL: false,
            });
            setStreamSettings({
              maxResolution: '1080p',
              maxFramerate: '30fps',
              adaptiveQuality: true,
              autoReconnect: true,
            });
            setAppSettings({
              notifications: true,
              keepScreenOn: true,
              darkMode: false,
              hapticFeedback: true,
            });
            Alert.alert('Settings Reset', 'All settings have been reset to default values.');
          }
        }
      ]
    );
  };

  const resolutionOptions = ['480p', '720p', '1080p', '1440p', '4K'];
  const framerateOptions = ['15fps', '30fps', '60fps'];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* PC Connection Settings */}
      <Card style={styles.card}>
        <CardContent>
          <View style={styles.sectionHeader}>
            <Icon name="computer" size={24} color="#dc2626" />
            <Text style={styles.sectionTitle}>PC Connection</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>PC Address</Text>
              <Text style={styles.settingValue}>{pcSettings.ipAddress}:{pcSettings.port}</Text>
            </View>
            <Button
              title="Configure"
              variant="secondary"
              size="sm"
              onPress={() => setShowConnectionModal(true)}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto Connect</Text>
              <Text style={styles.settingDescription}>
                Automatically connect to PC when app starts
              </Text>
            </View>
            <Switch
              value={pcSettings.autoConnect}
              onValueChange={(value) =>
                setPcSettings(prev => ({...prev, autoConnect: value}))
              }
              trackColor={{false: '#d1d5db', true: '#dc2626'}}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Use SSL</Text>
              <Text style={styles.settingDescription}>
                Enable secure connection (requires SSL setup)
              </Text>
            </View>
            <Switch
              value={pcSettings.useSSL}
              onValueChange={(value) =>
                setPcSettings(prev => ({...prev, useSSL: value}))
              }
              trackColor={{false: '#d1d5db', true: '#dc2626'}}
              thumbColor="#ffffff"
            />
          </View>
        </CardContent>
      </Card>

      {/* Stream Quality Settings */}
      <Card style={styles.card}>
        <CardContent>
          <View style={styles.sectionHeader}>
            <Icon name="hd" size={24} color="#dc2626" />
            <Text style={styles.sectionTitle}>Stream Quality</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Maximum Resolution</Text>
              <Text style={styles.settingDescription}>
                Highest resolution for screen viewing
              </Text>
            </View>
            <View style={styles.qualitySelector}>
              {resolutionOptions.map((resolution) => (
                <Button
                  key={resolution}
                  title={resolution}
                  variant={streamSettings.maxResolution === resolution ? 'primary' : 'secondary'}
                  size="sm"
                  onPress={() => setStreamSettings(prev => ({...prev, maxResolution: resolution}))}
                  style={styles.qualityButton}
                />
              ))}
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Maximum Framerate</Text>
              <Text style={styles.settingDescription}>
                Highest framerate for smooth viewing
              </Text>
            </View>
            <View style={styles.qualitySelector}>
              {framerateOptions.map((framerate) => (
                <Button
                  key={framerate}
                  title={framerate}
                  variant={streamSettings.maxFramerate === framerate ? 'primary' : 'secondary'}
                  size="sm"
                  onPress={() => setStreamSettings(prev => ({...prev, maxFramerate: framerate}))}
                  style={styles.qualityButton}
                />
              ))}
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Adaptive Quality</Text>
              <Text style={styles.settingDescription}>
                Automatically adjust quality based on connection
              </Text>
            </View>
            <Switch
              value={streamSettings.adaptiveQuality}
              onValueChange={(value) =>
                setStreamSettings(prev => ({...prev, adaptiveQuality: value}))
              }
              trackColor={{false: '#d1d5db', true: '#dc2626'}}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto Reconnect</Text>
              <Text style={styles.settingDescription}>
                Automatically reconnect if stream is interrupted
              </Text>
            </View>
            <Switch
              value={streamSettings.autoReconnect}
              onValueChange={(value) =>
                setStreamSettings(prev => ({...prev, autoReconnect: value}))
              }
              trackColor={{false: '#d1d5db', true: '#dc2626'}}
              thumbColor="#ffffff"
            />
          </View>
        </CardContent>
      </Card>

      {/* App Settings */}
      <Card style={styles.card}>
        <CardContent>
          <View style={styles.sectionHeader}>
            <Icon name="settings" size={24} color="#dc2626" />
            <Text style={styles.sectionTitle}>App Settings</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive notifications about stream status
              </Text>
            </View>
            <Switch
              value={appSettings.notifications}
              onValueChange={(value) =>
                setAppSettings(prev => ({...prev, notifications: value}))
              }
              trackColor={{false: '#d1d5db', true: '#dc2626'}}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Keep Screen On</Text>
              <Text style={styles.settingDescription}>
                Prevent screen from dimming during viewing
              </Text>
            </View>
            <Switch
              value={appSettings.keepScreenOn}
              onValueChange={(value) =>
                setAppSettings(prev => ({...prev, keepScreenOn: value}))
              }
              trackColor={{false: '#d1d5db', true: '#dc2626'}}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingDescription}>
                Use dark theme throughout the app
              </Text>
            </View>
            <Switch
              value={appSettings.darkMode}
              onValueChange={(value) =>
                setAppSettings(prev => ({...prev, darkMode: value}))
              }
              trackColor={{false: '#d1d5db', true: '#dc2626'}}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Text style={styles.settingDescription}>
                Vibration feedback for interactions
              </Text>
            </View>
            <Switch
              value={appSettings.hapticFeedback}
              onValueChange={(value) =>
                setAppSettings(prev => ({...prev, hapticFeedback: value}))
              }
              trackColor={{false: '#d1d5db', true: '#dc2626'}}
              thumbColor="#ffffff"
            />
          </View>
        </CardContent>
      </Card>

      {/* About & Support */}
      <Card style={styles.card}>
        <CardContent>
          <View style={styles.sectionHeader}>
            <Icon name="info" size={24} color="#dc2626" />
            <Text style={styles.sectionTitle}>About & Support</Text>
          </View>

          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>

          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Build</Text>
            <Text style={styles.aboutValue}>2024.01.001</Text>
          </View>

          <View style={styles.buttonGroup}>
            <Button
              title="Share App"
              icon="share"
              variant="secondary"
              onPress={handleShareApp}
              style={styles.actionButton}
            />

            <Button
              title="Get Support"
              icon="help"
              variant="secondary"
              onPress={handleOpenSupport}
              style={styles.actionButton}
            />
          </View>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card style={[styles.card, styles.dangerCard]}>
        <CardContent>
          <View style={styles.sectionHeader}>
            <Icon name="warning" size={24} color="#dc2626" />
            <Text style={styles.dangerTitle}>Danger Zone</Text>
          </View>

          <Text style={styles.dangerDescription}>
            Reset all app settings to their default values. This action cannot be undone.
          </Text>

          <Button
            title="Reset All Settings"
            icon="restore"
            variant="danger"
            onPress={handleResetSettings}
            style={styles.dangerButton}
          />
        </CardContent>
      </Card>

      {/* Connection Configuration Modal */}
      <Modal
        visible={showConnectionModal}
        title="PC Connection Settings"
        onClose={() => setShowConnectionModal(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalDescription}>
            Configure the connection to your PC running Sonic Broadcasting.
          </Text>

          <Input
            label="IP Address"
            placeholder="192.168.1.100"
            value={tempIpAddress}
            onChangeText={setTempIpAddress}
            keyboardType="numeric"
            style={styles.modalInput}
          />

          <Input
            label="Port"
            placeholder="8080"
            value={tempPort}
            onChangeText={setTempPort}
            keyboardType="numeric"
            style={styles.modalInput}
          />

          <View style={styles.modalButtons}>
            <Button
              title="Test Connection"
              icon="wifi"
              variant="secondary"
              onPress={handleTestConnection}
              style={styles.modalButton}
            />

            <Button
              title="Save"
              icon="save"
              onPress={handleSavePcSettings}
              style={styles.modalButton}
            />
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
  },
  card: {
    margin: 16,
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 12,
  },
  dangerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc2626',
    marginLeft: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  qualitySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  qualityButton: {
    minWidth: 60,
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  aboutLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  aboutValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
  },
  dangerCard: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
    marginBottom: 32,
  },
  dangerDescription: {
    fontSize: 14,
    color: '#dc2626',
    marginBottom: 16,
    lineHeight: 20,
  },
  dangerButton: {
    alignSelf: 'flex-start',
  },
  modalContent: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInput: {
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
  },
});

export default SettingsScreen;