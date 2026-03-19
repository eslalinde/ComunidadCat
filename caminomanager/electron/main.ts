import { app, BrowserWindow, ipcMain, Menu, session } from 'electron';
import path from 'path';
import fs from 'fs';
import serve from 'electron-serve';
import { autoUpdater } from 'electron-updater';

const isProd = app.isPackaged;

const appPackageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
);
const isStandalone: boolean = appPackageJson.standalone === true || appPackageJson.standalone === 'true';

const loadURL = serve({ directory: path.join(__dirname, '..', 'out') });

let mainWindow: BrowserWindow | null = null;

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

  loadURL(mainWindow);

  if (!isProd) {
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

app.whenReady().then(() => {
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
  if (isProd && !isStandalone) {
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
  autoUpdater.quitAndInstall();
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
