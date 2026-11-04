---
name: electron-feature
description: 'Add Electron-specific features to ComunidadCat: IPC handlers, auto-update, window management, native integrations.'
---

# Electron Feature

Add Electron-specific functionality to the ComunidadCat desktop application.

## When to Use

- Adding native desktop features (file system, notifications, tray)
- Modifying window behavior (frameless, sizing, positioning)
- Updating auto-update logic
- Adding IPC communication between main and renderer
- User asks about "Electron", "desktop feature", "native integration"

## Architecture Overview

```
electron/
├── main.ts         # Main process (BrowserWindow, IPC handlers, auto-updater)
├── preload.ts      # Preload script (contextBridge exposures)
└── tsconfig.json   # Electron-specific TS config

caminomanager/src/components/electron/
├── WindowControls.tsx      # Custom title bar buttons (minimize, maximize, close)
└── UpdateNotification.tsx  # Auto-update UI notifications
```

## Key Constraints

1. **Static Export**: The app uses `output: 'export'` in Next.js. No server-side features (API routes, middleware, SSR).
2. **Context Isolation**: `contextIsolation: true`. All main↔renderer communication via `contextBridge`.
3. **Security**: Never expose `require`, `fs`, or other Node.js APIs directly to the renderer.

## Workflow

### 1. Define the Feature

Ask the user:
- What native capability is needed?
- Does it require main process access (file system, OS APIs)?
- Does the renderer need to communicate with main process?
- Should it degrade gracefully in the web version?

### 2. Main Process (if needed)

In `electron/main.ts`, add IPC handlers:

```typescript
ipcMain.handle('channel-name', async (_event, args) => {
  // Main process logic
  return result;
});
```

### 3. Preload Script (if needed)

In `electron/preload.ts`, expose via contextBridge:

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  channelName: (args: any) => ipcRenderer.invoke('channel-name', args),
});
```

### 4. TypeScript Declarations

Add type declarations for the exposed API:

```typescript
// In a .d.ts file or at the top of the component
declare global {
  interface Window {
    electronAPI?: {
      channelName: (args: any) => Promise<any>;
    };
  }
}
```

### 5. Renderer Component

In `src/components/electron/`, create the component:

```typescript
'use client';

export function ElectronFeature() {
  // Check if running in Electron
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  if (!isElectron) return null; // Graceful degradation for web

  // Use window.electronAPI.channelName(...)
}
```

### 6. Web Compatibility

Always check for Electron context before using native features:
```typescript
const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;
```

### 7. Build & Test

```bash
cd caminomanager

# TypeScript check (includes electron tsconfig)
npm run type-check
tsc -p electron/tsconfig.json

# Test in Electron dev mode
npm run electron:dev

# Build installer
npm run electron:build
```

### Auto-Update Pattern

The app uses `electron-updater` with GitHub releases:

```typescript
// In main.ts
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();

autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update-available', info);
});

autoUpdater.on('update-downloaded', (info) => {
  mainWindow?.webContents.send('update-downloaded', info);
});
```

### Safety Rules

- Never bypass context isolation
- Always handle errors in IPC handlers
- Degrade gracefully in web mode (the same codebase runs on Vercel)
- Test both web and Electron builds after changes
