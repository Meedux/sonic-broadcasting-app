import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { videoSDKService } from '../../config/videosdk';
import ParticipantView from '../components/ParticipantView';

// Do NOT call getComponents() at module load time — must be done after initialize()

export default function MeetingScreen({ meetingId, token, onLeave }: { meetingId: string; token: string; onLeave: () => void }) {
  const [Provider, setProvider] = useState<any | null>(null);
  const [joining, setJoining] = useState(true);
  const joinTimeoutRef = useRef<number | null>(null);

  const meetingConfig = useMemo(() => ({ meetingId, micEnabled: false, webcamEnabled: true, name: 'Mobile' }), [meetingId]);

  useEffect(() => {
    // Try to get components at runtime; if not initialized, instruct user and go back
    try {
      const comps = videoSDKService.getComponents();
      setProvider(() => comps.MeetingProvider);
    } catch {
      Alert.alert('VideoSDK Error', 'VideoSDK not initialized or native module missing. Use development build (npx expo run:android)');
      onLeave();
    }
  }, [onLeave]);
  useEffect(() => {
    // Set a 12s timeout for join; if not joined, leave with a message
    joinTimeoutRef.current = (setTimeout(() => {
      if (joining) {
        Alert.alert('Join timeout', 'Unable to join meeting (timeout)');
        setJoining(false);
        onLeave();
      }
    }, 12000) as unknown) as number;

    return () => {
      if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current as unknown as number);
    };
  }, [joining, onLeave]);

  // If MeetingProvider accepts event props (some SDKs do), pass a simple onError to surface websocket disconnects
  const providerProps: any = { config: meetingConfig, token };
  // network/watch handlers can be provided by the SDK; include onError as a safe prop
  providerProps.onError = (err: any) => {
    console.error('Provider error', err);
    Alert.alert('Meeting error', (err && err.message) || 'Connection error');
    // leave the meeting screen after showing error
    onLeave();
  };

  if (!Provider) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Provider {...providerProps}>
      <MeetingInner onLeave={onLeave} setJoining={setJoining} />
    </Provider>
  );
}

function MeetingInner({ onLeave, setJoining }: { onLeave: () => void; setJoining: (v: boolean) => void }) {
  // Get hooks from SDK components at runtime
  // Provide a safe fallback hook so hook order is stable; the fallback returns minimal API
  let useMeetingHook: any = () => ({ leave: () => {}, participants: new Map() });
  try {
    const comps = videoSDKService.getComponents();
    useMeetingHook = comps.useMeeting || useMeetingHook;
  } catch {
    // keep fallback
  }

  const { join, leave, participants } = useMeetingHook();

  useEffect(() => {
  let mounted = true;

    const doJoin = async () => {
      try {
        setJoining(true);
        const result = join();
        // join may return a promise or void
        if (result && typeof (result as any).then === 'function') {
          await result;
        }
  if (!mounted) return;
  setJoining(false);
      } catch (err) {
        console.error('Join failed', err);
        Alert.alert('Join failed', (err as any)?.message || 'Unable to join');
        onLeave();
      }
    };

    // Call join once when component mounts
    try {
      doJoin();
    } catch (err) {
      console.error('Join invocation error', err);
      Alert.alert('Join invocation failed', (err as any)?.message || 'Join failed');
      onLeave();
    }

    return () => {
      mounted = false;
      try {
        // Ensure we leave the meeting on unmount
        leave();
      } catch {
        // ignore
      }
    };
  }, [join, leave, onLeave, setJoining]);

  const participantIds = Array.from(participants.keys()) as string[];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>In Meeting</Text>
        <TouchableOpacity onPress={leave} style={styles.leaveBtn}><Text style={styles.leaveText}>Leave</Text></TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {participantIds.length === 0 ? (
          <View style={styles.center}><ActivityIndicator size="large" /></View>
        ) : (
          participantIds.map(id => <ParticipantView key={id} participantId={id} />)
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { height: 60, backgroundColor: '#111', paddingHorizontal: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  leaveBtn: { padding: 8, backgroundColor: '#FF3B30', borderRadius: 8 },
  leaveText: { color: '#fff', fontWeight: '700' },
  grid: { flex: 1, padding: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
