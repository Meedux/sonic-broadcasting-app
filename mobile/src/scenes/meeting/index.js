import React, { useEffect, useState } from "react";
import { Platform, NativeModules, PermissionsAndroid } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../styles/colors";
import {
  MeetingConsumer,
  MeetingProvider,
} from "@videosdk.live/react-native-sdk";
import MeetingContainer from "./MeetingContainer";
import { SCREEN_NAMES } from "../../navigators/screenNames";
const { ForegroundServiceModule } = NativeModules;

// Permission requests are handled on-demand from the Join screen to avoid
// calling PermissionsAndroid before the React Native Activity is attached.

export default function ({ navigation, route }) {
  console.log('Meeting screen params:', route?.params);
  // Permissions are requested on-demand from the Join screen before navigation
  // to ensure the app is attached to an Activity. Assume permissions have
  // already been requested and granted when landing on the Meeting screen.
  const [permissionsGranted] = useState(true);

  const {
    token,
    meetingId,
    micEnabled,
    webcamEnabled,
    name,
    meetingType,
    controllerMode,
    defaultCamera,
  } = route.params;

  const handleMeetingJoined = async () => {
    if (permissionsGranted) {
      if (Platform.OS === "android") {
        setTimeout(async () => {
          try {
            await ForegroundServiceModule.startService();
          } catch (err) {
            console.error("[Error starting foreground service:", err);
          }
        }, 300);
      }
    }
  };

  const handleMeetingLeft = () => {
    if (Platform.OS === "android") {
      ForegroundServiceModule.stopService();
    }
    navigation.navigate(SCREEN_NAMES.Join);
  };

  if (Platform.OS === "android" && !permissionsGranted) {
    return (
      <SafeAreaView
        edges={["top", "bottom"]}
        style={{ flex: 1, backgroundColor: colors.primary[900], padding: 12 }}
      />
    );
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: colors.primary[900], padding: 12 }}
    >
      <MeetingProvider
        config={{
          meetingId: meetingId,
          micEnabled: micEnabled,
          webcamEnabled: webcamEnabled,
          name: name,
          notification: {
            title: "Video SDK Meeting",
            message: "Meeting is running.",
          },
          defaultCamera: defaultCamera,
        }}
        token={token}
      >
        <MeetingConsumer
          onMeetingJoined={handleMeetingJoined}
          onMeetingLeft={handleMeetingLeft}
        >
          {() => (
            <MeetingContainer
              webcamEnabled={webcamEnabled}
              meetingType={meetingType}
              controllerMode={controllerMode}
            />
          )}
        </MeetingConsumer>
      </MeetingProvider>
    </SafeAreaView>
  );
}
