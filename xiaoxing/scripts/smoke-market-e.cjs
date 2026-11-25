"use strict";

/**
 * 行情 Phase E 冒烟：dashboard 近7日序列 + 卡片摘要 + /api/market 语义
 */
const assert = require("assert");
const http = require("http");
const {
  ingestSeedWithB2b,
  buildMarketDashboard,
  sparklineForProduct
} = require("../lib/market/index.cjs");

function main() {
  const seeded = ingestSeedWithB2b();
  assert.ok(seeded.count >= 8, "批发+地头种子应入库");

  const dash = buildMarketDashboard({ quoteLimit: 12, days: 7 });
  assert.equal(dash.ok, true);
  assert.ok(dash.quotes.length >= 4);
  assert.ok(dash.quotes.some((q) => q.badge === "批发"));
  assert.ok(dash.quotes.some((q) => q.badge === "地头"));
  assert.ok(dash.sparklines.length >= 1);

  const berry = dash.sparklines.find((s) => s.product === "草莓");
  assert.ok(berry);
  assert.equal(berry.series.length, 7);
  const filled = berry.series.filter((s) => s.avg != null);
  assert.ok(filled.length >= 2, "草莓近7日至少2个有价点");

  const sp = sparklineForProduct("草莓", { days: 7, endDate: "2026-11-18" });
  assert.ok(sp.series.some((s) => s.date === "2026-11-18" && s.avg != null));

  // 本地起临时服务测 /api/market（不依赖常驻 serve）
  const market = require("../lib/market/index.cjs");
  const server = http.createServer((req, res) => {
    if (req.url === "/api/market") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(market.buildMarketDashboard({ quoteLimit: 8 })));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address();
    http
      .get(`http://127.0.0.1:${port}/api/market`, (r) => {
        let body = "";
        r.on("data", (c) => (body += c));
        r.on("end", () => {
          const json = JSON.parse(body);
          assert.equal(json.ok, true);
          assert.ok(json.sparklines.length >= 1);
          server.close();
          console.log(
            JSON.stringify(
              {
                ok: true,
                seeded: seeded.count,
                quotes: dash.quotes.length,
                berryPoints: filled.length,
                alerts:
                  (dash.alerts.cross_market || []).length +
                  (dash.alerts.farmgate || []).length
              },
              null,
              2
            )
          );
        });
      })
      .on("error", (err) => {
        server.close();
        throw err;
      });
  });
}

main();
