const path = require('node:path');
const { fileURLToPath } = require('node:url');

const MAX_BUILD_BYTES = 256 * 1024;

function isTrustedMainSender(event, mainWindow, entryPath) {
  if (!event || !mainWindow || mainWindow.isDestroyed()) return false;

  const contents = mainWindow.webContents;
  if (!contents || event.sender !== contents || event.senderFrame !== contents.mainFrame) {
    return false;
  }

  try {
    return path.resolve(fileURLToPath(contents.getURL())) === path.resolve(entryPath);
  } catch {
    return false;
  }
}

function isValidBuildPayload(build) {
  if (!build || typeof build !== 'object' || Array.isArray(build)) return false;
  if (typeof build.name !== 'string' || build.name.length > 200) return false;
  if (!Array.isArray(build.steps) || build.steps.length > 1000) return false;
  if (!build.steps.every(step => typeof step === 'string' && step.length <= 2000)) return false;
  if (build.clan != null && (typeof build.clan !== 'string' || build.clan.length > 100)) return false;

  try {
    return Buffer.byteLength(JSON.stringify(build), 'utf8') <= MAX_BUILD_BYTES;
  } catch {
    return false;
  }
}

module.exports = { isTrustedMainSender, isValidBuildPayload };
