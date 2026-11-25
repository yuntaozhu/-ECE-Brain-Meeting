"use strict";

/**
 * 行情品名硬门闩：问句抽品 → 与 quote.product_name 必须一致（含别名）
 */
const fs = require("fs");
const { schemaFile } = require("../knowledge/paths.cjs");
const { normalizeText } = require("../knowledge/parse.cjs");

let _cfg = null;

function loadProductCfg() {
  if (_cfg) return _cfg;
  try {
    _cfg = JSON.parse(fs.readFileSync(schemaFile("market-products.json"), "utf8"));
  } catch (_) {
    _cfg = {
      requireProductMatch: true,
      minProductScore: 20,
      minScore: 12,
      liveOnMiss: true,
      timeoutMs: 25000,
      maxSourcesPerQuery: 2,
      cooldownSec: 120,
      allowB2bLive: false,
      products: [
        { name: "草莓", aliases: [] },
        { name: "黄瓜", aliases: [] },
        { name: "西红柿", aliases: ["番茄"] }
      ],
      productSourcePrefer: {},
      marketSourceHints: [],
      defaultLiveSourceIds: ["xinfadi-price", "sgvindex"]
    };
  }
  return _cfg;
}

function resetProductCfgCache() {
  _cfg = null;
}

/** @returns {{ name: string, aliases: string[] }[]} */
function productEntries() {
  return (loadProductCfg().products || []).map((p) => ({
    name: String(p.name || "").trim(),
    aliases: Array.isArray(p.aliases) ? p.aliases.map(String) : []
  })).filter((p) => p.name);
}

/**
 * 最长匹配优先抽出问句中的品名（规范名）
 * @returns {string[]}
 */
function extractProducts(query) {
  const qn = normalizeText(query);
  if (!qn) return [];
  const hits = [];
  const entries = productEntries()
    .map((p) => {
      const keys = [p.name, ...p.aliases].filter(Boolean);
      const longest = keys.sort((a, b) => normalizeText(b).length - normalizeText(a).length)[0];
      return { ...p, keys, len: normalizeText(longest || p.name).length };
    })
    .sort((a, b) => b.len - a.len);

  const used = new Set();
  for (const e of entries) {
    for (const k of e.keys) {
      const nk = normalizeText(k);
      if (nk.length < 1) continue;
      if (!qn.includes(nk)) continue;
      // 「蛋」过短易误伤；要求独立或常见搭配
      if (nk === "蛋" && !/鸡蛋|鲜蛋/.test(String(query || ""))) continue;
      if (nk === "姜" && !/生姜|姜/.test(String(query || ""))) continue;
      if (used.has(e.name)) break;
      hits.push(e.name);
      used.add(e.name);
      break;
    }
  }
  return hits;
}

function expandNames(names) {
  const set = new Set();
  const entries = productEntries();
  for (const n of names || []) {
    set.add(n);
    const e = entries.find((x) => x.name === n || x.aliases.includes(n));
    if (e) {
      set.add(e.name);
      e.aliases.forEach((a) => set.add(a));
    }
  }
  return [...set];
}

/**
 * 报价品名是否与问句品名集合一致
 */
function productMatchesQuote(quote, queryProducts) {
  if (!queryProducts || !queryProducts.length) return true;
  const prod = normalizeText(quote?.product_name || "");
  if (!prod) return false;
  const expanded = expandNames(queryProducts).map(normalizeText);
  return expanded.some((n) => n && (prod === n || prod.includes(n) || n.includes(prod)));
}

function productOverlapScore(quote, queryProducts) {
  if (!queryProducts?.length) return 0;
  const prod = normalizeText(quote?.product_name || "");
  if (!prod) return 0;
  const expanded = expandNames(queryProducts).map(normalizeText);
  if (expanded.some((n) => n && prod === n)) return 20;
  if (expanded.some((n) => n && n.length >= 2 && (prod.includes(n) || n.includes(prod)))) return 20;
  return 0;
}

module.exports = {
  loadProductCfg,
  resetProductCfgCache,
  productEntries,
  extractProducts,
  expandNames,
  productMatchesQuote,
  productOverlapScore
};
