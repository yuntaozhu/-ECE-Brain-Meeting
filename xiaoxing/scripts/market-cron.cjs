#!/usr/bin/env node
/**
 * 行情时段任务（Phase B/D）
 * - morning：09:30 窗口语义 — crawl market（可选）+ ingest + 跨市场价差
 * - midday：11:00–14:00 语义 — B2B fixture/seed + 地头vs批发价差（无登录不真采）
 * - spread：仅跨市场价差
 * - 默认 dry：不调 Firecrawl / 不登录 B2B
 *
 * node scripts/market-cron.cjs --slot=morning
 * node scripts/market-cron.cjs --slot=morning --crawl
 * node scripts/market-cron.cjs --slot=midday
 * node scripts/market-cron.cjs --slot=spread
 */
const { spawnSync } = require("child_process");
const path = require("path");
const {
  ingestSeed,
  ingestSeedB2b,
  appendQuotes,
  ingestSpreadFollowups,
  ingestFarmgateSpreadFollowups,
  b2b
} = require("../lib/market/index.cjs");
const fs = require("fs");
const { marketRawDir, ensureDir } = require("../lib/knowledge/paths.cjs");
const { parseMarketMarkdown } = require("../lib/market/parsers/index.cjs");

const root = path.join(__dirname, "..");

function runNpm(script) {
  const r = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", script],
    { cwd: root, encoding: "utf8", shell: true }
  );
  return {
    ok: r.status === 0,
    status: r.status,
    stdout: (r.stdout || "").slice(-500),
    stderr: (r.stderr || "").slice(-300)
  };
}

function ingestAllRawAndFixtures() {
  const dirs = [
    ensureDir(marketRawDir()),
    path.join(root, "knowledge", "market", "fixtures")
  ];
  const all = [];
  const report = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md"))) {
      const full = path.join(dir, f);
      const md = fs.readFileSync(full, "utf8");
      const urlM = md.match(/^url:\s*(.+)$/m);
      const idM = md.match(/^source_id:\s*(.+)$/m);
      const parsed = parseMarketMarkdown(md, {
        fileName: f,
        source_url: urlM && urlM[1].trim(),
        source_id: idM && idM[1].trim()
      });
      all.push(...parsed.quotes);
      report.push({ file: f, kind: parsed.kind, count: parsed.quotes.length });
    }
  }
  if (!all.length) {
    const seeded = ingestSeed({ replace: false });
    return { mode: "seed-fallback", ...seeded, report };
  }
  const written = appendQuotes(all);
  return { mode: "parsed", ...written, report };
}

function main() {
  const slot =
    (process.argv.find((a) => a.startsWith("--slot=")) || "--slot=morning").slice(7);
  const doCrawl = process.argv.includes("--crawl");
  const out = { slot, at: new Date().toISOString(), steps: [] };

  if (slot === "morning") {
    if (doCrawl) {
      out.steps.push({ crawl: runNpm("crawl:market") });
    } else {
      out.steps.push({ crawl: { skipped: true, hint: "加 --crawl 才真采" } });
    }
    out.steps.push({ ingest: ingestAllRawAndFixtures() });
    out.steps.push({ spread: ingestSpreadFollowups({ threshold: 3 }) });
  } else if (slot === "midday") {
    const liveGate = b2b.assertLiveAllowed("ymt");
    out.steps.push({
      b2b_live: liveGate.ok
        ? { skipped: true, hint: "Playwright 登录态抽取后置；本槽仅 fixture" }
        : { blocked: true, reason: liveGate.error }
    });
    out.steps.push({ b2b_seed: ingestSeedB2b({ replace: false }) });
    out.steps.push({ ingest_b2b_fixtures: ingestAllRawAndFixtures() });
    out.steps.push({
      farmgate_spread: ingestFarmgateSpreadFollowups({ threshold: 4 })
    });
  } else if (slot === "spread") {
    out.steps.push({ spread: ingestSpreadFollowups({ threshold: 3 }) });
  } else {
    out.error = "unknown slot; use morning|midday|spread";
    console.log(JSON.stringify(out, null, 2));
    process.exit(1);
  }

  out.ok = true;
  console.log(JSON.stringify(out, null, 2));
}

main();
