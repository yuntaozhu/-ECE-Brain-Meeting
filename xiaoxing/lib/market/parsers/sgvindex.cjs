"use strict";

/**
 * 寿光指数风格：自由文本「品名 … 价 元/斤」
 */
const { normalizeQuote, validateQuote } = require("../normalize.cjs");

const PRODUCT_RE =
  /(草莓|黄瓜|西红柿|番茄|大白菜|彩椒|青椒|茄子|芹菜|土豆|生姜|大蒜)/g;

function parseSgvindexMarkdown(md, meta = {}) {
  const quotes = [];
  const publishDate =
    meta.publish_date ||
    (String(md).match(/fetched_at:\s*(\d{4}-\d{2}-\d{2})/) || [])[1] ||
    new Date().toISOString().slice(0, 10);
  const lines = String(md || "").split(/\r?\n/);

  for (const line of lines) {
    const products = line.match(PRODUCT_RE);
    if (!products) continue;
    const priceM = line.match(
      /(\d+(?:\.\d+)?)\s*[-~～到至]\s*(\d+(?:\.\d+)?)\s*元\s*\/?\s*(斤|公斤|千克)?/
    );
    const singleM = line.match(
      /(\d+(?:\.\d+)?)\s*元\s*\/?\s*(斤|公斤|千克)?/
    );
    let min = null;
    let max = null;
    let avg = null;
    let unit = "元/斤";
    if (priceM) {
      min = Number(priceM[1]);
      max = Number(priceM[2]);
      avg = (min + max) / 2;
      unit = priceM[3] === "公斤" || priceM[3] === "千克" ? "元/公斤" : "元/斤";
    } else if (singleM) {
      avg = Number(singleM[1]);
      unit = singleM[2] === "公斤" || singleM[2] === "千克" ? "元/公斤" : "元/斤";
    } else continue;

    const product = products[0] === "番茄" ? "西红柿" : products[0];
    const specM = line.match(/(大粉|红彩|净菜|油亮|一级|精品)/);
    const q = normalizeQuote({
      product_name: product,
      specification: specM ? specM[1] : "",
      price_min: min,
      price_max: max,
      price_avg: avg,
      unit_raw: unit,
      publish_date: publishDate,
      market_or_region: meta.market_or_region || "寿光蔬菜指数",
      province: meta.province || "山东省",
      category: product === "草莓" ? "水果" : "蔬菜",
      source_url: meta.source_url || "http://www.sgvindex.com",
      source_tier: "T1",
      source_id: meta.source_id || "sgvindex",
      confidence: 0.75
    });
    if (validateQuote(q).ok) quotes.push(q);
  }
  return quotes;
}

module.exports = { parseSgvindexMarkdown };
