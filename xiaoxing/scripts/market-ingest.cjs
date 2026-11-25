#!/usr/bin/env node
/**
 * 行情入库：--seed | 默认解析 raw/market + fixtures
 * node scripts/market-ingest.cjs --seed
 * node scripts/market-ingest.cjs
 * node scripts/market-ingest.cjs --fixtures-only
 */
const fs = require("fs");
const path = require("path");
const { marketRawDir, ensureDir } = require("../lib/knowledge/paths.cjs");
const { ingestSeed, appendQuotes } = require("../lib/market/index.cjs");
const { parseMarketMarkdown } = require("../lib/market/parsers/index.cjs");

function collectFromDir(dir) {
  if (!fs.existsSync(dir)) return { quotes: [], report: [] };
  const report = [];
  const quotes = [];
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
    quotes.push(...parsed.quotes);
    report.push({ file: f, kind: parsed.kind, count: parsed.quotes.length });
  }
  return { quotes, report };
}

function main() {
  if (process.argv.includes("--seed")) {
    const r = ingestSeed({ replace: true });
    console.log(JSON.stringify({ ok: true, mode: "seed", count: r.count, file: r.file }, null, 2));
    return;
  }

  const fixturesOnly = process.argv.includes("--fixtures-only");
  const fixtureDir = path.join(__dirname, "..", "knowledge", "market", "fixtures");
  const parts = [];
  if (!fixturesOnly) parts.push(collectFromDir(ensureDir(marketRawDir())));
  parts.push(collectFromDir(fixtureDir));

  const all = parts.flatMap((p) => p.quotes);
  const report = parts.flatMap((p) => p.report);
  if (!all.length) {
    console.log(
      JSON.stringify(
        { ok: true, mode: "empty", count: 0, report, hint: "无解析行；可用 --seed" },
        null,
        2
      )
    );
    return;
  }
  const written = appendQuotes(all);
  console.log(
    JSON.stringify({ ok: true, mode: "parsed", count: written.count, file: written.file, report }, null, 2)
  );
}

main();
