"use strict";

/**
 * B2B 供应大厅规则解析（fixture / 脱敏公开列表）
 * 真站登录态抽取走 lib/market/b2b/profile 钩子，本文件只吃 Markdown。
 */
const { normalizeQuote, validateQuote } = require("../normalize.cjs");

function baseMeta(meta = {}) {
  return {
    publish_date: meta.publish_date || new Date().toISOString().slice(0, 10),
    source_url: meta.source_url || "",
    source_id: meta.source_id || null,
    source_tier: "T3",
    quote_kind: "farmgate",
    confidence: meta.confidence ?? 0.5
  };
}

function pushOk(out, raw) {
  const q = normalizeQuote(raw);
  if (validateQuote(q).ok) out.push(q);
}

/**
 * 一亩田式表格：| 品类 | 产地 | 规格 | 报价 | 单位 | 供应方 |
 */
function parseYmtMarkdown(md, meta = {}) {
  const out = [];
  const bm = baseMeta({
    ...meta,
    source_url: meta.source_url || "https://www.ymt.com/gongying/",
    source_id: meta.source_id || "ymt-gongying"
  });
  for (const line of String(md || "").split(/\r?\n/)) {
    if (!/\|/.test(line) || /品类|---+/.test(line)) continue;
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 4) continue;
    const [product, region, spec, priceCell, unitCell, seller] = cells;
    if (!/草莓|黄瓜|西红柿|番茄|大白菜|彩椒/.test(product)) continue;
    const nums = String(priceCell).match(/(\d+(?:\.\d+)?)/g);
    if (!nums || !nums.length) continue;
    const prices = nums.map(Number);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = Math.round(((min + max) / 2) * 1000) / 1000;
    pushOk(out, {
      ...bm,
      product_name: product.replace(/番茄/, "西红柿"),
      province: /山东|四川|河南|安徽|广东/.test(region)
        ? region.replace(/.*(山东|四川|河南|安徽|广东).*/, "$1省").replace(/省省/, "省")
        : "",
      market_or_region: `一亩田·${region}产地`,
      specification: spec || null,
      price_min: min,
      price_max: max,
      price_avg: avg,
      unit_raw: /公斤|千克/.test(unitCell || "") ? "元/公斤" : "元/斤",
      category: /草莓/.test(product) ? "水果" : "蔬菜",
      seller_hint: seller || null
    });
  }
  return out;
}

/**
 * 惠农网自由行：供应：品类 产地 规格 价 元/斤 供应方
 */
function parseCnhnbMarkdown(md, meta = {}) {
  const out = [];
  const bm = baseMeta({
    ...meta,
    source_url: meta.source_url || "https://www.cnhnb.com/supply/",
    source_id: meta.source_id || "cnhnb-supply"
  });
  for (const line of String(md || "").split(/\r?\n/)) {
    const m = line.match(
      /供应[：:]\s*(草莓|黄瓜|西红柿|番茄|大白菜|彩椒)\s+(\S+)\s+(\S+)\s+(\d+(?:\.\d+)?)(?:\s*[～~\-－]\s*(\d+(?:\.\d+)?))?\s*元\/斤\s*(\S+)?/
    );
    if (!m) continue;
    const min = Number(m[4]);
    const max = m[5] ? Number(m[5]) : min;
    pushOk(out, {
      ...bm,
      product_name: m[1] === "番茄" ? "西红柿" : m[1],
      market_or_region: `惠农网·${m[2]}产地`,
      specification: m[3],
      price_min: min,
      price_max: max,
      price_avg: Math.round(((min + max) / 2) * 1000) / 1000,
      unit_raw: "元/斤",
      category: /草莓/.test(m[1]) ? "水果" : "蔬菜",
      seller_hint: m[6] || null
    });
  }
  return out;
}

function detectB2bParser(md, fileName = "") {
  const name = String(fileName || "").toLowerCase();
  const body = String(md || "");
  if (name.includes("ymt") || /一亩田|ymt\.com/i.test(body)) return "ymt";
  if (name.includes("cnhnb") || /惠农|cnhnb\.com/i.test(body)) return "cnhnb";
  if (/供应[：:]/.test(body) && /元\/斤/.test(body)) return "cnhnb";
  return null;
}

function parseB2bMarkdown(md, meta = {}) {
  const kind = detectB2bParser(md, meta.fileName);
  if (kind === "ymt") return { kind, quotes: parseYmtMarkdown(md, meta) };
  if (kind === "cnhnb") return { kind, quotes: parseCnhnbMarkdown(md, meta) };
  return { kind: null, quotes: [] };
}

module.exports = {
  detectB2bParser,
  parseB2bMarkdown,
  parseYmtMarkdown,
  parseCnhnbMarkdown
};
