/**
 * 将 inbox 中的 L2/L3 候选升格到 distilled / FAQ
 *
 * 用法：
 *   node scripts/promote-inbox.cjs              # 全部进 distilled（同 fp 去重）
 *   node scripts/promote-inbox.cjs --faq        # 额外：命中≥3 且短答 → FAQ
 *   node scripts/promote-inbox.cjs --faq --min=2
 *   node scripts/promote-inbox.cjs --dry
 */
const path = require("path");
const {
  aggregateInbox,
  promoteToDistilled,
  promoteToFaq,
  ensureDirs
} = require("../lib/knowledgeSink.cjs");

function parseArgs(argv) {
  const opts = { faq: false, dry: false, min: 3 };
  for (const a of argv) {
    if (a === "--faq") opts.faq = true;
    else if (a === "--dry") opts.dry = true;
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
    return;
  }

  const d = promoteToDistilled(entries);
  console.log(`[promote] distilled 写入 ${d.count} 个文件 → knowledge/distilled/`);

  if (opts.faq) {
    let n = 0;
    for (const e of entries) {
      if ((e._count || 1) < opts.min) continue;
      if (String(e.tts || "").length > 100) continue;
      const r = promoteToFaq(e);
      if (r.ok) {
        n += 1;
        console.log(`[promote] FAQ + ${String(e.q).slice(0, 40)}`);
      } else {
        console.log(`[promote] FAQ skip: ${r.reason || r.error} | ${String(e.q).slice(0, 30)}`);
      }
    }
    console.log(`[promote] FAQ 新增 ${n} 条（min=${opts.min}）`);
    console.log("[promote] 建议接着跑: npm run rag:index");
  } else {
    console.log("[promote] 未加 --faq；仅 distilled。升格模板请加 --faq");
    console.log("[promote] 建议接着跑: npm run rag:index");
  }
}

main();
