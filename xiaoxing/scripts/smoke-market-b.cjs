"use strict";

/**
 * 行情 Phase B 冒烟：规则解析 + cron dry + 旁路行情建议
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { parseMarketMarkdown } = require("../lib/market/parsers/index.cjs");
const {
  ingestSeed,
  appendQuotes,
  writeQuotesReplace,
  detectSpreadAlerts,
  ingestSpreadFollowups
} = require("../lib/market/index.cjs");
const meeting = require("../lib/meeting/index.cjs");

function main() {
  const fixtureDir = path.join(__dirname, "..", "knowledge", "market", "fixtures");
  const xf = fs.readFileSync(path.join(fixtureDir, "xinfadi-sample.md"), "utf8");
  const xfParsed = parseMarketMarkdown(xf, { fileName: "xinfadi-sample.md" });
  assert.equal(xfParsed.kind, "xinfadi");
  assert.ok(xfParsed.quotes.length >= 4, "新发地表应解析多行");
  assert.ok(xfParsed.quotes.some((q) => q.product_name === "草莓"));

  const sg = fs.readFileSync(path.join(fixtureDir, "sgvindex-sample.md"), "utf8");
  const sgParsed = parseMarketMarkdown(sg, { fileName: "sgvindex-sample.md" });
  assert.equal(sgParsed.kind, "sgvindex");
  assert.ok(sgParsed.quotes.length >= 3);

  // 替换写入，构造跨市场价差
  const merged = [
    ...xfParsed.quotes,
    ...sgParsed.quotes,
    {
      province: "广东省",
      publish_date: "2026-11-18",
      market_or_region: "广州江南市场",
      category: "水果",
      product_name: "草莓",
      price_avg: 20,
      unit_raw: "元/斤",
      source_url: "http://www.jnmarket.net",
      source_tier: "seed",
      source_id: "jnmarket",
      confidence: 0.6
    }
  ];
  const written = writeQuotesReplace(merged);
  assert.ok(written.count >= 5);

  const alerts = detectSpreadAlerts({
    products: ["草莓"],
    pairs: [{ a: "新发地", b: "江南" }],
    threshold: 3
  });
  assert.ok(alerts.length >= 1, "草莓新发地 vs 江南应有价差");

  const fu = ingestSpreadFollowups({
    products: ["草莓"],
    pairs: [{ a: "新发地", b: "江南" }],
    threshold: 3
  });
  assert.ok(fu.created.length >= 1 || fu.alerts.length >= 1);

  meeting.resetSuggestGateCache && meeting.resetSuggestGateCache();
  meeting.startMeeting({});
  const sug = meeting.handleMeetingUtterance({
    track: "others",
    text: "新发地草莓今天多少钱？"
  });
  assert.equal(sug.action, "log_others");
  assert.ok(sug.suggest, "旁路应出行情建议");
  assert.equal(sug.suggest.layer, "market");
  assert.ok(/信息来自/.test(sug.suggest.reply), "旁路口播应有来源短名");
  assert.ok(!/https?:\/\//i.test(sug.suggest.reply), "旁路禁止念网址");
  meeting.stopMeeting();

  console.log(
    JSON.stringify(
      {
        ok: true,
        xinfadi: xfParsed.quotes.length,
        sgv: sgParsed.quotes.length,
        alerts: alerts.length,
        followups: fu.created.length,
        suggestPreview: String(sug.suggest.reply).slice(0, 60)
      },
      null,
      2
    )
  );
}

main();
