import {
  useMeeting,
} from "@videosdk.live/react-native-sdk";
import { useEffect, useState } from "react";
import OneToOneMeetingViewer from "./OneToOne";
import ConferenceMeetingViewer from "./Conference/ConferenceMeetingViewer";
import ParticipantLimitViewer from "./OneToOne/ParticipantLimitViewer";
import WaitingToJoinView from "./Components/WaitingToJoinView";
import React from "react";
import ControllerViewer from "./Components/ControllerViewer";

export default function MeetingContainer({ webcamEnabled, meetingType, controllerMode }) {
  const [isJoined, setJoined] = useState(false);
  const [participantLimit, setParticipantLimit] = useState(false);

  const { join, participants, leave } = useMeeting({
    onMeetingJoined: () => {
      console.log('MeetingContainer: onMeetingJoined()');
      setTimeout(() => {
        setJoined(true);
        console.log('MeetingContainer: setJoined(true)');
      }, 500);
    },
    onParticipantLeft: () => {
      console.log('MeetingContainer: onParticipantLeft, participants.size=', participants.size);
      if (participants.size < 2) {
        setParticipantLimit(false);
      }
    },
  });

  useEffect(() => {
    if (isJoined) {
      if (participants.size > 2) {
        setParticipantLimit(true);
      }
    }
  }, [isJoined]);

  useEffect(() => {
    setTimeout(() => {
      if (!isJoined) {
        console.log('MeetingContainer: attempting to join...');
        join();
      }
    }, 1000);

    return () => {
      console.log('MeetingContainer: leaving meeting...');
      leave();
    };
  }, []);

  if (!isJoined) return <WaitingToJoinView />;

  if (controllerMode) {
    return <ControllerViewer />;
  }

  return meetingType === "GROUP" ? (
    <ConferenceMeetingViewer />
  ) : participantLimit ? (
    <ParticipantLimitViewer />
  ) : (
    <OneToOneMeetingViewer />
  );
}
