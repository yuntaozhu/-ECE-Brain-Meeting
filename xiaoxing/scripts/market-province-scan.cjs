#!/usr/bin/env node
/**
 * 省厅栏目测绘（Phase C）
 * node scripts/market-province-scan.cjs           # 优先 fixtures
 * node scripts/market-province-scan.cjs --live    # 无 fixture 时抓首页
 * node scripts/market-province-scan.cjs --force
 */
const fs = require("fs");
const path = require("path");
const {
  listPilotProvinces,
  discoverProvince
} = require("../lib/market/province/discover.cjs");
const { loadCache } = require("../lib/market/province/routeCache.cjs");

async function main() {
  const live = process.argv.includes("--live");
  const force = process.argv.includes("--force");
  const preferLive = process.argv.includes("--prefer-live");
  const fixtureDir = path.join(__dirname, "..", "knowledge", "market", "fixtures");
  const pilots = listPilotProvinces();
  const results = [];

  for (const p of pilots) {
    const fixture = path.join(fixtureDir, `province-${p.id}-home.html`);
    const hasFixture = fs.existsSync(fixture);
    const opts = { force };
    if (hasFixture && !preferLive) {
      opts.htmlPath = fixture;
    } else if (live || preferLive) {
      opts.live = true;
    }
    const r = await discoverProvince(p.id, opts);
    results.push({
      id: p.id,
      name: p.name,
      cached: r.cached,
      error: r.error || null,
      price_url: r.route?.price_url || null,
      price_label: r.route?.price_label || null,
      pest_url: r.route?.pest_url || null,
      pest_label: r.route?.pest_label || null
    });
  }

  console.log(JSON.stringify({ ok: true, live, force, results, cache: loadCache().routes }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
