"use strict";

/**
 * 新发地风格 Markdown 表解析（品名/规格/最低/最高/平均）
 */
const { normalizeQuote, validateQuote } = require("../normalize.cjs");

const HEADER_RE = /品名|最低|最高|平均|均价/;

function parseXinfadiMarkdown(md, meta = {}) {
  const quotes = [];
  const lines = String(md || "").split(/\r?\n/);
  let publishDate =
    meta.publish_date ||
    (String(md).match(/fetched_at:\s*(\d{4}-\d{2}-\d{2})/) || [])[1] ||
    new Date().toISOString().slice(0, 10);

  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith("|")) continue;
    if (/^\|\s*---/.test(t) || HEADER_RE.test(t)) continue;
    const cells = t
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 4) continue;
    // 品名 规格 低 高 均 [单位]
    const product = cells[0];
    if (!product || product.length > 20) continue;
    if (/^品名|名称|序号$/.test(product)) continue;
    let spec = "";
    let min;
    let max;
    let avg;
    let unit = "元/斤";
    if (cells.length >= 5 && !Number.isNaN(Number(cells[2]))) {
      spec = cells[1];
      min = Number(cells[2]);
      max = Number(cells[3]);
      avg = Number(cells[4]);
      if (cells[5]) unit = cells[5];
    } else if (cells.length >= 4) {
      min = Number(cells[1]);
      max = Number(cells[2]);
      avg = Number(cells[3]);
      if (cells[4]) unit = cells[4];
    } else continue;
    if (![min, max, avg].every((n) => Number.isFinite(n))) continue;

    const q = normalizeQuote({
      product_name: product,
      specification: spec,
      price_min: min,
      price_max: max,
      price_avg: avg,
      unit_raw: unit,
      publish_date: publishDate,
      market_or_region: meta.market_or_region || "北京新发地",
      province: meta.province || "北京市",
      category: /草莓|苹果|梨|葡萄|西瓜/.test(product) ? "水果" : "蔬菜",
      source_url: meta.source_url || "http://www.xinfadi.com.cn/priceDetail.html",
      source_tier: "T1",
      source_id: meta.source_id || "xinfadi-price",
      confidence: 0.85
    });
    if (validateQuote(q).ok) quotes.push(q);
  }
  return quotes;
}

module.exports = { parseXinfadiMarkdown };
