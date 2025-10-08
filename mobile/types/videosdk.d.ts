// Custom VideoSDK type declarations to override problematic types
declare module '@videosdk.live/react-native-sdk' {
  export interface MeetingConfig {
    meetingId: string;
    micEnabled?: boolean;
    webcamEnabled?: boolean;
    name?: string;
  }

  export interface MeetingProviderProps {
    config: MeetingConfig;
    token: string;
    children: React.ReactNode;
  }

  export interface UseMeetingHooks {
    onMeetingJoined?: () => void;
    onMeetingLeft?: () => void;
    onParticipantJoined?: (participant: any) => void;
    onParticipantLeft?: (participant: any) => void;
    onHlsStateChanged?: (data: any) => void;
    onError?: (error: any) => void;
  }

  export interface UseMeetingReturn {
    join: () => void;
    leave: () => void;
    toggleWebcam: () => void;
    toggleMic: () => void;
    startHls: (config: any) => void;
    stopHls: () => void;
    localWebcamOn: boolean;
    localMicOn: boolean;
    localParticipant: any;
    participants: Map<string, any>;
    hlsState: string;
    webcamStream?: any;
  }

  export const MeetingProvider: React.FC<MeetingProviderProps>;
  export const useMeeting: (hooks?: UseMeetingHooks) => UseMeetingReturn;
  export const RTCView: React.FC<any>;
  export const useParticipant: (participantId: string) => any;
}