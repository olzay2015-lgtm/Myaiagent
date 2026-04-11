/**
 * Electron Preload Script
 * Exposes safe APIs to the renderer (web) process via contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * File System API — доступ к файловой системе компьютера.
 * Доступен в веб-интерфейсе через window.electronFS
 */
contextBridge.exposeInMainWorld('electronFS', {
  readFile: (filePath: string) =>
    ipcRenderer.invoke('fs:readFile', filePath),

  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('fs:writeFile', filePath, content),

  readDir: (dirPath: string) =>
    ipcRenderer.invoke('fs:readDir', dirPath),

  showOpenDialog: (options?: {
    title?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    multiSelections?: boolean;
    directory?: boolean;
  }) =>
    ipcRenderer.invoke('fs:showOpenDialog', options || {}),

  showSaveDialog: (options?: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) =>
    ipcRenderer.invoke('fs:showSaveDialog', options || {}),

  stat: (filePath: string) =>
    ipcRenderer.invoke('fs:stat', filePath),
});

/**
 * Shell API — системные действия
 */
contextBridge.exposeInMainWorld('electronShell', {
  openExternal: (url: string) =>
    ipcRenderer.invoke('shell:openExternal', url),
});

/**
 * App API — информация о приложении
 */
contextBridge.exposeInMainWorld('electronApp', {
  getInfo: () => ipcRenderer.invoke('app:getInfo'),
  isElectron: true,
});
