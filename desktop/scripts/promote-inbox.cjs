/**
 * 将 inbox 中的 L2/L3 候选升格到 Wiki「常见问法」/ FAQ
 *（兼容旧名：仍写 distilled 仅当 --legacy-distilled）
 *
 * 用法：
 *   node scripts/promote-inbox.cjs              # inbox → wiki 常见问法
 *   node scripts/promote-inbox.cjs --faq        # 额外：命中≥3 → FAQ（口播取自词条）
 *   node scripts/promote-inbox.cjs --faq --min=2
 *   node scripts/promote-inbox.cjs --legacy-distilled  # 未匹配也写 distilled/
 *   node scripts/promote-inbox.cjs --dry
 */
const path = require("path");
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
  console.log(`[promote] inbox 去重后 ${entries.length} 条`);

  if (!entries.length) {
    console.log("[promote] 无候选，退出");
    return;
  }

  if (opts.dry) {
    for (const e of entries) {
      console.log(
        `- [${e.level}] x${e._count} ${String(e.q).slice(0, 40)} | tts=${String(e.tts).slice(0, 40)}`
      );
    }
    const d = promoteToDistilled(entries, { dry: true, legacyDistilled: opts.legacy });
    console.log(
      `[promote] dry wiki: appendable 见匹配；unmatched=${d.wikiUnmatched}`
    );
    return;
  }

  const d = promoteToDistilled(entries, { legacyDistilled: opts.legacy });
  console.log(
    `[promote] wiki 常见问法 +${d.wikiAppended} · 未匹配 ${d.wikiUnmatched}` +
      (opts.legacy ? ` · distilled ${d.count} → knowledge/distilled/` : "")
  );

  if (opts.faq) {
    let n = 0;
    for (const e of entries) {
      if ((e._count || 1) < opts.min) continue;
      if (!opts.legacy && String(e.tts || "").length > 120) {
        // 有 wiki 口播时 promoteToFaq 会改用词条，仍可升格
      }
      const r = promoteToFaq(e);
      if (r.ok) {
        n += 1;
        console.log(
          `[promote] FAQ + ${String(e.q).slice(0, 40)}${r.fromWiki ? ` ←wiki:${r.slug}` : ""}`
        );
      } else {
        console.log(`[promote] FAQ skip: ${r.reason || r.error} | ${String(e.q).slice(0, 30)}`);
      }
    }
    console.log(`[promote] FAQ 新增 ${n} 条（min=${opts.min}）`);
  } else {
    console.log("[promote] 未加 --faq；仅 wiki 常见问法。模板秒答请加 --faq");
  }
  console.log("[promote] 建议: npm run knowledge:wiki:lint && npm run rag:index");
  void path;
}

main();
