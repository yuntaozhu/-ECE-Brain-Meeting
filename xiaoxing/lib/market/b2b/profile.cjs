"use strict";

/**
 * B2B Persistent Profile 钩子（Phase D 轻量）
 * - 不破解反爬、不撞库
 * - 真登录态保活后置 Playwright / Browser Use
 * - 当前：读本地 profile 状态文件，默认 offline → 仅 fixture/seed
 */
const fs = require("fs");
const path = require("path");
const { knowledgeRoot, ensureDir } = require("../../knowledge/paths.cjs");

function profileDir() {
  return ensureDir(path.join(knowledgeRoot(), "market", "b2b-profile"));
}

function statusFile() {
  return path.join(profileDir(), "status.json");
}

function defaultStatus() {
  return {
    platforms: {
      ymt: { logged_in: false, last_keepalive: null, note: "需人工扫码后写 status" },
      cnhnb: { logged_in: false, last_keepalive: null, note: "需人工扫码后写 status" }
    },
    outbound_call_enabled: false,
    updated_at: null
  };
}

function loadProfileStatus() {
  const p = statusFile();
  if (!fs.existsSync(p)) return defaultStatus();
  try {
    return { ...defaultStatus(), ...JSON.parse(fs.readFileSync(p, "utf8")) };
  } catch (_) {
    return defaultStatus();
  }
}

function saveProfileStatus( partial = {}) {
  const cur = loadProfileStatus();
  const next = {
    ...cur,
    ...partial,
    platforms: { ...cur.platforms, ...(partial.platforms || {}) },
    updated_at: new Date().toISOString()
  };
  fs.writeFileSync(statusFile(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

function isLoggedIn(platform) {
  const st = loadProfileStatus();
  const row = st.platforms && st.platforms[platform];
  return Boolean(row && row.logged_in);
}

/**
 * 真采入口占位：未登录则拒绝 live，避免盲爬。
 */
function assertLiveAllowed(platform) {
  if (!isLoggedIn(platform)) {
    return {
      ok: false,
      error: `${platform} 未登录；Phase D 默认用 fixture/seed，勿强行爬供应大厅`
    };
  }
  if (process.env.XIAOXING_B2B_LIVE !== "1") {
    return {
      ok: false,
      error: "需设置 XIAOXING_B2B_LIVE=1 才允许登录态抽取（合规闸）"
    };
  }
  return { ok: true };
}

module.exports = {
  profileDir,
  statusFile,
  loadProfileStatus,
  saveProfileStatus,
  isLoggedIn,
  assertLiveAllowed,
  defaultStatus
};
