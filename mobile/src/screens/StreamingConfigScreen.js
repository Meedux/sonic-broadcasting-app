import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const StreamingConfigScreen = ({ navigation }) => {
  const [youtubeKey, setYoutubeKey] = useState('');
  const [facebookKey, setFacebookKey] = useState('');
  const [enableYoutube, setEnableYoutube] = useState(true);
  const [enableFacebook, setEnableFacebook] = useState(true);

  useEffect(() => {
    loadStoredKeys();
  }, []);

  const loadStoredKeys = async () => {
    try {
      const storedYoutubeKey = await AsyncStorage.getItem('youtube_stream_key');
      const storedFacebookKey = await AsyncStorage.getItem('facebook_stream_key');
      const storedYoutubeEnabled = await AsyncStorage.getItem('youtube_enabled');
      const storedFacebookEnabled = await AsyncStorage.getItem('facebook_enabled');

      if (storedYoutubeKey) setYoutubeKey(storedYoutubeKey);
      if (storedFacebookKey) setFacebookKey(storedFacebookKey);
      if (storedYoutubeEnabled !== null) setEnableYoutube(JSON.parse(storedYoutubeEnabled));
      if (storedFacebookEnabled !== null) setEnableFacebook(JSON.parse(storedFacebookEnabled));
    } catch (error) {
      console.error('Error loading stored keys:', error);
    }
  };

  const saveConfiguration = async () => {
    try {
      await AsyncStorage.setItem('youtube_stream_key', youtubeKey);
      await AsyncStorage.setItem('facebook_stream_key', facebookKey);
      await AsyncStorage.setItem('youtube_enabled', JSON.stringify(enableYoutube));
      await AsyncStorage.setItem('facebook_enabled', JSON.stringify(enableFacebook));

      Alert.alert('Success', 'Streaming configuration saved successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving configuration:', error);
      Alert.alert('Error', 'Failed to save configuration');
    }
  };

  const clearConfiguration = () => {
    Alert.alert(
      'Clear Configuration',
      'Are you sure you want to clear all streaming keys?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'youtube_stream_key',
                'facebook_stream_key',
                'youtube_enabled',
                'facebook_enabled'
              ]);
              setYoutubeKey('');
              setFacebookKey('');
              setEnableYoutube(true);
              setEnableFacebook(true);
              Alert.alert('Success', 'Configuration cleared');
            } catch (error) {
              console.error('Error clearing configuration:', error);
            }
          }
        }
      ]
    );
  };

  const openYouTubeHelp = () => {
    Alert.alert(
      'YouTube Stream Key',
      'To get your YouTube stream key:\n\n1. Go to YouTube Studio\n2. Click "Create" → "Go Live"\n3. Select "Stream" tab\n4. Copy your "Stream key"\n\nNote: You need to enable live streaming on your YouTube channel first.',
      [{ text: 'OK' }]
    );
  };

  const openFacebookHelp = () => {
    Alert.alert(
      'Facebook Stream Key',
      'To get your Facebook stream key:\n\n1. Go to Facebook Creator Studio\n2. Click "Create" → "Live Video"\n3. Select "Streaming Software"\n4. Copy your "Stream Key"\n\nNote: Your Facebook page must be eligible for live streaming.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Streaming Configuration</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Configure your streaming keys for real YouTube and Facebook livestreaming
        </Text>

        {/* YouTube Configuration */}
        <View style={styles.platformSection}>
          <View style={styles.platformHeader}>
            <Text style={styles.platformTitle}>🎥 YouTube Live</Text>
            <Switch
              value={enableYoutube}
              onValueChange={setEnableYoutube}
              trackColor={{ false: '#333333', true: '#FF0000' }}
              thumbColor={enableYoutube ? '#FFFFFF' : '#666666'}
            />
          </View>
          
          {enableYoutube && (
            <>
              <TouchableOpacity style={styles.helpButton} onPress={openYouTubeHelp}>
                <Text style={styles.helpButtonText}>? How to get YouTube stream key</Text>
              </TouchableOpacity>
              
              <TextInput
                style={styles.input}
                placeholder="Enter your YouTube stream key"
                placeholderTextColor="#666666"
                value={youtubeKey}
                onChangeText={setYoutubeKey}
                secureTextEntry={true}
                multiline={false}
              />
              
              <Text style={styles.inputHelp}>
                Your stream key is private. Keep it secure.
              </Text>
            </>
          )}
        </View>

        {/* Facebook Configuration */}
        <View style={styles.platformSection}>
          <View style={styles.platformHeader}>
            <Text style={styles.platformTitle}>📘 Facebook Live</Text>
            <Switch
              value={enableFacebook}
              onValueChange={setEnableFacebook}
              trackColor={{ false: '#333333', true: '#1877F2' }}
              thumbColor={enableFacebook ? '#FFFFFF' : '#666666'}
            />
          </View>
          
          {enableFacebook && (
            <>
              <TouchableOpacity style={styles.helpButton} onPress={openFacebookHelp}>
                <Text style={styles.helpButtonText}>? How to get Facebook stream key</Text>
              </TouchableOpacity>
              
              <TextInput
                style={styles.input}
                placeholder="Enter your Facebook stream key"
                placeholderTextColor="#666666"
                value={facebookKey}
                onChangeText={setFacebookKey}
                secureTextEntry={true}
                multiline={false}
              />
              
              <Text style={styles.inputHelp}>
                Your stream key is private. Keep it secure.
              </Text>
            </>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={saveConfiguration}>
            <Text style={styles.saveButtonText}>Save Configuration</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearButton} onPress={clearConfiguration}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Important Notes:</Text>
          <Text style={styles.infoText}>
            • Stream keys are stored securely on your device only{'\n'}
            • You need active YouTube/Facebook accounts with live streaming enabled{'\n'}
            • RTMP streaming requires stable internet connection{'\n'}
            • Desktop screen sharing + mobile camera will be combined for streaming
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    fontSize: 16,
    color: '#00D4FF',
    marginRight: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 30,
    textAlign: 'center',
  },
  platformSection: {
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  platformHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  platformTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  helpButton: {
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  helpButtonText: {
    color: '#00D4FF',
    fontSize: 14,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 15,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 10,
  },
  inputHelp: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 30,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#00D4FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 15,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },
});

export default StreamingConfigScreen;