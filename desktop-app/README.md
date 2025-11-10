# Sonic Broadcast Desktop

Sonic Broadcast Desktop is the broadcaster control center for the Sonic Broadcasting Suite. It is an Electron + React application that integrates a local Express/Socket.IO server and the Daily.co SDK.

## Scripts

- `npm run dev`: launch the renderer dev server and attach Electron
- `npm run typecheck`: run TypeScript project references
- `npm run lint`: run ESLint checks
- `npm run build`: bundle renderer and Electron targets
- `npm run package`: build distributable binaries with electron-builder

## Project Layout

- `src/`: React renderer entry point and UI components
- `electron/`: Electron main process, preload script, and server integration
- `build/`: electron-builder resources (icons, etc.)

## Next Steps

You can now implement the custom UI, integrate Daily.co broadcasting, and expand the communication server.
