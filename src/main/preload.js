const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  detectValheim: () => ipcRenderer.invoke('valheim:detect'),
  selectValheimFolder: () => ipcRenderer.invoke('valheim:select'),
  getState: () => ipcRenderer.invoke('state:get'),
  saveState: (patch) => ipcRenderer.invoke('state:save', patch),
  loadConfig: (url) => ipcRenderer.invoke('config:load', url),
  installModpack: (payload) => ipcRenderer.invoke('modpack:install', payload),
  resetModpack: (payload) => ipcRenderer.invoke('modpack:reset', payload),
  isInstalled: (key) => ipcRenderer.invoke('modpack:isInstalled', key),
  launchGame: (preferSteam) => ipcRenderer.invoke('game:launch', preferSteam),
  onProgress: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on('progress', listener);
    return () => ipcRenderer.removeListener('progress', listener);
  }
});