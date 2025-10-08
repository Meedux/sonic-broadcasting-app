import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { videoSDKService } from '../../config/videosdk';

export default function JoinScreen({ onJoin }: { onJoin: (meetingId: string, token: string) => void }) {
  const [meetingId, setMeetingId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const id = meetingId.trim();
    if (!id) return Alert.alert('Meeting ID required');

    setLoading(true);
    try {
      const available = await videoSDKService.initialize();
      if (!available) {
        Alert.alert('VideoSDK not available', 'Use a development build (not Expo Go)');
        setLoading(false);
        return;
      }

      // Use existing token (server-side token exchange recommended in prod)
      const token = videoSDKService.getToken();

      if (!token) throw new Error('No token');

      // Validate the meeting exists on the server before trying to join
      try {
        const res = await fetch(`https://api.videosdk.live/v2/rooms/${encodeURIComponent(id)}`, {
          method: 'GET',
          headers: { Authorization: token, 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
          const statusText = `${res.status} ${res.statusText}`;
          console.warn('Room validation failed', statusText);
          return Alert.alert('Invalid meeting', 'Meeting not found or inaccessible');
        }
      } catch (err) {
        console.warn('Room validation error', err);
        return Alert.alert('Validation failed', 'Unable to verify meeting ID');
      }

      // Passed validation — hand the meetingId and token to the Meeting screen
      onJoin(id, token);
    } catch (err: any) {
      console.error('Join failed', err);
      Alert.alert('Join failed', err?.message || 'Unable to join');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join Meeting</Text>
      <TextInput
        placeholder="Meeting ID"
        value={meetingId}
        onChangeText={setMeetingId}
        style={styles.input}
        autoCapitalize="none"
      />

      <TouchableOpacity style={[styles.button, loading && styles.disabled]} onPress={handleJoin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Connecting…' : 'Join Meeting'}</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>Make sure you run the Desktop app first and copy the meeting ID.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  input: { height: 48, borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 12, borderRadius: 8, marginBottom: 12 },
  button: { height: 48, backgroundColor: '#007AFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '600' },
  hint: { marginTop: 12, color: '#666', fontSize: 13 },
});
