/**
 * Wiki 健康检查（Karpathy Lint）
 *   node scripts/wiki-lint.cjs
 *   node scripts/wiki-lint.cjs --json
 */
const { lintWiki, listConceptPages, parseIndexEntries } = require("../lib/knowledge");

const asJson = process.argv.includes("--json");
const result = lintWiki();
const pages = listConceptPages();
const index = parseIndexEntries();

if (asJson) {
  console.log(JSON.stringify({ ...result, indexed: index.length }, null, 2));
  process.exit(result.ok ? 0 : 1);
}

console.log(`[wiki-lint] 概念页 ${result.pageCount} · index 行 ${index.length}`);
if (!result.issues.length) {
  console.log("[wiki-lint] 无问题");
  process.exit(0);
}

const byLevel = { error: [], warn: [], info: [] };
for (const i of result.issues) {
  (byLevel[i.level] || byLevel.info).push(i);
}
for (const level of ["error", "warn", "info"]) {
  for (const i of byLevel[level]) {
    console.log(`  [${level}] ${i.type} @ ${i.slug}: ${i.detail}`);
  }
}
console.log(
  `[wiki-lint] error=${byLevel.error.length} warn=${byLevel.warn.length} info=${byLevel.info.length}`
);
process.exit(result.ok ? 0 : 1);
