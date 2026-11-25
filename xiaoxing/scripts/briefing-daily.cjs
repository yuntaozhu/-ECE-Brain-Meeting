#!/usr/bin/env node
/**
 * 生成会前动态卡片
 *   npm run briefing
 *   npm run briefing -- --live   # Firecrawl 抓 briefing 桶
 *   npm run crawl -- --bucket=briefing
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { buildDailyBriefing, listBriefingSources } = require("../lib/briefing/daily.cjs");

const live = process.argv.includes("--live");

async function main() {
  let scrapeFn = null;
  if (live) {
    const { scrapeUrl, hasApiKey } = require("../lib/firecrawl/client.cjs");
    if (!hasApiKey()) {
      console.error("缺少 FIRECRAWL_API_KEY，无法 --live");
      process.exit(1);
    }
    scrapeFn = scrapeUrl;
  }
  const card = await buildDailyBriefing({ live, scrapeFn });
  console.log(
    JSON.stringify(
      {
        ok: card.ok,
        day: card.day,
        itemCount: card.itemCount,
        sources: listBriefingSources().length,
        mdPath: card.mdPath,
        live
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
