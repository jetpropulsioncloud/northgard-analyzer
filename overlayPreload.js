const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  if (typeof callback !== 'function') return () => {};

  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('longhouseOverlay', {
  onLoadBuild: callback => subscribe('load-build', callback),
  onNextSection: callback => subscribe('overlay-next-section', callback),
  onPreviousSection: callback => subscribe('overlay-prev-section', callback),
  onFirstSection: callback => subscribe('overlay-first-section', callback),
  onLastSection: callback => subscribe('overlay-last-section', callback),
  onScrollDown: callback => subscribe('overlay-scroll-down', callback),
  onScrollUp: callback => subscribe('overlay-scroll-up', callback),
  onScrollPageDown: callback => subscribe('overlay-scroll-page-down', callback),
  onScrollPageUp: callback => subscribe('overlay-scroll-page-up', callback),
  onScrollTop: callback => subscribe('overlay-go-top', callback),
  onScrollBottom: callback => subscribe('overlay-go-bottom', callback)
});
