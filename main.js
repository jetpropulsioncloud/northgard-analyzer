const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

log.info('App launched');
log.info(`App version: ${app.getVersion()}`);

let mainWindow = null;
let buildWin = null;
let overlayLocked = true;

function createWindow() {
  log.info('Creating Electron window...');
  log.info(`Current version: ${app.getVersion()}`);

  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    icon: process.platform === 'win32'
      ? path.join(__dirname, 'assets', 'longhouse-icon.ico')
      : path.join(__dirname, 'assets', 'longhouse-icon.png'),
    transparent: false,
    frame: false,
    resizable: true,
    alwaysOnTop: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.send('app-version', app.getVersion());
  });

  mainWindow.on('close', () => {
    if (buildWin && !buildWin.isDestroyed()) {
      buildWin.close();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (app.isPackaged) {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'jetpropulsioncloud',
      repo: 'northgard-analyzer'
    });

    autoUpdater.checkForUpdatesAndNotify();
  } else {
    console.log('Skipping auto-update check in dev mode');
  }

  autoUpdater.on('update-available', () => {
    log.info('Update available');

    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('update-available');
    }
  });

  autoUpdater.on('download-progress', progressObj => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', () => {
    log.info('Update downloaded. Will install on quit.');
    autoUpdater.quitAndInstall();
  });

  autoUpdater.on('error', err => {
    log.error('AutoUpdater error:', err == null ? 'unknown' : (err.stack || err).toString());
  });
}

function getBuildWindow() {
  if (!buildWin || buildWin.isDestroyed()) {
    return null;
  }

  return buildWin;
}

function setOverlayLocked(locked) {
  const win = getBuildWindow();

  if (!win) {
    return;
  }

  overlayLocked = locked;

  if (overlayLocked) {
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setIgnoreMouseEvents(true, { forward: true });
    win.setFocusable(false);

    if (win.isVisible()) {
      win.showInactive();
    }
  } else {
    win.setIgnoreMouseEvents(false);
    win.setFocusable(true);
    win.show();
    win.focus();
  }

  win.webContents.send('overlay-lock-state', overlayLocked);
}

function toggleOverlayLock() {
  setOverlayLocked(!overlayLocked);
}

function toggleOverlayVisibility() {
  const win = getBuildWindow();

  if (!win) {
    return;
  }

  if (win.isVisible()) {
    win.hide();
    return;
  }

  win.showInactive();
  win.setAlwaysOnTop(true, 'screen-saver');

  if (overlayLocked) {
    win.setIgnoreMouseEvents(true, { forward: true });
    win.setFocusable(false);
  }
}

function runInBuildWindow(script) {
  const win = getBuildWindow();

  if (!win) {
    return;
  }

  win.webContents.executeJavaScript(script).catch(err => {
    log.error('Overlay script error:', err);
  });
}

function scrollBuildWindow(amount) {
  runInBuildWindow(`
    (() => {
      const allElements = Array.from(document.querySelectorAll('*'));

      const scrollableElements = allElements.filter(element => {
        const style = window.getComputedStyle(element);
        const canScroll = element.scrollHeight > element.clientHeight + 20;
        const visible = style.display !== 'none' && style.visibility !== 'hidden';
        const allowsScroll = style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay';

        return canScroll && visible && allowsScroll;
      });

      scrollableElements.sort((a, b) => {
        const aAmount = a.scrollHeight - a.clientHeight;
        const bAmount = b.scrollHeight - b.clientHeight;

        return bAmount - aAmount;
      });

      const target = scrollableElements[0] || document.scrollingElement || document.documentElement || document.body;

      target.scrollBy({
        top: ${amount},
        left: 0,
        behavior: 'smooth'
      });
    })();
  `);
}

function scrollBuildWindowToTop() {
  runInBuildWindow(`
    (() => {
      const allElements = Array.from(document.querySelectorAll('*'));

      const scrollableElements = allElements.filter(element => {
        const style = window.getComputedStyle(element);
        const canScroll = element.scrollHeight > element.clientHeight + 20;
        const visible = style.display !== 'none' && style.visibility !== 'hidden';
        const allowsScroll = style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay';

        return canScroll && visible && allowsScroll;
      });

      scrollableElements.sort((a, b) => {
        const aAmount = a.scrollHeight - a.clientHeight;
        const bAmount = b.scrollHeight - b.clientHeight;

        return bAmount - aAmount;
      });

      const target = scrollableElements[0] || document.scrollingElement || document.documentElement || document.body;

      target.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    })();
  `);
}

function scrollBuildWindowToBottom() {
  runInBuildWindow(`
    (() => {
      const allElements = Array.from(document.querySelectorAll('*'));

      const scrollableElements = allElements.filter(element => {
        const style = window.getComputedStyle(element);
        const canScroll = element.scrollHeight > element.clientHeight + 20;
        const visible = style.display !== 'none' && style.visibility !== 'hidden';
        const allowsScroll = style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay';

        return canScroll && visible && allowsScroll;
      });

      scrollableElements.sort((a, b) => {
        const aAmount = a.scrollHeight - a.clientHeight;
        const bAmount = b.scrollHeight - b.clientHeight;

        return bAmount - aAmount;
      });

      const target = scrollableElements[0] || document.scrollingElement || document.documentElement || document.body;

      target.scrollTo({
        top: target.scrollHeight,
        left: 0,
        behavior: 'smooth'
      });
    })();
  `);
}

function registerOverlayShortcuts() {
  const shortcuts = [
    {
      keys: 'Alt+L',
      action: toggleOverlayLock
    },
    {
      keys: 'Alt+O',
      action: toggleOverlayVisibility
    },
    {
      keys: 'CommandOrControl+Alt+J',
      action: () => {
        const win = getBuildWindow();

        if (win) {
          win.webContents.send('overlay-next-section');
        }
      }
    },
    {
      keys: 'CommandOrControl+Alt+K',
      action: () => {
        const win = getBuildWindow();

        if (win) {
          win.webContents.send('overlay-prev-section');
        }
      }
    },
    {
      keys: 'CommandOrControl+Alt+N',
      action: () => {
        const win = getBuildWindow();

        if (win) {
          win.webContents.send('overlay-next-section');
        }
      }
    },
    {
      keys: 'CommandOrControl+Alt+M',
      action: () => {
        const win = getBuildWindow();

        if (win) {
          win.webContents.send('overlay-prev-section');
        }
      }
    },
    {
      keys: 'CommandOrControl+Alt+H',
      action: () => {
        const win = getBuildWindow();

        if (win) {
          win.webContents.send('overlay-first-section');
        }
      }
    },
    {
      keys: 'CommandOrControl+Alt+E',
      action: () => {
        const win = getBuildWindow();

        if (win) {
          win.webContents.send('overlay-last-section');
        }
      }
    }
  ];

  shortcuts.forEach(shortcut => {
    const registered = globalShortcut.register(shortcut.keys, shortcut.action);

    if (!registered) {
      log.warn(`Could not register shortcut: ${shortcut.keys}`);
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  registerOverlayShortcuts();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.on('request-app-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.on('reset-window-focus', () => {
  const win = BrowserWindow.getFocusedWindow();

  if (win) {
    win.hide();
    setTimeout(() => win.show(), 150);
  }
});

ipcMain.on('overlay-lock', () => {
  setOverlayLocked(true);
});

ipcMain.on('overlay-unlock', () => {
  setOverlayLocked(false);
});

ipcMain.on('overlay-toggle-lock', () => {
  toggleOverlayLock();
});

ipcMain.on('overlay-toggle-visibility', () => {
  toggleOverlayVisibility();
});

ipcMain.on('open-build-window', (event, buildData) => {
  if (buildWin && !buildWin.isDestroyed()) {
    buildWin.close();
  }

  overlayLocked = false;

  buildWin = new BrowserWindow({
    width: 400,
    height: 600,
    minWidth: 350,
    minHeight: 400,
    resizable: true,
    title: 'Northgard Build',
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    skipTaskbar: true,
    focusable: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  buildWin.loadFile('viewBuild.html');

  buildWin.webContents.once('did-finish-load', () => {
    buildWin.webContents.send('load-build', buildData);
    buildWin.webContents.send('overlay-lock-state', false);

    buildWin.setAlwaysOnTop(true, 'screen-saver');
    buildWin.setIgnoreMouseEvents(false);
    buildWin.setFocusable(true);
    buildWin.show();
    buildWin.focus();
  });

  buildWin.on('closed', () => {
    buildWin = null;
  });
});