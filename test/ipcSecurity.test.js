const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { isTrustedMainSender, isValidBuildPayload } = require('../ipcSecurity');

const entryPath = path.resolve('/tmp/longhouse/index.html');

function mockIpc(url = pathToFileURL(entryPath).href) {
  const mainFrame = {};
  const contents = { mainFrame, getURL: () => url };
  const win = { isDestroyed: () => false, webContents: contents };
  return { event: { sender: contents, senderFrame: mainFrame }, win };
}

test('accepts IPC from the exact trusted app entry frame', () => {
  const { event, win } = mockIpc();
  assert.equal(isTrustedMainSender(event, win, entryPath), true);
});

test('rejects child frames, other windows, and navigated pages', () => {
  const { event, win } = mockIpc();
  assert.equal(isTrustedMainSender({ ...event, senderFrame: {} }, win, entryPath), false);
  assert.equal(isTrustedMainSender({ ...event, sender: {} }, win, entryPath), false);
  assert.equal(isTrustedMainSender(event, { ...win, isDestroyed: () => true }, entryPath), false);
  const remotePage = mockIpc('https://example.com/index.html');
  assert.equal(isTrustedMainSender(remotePage.event, remotePage.win, entryPath), false);
  const otherPage = mockIpc(pathToFileURL('/tmp/other/index.html').href);
  assert.equal(isTrustedMainSender(otherPage.event, otherPage.win, entryPath), false);
});

test('accepts normal build data including optional metadata', () => {
  assert.equal(isValidBuildPayload({ name: 'Wolf 801', clan: 'Fenrir', steps: ['# 801', 'Build a camp'], loreOrder: [1, 2] }), true);
});

test('rejects malformed and excessively long build fields', () => {
  assert.equal(isValidBuildPayload(null), false);
  assert.equal(isValidBuildPayload({ name: 'A', steps: [{}] }), false);
  assert.equal(isValidBuildPayload({ name: 'X'.repeat(201), steps: [] }), false);
  assert.equal(isValidBuildPayload({ name: 'A', steps: ['X'.repeat(2001)] }), false);
  assert.equal(isValidBuildPayload({ name: 'A', steps: [], clan: 42 }), false);
});

test('rejects oversized and non-serializable payloads', () => {
  assert.equal(isValidBuildPayload({ name: 'A', steps: [], extra: 'Z'.repeat(300_000) }), false);
  const circular = { name: 'A', steps: [] };
  circular.extra = circular;
  assert.equal(isValidBuildPayload(circular), false);
});
