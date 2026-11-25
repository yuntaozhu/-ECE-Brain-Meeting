"use strict";

/**
 * 行情 Phase C 冒烟：省厅路由发现 + 病虫预警 Ask
 */
const assert = require("assert");
const path = require("path");
const fs = require("fs");
const {
  discoverFromHtml,
  listPilotProvinces,
  discoverProvince,
  loadRoots
} = require("../lib/market/province/discover.cjs");
const { getRoute, loadCache } = require("../lib/market/province/routeCache.cjs");
const { matchPestAlert } = require("../lib/market/pest.cjs");
const { ask } = require("../lib/ask/index.cjs");

async function main() {
  const roots = loadRoots();
  assert.ok((roots.pilots || []).length >= 3);

  const pilots = listPilotProvinces();
  assert.ok(pilots.some((p) => p.id === "shandong"));

  const fixtureDir = path.join(__dirname, "..", "knowledge", "market", "fixtures");
  const sdHtml = fs.readFileSync(path.join(fixtureDir, "province-shandong-home.html"), "utf8");
  const sd = discoverFromHtml(sdHtml, pilots.find((p) => p.id === "shandong"));
  assert.ok(sd.price_url && /jghq|价格|行情|jgxx|cailanzi/i.test(sd.price_url + sd.price_label));
  assert.ok(sd.pest_url && /病虫|植保|bch/i.test(sd.pest_url + sd.pest_label));

  const r = await discoverProvince("shandong", {
    force: true,
    htmlPath: path.join(fixtureDir, "province-shandong-home.html")
  });
  assert.ok(r.route?.price_url);
  assert.ok(getRoute("shandong")?.price_url);

  await discoverProvince("guangdong", {
    force: true,
    htmlPath: path.join(fixtureDir, "province-guangdong-home.html")
  });
  assert.ok(getRoute("guangdong")?.pest_url);

  const pest = matchPestAlert("山东草莓灰霉病风险如何");
  assert.ok(pest);
  assert.equal(pest.layer, "pest");
  assert.ok(/灰霉|山东/.test(pest.reply));

  const a = ask("河南番茄晚疫病预警", { writeGap: false, session: false });
  assert.equal(a.layer, "pest");

  // 农艺不抢
  const faq = ask("宁玉有什么特点", { writeGap: false, session: false });
  assert.ok(["faq", "wiki", "wiki2"].includes(faq.layer));

  console.log(
    JSON.stringify(
      {
        ok: true,
        pilots: pilots.map((p) => p.id),
        shandong: getRoute("shandong"),
        guangdongPrice: getRoute("guangdong")?.price_label,
        pestLayer: a.layer,
        cacheKeys: Object.keys(loadCache().routes)
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
