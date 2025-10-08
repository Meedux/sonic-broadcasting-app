import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import JoinScreen from './screens/JoinScreen';
import MeetingScreen from './screens/MeetingScreen';

// Very small app shell that switches between Join and Meeting screens
export default function App() {
  const [state, setState] = React.useState({ mode: 'join', meetingId: '', token: null });

  return (
    <SafeAreaView style={styles.app}>
      {state.mode === 'join' ? (
        <JoinScreen
          onJoin={(meetingId, token) => setState({ mode: 'meeting', meetingId, token })}
        />
      ) : (
        <MeetingScreen
          meetingId={state.meetingId}
          token={state.token}
          onLeave={() => setState({ mode: 'join', meetingId: '', token: null })}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#fff' },
});
