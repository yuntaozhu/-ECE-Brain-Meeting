"use strict";

const fs = require("fs");
const path = require("path");
const { knowledgeRoot, ensureDir } = require("../../knowledge/paths.cjs");

function cachePath() {
  return path.join(knowledgeRoot(), "market", "province-route-cache.json");
}

function loadCache() {
  const p = cachePath();
  if (!fs.existsSync(p)) return { version: 1, routes: {} };
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (_) {
    return { version: 1, routes: {} };
  }
}

function saveCache(cache) {
  ensureDir(path.dirname(cachePath()));
  fs.writeFileSync(cachePath(), JSON.stringify(cache, null, 2), "utf8");
  return cachePath();
}

function getRoute(provinceId) {
  const c = loadCache();
  return c.routes[provinceId] || null;
}

function setRoute(provinceId, route) {
  const c = loadCache();
  c.routes[provinceId] = {
    ...route,
    updated_at: new Date().toISOString()
  };
  saveCache(c);
  return c.routes[provinceId];
}

function markEmpty(provinceId) {
  const r = getRoute(provinceId) || {};
  const fails = Number(r.empty_streak || 0) + 1;
  return setRoute(provinceId, {
    ...r,
    empty_streak: fails,
    last_empty_at: new Date().toISOString()
  });
}

function shouldRediscover(provinceId, maxStreak = 2) {
  const r = getRoute(provinceId);
  if (!r || !r.price_url) return true;
  return Number(r.empty_streak || 0) >= maxStreak;
}

module.exports = {
  cachePath,
  loadCache,
  saveCache,
  getRoute,
  setRoute,
  markEmpty,
  shouldRediscover
};
