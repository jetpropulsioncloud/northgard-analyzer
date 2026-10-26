const test = require("node:test");
const assert = require("node:assert/strict");
const { escapeHtml } = require("../safeHtml.js");

test("escapes HTML tags and ampersands", () => {
  assert.equal(escapeHtml("<img src=x onerror=alert(1)>&"), "&lt;img src=x onerror=alert(1)&gt;&amp;");
});

test("escapes both quotation marks in attributes", () => {
  assert.equal(escapeHtml(`" onclick='alert(1)`), "&quot; onclick=&#39;alert(1)");
});

test("handles nullish values safely", () => {
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(undefined), "");
});

test("does not double-interpret entity-looking input", () => {
  assert.equal(escapeHtml("&lt;script&gt;"), "&amp;lt;script&amp;gt;");
});

test("preserves ordinary build names and Unicode", () => {
  assert.equal(escapeHtml("🐺 Wolf 801 — Economy"), "🐺 Wolf 801 — Economy");
});
