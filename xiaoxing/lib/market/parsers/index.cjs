"use strict";

const { parseXinfadiMarkdown } = require("./xinfadi.cjs");
const { parseSgvindexMarkdown } = require("./sgvindex.cjs");
const { parseB2bMarkdown, detectB2bParser } = require("./b2b.cjs");
const { normalizeQuote, validateQuote } = require("../normalize.cjs");

function detectParser(md, fileName = "") {
  const name = String(fileName || "").toLowerCase();
  const body = String(md || "");
  const b2b = detectB2bParser(body, name);
  if (b2b) return b2b;
  if (name.includes("xinfadi") || /新发地|priceDetail/i.test(body)) return "xinfadi";
  if (name.includes("sgv") || /寿光|sgvindex/i.test(body)) return "sgvindex";
  if (/\|\s*品名\s*\|/.test(body) && /平均|均价|最低/.test(body)) return "xinfadi";
  return "loose";
}

function parseLoose(md, meta = {}) {
  const quotes = [];
  for (const line of String(md || "").split(/\r?\n/)) {
    const m = line.match(
      /(草莓|黄瓜|西红柿|番茄|大白菜|彩椒)[^0-9]{0,16}?(\d+(?:\.\d+)?)\s*[元]?\/?\s*(斤|公斤|千克)?/
    );
    if (!m) continue;
    const q = normalizeQuote({
      product_name: m[1] === "番茄" ? "西红柿" : m[1],
      price_avg: Number(m[2]),
      unit_raw: m[3] === "公斤" || m[3] === "千克" ? "元/公斤" : "元/斤",
      publish_date: meta.publish_date || new Date().toISOString().slice(0, 10),
      market_or_region: meta.market_or_region || "采集页",
      province: meta.province || "",
      category: /草莓/.test(m[1]) ? "水果" : "蔬菜",
      source_url: meta.source_url || "",
      source_tier: meta.tier || "T1",
      source_id: meta.source_id || null,
      confidence: 0.4
    });
    if (validateQuote(q).ok) quotes.push(q);
  }
  return quotes;
}

function parseMarketMarkdown(md, meta = {}) {
  const kind = detectParser(md, meta.fileName);
  if (kind === "ymt" || kind === "cnhnb") {
    const b2b = parseB2bMarkdown(md, { ...meta, fileName: meta.fileName });
    return { kind: b2b.kind || kind, quotes: b2b.quotes };
  }
  if (kind === "xinfadi") return { kind, quotes: parseXinfadiMarkdown(md, meta) };
  if (kind === "sgvindex") return { kind, quotes: parseSgvindexMarkdown(md, meta) };
  return { kind, quotes: parseLoose(md, meta) };
}

module.exports = {
  detectParser,
  parseMarketMarkdown,
  parseXinfadiMarkdown,
  parseSgvindexMarkdown,
  parseB2bMarkdown,
  parseLoose
};
