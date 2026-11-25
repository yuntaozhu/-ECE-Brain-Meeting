"use strict";

/**
 * 省厅栏目语义发现：关键词打分（Phase C；LLM/VLM 后置挂钩）
 * 不依赖 Playwright：fixture HTML 或 fetch 首页
 */
const fs = require("fs");
const { schemaFile } = require("../../knowledge/paths.cjs");
const { setRoute, getRoute, shouldRediscover } = require("./routeCache.cjs");

let _roots = null;

function loadRoots() {
  if (_roots) return _roots;
  _roots = JSON.parse(fs.readFileSync(schemaFile("province-agri-roots.json"), "utf8"));
  return _roots;
}

function listPilotProvinces() {
  const cfg = loadRoots();
  const ids = new Set(cfg.pilots || []);
  return (cfg.provinces || []).filter((p) => ids.has(p.id) || p.pilot === true);
}

function extractAnchors(html, baseUrl) {
  const out = [];
  const re = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(String(html || "")))) {
    let href = m[1].trim();
    const text = String(m[2] || "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
    if (/备案|机构职能|政务公开目录|登录|注册/.test(text)) continue;
    try {
      href = new URL(href, baseUrl).toString();
    } catch (_) {
      continue;
    }
    out.push({ href, text });
    if (out.length >= 120) break;
  }
  return out;
}

function scoreLink(text, href, keywords) {
  const hay = `${text} ${href}`;
  let score = 0;
  for (const k of keywords) {
    if (hay.includes(k)) score += 10;
    else {
      for (let i = 0; i + 2 <= k.length; i++) {
        if (hay.includes(k.slice(i, i + 2))) score += 1;
      }
    }
  }
  return score;
}

function pickBest(anchors, keywords) {
  let best = null;
  for (const a of anchors) {
    const s = scoreLink(a.text, a.href, keywords);
    if (!best || s > best.score) best = { ...a, score: s };
  }
  if (!best || best.score < 8) return null;
  return best;
}

function discoverFromHtml(html, province, cfg = loadRoots()) {
  const anchors = extractAnchors(html, province.home);
  const price = pickBest(anchors, cfg.priceKeywords || []);
  const pest = pickBest(anchors, cfg.pestKeywords || []);
  return {
    province_id: province.id,
    province_name: province.name,
    home: province.home,
    price_url: price?.href || null,
    price_label: price?.text || null,
    price_score: price?.score || 0,
    pest_url: pest?.href || null,
    pest_label: pest?.text || null,
    pest_score: pest?.score || 0,
    method: "keyword",
    candidates: anchors.length
  };
}

async function fetchHomeHtml(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs || 20000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": "XiaoxingMarketBot/0.5 (+phase-c)" }
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, html: text };
  } finally {
    clearTimeout(t);
  }
}

/**
 * 发现或读缓存；force 时重测绘
 */
async function discoverProvince(provinceId, opts = {}) {
  const cfg = loadRoots();
  const province = (cfg.provinces || []).find((p) => p.id === provinceId);
  if (!province) throw new Error(`unknown province: ${provinceId}`);

  if (!opts.force && !shouldRediscover(provinceId) && getRoute(provinceId)?.price_url) {
    return { cached: true, route: getRoute(provinceId) };
  }

  let html = opts.html || null;
  if (!html && opts.htmlPath && fs.existsSync(opts.htmlPath)) {
    html = fs.readFileSync(opts.htmlPath, "utf8");
  }
  if (!html && opts.live) {
    const fr = await fetchHomeHtml(province.home);
    if (!fr.ok) {
      return { cached: false, error: `fetch ${fr.status}`, route: getRoute(provinceId) };
    }
    html = fr.html;
  }
  if (!html) {
    return { cached: false, error: "no html (pass fixture or --live)", route: null };
  }

  const discovered = discoverFromHtml(html, province, cfg);
  const route = setRoute(provinceId, {
    ...discovered,
    empty_streak: 0
  });
  return { cached: false, route };
}

module.exports = {
  loadRoots,
  listPilotProvinces,
  extractAnchors,
  discoverFromHtml,
  discoverProvince,
  fetchHomeHtml
};
