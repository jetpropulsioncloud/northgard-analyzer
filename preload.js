const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  if (typeof callback !== 'function') return () => {};

  // Do not expose the Electron event object to page scripts.
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('longhouse', {
  closeApp: () => ipcRenderer.send('request-app-close'),
  openBuild: build => ipcRenderer.send('open-build-window', build),
  getStaticData: () => ipcRenderer.invoke('load-static-data'),
  onAppVersion: callback => subscribe('app-version', callback),
  onUpdateAvailable: callback => subscribe('update-available', callback),
  onDownloadProgress: callback => subscribe('download-progress', callback),
  onUpdateDownloaded: callback => subscribe('update-downloaded', callback)
});
