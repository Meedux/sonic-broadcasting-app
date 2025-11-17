# Sonic Mobile (Kotlin Rewrite)

This directory contains a native Android (Kotlin + Jetpack Compose) rewrite of the previous React Native mobile app.

## Goals
* Act as controller + viewer for the desktop Electron broadcasting app.
* Join a Daily.co room, show desktop screenshare, control RTMP livestream start/stop.
* Receive pairing + session data over Socket.IO from the desktop LAN server.

## Architecture
| Layer | Files | Responsibility |
|-------|-------|---------------|
| Daily wrapper | `daily/DailyClient.kt` | Abstract join/leave/livestream (placeholder for real Daily Android SDK). |
| Socket.IO | `socket/SocketManager.kt` | Maintains websocket connection, emits events via Flow. |
| State | `state/AppViewModel.kt` | Aggregates Daily + Socket state, exposes `UiState` to Compose. |
| UI | `ui/screens/ControllerScreen.kt` | Dark theme controller screen + video preview + buttons. |
| Theme | `ui/theme/Theme.kt` | Dark red & black color scheme. |

## Daily Android SDK
The actual Maven coordinate must be inserted (commented in `app/build.gradle.kts`). Replace:
```kotlin
// implementation("co.daily:daily-android-sdk:0.1.0")
```
with the correct artifact & version from Daily docs, then implement the real calls inside `DailyClient`.

## TODOs
1. Runtime permission UX (rationale, denial flow).
2. Add room validation/auth (e.g., shared secret from desktop; extend `SocketManager`).
3. Retry/backoff for join errors.
4. Implement real livestream status propagation from desktop (server must emit `livestream-status`).
5. Unit tests for `DailyClient`, `SocketManager`, and ViewModel.

## Building
Open Android Studio and sync Gradle. (First sync will fail until the Daily dependency is added or the placeholder calls are guarded.)

## Migration Note
Original React Native implementation has been superseded by this native module. Remove RN files after confirming Kotlin build stability.
Livestream controls currently proxy commands to the desktop via Socket.IO (start/pause/stop) because RTMP control is handled centrally there. Daily Android SDK does not yet expose native RTMP start/stop APIs; when available, replace socket emits with direct `CallClient` methods.
