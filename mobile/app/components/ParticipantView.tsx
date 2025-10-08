import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { videoSDKService } from '../../config/videosdk';

export default function ParticipantView({ participantId }: { participantId: string }) {
  // Runtime fetch of components — requires videoSDKService.initialize() to have run successfully
  let components: any;
  try {
    components = videoSDKService.getComponents();
  } catch {
    throw new Error('VideoSDK not initialized. Call videoSDKService.initialize() or run a development build (npx expo run:android).');
  }

  const useParticipantSafe: any = components.useParticipant || (() => ({ webcamStream: null, webcamOn: false, displayName: '' }));
  const RTCView: any = components.RTCView;

  const p = useParticipantSafe(participantId) as any;
  const { webcamStream, webcamOn, displayName } = p || { webcamStream: null, webcamOn: false, displayName: participantId };

  return (
    <View style={styles.wrap}>
      <Text style={styles.name}>{displayName || participantId}</Text>
      {webcamOn && webcamStream ? (
        RTCView ? <RTCView streamURL={webcamStream.toURL()} style={styles.video} objectFit="cover" /> : <View style={styles.placeholder}><Text style={styles.offText}>Video</Text></View>
      ) : (
        <View style={styles.placeholder}><Text style={styles.offText}>Camera Off</Text></View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, height: 180, backgroundColor: '#222', margin: 6, borderRadius: 8, overflow: 'hidden' },
  name: { color: '#fff', padding: 6, fontWeight: '600' },
  video: { flex: 1, backgroundColor: '#000' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  offText: { color: '#9ca3af' },
});
