"use strict";

/**
 * 行情报价归一：单位统一为「元/斤」；异常价标 needs_review
 */

const ANOMALY_HINTS = [
  { re: /大白菜|白菜/, maxAvgJin: 8 },
  { re: /黄瓜/, maxAvgJin: 15 },
  { re: /草莓/, maxAvgJin: 80 },
  { re: /西红柿|番茄/, maxAvgJin: 20 }
];

function toJinFactor(unitRaw) {
  const u = String(unitRaw || "").replace(/\s+/g, "");
  if (/公斤|千克|kg/i.test(u)) return 0.5; // 元/公斤 → 元/斤
  if (/吨/.test(u)) return 0.5 / 1000;
  if (/斤/.test(u)) return 1;
  return 1; // 默认已按斤
}

function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function scalePrice(v, factor) {
  const n = num(v);
  if (n === null) return null;
  return Math.round(n * factor * 1000) / 1000;
}

function checkAnomaly(quote) {
  const name = String(quote.product_name || "");
  const avg = num(quote.price_avg);
  if (avg === null) return false;
  for (const h of ANOMALY_HINTS) {
    if (h.re.test(name) && avg > h.maxAvgJin) return true;
  }
  if (avg <= 0 || avg > 200) return true;
  return false;
}

/**
 * @param {object} raw
 * @returns {object} normalized quote
 */
function normalizeQuote(raw = {}) {
  const unitRaw = String(raw.unit_raw || raw.unit || "元/斤");
  const factor = toJinFactor(unitRaw);
  const tier = String(raw.source_tier || "T1");
  const kindRaw = String(raw.quote_kind || raw.kind || "").toLowerCase();
  let quote_kind = "wholesale";
  if (kindRaw === "farmgate" || kindRaw === "b2b" || tier === "T3") {
    quote_kind = "farmgate";
  }
  if (kindRaw === "wholesale") quote_kind = "wholesale";

  const quote = {
    province: String(raw.province || "").trim() || null,
    publish_date: String(raw.publish_date || "").slice(0, 10),
    market_or_region: String(raw.market_or_region || raw.market || "").trim(),
    category: String(raw.category || "").trim() || null,
    product_name: String(raw.product_name || raw.product || "").trim(),
    specification: String(raw.specification || raw.spec || "").trim() || null,
    price_min: scalePrice(raw.price_min, factor),
    price_max: scalePrice(raw.price_max, factor),
    price_avg: scalePrice(raw.price_avg ?? raw.price, factor),
    unit: "元/斤",
    unit_raw: unitRaw,
    source_url: String(raw.source_url || "").trim(),
    source_tier: tier,
    source_id: raw.source_id || null,
    quote_kind,
    seller_hint: raw.seller_hint ? String(raw.seller_hint).trim() : null,
    contact_masked: raw.contact_masked ? String(raw.contact_masked).trim() : null,
    fetched_at: raw.fetched_at || new Date().toISOString(),
    confidence: num(raw.confidence) ?? 0.5,
    needs_review: Boolean(raw.needs_review)
  };
  if (!quote.price_avg && quote.price_min != null && quote.price_max != null) {
    quote.price_avg =
      Math.round(((quote.price_min + quote.price_max) / 2) * 1000) / 1000;
  }
  if (checkAnomaly(quote)) quote.needs_review = true;
  return quote;
}

function validateQuote(quote) {
  const errors = [];
  if (!quote.product_name) errors.push("missing product_name");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(quote.publish_date || "")) {
    errors.push("bad publish_date");
  }
  if (!quote.source_url) errors.push("missing source_url");
  if (quote.unit !== "元/斤") errors.push("unit must be 元/斤");
  if (quote.price_avg == null && quote.price_min == null) {
    errors.push("missing price");
  }
  return { ok: errors.length === 0, errors };
}

function speakQuote(quote) {
  if (!quote) return "";
  const { speakSource } = require("./sourceLabel.cjs");
  const avg = quote.price_avg != null ? quote.price_avg : "—";
  const range =
    quote.price_min != null && quote.price_max != null
      ? `，区间 ${quote.price_min}～${quote.price_max} 元/斤`
      : "";
  const spec = quote.specification ? `（${quote.specification}）` : "";
  const review = quote.needs_review ? "（该条标为待复核，请以市场当日牌价为准）" : "";
  const kindLabel =
    quote.quote_kind === "farmgate" ? "产地地头价" : "批发均价";
  return (
    `${quote.publish_date} ${quote.market_or_region || "市场"}` +
    `${quote.product_name}${spec}${kindLabel}约 ${avg} 元/斤${range}。` +
    `${speakSource(quote)}${review}`
  );
}

/** 展示用：口播短名 + 可选原始链接（不进 TTS） */
function formatQuoteSourceDisplay(quote) {
  const { sourceLabel } = require("./sourceLabel.cjs");
  const label = sourceLabel(quote);
  const url = quote && quote.source_url ? String(quote.source_url).trim() : "";
  return url ? `出处：${label}` : `出处：${label}`;
}

module.exports = {
  normalizeQuote,
  validateQuote,
  speakQuote,
  formatQuoteSourceDisplay,
  toJinFactor,
  checkAnomaly
};
