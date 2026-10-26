const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function initializeBridge(filename) {
  const api = new Map();
  const listeners = new Map();
  const sent = [];
  const invoked = [];
  const ipcRenderer = {
    send: (...args) => sent.push(args),
    invoke: (...args) => {
      invoked.push(args);
      return Promise.resolve({ militaryPaths: {}, clanLore: {} });
    },
    on: (channel, listener) => listeners.set(channel, listener),
    removeListener: (channel, listener) => {
      if (listeners.get(channel) === listener) listeners.delete(channel);
    }
  };
  const contextBridge = { exposeInMainWorld: (name, value) => api.set(name, value) };

  const source = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
  vm.runInNewContext(source, {
    require: name => {
      assert.equal(name, 'electron');
      return { contextBridge, ipcRenderer };
    }
  }, { filename });

  return { api, listeners, sent, invoked };
}

test('main preload exposes only named operations, not raw Electron APIs', async () => {
  const { api, sent, invoked } = initializeBridge('preload.js');
  const bridge = api.get('longhouse');
  assert.ok(bridge);
  assert.equal(bridge.ipcRenderer, undefined);
  assert.equal(bridge.send, undefined);
  bridge.closeApp();
  bridge.openBuild({ name: 'Wolf', steps: [] });
  assert.equal(sent[0][0], 'request-app-close');
  assert.equal(sent[1][0], 'open-build-window');
  await bridge.getStaticData();
  assert.equal(invoked[0][0], 'load-static-data');
});

test('main preload listeners strip the privileged IPC event and can unsubscribe', () => {
  const { api, listeners } = initializeBridge('preload.js');
  let payload;
  const unsubscribe = api.get('longhouse').onAppVersion(value => { payload = value; });
  const event = { sender: { privileged: true } };
  listeners.get('app-version')(event, '1.5.0');
  assert.equal(payload, '1.5.0');
  assert.notEqual(payload, event);
  unsubscribe();
  assert.equal(listeners.has('app-version'), false);
});

test('overlay preload is receive-only and accepts build/scroll events', () => {
  const { api, listeners, sent, invoked } = initializeBridge('overlayPreload.js');
  const overlay = api.get('longhouseOverlay');
  assert.ok(overlay);
  assert.equal(overlay.send, undefined);
  assert.equal(overlay.openBuild, undefined);
  let build;
  overlay.onLoadBuild(value => { build = value; });
  listeners.get('load-build')({ sender: 'private' }, { name: 'Bear' });
  assert.equal(build.name, 'Bear');
  assert.equal(sent.length, 0);
  assert.equal(invoked.length, 0);
  let scrolled = false;
  overlay.onScrollDown(() => { scrolled = true; });
  listeners.get('overlay-scroll-down')({ sender: 'private' });
  assert.equal(scrolled, true);
});

test('both shipped JSON resources parse correctly', () => {
  for (const file of ['militarypath.json', 'lore.json']) {
    const contents = fs.readFileSync(path.join(__dirname, '..', 'data', file), 'utf8');
    assert.equal(typeof JSON.parse(contents), 'object');
  }
});
