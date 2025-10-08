// Electron Screen Sharing Polyfill
// This helps VideoSDK work with Electron's screen sharing capabilities

interface DesktopCapturerSource {
  id: string;
  name: string;
  thumbnail: string;
}

declare global {
  interface Window {
    electronAPI?: {
      getDesktopSources: () => Promise<DesktopCapturerSource[]>;
    };
  }
}

// Polyfill for Electron screen sharing
if (typeof window !== 'undefined' && window.navigator.userAgent.includes('Electron')) {
  console.log('Setting up Electron screen sharing polyfill...');
  
  // Override getDisplayMedia for Electron compatibility
  if (navigator.mediaDevices && !navigator.mediaDevices.getDisplayMedia) {
    navigator.mediaDevices.getDisplayMedia = async () => {
      try {
        console.log('Using Electron screen capture...');
        
        // Request screen sources from Electron main process
        const sources = await window.electronAPI?.getDesktopSources() || [];
        
        if (sources.length === 0) {
          throw new Error('No screen sources available');
        }
        
        // Use the first available screen source
        const source = sources.find(s => s.id.startsWith('screen')) || sources[0];
        
        // Create constraints for getUserMedia with the screen source
        const electronConstraints = {
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: source.id,
              minWidth: 1280,
              maxWidth: 1920,
              minHeight: 720,
              maxHeight: 1080
            }
          }
        };
        
        // @ts-expect-error - Electron specific getUserMedia
        return navigator.mediaDevices.getUserMedia(electronConstraints);
      } catch (error) {
        console.error('Electron screen capture failed:', error);
        throw error;
      }
    };
  }
  
  // Set up permissions for screen sharing
  if (navigator.permissions) {
    navigator.permissions.query = navigator.permissions.query || function() {
      return Promise.resolve({
        state: 'granted' as PermissionState,
        onchange: null
      } as PermissionStatus);
    };
  }
}

export {};