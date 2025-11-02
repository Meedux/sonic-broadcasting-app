# Sonic Broadcasting App

A cross-platform livestreaming application consisting of a desktop broadcasting software and mobile controller/camera.

## Features

### Desktop App
- Professional broadcasting software interface with dark theme and red accents
- Full-width layout: Left panel (controls, gift statistics, live chat), Right panel (screen capture top, camera feed bottom)
- Screen capture and real-time preview with WebRTC streaming
- RTMP livestreaming support using FFmpeg
- WebSocket server for device pairing
- Mock gift statistics with animations and real-time updates
- Live chat with mock viewer messages
- Viewer count, bitrate, and uptime metrics
- 6-digit pairing code generation
- Local IP address display for easy mobile connection

### Mobile App
- Controller interface for desktop broadcasting
- Full-width layout: Screen preview top, camera feed middle, live chat bottom
- Camera preview and capture with WebRTC streaming
- WebRTC client for receiving desktop screenshare
- WebSocket client for pairing with desktop
- Configurable desktop IP address for connection
- User feedback with snackbar messages for connection status
### Desktop App
- Professional broadcasting software interface with dark theme and red accents
- Full-width layout: Left panel (controls, gift statistics, live chat), Right panel (screen capture top, camera feed bottom)
- Screen capture and real-time preview with WebRTC streaming
- WebSocket server for device pairing
- Mock gift statistics with animations and real-time updates
- Live chat with mock viewer messages
- Viewer count, bitrate, and uptime metrics
- 6-digit pairing code generation
- Local IP address display for easy mobile connection

- Node.js: v22.13.1
- Flutter: 3.24.5
- Dart: 3.5.4

#### macOS
```bash
brew install ffmpeg
```bash
sudo apt update && sudo apt install ffmpeg
#### macOS
```bash
brew install ffmpeg
```

#### Linux
```bash
### Desktop (Electron)
Location: `desktop/`

#### Libraries Used
- **Electron**: MIT License - Main framework for desktop app
- **Vite**: MIT License - Build tool (used by create-electron-app template)
- **mediasoup-client**: ISC License - WebRTC client for real-time communication
- **socket.io-client**: MIT License - WebSocket client for signaling
- **fluent-ffmpeg**: MIT License - FFmpeg wrapper for RTMP streaming
#### Build and Run
```bash
cd desktop
npm install
npm start
- Camera access for camera feed preview

### Mobile (Flutter)
Location: `mobile/`

#### Libraries Used
- **camera**: BSD-3-Clause License - Camera access
- **flutter_webrtc**: MIT License - WebRTC client for real-time video
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
7. Desktop captures screen and sends via WebRTC to mobile
8. Mobile displays screenshare preview and can control desktop functions

**For testing on the same machine:**
- If mobile app runs on Android emulator: Use IP `10.0.2.2` (Android emulator localhost)
- If mobile app runs on iOS simulator: Use IP `127.0.0.1` or the actual local IP
- If both apps run on same device: Use `127.0.0.1`

### Desktop App
Professional broadcasting software interface:
- Live chat with viewer interactions

- WebRTC video display for desktop screenshare
- Camera controls and preview
- Automatic reconnection on connection loss
- Retry logic for WebRTC connection establishment

## Security
- Temporary 6-digit codes expire after use
- Local network communication only
- WebRTC DTLS encryption for video streams
- No external servers required

## Development
- All dependencies are open-source
- Follow official documentation for WebRTC and Mediasoup integrations
- Code is structured for maintainability and extensibility