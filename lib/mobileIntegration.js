// Mobile Integration Service for Web App
export class MobileIntegrationService {
  constructor() {
    this.eventSource = null;
    this.listeners = new Map();
    this.mobileConnected = false;
    this.mobileCapabilities = null;
  }

  // Initialize connection to mobile
  connectToMobile() {
    if (typeof window === 'undefined') return;

    const url = '/api/stream-events?type=web';
    
    try {
      this.eventSource = new EventSource(url);
      
      this.eventSource.onopen = () => {
        console.log('Web app connected to event stream');
        this.notifyListeners('CONNECTION_STATUS', { connected: true });
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMobileEvent(data);
        } catch (error) {
          console.error('Error parsing mobile event:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('Mobile integration error:', error);
        this.notifyListeners('CONNECTION_STATUS', { connected: false, error });
      };

    } catch (error) {
      console.error('Failed to connect to mobile events:', error);
    }
  }

  // Handle incoming events from mobile
  handleMobileEvent(event) {
    console.log('Received mobile event:', event);

    switch (event.type) {
      case 'MOBILE_CONNECTED':
        this.mobileConnected = true;
        this.notifyListeners('MOBILE_STATUS', { connected: true });
        break;

      case 'MOBILE_DISCONNECTED':
        this.mobileConnected = false;
        this.notifyListeners('MOBILE_STATUS', { connected: false });
        break;

      case 'REQUEST_SCREEN_SHARE':
        this.handleScreenShareRequest();
        break;

      case 'INITIALIZE_STREAM':
        this.handleStreamInitialization(event.settings);
        break;

      case 'START_LIVE_STREAM':
        this.handleStartLiveStream(event.platform, event.settings);
        break;

      case 'STOP_LIVE_STREAM':
        this.handleStopLiveStream();
        break;

      case 'MOBILE_CAMERA_DATA':
        this.handleCameraData(event.videoData);
        break;

      case 'EDITING_COMMAND':
        this.handleEditingCommand(event.command, event.params);
        break;

      case 'MOBILE_CAPABILITIES':
        this.mobileCapabilities = event.capabilities;
        this.notifyListeners('MOBILE_CAPABILITIES', event.capabilities);
        break;

      case 'REQUEST_WEBRTC_CONNECTION':
        this.handleWebRTCRequest();
        break;

      case 'MOBILE_STREAM_START':
        this.handleMobileStreamStart(event);
        break;

      case 'MOBILE_STREAM_STOP':
        this.handleMobileStreamStop();
        break;

      default:
        console.log('Unknown mobile event type:', event.type);
    }
  }

  // Handle screen share request from mobile
  async handleScreenShareRequest() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      });

      // Send confirmation back to mobile
      await this.sendToMobile({
        type: 'SCREEN_SHARE_STARTED',
        data: { streamUrl: 'webrtc://stream-id' } // In real implementation
      });

      this.notifyListeners('SCREEN_SHARE_REQUESTED', { stream });

    } catch (error) {
      console.error('Screen share request failed:', error);
      await this.sendToMobile({
        type: 'SCREEN_SHARE_FAILED',
        error: error.message
      });
    }
  }

  // Handle stream initialization
  async handleStreamInitialization(settings) {
    console.log('Initializing stream with settings:', settings);

    // Simulate stream setup process
    setTimeout(async () => {
      await this.sendToMobile({
        type: 'STREAM_READY',
        data: {
          platform: settings.platform,
          quality: settings.quality,
          streamUrl: 'rtmp://stream.example.com/live'
        }
      });
    }, 2000);

    this.notifyListeners('STREAM_INITIALIZATION', settings);
  }

  // Handle live stream start
  async handleStartLiveStream(platform, settings) {
    console.log('Starting live stream:', platform, settings);

    // Simulate starting the stream
    this.notifyListeners('LIVE_STREAM_STARTING', { platform, settings });

    setTimeout(async () => {
      await this.sendToMobile({
        type: 'STREAM_STARTED',
        platform: platform
      });
      
      this.notifyListeners('LIVE_STREAM_STARTED', { platform });
    }, 1000);
  }

  // Handle live stream stop
  async handleStopLiveStream() {
    console.log('Stopping live stream');
    
    this.notifyListeners('LIVE_STREAM_STOPPING', {});
    
    setTimeout(async () => {
      await this.sendToMobile({
        type: 'STREAM_STOPPED'
      });
      
      this.notifyListeners('LIVE_STREAM_STOPPED', {});
    }, 500);
  }

  // Handle camera data from mobile
  handleCameraData(videoData) {
    console.log('Received camera data from mobile:', videoData);
    this.notifyListeners('MOBILE_CAMERA_DATA', videoData);
  }

  // Handle editing commands from mobile
  handleEditingCommand(command, params) {
    console.log('Received editing command:', command, params);
    
    switch (command) {
      case 'APPLY_FILTER':
        this.applyVideoFilter(params.filter, params.intensity);
        break;
      case 'ADJUST_PARAMETER':
        this.adjustVideoParameter(params.parameter, params.value);
        break;
      case 'ADD_OVERLAY':
        this.addVideoOverlay(params);
        break;
      case 'REMOVE_OVERLAY':
        this.removeVideoOverlay();
        break;
      case 'UPDATE_OVERLAY':
        this.updateVideoOverlay(params);
        break;
      case 'RESET_ALL':
        this.resetVideoEffects();
        break;
    }
    
    this.notifyListeners('EDITING_COMMAND', { command, params });
  }

  // Video editing methods (to be implemented with actual video processing)
  applyVideoFilter(filter, intensity) {
    console.log(`Applying ${filter} filter with intensity ${intensity}`);
    // Implementation would use WebGL shaders or video processing library
  }

  adjustVideoParameter(parameter, value) {
    console.log(`Adjusting ${parameter} to ${value}`);
    // Implementation would modify video processing pipeline
  }

  addVideoOverlay(params) {
    console.log('Adding video overlay:', params);
    // Implementation would add overlay to video stream
  }

  removeVideoOverlay() {
    console.log('Removing video overlay');
    // Implementation would remove overlay from video stream
  }

  updateVideoOverlay(params) {
    console.log('Updating video overlay:', params);
    // Implementation would update overlay properties
  }

  resetVideoEffects() {
    console.log('Resetting all video effects');
    // Implementation would reset video processing to default
  }

  // Handle WebRTC connection request
  async handleWebRTCRequest() {
    console.log('Mobile requesting WebRTC connection');
    // Implementation would set up WebRTC peer connection
    this.notifyListeners('WEBRTC_REQUEST', {});
  }

  // Handle mobile stream start
  handleMobileStreamStart(event) {
    console.log('Mobile camera stream starting:', event);
    this.notifyListeners('MOBILE_STREAM_START', event);
  }

  // Handle mobile stream stop
  handleMobileStreamStop() {
    console.log('Mobile camera stream stopped');
    this.notifyListeners('MOBILE_STREAM_STOP', {});
  }

  // Send message to mobile
  async sendToMobile(message) {
    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...message,
          targetType: 'mobile',
          source: 'web',
          timestamp: Date.now()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message to mobile:', error);
      throw error;
    }
  }

  // Event listener management
  addListener(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  removeListener(eventType, callback) {
    if (this.listeners.has(eventType)) {
      const callbacks = this.listeners.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

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

  // Disconnect
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.mobileConnected = false;
    this.notifyListeners('CONNECTION_STATUS', { connected: false });
  }

  // Get mobile status
  isMobileConnected() {
    return this.mobileConnected;
  }

  getMobileCapabilities() {
    return this.mobileCapabilities;
  }
}

// Create singleton instance
const mobileIntegrationService = new MobileIntegrationService();
export default mobileIntegrationService;