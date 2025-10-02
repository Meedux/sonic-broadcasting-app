import AsyncStorage from '@react-native-async-storage/async-storage';

class ApiService {
  constructor() {
    this.baseUrl = 'http://localhost:3000'; // Adjust based on your setup
    this.eventSource = null;
    this.listeners = new Map();
  }

  // Connect to the web app's event stream
  connectToEventStream() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    const url = `${this.baseUrl}/api/stream-events?type=mobile`;
    
    try {
      this.eventSource = new EventSource(url);
      
      this.eventSource.onopen = () => {
        console.log('Connected to event stream');
        this.notifyListeners('CONNECTION_STATUS', { connected: true });
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received event:', data);
          this.handleIncomingEvent(data);
        } catch (error) {
          console.error('Error parsing event data:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        this.notifyListeners('CONNECTION_STATUS', { connected: false, error });
      };

    } catch (error) {
      console.error('Failed to connect to event stream:', error);
    }
  }

  // Disconnect from event stream
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.notifyListeners('CONNECTION_STATUS', { connected: false });
  }

  // Send message to web app
  async sendMessage(message) {
    try {
      const response = await fetch(`${this.baseUrl}/api/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...message,
          source: 'mobile',
          timestamp: Date.now()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Handle incoming events from web app
  handleIncomingEvent(event) {
    switch (event.type) {
      case 'CONNECTED':
        this.notifyListeners('CONNECTION_STATUS', { connected: true, clientId: event.clientId });
        break;
      case 'SCREEN_SHARE_STARTED':
        this.notifyListeners('SCREEN_SHARE', { active: true, data: event.data });
        break;
      case 'SCREEN_SHARE_STOPPED':
        this.notifyListeners('SCREEN_SHARE', { active: false });
        break;
      case 'STREAM_STARTED':
        this.notifyListeners('STREAM_STATUS', { active: true, platform: event.platform });
        break;
      case 'STREAM_STOPPED':
        this.notifyListeners('STREAM_STATUS', { active: false });
        break;
      case 'STREAM_READY':
        this.notifyListeners('STREAM_READY', event.data);
        break;
      case 'WEB_CONNECTED':
        this.notifyListeners('WEB_STATUS', { connected: true });
        break;
      case 'WEB_DISCONNECTED':
        this.notifyListeners('WEB_STATUS', { connected: false });
        break;
      default:
        this.notifyListeners('UNKNOWN_EVENT', event);
    }
  }

  // Add event listener
  addListener(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  // Remove event listener
  removeListener(eventType, callback) {
    if (this.listeners.has(eventType)) {
      const callbacks = this.listeners.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Notify all listeners of an event type
  notifyListeners(eventType, data) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for ${eventType}:`, error);
        }
      });
    }
  }

  // Request screen share from PC
  async requestScreenShare() {
    return this.sendMessage({
      type: 'REQUEST_SCREEN_SHARE',
      targetType: 'web'
    });
  }

  // Start live stream
  async startLiveStream(platform, settings) {
    return this.sendMessage({
      type: 'START_LIVE_STREAM',
      platform,
      settings,
      targetType: 'web'
    });
  }

  // Stop live stream
  async stopLiveStream() {
    return this.sendMessage({
      type: 'STOP_LIVE_STREAM',
      targetType: 'web'
    });
  }

  // Send camera stream data
  async sendCameraData(videoData) {
    return this.sendMessage({
      type: 'MOBILE_CAMERA_DATA',
      videoData,
      targetType: 'web'
    });
  }

  // Send editing commands
  async sendEditingCommand(command, params) {
    return this.sendMessage({
      type: 'EDITING_COMMAND',
      command,
      params,
      targetType: 'web'
    });
  }

  // Send editing commands
  async sendEditingCommand(command, params) {
    return this.sendMessage({
      type: 'EDITING_COMMAND',
      command,
      params,
      targetType: 'web'
    });
  }

  // Send camera stream data
  async sendCameraData(videoData) {
    return this.sendMessage({
      type: 'MOBILE_CAMERA_DATA',
      videoData,
      targetType: 'web'
    });
  }

  // Request WebRTC connection for screen sharing
  async requestWebRTCConnection() {
    return this.sendMessage({
      type: 'REQUEST_WEBRTC_CONNECTION',
      targetType: 'web'
    });
  }

  // Send mobile capabilities
  async sendCapabilities() {
    return this.sendMessage({
      type: 'MOBILE_CAPABILITIES',
      capabilities: {
        camera: true,
        microphone: true,
        gyroscope: true,
        accelerometer: true,
        touch: true,
        screenSize: { width: 390, height: 844 } // Example iPhone 12 Pro size
      },
      targetType: 'web'
    });
  }

  // Store settings locally
  async saveSettings(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  // Load settings from local storage
  async loadSettings(key, defaultValue = null) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.error('Error loading settings:', error);
      return defaultValue;
    }
  }
}

// Create singleton instance
const apiService = new ApiService();
export default apiService;