"use strict";

/**
 * Firecrawl 健康检查冒烟（默认不打 live；加 --live 才真实 scrape）
 * node scripts/smoke-firecrawl.cjs
 * node scripts/smoke-firecrawl.cjs --live
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { healthCheck, hasApiKey } = require("../lib/firecrawl/client.cjs");

async function main() {
  const live = process.argv.includes("--live");
  const r = await healthCheck({ live });
  console.log(JSON.stringify({ ...r, keyPresent: hasApiKey() }, null, 2));
  if (!r.configured) {
    console.error("跳过失败：未配置 FIRECRAWL_API_KEY（配置检查路径 OK）");
    process.exit(0);
  }
  if (live && !r.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
