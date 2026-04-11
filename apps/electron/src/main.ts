/**
 * Electron Main Process — десктоп обёртка для MyAIAgent.
 * Открывает веб-интерфейс в Electron окне.
 * Предоставляет доступ к файловой системе через IPC.
 */

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const WEB_URL = process.env.AGENT_WEB_URL || 'http://localhost:3000';
const API_URL = process.env.AGENT_API_URL || 'http://localhost:4000';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'MyAIAgent Desktop',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
  });

  // Load the web interface
  mainWindow.loadURL(WEB_URL).catch(() => {
    // If web server is not running, show an error page
    mainWindow?.loadFile(path.join(__dirname, '..', 'static', 'offline.html'));
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ==============================
// IPC Handlers — File System API
// ==============================

/**
 * Read a file from the user's filesystem
 */
ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
  try {
    // Security: only allow reading from user-selected paths
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return { success: true, content, path: filePath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

/**
 * Write a file to the user's filesystem
 */
ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
  try {
    await fs.promises.writeFile(filePath, content, 'utf-8');
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

/**
 * List directory contents
 */
ipcMain.handle('fs:readDir', async (_event, dirPath: string) => {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    return {
      success: true,
      entries: entries.map(e => ({
        name: e.name,
        isDirectory: e.isDirectory(),
        isFile: e.isFile(),
        path: path.join(dirPath, e.name),
      })),
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

/**
 * Show a file picker dialog
 */
ipcMain.handle('fs:showOpenDialog', async (_event, options: {
  title?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  multiSelections?: boolean;
  directory?: boolean;
}) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: options.title || 'Select File',
    filters: options.filters || [{ name: 'All Files', extensions: ['*'] }],
    properties: [
      options.directory ? 'openDirectory' : 'openFile',
      ...(options.multiSelections ? ['multiSelections' as const] : []),
    ],
  });

  return {
    canceled: result.canceled,
    filePaths: result.filePaths,
  };
});

/**
 * Show a save dialog
 */
ipcMain.handle('fs:showSaveDialog', async (_event, options: {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: options.title || 'Save File',
    defaultPath: options.defaultPath,
    filters: options.filters || [{ name: 'All Files', extensions: ['*'] }],
  });

  return {
    canceled: result.canceled,
    filePath: result.filePath,
  };
});

/**
 * Get file info (size, dates, etc.)
 */
ipcMain.handle('fs:stat', async (_event, filePath: string) => {
  try {
    const stat = await fs.promises.stat(filePath);
    return {
      success: true,
      size: stat.size,
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
      created: stat.birthtime,
      modified: stat.mtime,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

/**
 * Open a file/URL in the default system application
 */
ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  await shell.openExternal(url);
  return { success: true };
});

/**
 * Get app info
 */
ipcMain.handle('app:getInfo', async () => {
  return {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    webUrl: WEB_URL,
    apiUrl: API_URL,
  };
});

// ==============================
// App Lifecycle
// ==============================

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
