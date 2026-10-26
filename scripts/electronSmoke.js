const assert = require('node:assert/strict');
const path = require('node:path');
const { app, BrowserWindow, ipcMain } = require('electron');

app.commandLine.appendSwitch('disable-gpu');

const timeout = setTimeout(() => {
  console.error('Electron preload smoke test timed out');
  app.exit(1);
}, 30000);

async function inspectWindow(preloadFile, globalName, expectedMethod) {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', preloadFile),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  await win.loadFile(path.join(__dirname, 'bridge-smoke.html'));
  const result = await win.webContents.executeJavaScript(`({
    bridge: typeof window.${globalName}?.${expectedMethod},
    nodeRequire: typeof require,
    nodeProcess: typeof process
  })`);
  assert.equal(result.bridge, 'function');
  assert.equal(result.nodeRequire, 'undefined');
  assert.equal(result.nodeProcess, 'undefined');
  return win;
}

app.whenReady().then(async () => {
  let mainWindow;
  let overlayWindow;

  try {
    ipcMain.handle('load-static-data', () => ({ militaryPaths: {}, clanLore: {} }));
    mainWindow = await inspectWindow('preload.js', 'longhouse', 'getStaticData');
    const data = await mainWindow.webContents.executeJavaScript('window.longhouse.getStaticData()');
    assert.equal(typeof data.militaryPaths, 'object');

    overlayWindow = await inspectWindow('overlayPreload.js', 'longhouseOverlay', 'onLoadBuild');
    const noSend = await overlayWindow.webContents.executeJavaScript(
      "typeof window.longhouseOverlay.openBuild === 'undefined'"
    );
    assert.equal(noSend, true);

    console.log('Isolated Electron main/overlay bridges launched successfully');
    clearTimeout(timeout);
    app.exit(0);
  } catch (error) {
    console.error(error);
    clearTimeout(timeout);
    app.exit(1);
  } finally {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
    if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.destroy();
  }
}).catch(error => {
  console.error(error);
  clearTimeout(timeout);
  app.exit(1);
});
