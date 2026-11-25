"use strict";

/**
 * 行情 Phase D 冒烟：B2B 解析 + 地头/批发价差 + midday cron 语义 + Ask
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { parseMarketMarkdown } = require("../lib/market/parsers/index.cjs");
const {
  writeQuotesReplace,
  loadSeedQuotes,
  loadSeedB2bQuotes,
  detectFarmgateSpreadAlerts,
  ingestFarmgateSpreadFollowups,
  matchMarketQuote,
  b2b
} = require("../lib/market/index.cjs");

function main() {
  const fixtureDir = path.join(__dirname, "..", "knowledge", "market", "fixtures");
  const ymtMd = fs.readFileSync(path.join(fixtureDir, "ymt-gongying-sample.md"), "utf8");
  const ymt = parseMarketMarkdown(ymtMd, { fileName: "ymt-gongying-sample.md" });
  assert.equal(ymt.kind, "ymt");
  assert.ok(ymt.quotes.length >= 2, "一亩田表应解析多行");
  assert.ok(ymt.quotes.every((q) => q.quote_kind === "farmgate"));
  assert.ok(ymt.quotes.every((q) => q.source_tier === "T3"));

  const hnMd = fs.readFileSync(path.join(fixtureDir, "cnhnb-supply-sample.md"), "utf8");
  const hn = parseMarketMarkdown(hnMd, { fileName: "cnhnb-supply-sample.md" });
  assert.equal(hn.kind, "cnhnb");
  assert.ok(hn.quotes.length >= 2);

  const wholesale = loadSeedQuotes();
  const farmgate = loadSeedB2bQuotes();
  assert.ok(farmgate.length >= 3);
  const merged = [...wholesale, ...farmgate];
  const written = writeQuotesReplace(merged);
  assert.ok(written.count >= 6);

  const alerts = detectFarmgateSpreadAlerts({
    products: ["草莓"],
    threshold: 4
  });
  assert.ok(alerts.length >= 1, "草莓地头 vs 批发应有价差");
  assert.ok(alerts[0].spread >= 4);

  const fu = ingestFarmgateSpreadFollowups({
    products: ["草莓"],
    threshold: 4
  });
  assert.ok(fu.created.length >= 1 || fu.alerts.length >= 1);
  assert.equal(fu.outbound_call_enabled, false);

  const gate = b2b.assertLiveAllowed("ymt");
  assert.equal(gate.ok, false, "未登录不得 live");

  const hit = matchMarketQuote("一亩田草莓产地价多少");
  assert.ok(hit && hit.ok, "Ask 应命中 B2B 地头价");
  assert.equal(hit.layer, "market");
  assert.equal(hit.quote.quote_kind, "farmgate");
  assert.ok(/地头|产地/.test(hit.reply));
  assert.ok(/信息来自一亩田/.test(hit.reply), "地头口播应说来源短名");
  assert.ok(!/https?:\/\//i.test(hit.reply), "地头口播禁止念网址");

  const cron = spawnSync(
    process.execPath,
    [path.join(__dirname, "market-cron.cjs"), "--slot=midday"],
    { encoding: "utf8", cwd: path.join(__dirname, "..") }
  );
  assert.equal(cron.status, 0, cron.stderr || cron.stdout);
  const cronOut = JSON.parse(cron.stdout);
  assert.equal(cronOut.ok, true);
  assert.equal(cronOut.slot, "midday");

  console.log(
    JSON.stringify(
      {
        ok: true,
        ymt: ymt.quotes.length,
        cnhnb: hn.quotes.length,
        farmgateAlerts: alerts.length,
        followups: fu.created.length,
        askPreview: String(hit.reply).slice(0, 80),
        cronSteps: cronOut.steps.length
      },
      null,
      2
    )
  );
}

main();
