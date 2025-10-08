// Custom Electron Screen Sharing Hook
import { useCallback, useEffect, useState } from 'react';

interface ElectronSource {
  id: string;
  name: string;
  thumbnail: string;
}

declare global {
  interface Window {
    electronAPI?: {
      getDesktopSources: () => Promise<ElectronSource[]>;
    };
  }
}

export const useElectronScreenShare = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    // Detect if we're in Electron
    const isElectronEnv = typeof window !== 'undefined' && 
      window.navigator.userAgent.includes('Electron');
    setIsElectron(isElectronEnv);
    
    if (isElectronEnv) {
      console.log('Electron environment detected for screen sharing');
      
      // Override navigator.mediaDevices.getDisplayMedia
      if (navigator.mediaDevices) {
        const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
        
        navigator.mediaDevices.getDisplayMedia = async (constraints?) => {
          try {
            console.log('Custom Electron getDisplayMedia called');
            
            // Get sources from Electron
            const sources = await window.electronAPI?.getDesktopSources();
            if (!sources || sources.length === 0) {
              throw new Error('No screen sources available');
            }
            
            // Use first screen source (or first available)
            const screenSource = sources.find(source => source.id.startsWith('screen:')) || sources[0];
            
            // Create Electron-specific constraints
            const electronConstraints = {
              audio: false,
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: screenSource.id,
                  minWidth: 1280,
                  maxWidth: 1920,
                  minHeight: 720,
                  maxHeight: 1080,
                  frameRate: 30
                }
              }
            } as MediaStreamConstraints & {
              video: {
                mandatory: {
                  chromeMediaSource: string;
                  chromeMediaSourceId: string;
                  minWidth: number;
                  maxWidth: number;
                  minHeight: number;
                  maxHeight: number;
                  frameRate: number;
                }
              }
            };
            
            // Use getUserMedia with desktop source
            const stream = await navigator.mediaDevices.getUserMedia(electronConstraints);
            console.log('Electron screen capture successful:', stream);
            return stream;
            
          } catch (error) {
            console.error('Electron screen capture failed:', error);
            // Fallback to original if available
            if (originalGetDisplayMedia) {
              return originalGetDisplayMedia.call(navigator.mediaDevices, constraints);
            }
            throw error;
          }
        };
      }
    }
  }, []);

  const startScreenShare = useCallback(async (): Promise<MediaStream | null> => {
    try {
      console.log('🚀 Starting Electron screen share...');
      
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Screen sharing not supported');
      }

      console.log('📡 Calling getDisplayMedia...');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: false
      });

      console.log('✅ Screen stream obtained:', stream);
      console.log('📺 Video tracks:', stream.getVideoTracks());

      setScreenStream(stream);
      setIsScreenSharing(true);
      
      // Handle stream end
      stream.getVideoTracks()[0].onended = () => {
        console.log('🛑 Screen sharing stream ended');
        setIsScreenSharing(false);
        setScreenStream(null);
      };

      return stream;
    } catch (error) {
      console.error('❌ Failed to start screen sharing:', error);
      setIsScreenSharing(false);
      setScreenStream(null);
      throw error;
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    console.log('🛑 Stopping screen share...');
    if (screenStream) {
      screenStream.getTracks().forEach(track => {
        console.log('🔌 Stopping track:', track);
        track.stop();
      });
      setScreenStream(null);
      setIsScreenSharing(false);
      console.log('✅ Screen share stopped');
    }
  }, [screenStream]);

  return {
    isElectron,
    isScreenSharing,
    screenStream,
    startScreenShare,
    stopScreenShare
  };
};