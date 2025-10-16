# Sonic Broadcasting App

A cross-platform livestreaming application consisting of a desktop host and mobile controller/camera.

## Features

### Desktop App
- Screen capture and preview
- RTSP streaming using FFmpeg
- WebSocket server for device pairing
- Vertical stacked layout showing screen capture and stream status
- 6-digit pairing code generation
- **Displays local IP address** for easy mobile app connection

### Mobile App
- Camera preview and capture
- RTSP stream reception using VLC player
- WebSocket client for pairing with desktop
- Vertical stacked layout showing RTSP stream (screenshare) on top and camera preview below
- **Configurable desktop IP address** for easy connection
- **User feedback** with snackbar messages for connection status
- **Loading state** with spinner on connect button during connection attempts

### Streaming Layout
Both apps feature a vertical stacked layout similar to YouTube Reels or TikTok livestreams:
- **Top**: RTSP stream from desktop (screenshare)
- **Bottom**: Camera preview from mobile device
- Real-time streaming with low latency RTSP/RTP protocol

## Architecture

- **Desktop App (Electron)**: Main livestreaming host, RTSP server, screen capture, FFmpeg encoding and streaming
- **Mobile App (Flutter)**: RTSP client using VLC player for receiving and displaying streams
- **Connection**: WebSocket for signaling and pairing, RTSP for efficient video streaming
- **Streaming Protocol**: RTSP/RTP for low-latency, high-efficiency video transmission

## Requirements

### Software Versions
- Node.js: v22.13.1
- Flutter: 3.24.5
- Dart: 3.5.4

### FFmpeg Installation
FFmpeg is required for video encoding and RTMP streaming on the desktop app.

#### Windows
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Extract to a folder (e.g., `C:\ffmpeg`)
3. Add to PATH or configure in app

#### macOS
```bash
brew install ffmpeg
```

#### Linux
```bash
sudo apt update && sudo apt install ffmpeg
```

## Projects

### Desktop (Electron)
Location: `desktop/`

#### Libraries Used
- **Electron**: MIT License - Main framework for desktop app
- **Vite**: MIT License - Build tool (used by create-electron-app template)
- **ws**: MIT License - WebSocket server for signaling
- **fluent-ffmpeg**: MIT License - FFmpeg wrapper for RTSP streaming
- **electron-store**: MIT License - Data persistence
- **Material-UI** (if React used): MIT License - UI components

#### Build and Run
```bash
cd desktop
npm install
npm start
```

#### Permissions
- Screen capture requires user permission on first run
- Microphone/camera access if needed for additional features

### Mobile (Flutter)
Location: `mobile/`

#### Libraries Used
- **camera**: BSD-3-Clause License - Camera access
- **flutter_vlc_player**: MIT License - VLC-based RTSP player
- **socket_io_client**: MIT License - WebSocket client for signaling
- **provider**: MIT License - State management

#### Build and Run
```bash
cd mobile
flutter pub get
flutter run
```

#### Permissions
**Android** (`android/app/src/main/AndroidManifest.xml`):
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

**iOS** (`ios/Runner/Info.plist`):
```xml
<key>NSCameraUsageDescription</key>
<string>Camera access for livestreaming</string>
<key>NSMicrophoneUsageDescription</key>
<string>Microphone access for audio</string>
```

## Pairing and Connection Process

1. Launch the desktop app
2. Desktop generates and displays a 6-digit pairing code and local IP address
3. Desktop starts WebSocket server on local network
4. Launch mobile app and enter the desktop IP address and 6-digit pairing code
5. Mobile connects to desktop via WebSocket
6. Desktop sends RTSP stream URL to mobile
7. Desktop starts FFmpeg RTSP streaming of screen capture
8. Mobile receives and displays RTSP stream using VLC player

## Network Configuration

**For testing on the same machine:**
- If mobile app runs on Android emulator: Use IP `10.0.2.2` (Android emulator localhost)
- If mobile app runs on iOS simulator: Use IP `127.0.0.1` or the actual local IP
- If both apps run on same device: Use `127.0.0.1`

**For testing on different devices:**
- Ensure both devices are on the same Wi-Fi network
- Use the IP address displayed in the desktop app
- Disable firewall/antivirus that might block WebSocket connections on port 8080

## UI Design

### Desktop App
OBS-like interface with red and white theme:
- Main preview window showing combined stream
- Start/Stop streaming buttons
- Bitrate and status indicators
- RTMP configuration inputs
- Pairing code display
- Layout controls for screen/camera positioning

### Mobile App
Clean Material 3 interface with red and white theme:
- RTSP stream player using VLC
- 6-digit pairing code input field
- Connect/Disconnect buttons
- Stream control buttons (Start, Stop, Pause)
- Camera preview when not streaming

## Error Handling
- Automatic reconnection on connection loss
- Retry logic for RTSP stream connection
- Validation of pairing codes
- FFmpeg error handling and restart
- VLC player error recovery

## Security
- Temporary 6-digit codes expire after use
- Local network communication only
- RTSP streaming over TCP for reliability
- No external servers required

## Development
- All dependencies are open-source
- Follow official documentation for integrations
- Code is structured for maintainability and extensibility