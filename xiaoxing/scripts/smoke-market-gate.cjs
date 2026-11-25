"use strict";

/**
 * 品名硬门闩 + live-on-miss（mock scrape，不打真网）
 * node scripts/smoke-market-gate.cjs
 */
const assert = require("assert");
const { ingestSeedWithB2b, matchMarketQuote, buildMarketMiss, extractProducts } =
  require("../lib/market/index.cjs");
const { ask, askAsync } = require("../lib/ask/index.cjs");
const { liveFetchForQuery, resetLiveCooldown, resolveTargets } = require("../lib/market/liveFetch.cjs");
const { resetProductCfgCache } = require("../lib/market/productGate.cjs");

async function main() {
  resetProductCfgCache();
  resetLiveCooldown();
  ingestSeedWithB2b();

  assert.deepEqual(extractProducts("寿光的大豆多少钱一斤"), ["大豆"]);
  assert.deepEqual(extractProducts("寿光的鸡蛋多少钱"), ["鸡蛋"]);
  assert.ok(extractProducts("寿光黄瓜均价多少").includes("黄瓜"));

  // G：地名不得顶替品名
  assert.equal(matchMarketQuote("寿光的大豆多少钱一斤"), null);
  assert.equal(matchMarketQuote("寿光的鸡蛋多少钱"), null);
  const cucumber = matchMarketQuote("寿光黄瓜均价多少");
  assert.ok(cucumber && cucumber.layer === "market");
  assert.ok(/黄瓜/.test(cucumber.reply));

  // 资料类不走行情
  assert.equal(matchMarketQuote("草莓资料哪里查"), null);

  const missAsk = ask("寿光的大豆多少钱一斤", { writeGap: false, session: false });
  assert.equal(missAsk.layer, "market_miss");
  assert.ok(/大豆/.test(missAsk.reply));
  assert.ok(!/黄瓜/.test(missAsk.reply));

  const eggAsk = ask("现在哪里的鸡蛋最便宜", { writeGap: false, session: false });
  assert.equal(eggAsk.layer, "market_miss");
  assert.ok(/鸡蛋/.test(eggAsk.reply));

  // 回归有货
  const berry = ask("新发地草莓批发价多少", { writeGap: false, session: false });
  assert.equal(berry.layer, "market");

  // L：resolveTargets
  const rt = resolveTargets("寿光的鸡蛋多少钱");
  assert.ok(rt.targets.some((t) => t.id === "sgvindex"));

  // L：mock live 写入鸡蛋价后再命中
  resetLiveCooldown();
  const live = await liveFetchForQuery("寿光的鸡蛋多少钱", {
    skipCooldown: true,
    scrapeFn: async (target) => ({
      target,
      file: null,
      kind: "mock",
      chars: 10,
      quotes: [
        {
          product_name: "鸡蛋",
          publish_date: "2026-11-18",
          market_or_region: "寿光蔬菜指数",
          price_avg: 4.2,
          price_min: 3.8,
          price_max: 4.6,
          unit_raw: "元/斤",
          source_url: target.url,
          source_id: target.id,
          source_tier: "live",
          quote_kind: "wholesale"
        }
      ]
    })
  });
  assert.ok(live.ok && live.appended >= 1);

  const eggHit = matchMarketQuote("寿光的鸡蛋多少钱");
  assert.ok(eggHit && eggHit.layer === "market");
  assert.ok(/鸡蛋/.test(eggHit.reply));

  // 用库内通常无货的品测 askAsync live（避免上一例已入库导致不走 live）
  resetLiveCooldown();
  const asyncHit = await askAsync("寿光的西瓜多少钱", {
    writeGap: false,
    session: false,
    live: true,
    skipCooldown: true,
    scrapeFn: async (target) => ({
      target,
      kind: "mock",
      chars: 1,
      quotes: [
        {
          product_name: "西瓜",
          publish_date: "2026-11-18",
          market_or_region: "寿光蔬菜指数",
          price_avg: 1.2,
          unit_raw: "元/斤",
          source_url: target.url,
          source_id: target.id,
          quote_kind: "wholesale"
        }
      ]
    })
  });
  assert.equal(asyncHit.layer, "market");
  assert.ok(asyncHit.live);
  assert.ok(/西瓜/.test(asyncHit.reply));

  // live 失败仍诚实 miss
  resetLiveCooldown();
  const asyncMiss = await askAsync("寿光的大豆多少钱一斤", {
    writeGap: false,
    session: false,
    live: true,
    skipCooldown: true,
    scrapeFn: async () => {
      throw Object.assign(new Error("mock fail"), { code: "upstream" });
    }
  });
  assert.equal(asyncMiss.layer, "market_miss");
  assert.ok(/大豆/.test(asyncMiss.reply));
  assert.ok(!/黄瓜/.test(asyncMiss.reply));

  const missShape = buildMarketMiss("寿光蓝莓多少钱", { liveAttempted: true, liveOk: false });
  assert.equal(missShape.layer, "market_miss");

  console.log(
    JSON.stringify(
      {
        ok: true,
        gate: true,
        cucumberScore: cucumber.score,
        eggLive: eggHit.score,
        asyncLayer: asyncHit.layer,
        missLayer: asyncMiss.layer
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
