import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { usePubSub, useMeeting } from "@videosdk.live/react-native-sdk";
import colors from "../../../styles/colors";

export default function ControllerViewer() {
  const [rmtpUrl, setRmtpUrl] = useState("");
  const pubsub = usePubSub("CONTROL", {});
  const meeting = useMeeting();

  const sendControl = (action, payload = {}) => {
    const message = { action, payload, from: meeting?.localParticipant?.id };
    console.log('ControllerViewer: publishing control message', message);
    // publish control message; persist false
    try {
      pubsub.publish(JSON.stringify(message), { persist: false });
    } catch (err) {
      console.error('ControllerViewer publish error:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Controller</Text>
      <TextInput
        placeholder="RTMP URL or key"
        placeholderTextColor="#999"
        style={styles.input}
        value={rmtpUrl}
        onChangeText={setRmtpUrl}
      />

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "#e53e3e" }]}
          onPress={() => sendControl("START", { rmtp: rmtpUrl })}
        >
          <Text style={styles.btnText}>Start Live</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "#f6ad55" }]}
          onPress={() => sendControl("PAUSE")}
        >
          <Text style={styles.btnText}>Pause</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "#48bb78" }]}
          onPress={() => sendControl("STOP")}
        >
          <Text style={styles.btnText}>Stop</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { color: colors.primary[100], fontSize: 20, marginBottom: 12 },
  input: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.primary[700],
    color: colors.primary[100],
    marginBottom: 12,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  btn: {
    flex: 1,
    height: 48,
    marginHorizontal: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "white", fontWeight: "bold" },
});
