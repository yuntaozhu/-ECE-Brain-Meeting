/**
 * Inbox → Wiki「常见问法」Ingest（不覆盖事实/口播/边界）
 *
 *   node scripts/wiki-ingest.cjs
 *   node scripts/wiki-ingest.cjs --dry
 *   node scripts/wiki-ingest.cjs --faq --min=3
 */
const {
  aggregateInbox,
  promoteToDistilled,
  promoteToFaq,
  ensureDirs
} = require("../lib/knowledge");

function parseArgs(argv) {
  const opts = { faq: false, dry: false, min: 3, legacy: false };
  for (const a of argv) {
    if (a === "--faq") opts.faq = true;
    else if (a === "--dry") opts.dry = true;
    else if (a === "--legacy-distilled") opts.legacy = true;
    else if (a.startsWith("--min=")) opts.min = Number(a.slice(6)) || 3;
  }
  return opts;
}

function main() {
  ensureDirs();
  const opts = parseArgs(process.argv.slice(2));
  const agg = aggregateInbox();
  const entries = [...agg.values()].map((v) => ({ ...v.entry, _count: v.count }));
  console.log(`[wiki-ingest] inbox 去重后 ${entries.length} 条`);

  if (!entries.length) {
    console.log("[wiki-ingest] 无候选，退出");
    return;
  }

  if (opts.dry) {
    const d = promoteToDistilled(entries, { dry: true, legacyDistilled: opts.legacy });
    for (const r of d.wiki?.results || []) {
      console.log(
        `- ${r.ok ? (r.skipped ? "skip" : r.dry ? `→${r.slug}` : "ok") : r.reason} | ${r.q}`
      );
    }
    console.log(
      `[wiki-ingest] dry: 将追加≈可匹配项，未匹配 ${d.wikiUnmatched}（legacy distilled=${opts.legacy}）`
    );
    return;
  }

  const d = promoteToDistilled(entries, { legacyDistilled: opts.legacy });
  console.log(
    `[wiki-ingest] wiki 追加常见问法 ${d.wikiAppended} · 未匹配 ${d.wikiUnmatched}` +
      (opts.legacy ? ` · distilled 候选 ${d.count}` : " · 未匹配未写 distilled（默认）")
  );

  if (opts.faq) {
    let n = 0;
    for (const e of entries) {
      if ((e._count || 1) < opts.min) continue;
      const r = promoteToFaq(e);
      if (r.ok) {
        n += 1;
        console.log(
          `[wiki-ingest] FAQ + ${String(e.q).slice(0, 40)}${r.fromWiki ? ` ← ${r.slug}` : ""}`
        );
      }
    }
    console.log(`[wiki-ingest] FAQ 新增 ${n}（min=${opts.min}；A 优先词条口播）`);
  }

  console.log("[wiki-ingest] 建议: npm run knowledge:wiki:lint && npm run rag:index");
}

main();
