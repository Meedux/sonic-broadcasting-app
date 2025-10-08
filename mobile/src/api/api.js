import { REACT_APP_VIDEOSDK_TOKEN, REACT_APP_AUTH_URL } from "@env";

const API_BASE_URL = "https://api.videosdk.live/v2";

const VIDEOSDK_TOKEN = REACT_APP_VIDEOSDK_TOKEN;
const API_AUTH_URL = REACT_APP_AUTH_URL;

export const getToken = async () => {
  if (VIDEOSDK_TOKEN && API_AUTH_URL) {
    console.error(
      "Error: Provide only ONE PARAMETER - either Token or Auth API"
    );
  } else if (VIDEOSDK_TOKEN) {
    console.log(`Token fetched from env variable ${VIDEOSDK_TOKEN}`);
    return VIDEOSDK_TOKEN;
  } else if (API_AUTH_URL) {
    const res = await fetch(`${API_AUTH_URL}/get-token`, {
      method: "GET",
    });
    const { token } = await res.json();
    if (!token) {
      console.error("Error: ", Error("Token not found"));
    }
    console.log("Token fetched from Auth A");
    return token;
  } else {
    console.error("Error: ", Error("Please add a token or Auth Server URL"));
  }
};

export const createMeeting = async ({ token }) => {
  const url = `${API_BASE_URL}/rooms`;
  const options = {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
  };

  try {
    console.log('createMeeting: POST', url, { headers: options.headers });
    const response = await fetch(url, options);
    const data = await response.json();
    console.log('createMeeting response:', data);
    return data.roomId;
  } catch (err) {
    console.error('createMeeting error:', err);
    return null;
  }
};

export const validateMeeting = async ({ meetingId, token }) => {
  const url = `${API_BASE_URL}/rooms/validate/${meetingId}`;

  const options = {
    method: "GET",
    headers: { Authorization: token },
  };

  try {
    console.log('validateMeeting: GET', url);
    const response = await fetch(url, options);
    const result = await response.json();
    console.log('validateMeeting response:', result);
    return result ? result.roomId === meetingId : false;
  } catch (err) {
    console.error('validateMeeting error:', err);
    return false;
  }
};

export const fetchSession = async ({ meetingId, token }) => {
  const url = `${API_BASE_URL}/sessions?roomId=${meetingId}`;

  const options = {
    method: "GET",
    headers: { Authorization: token },
  };

  try {
    console.log('fetchSession: GET', url);
    const response = await fetch(url, options);
    const result = await response.json();
    console.log('fetchSession response:', result);
    return result ? result.data[0] : null;
  } catch (err) {
    console.error('fetchSession error:', err);
    return null;
  }
};
