/**
 * Offline: FAQ + 详版 -> continuous follow-up chains under knowledge/chains.
 *
 *   node scripts/distill-chains.cjs
 *   node scripts/distill-chains.cjs --limit=5
 *   node scripts/distill-chains.cjs --all
 *   node scripts/distill-chains.cjs --force-rule
 *   node scripts/distill-chains.cjs --dry
 */
const fs = require("fs");
const path = require("path");

const rootEnv = path.join(__dirname, "..", "..", ".env");
const deskEnv = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: fs.existsSync(rootEnv) ? rootEnv : deskEnv });

const { distillChains } = require("../lib/knowledge/chains");

function parseArgs(argv) {
  const opts = { limit: 0, all: false, forceRule: false, dry: false, keys: [] };
  for (const a of argv) {
    if (a === "--all") opts.all = true;
    else if (a === "--force-rule" || a === "--forceRule") opts.forceRule = true;
    else if (a === "--dry") opts.dry = true;
    else if (a.startsWith("--limit=")) opts.limit = Number(a.slice(8)) || 0;
    else if (a.startsWith("--key=")) opts.keys.push(a.slice(6));
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const result = await distillChains(opts);
  console.log(
    `[distill-chains] faq=${result.totalFaq} distilled=${result.distilled} ready=${result.ready}` +
      ` mode=${result.forceRule ? "rule" : "ark"} hasArk=${result.hasArk}` +
      (opts.dry ? " dry" : "")
  );
  for (const c of result.chains || []) {
    console.log(
      `  - ${c.cardId} steps=${(c.steps || []).length} ready=${c.ready} source=${c.source} :: ${(c.seedTitles || [])[0] || ""}`
    );
  }
  if (!opts.dry) {
    console.log(`[distill-chains] index readyCount=${result.index.readyCount}`);
    console.log(`[distill-chains] merged ${result.mergedPath}`);
  }
}

main().catch((err) => {
  console.error("[distill-chains] failed", err && err.stack ? err.stack : err);
  process.exit(1);
});
