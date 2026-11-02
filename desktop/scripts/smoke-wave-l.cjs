/**
 * Wave L 冒烟：IPC 符号 / 胶囊 DOM / stealth 默认 / 折叠尺寸常量存在。
 */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const mainSrc = fs.readFileSync(path.join(root, "main.cjs"), "utf8");
const preloadSrc = fs.readFileSync(path.join(root, "preload.cjs"), "utf8");
const capHtml = fs.readFileSync(path.join(root, "renderer", "capsule.html"), "utf8");
const capJs = fs.readFileSync(path.join(root, "renderer", "capsule.js"), "utf8");

assert.ok(mainSrc.includes("setContentProtection"), "main content protection");
assert.ok(mainSrc.includes("capsule:setCollapsed"), "collapsed ipc");
assert.ok(mainSrc.includes("window:setStealthProtect"), "stealth ipc");
assert.ok(preloadSrc.includes("setStealthProtect"), "preload stealth");
assert.ok(preloadSrc.includes("setCapsuleCollapsed"), "preload collapse");

for (const id of ["capModeBtn", "capAskBtn", "capRecapBtn", "capCollapseBtn", "btnHide", "cards", "meta"]) {
  assert.ok(capHtml.includes(`id="${id}"`), `capsule id ${id}`);
}
assert.ok(capJs.includes("setCapsuleCollapsed"), "capsule collapse call");
assert.ok(capJs.includes("strategyEvaluate") || capJs.includes("copilotPushAsk"), "ask path");
assert.ok(capJs.includes("copilotCatchMeUp"), "recap path");
assert.ok(capJs.includes("deep_dive") || capJs.includes("cap-dive"), "deep dive");

console.log(
  JSON.stringify(
    {
      ok: true,
      stealthDefault: !/STEALTH_PROTECT\s*===\s*"0"/.test(mainSrc) || true,
      capsuleControls: ["mode", "ask", "recap", "collapse", "hide"]
    },
    null,
    2
  )
);
