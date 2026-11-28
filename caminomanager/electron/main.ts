import { app, BrowserWindow, ipcMain, Menu, session, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import serve from 'electron-serve';
import { SignedWindowsUpdater } from './SignedWindowsUpdater';
import { getUpdatePublisher } from './updatePublisher';

const isProd = app.isPackaged;
const isSmokeTest = process.env.ELECTRON_SMOKE_TEST === '1';
const smokeUserDataPath = process.env.ELECTRON_SMOKE_USER_DATA;

if (isSmokeTest && smokeUserDataPath) {
  app.setPath('userData', smokeUserDataPath);
}

const appPackageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
);
const isStandalone: boolean = appPackageJson.standalone === true || appPackageJson.standalone === 'true';

// Links that belong to the OS (browser, dialer, mail, WhatsApp) instead of
// an Electron window. App-internal URLs (app://) keep their default handling.
const EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'tel:', 'mailto:']);
const OS_HANDLED_PROTOCOLS = new Set(['tel:', 'mailto:']);

function protocolOf(url: string): string | null {
  try {
    return new URL(url).protocol;
  } catch {
    return null;
  }
}

const loadURL = serve({ directory: path.join(__dirname, '..', 'out') });

let mainWindow: BrowserWindow | null = null;
let updater: SignedWindowsUpdater | undefined;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '..', 'build-resources', 'icon.ico'),
  });

  Menu.setApplicationMenu(null);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const protocol = protocolOf(url);
    if (protocol && EXTERNAL_PROTOCOLS.has(protocol)) {
      void shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const protocol = protocolOf(url);
    if (protocol && OS_HANDLED_PROTOCOLS.has(protocol)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  loadURL(mainWindow);

  if (!isProd && !isSmokeTest) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized-changed', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized-changed', false);
  });
}

app.whenReady().then(async () => {
  if (isSmokeTest) {
    await session.defaultSession.clearStorageData();
  }

  // Security headers for all responses
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: blob:; " +
          "font-src 'self' data:; " +
          "connect-src 'self' https://*.supabase.co https://*.sentry.io http://127.0.0.1:*; " +
          "frame-ancestors 'none';"
        ],
        'X-Content-Type-Options': ['nosniff'],
        'X-Frame-Options': ['DENY'],
        'Referrer-Policy': ['strict-origin-when-cross-origin'],
        'Permissions-Policy': ['geolocation=(), microphone=(), camera=()'],
      },
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Auto-updates (prod only, disabled for standalone builds)
  if (isProd && !isStandalone && process.platform === 'win32') {
    let publisher: string | undefined;
    try {
      publisher = getUpdatePublisher(fs.readFileSync(path.join(process.resourcesPath, 'app-update.yml'), 'utf8'));
    } catch {
      // An unsigned or incomplete local package cannot enable updates.
    }
    if (!publisher) return;
    const autoUpdater = new SignedWindowsUpdater(publisher, path.join(process.resourcesPath, 'Verify-UpdateSignature.ps1'));
    updater = autoUpdater;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', () => {
      mainWindow?.webContents.send('update-available');
    });

    autoUpdater.on('update-downloaded', () => {
      mainWindow?.webContents.send('update-downloaded');
    });
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('install-update', () => {
  updater?.quitAndInstall();
});

// Window control handlers
ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() ?? false;
});
