import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Platform, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// No native VideoSDK hooks used in mock mode
import Button from "../../components/Button";
import colors from "../../styles/colors";
import { getToken, createMeeting, validateMeeting } from "../../api/api";
import Toast from "react-native-simple-toast";
import { SCREEN_NAMES } from "../../navigators/screenNames";

export default function Join({ navigation }) {
  // Mock studio state
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [meetingId, setMeetingId] = useState('MOCK-' + Math.random().toString(36).slice(2, 8).toUpperCase());
  const [name, setName] = useState('Broadcaster');

  // No native preview in mock mode

  const requestPermissions = async () => true; // mock

  const handleCreateAndJoin = async (asController = false) => {
    // Mock create/join behavior — navigate to Meeting with mock meetingId and no token
    navigation.navigate(SCREEN_NAMES.Meeting, {
      name: name,
      token: 'MOCK_TOKEN',
      meetingId: meetingId,
      micEnabled: isMicOn,
      webcamEnabled: isCameraOn,
      meetingType: 'ONE_TO_ONE',
      controllerMode: asController,
      defaultCamera: 'front',
    });
  };

  const handlePasteAndJoin = async () => {
    // Mock paste: just navigate using the current meetingId
    navigation.navigate(SCREEN_NAMES.Meeting, {
      name: name || 'Viewer',
      token: 'MOCK_TOKEN',
      meetingId: meetingId,
      micEnabled: isMicOn,
      webcamEnabled: isCameraOn,
      meetingType: 'ONE_TO_ONE',
      controllerMode: false,
      defaultCamera: 'front'
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Studio</Text>
        <Text style={styles.subtitle}>Broadcast to your channel</Text>
      </View>

      <View style={styles.previewCard}>
        {/* Desktop capture placeholder (top) */}
        <View style={styles.desktopPlaceholder}>
          <Text style={{ color: colors.primary[300] }}>Desktop capture preview (mock)</Text>
        </View>
        {/* Mobile camera placeholder (bottom) */}
        <View style={styles.cameraPlaceholder}>
          <Text style={{ color: colors.primary[300] }}>{isCameraOn ? 'Camera ON (mock)' : 'Camera OFF'}</Text>
        </View>
        <View style={styles.liveBadgeContainer}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={() => { setIsBroadcasting(!isBroadcasting); Toast.show(isBroadcasting ? 'Stopped mock broadcast' : 'Started mock broadcast'); }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{isBroadcasting ? 'Stop Broadcast' : 'Start Broadcast'}</Text>
        </TouchableOpacity>
        <View style={{height:8}} />
        <TouchableOpacity style={styles.controlButton} onPress={() => setIsCameraOn(!isCameraOn)}>
          <Text style={{ color: '#fff' }}>{isCameraOn ? 'Camera Off' : 'Camera On'}</Text>
        </TouchableOpacity>
        <View style={{height:8}} />
        <TouchableOpacity style={styles.controlButton} onPress={() => setIsMicOn(!isMicOn)}>
          <Text style={{ color: '#fff' }}>{isMicOn ? 'Mic Off' : 'Mic On'}</Text>
        </TouchableOpacity>
        <View style={{height:8}} />
        <TouchableOpacity style={[styles.controlButton, { backgroundColor: '#2b2b2b' }]} onPress={() => handleCreateAndJoin(true)}>
          <Text style={{ color: '#fff' }}>Enter Controller (mock)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[900], padding: 16 },
  header: { paddingVertical: 12 },
  title: { color: '#FFF', fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.primary[300], marginTop: 4 },
  previewCard: { height: 300, borderRadius: 12, overflow: 'hidden', marginTop: 16, backgroundColor: '#000' },
  preview: { flex: 1, width: '100%' },
  previewPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  controls: { marginTop: 20 },
  liveBadgeContainer: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center' },
  liveDot: { width: 10, height: 10, borderRadius: 6, backgroundColor: 'red', marginRight: 6 },
  liveText: { color: '#fff', fontWeight: '700' },
  desktopPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A' },
  cameraPlaceholder: { height: 80, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  controlButton: { backgroundColor: 'red', paddingVertical: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
 
