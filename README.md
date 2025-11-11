# Sonic Broadcasting App (Desktop + Mobile)

Sonic Broadcasting App is a two-part system built to capture a desktop screen, automate Daily.co room management, and control livestreaming to RTMP destinations from a companion mobile controller.

- Desktop: Electron + React app for screen capture, Daily session management, and a local Socket.IO server to coordinate with mobile.
- Mobile: React Native (Expo) app using Daily’s React Native SDK to join/view the screen share and control livestream state remotely.

## Why these technologies

- Electron (desktop): Direct access to desktop capture sources via Chromium’s getUserMedia with `chromeMediaSource` constraints and a reliable UI runtime using the web stack.
- Daily.co SDKs: Production-grade WebRTC abstraction with room provisioning, screen share, and built-in livestreaming (RTMP) control. We use:
  - `@daily-co/daily-js` + `@daily-co/daily-react` on desktop
  - `@daily-co/react-native-daily-js` on mobile
- Socket.IO: Simple local-LAN messaging bus between desktop and mobile (status, stream config, commands).
- Zustand: Lightweight predictable state management across both apps.
- Expo RN (mobile): Fast iteration, dev-build support for native modules, and batteries-included tooling.

## High-level architecture

1. Desktop app starts an Express server + Socket.IO (see `electron/server.ts`):
   - REST: `/daily/session` (provisions room+token), `/stream/config` (GET/POST), `/command` (POST), `/pairing/qr.png?url=...`.
   - Socket events: `status`, `stream-config`, `command`, `join-now`.
2. Desktop UI (React + styled-components) drives:
   - Screen capture selection (Electron bridge), Daily join/leave, start/stop screen share.
   - Livestream start/stop (RTMP) with real-time status from Daily events.
   - Shows LAN URLs and an inline QR to pair the mobile device.
3. Mobile app connects to the desktop over LAN:
   - Fetches `/daily/session`, joins Daily room, renders the screen via `DailyMediaView`.
   - Receives `stream-config` and can start/pause/end livestreaming.
   - Persists base URL, supports QR pairing, and reconnects.

## Desktop app

Location: `desktop-app/`

Key libs:
- Electron runtime (main/preload/renderer with Vite build)
- React + styled-components UI
- `express` + `socket.io` for local control plane
- Daily Web SDKs: `@daily-co/daily-js`, `@daily-co/daily-react`

Important files:
- `electron/server.ts`
  - Creates Express/Socket.IO server with `SOCKET_PATH=/socket.io`
  - `/daily/session`: Provisions a Daily room using API key (env or default), returns { roomUrl, token }.
  - `/stream/config` (GET/POST): Stores & broadcasts RTMP config to clients.
  - `/command` (POST): Emits arbitrary commands to connected clients.
  - `/pairing/qr.png?url=...`: Generates QR PNG for quick mobile pairing.
- `electron/preload.ts`, `electron/main.ts` (IPC + bridges)
- `src/hooks/useDailyController.ts`
  - Manages Daily lifecycle (create/join/leave), screen-share start/stop with captured `MediaStream`.
  - Livestream control: `startLiveStreaming/stopLiveStreaming`.
  - Robust event handling: joining/left, local screen share start/stop, `live-streaming-started/stopped/error`.
- `src/modules/BroadcastApp.tsx`
  - UI shell with status pills, source selection, preview, and livestream settings.
  - Pairing section: lists LAN URLs and renders inline QR.
- `src/state/broadcastStore.ts`
  - Zustand store for session, livestream config, logs, preview-mute, etc.

How & why:
- We use a singleton Daily call (from Daily React hooks) and provision rooms locally to avoid external dependencies on mobile for initial setup.
- The server emits `stream-config` and `join-now` so mobile can auto-sync configuration and join quickly.
- Inline QR encodes the first LAN URL (works with any; pick the correct subnet if multiple are shown).

## Mobile app

Location: `sonic-mobile/`

Created with: `npx create-expo-app -t blank-typescript`

Key libs:
- `@daily-co/react-native-daily-js` for joining/viewing the screen share and controlling livestream
- `socket.io-client` for LAN coordination
- `zustand` for state
- `@react-native-async-storage/async-storage` to persist the base URL
- `expo-barcode-scanner` for QR pairing

Important files:
- `src/daily/dailyClient.ts`
  - Singleton DailyCall via `Daily.createCallObject()`; join/leave helpers
  - Event subscriptions: participant changes, track start/stop (screenshare), error logging
  - Reconnecting logs (typed via safe casting until upstream typings include them)
- `src/socket/socketClient.ts`
  - Connects to desktop via Socket.IO (`/socket.io`), receives `stream-config` and `command`
  - Persists base URL with AsyncStorage, exposes `loadPersistedBaseUrl()`
  - Reconnection enabled with `onConnected` callback for auto-join
- `src/state/sessionStore.ts`
  - Zustand store: room URL/token, joined, participants, screenshare state, streaming config, logs, and `livestreamPaused`
- `src/screens/MainScreen.tsx`
  - UI: base URL input, Connect button, Scan QR, screen preview via `DailyMediaView`
  - Controls: Start/Resume, Pause, End livestream
  - Join flow: fetch `GET /daily/session`, then `joinDaily()` with exponential backoff (0.75s/1.5s/3s/6s)
  - Auto-load persisted base URL and auto-connect on launch

How & why:
- Daily RN SDK abstracts away WebRTC intricacies and provides a native surface for rendering remote media.
- Socket.IO ensures low-friction device discovery and configuration over LAN.
- We model Pause as an application state that stops the underlying stream (Daily currently doesn’t expose pause); Resume restarts with the same RTMP endpoint.

## Development & running

Desktop:
```powershell
cd desktop-app
npm run electron-dev
```
- The app boots the local server automatically and shows LAN URLs and a pairing QR.

Mobile (Android example):
```powershell
cd sonic-mobile
npm run start
# Build a development build to use native Daily module
npx expo run:android
```
- Use the input or “Scan QR” to connect to the desktop’s LAN URL (e.g., http://192.168.x.x:PORT).

## Security & validation
- LAN-only by design; add a shared token if needed:
  - Gate `/daily/session`, `/stream/config`, `/command` with a header/token.
  - Validate token in the mobile client before connecting.

## Error handling & resiliency
- Desktop: Defensive try/catch around Daily calls; graceful screen stream cleanup; clear status updates.
- Mobile: Backoff for join attempts; socket reconnection with onConnected hook; Daily reconnect logging.

## Future improvements
- Desktop UI to rotate QR across all LAN addresses
- Display livestream timer and metrics
- Optional Service Discovery (mDNS/Bonjou) for zero-config pairing
- Secure command endpoints + signed configs
- Offline-first caching of last-known stream config on mobile
