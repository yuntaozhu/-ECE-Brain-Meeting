"use strict";

/**
 * 行情 miss 后白名单 Firecrawl 补采 → 解析入库
 * 禁止开放搜索编价；B2B 默认不 live
 */
const fs = require("fs");
const path = require("path");
const { schemaFile, marketRawDir, ensureDir } = require("../knowledge/paths.cjs");
const { scrapeUrl, hasApiKey } = require("../firecrawl/client.cjs");
const { parseMarketMarkdown } = require("./parsers/index.cjs");
const { appendQuotes } = require("./store.cjs");
const { loadProductCfg, extractProducts, productMatchesQuote } = require("./productGate.cjs");
const { assertLiveAllowed } = require("./b2b/profile.cjs");

const cooldownMap = new Map();

function loadCrawlSources() {
  try {
    const raw = JSON.parse(fs.readFileSync(schemaFile("crawl-sources.json"), "utf8"));
    return Array.isArray(raw?.sources) ? raw.sources : [];
  } catch (_) {
    return [];
  }
}

function sourceById(id) {
  return loadCrawlSources().find((s) => s.id === id && s.bucket === "market") || null;
}

/**
 * 问句 → 白名单源（最多 maxSources）
 */
function resolveTargets(query, opts = {}) {
  const cfg = loadProductCfg();
  const q = String(query || "");
  const products = extractProducts(q);
  const max = opts.maxSources ?? cfg.maxSourcesPerQuery ?? 2;
  const ids = [];
  const push = (id) => {
    if (!id || ids.includes(id)) return;
    ids.push(id);
  };

  for (const h of cfg.marketSourceHints || []) {
    try {
      if (new RegExp(h.re, "i").test(q)) (h.ids || []).forEach(push);
    } catch (_) {}
  }
  for (const p of products) {
    const pref = cfg.productSourcePrefer?.[p] || [];
    pref.forEach(push);
  }
  (cfg.defaultLiveSourceIds || []).forEach(push);

  const allowB2b = opts.allowB2bLive === true || cfg.allowB2bLive === true;
  const out = [];
  for (const id of ids) {
    if (out.length >= max) break;
    const src = sourceById(id);
    if (!src || !src.url) continue;
    if (src.tier === "T3" || /ymt|cnhnb/i.test(id)) {
      if (!allowB2b) continue;
      const gate = assertLiveAllowed(id.startsWith("cnhnb") ? "cnhnb" : "ymt");
      if (!gate.ok) continue;
    }
    out.push({ id: src.id, url: src.url, title: src.title, tier: src.tier });
  }
  return { products, targets: out };
}

function cooldownKey(query) {
  const products = extractProducts(query).join("|") || "_";
  const market =
    (/新发地/.test(query) && "xfd") ||
    (/寿光/.test(query) && "sg") ||
    (/江南/.test(query) && "jn") ||
    "any";
  return `${products}::${market}`;
}

function inCooldown(query, sec) {
  const k = cooldownKey(query);
  const until = cooldownMap.get(k) || 0;
  return Date.now() < until ? { hit: true, key: k, remainMs: until - Date.now() } : { hit: false, key: k };
}

function markCooldown(query, sec) {
  const k = cooldownKey(query);
  cooldownMap.set(k, Date.now() + (sec || 120) * 1000);
}

function resetLiveCooldown() {
  cooldownMap.clear();
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      const e = new Error(`live fetch timeout ${ms}ms`);
      e.code = "timeout";
      reject(e);
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (err) => {
        clearTimeout(t);
        reject(err);
      }
    );
  });
}

async function scrapeOne(target, opts = {}) {
  const data = await scrapeUrl(target.url, {
    formats: ["markdown"],
    waitFor: opts.waitFor || 1000,
    timeout: opts.scrapeTimeout || 20000
  });
  const md = data?.data?.markdown || data?.markdown || "";
  const rawDir = ensureDir(marketRawDir());
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(rawDir, `live_${target.id}_${stamp}.md`);
  const body = `---\nurl: ${target.url}\nsource_id: ${target.id}\nfetched_at: ${new Date().toISOString()}\n---\n\n${md}`;
  fs.writeFileSync(file, body, "utf8");
  const parsed = parseMarketMarkdown(body, {
    fileName: path.basename(file),
    source_url: target.url,
    source_id: target.id
  });
  return {
    target,
    file,
    kind: parsed.kind,
    quotes: parsed.quotes || [],
    chars: md.length
  };
}

/**
 * @param {string} query
 * @param {{ live?: boolean, scrapeFn?: Function, skipCooldown?: boolean }} [opts]
 */
async function liveFetchForQuery(query, opts = {}) {
  const cfg = loadProductCfg();
  if (opts.live === false || cfg.liveOnMiss === false) {
    return { ok: false, skipped: true, reason: "live_disabled" };
  }
  if (!opts.scrapeFn && !hasApiKey()) {
    return { ok: false, skipped: true, reason: "missing_key", error: "缺少 FIRECRAWL_API_KEY" };
  }

  const cdSec = cfg.cooldownSec ?? 120;
  if (!opts.skipCooldown) {
    const cd = inCooldown(query, cdSec);
    if (cd.hit) {
      return { ok: false, skipped: true, reason: "cooldown", remainMs: cd.remainMs };
    }
  }

  const { products, targets } = resolveTargets(query, opts);
  if (!targets.length) {
    return { ok: false, skipped: true, reason: "no_targets", products };
  }

  const timeoutMs = opts.timeoutMs ?? cfg.timeoutMs ?? 25000;
  const scrapeFn = opts.scrapeFn || scrapeOne;
  const reports = [];
  let allQuotes = [];

  try {
    await withTimeout(
      (async () => {
        for (const t of targets) {
          try {
            const r = await scrapeFn(t, opts);
            reports.push({
              id: t.id,
              ok: true,
              kind: r.kind,
              count: (r.quotes || []).length,
              chars: r.chars
            });
            allQuotes.push(...(r.quotes || []));
          } catch (err) {
            reports.push({
              id: t.id,
              ok: false,
              error: String(err.message || err).slice(0, 160),
              code: err.code || null
            });
          }
        }
      })(),
      timeoutMs
    );
  } catch (err) {
    markCooldown(query, Math.min(cdSec, 60));
    return {
      ok: false,
      reason: err.code || "timeout",
      error: String(err.message || err),
      products,
      targets: targets.map((t) => t.id),
      reports
    };
  }

  markCooldown(query, cdSec);

  if (products.length) {
    allQuotes = allQuotes.filter((q) => productMatchesQuote(q, products));
  }

  let written = { count: 0, quotes: [] };
  if (allQuotes.length) {
    written = appendQuotes(allQuotes);
  }

  return {
    ok: written.count > 0,
    products,
    targets: targets.map((t) => t.id),
    reports,
    appended: written.count,
    quotes: written.quotes
  };
}

module.exports = {
  resolveTargets,
  liveFetchForQuery,
  resetLiveCooldown,
  cooldownKey,
  loadCrawlSources
};
