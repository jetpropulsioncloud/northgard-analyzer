// Escapes untrusted text before insertion into HTML templates.
// This module works in both Electron's renderer and Node's built-in test runner.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SafeHtml = api;
})(typeof globalThis !== "undefined" ? globalThis : undefined, function () {
  "use strict";
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  return Object.freeze({ escapeHtml });
});
