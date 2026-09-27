/**
 * 将会场 sessions/{meetingId}.jsonl 中的问答对沉淀进知识库
 *
 * 用法：
 *   node scripts/promote-session.cjs --latest
 *   node scripts/promote-session.cjs --id=mtg_xxx
 *   node scripts/promote-session.cjs --all
 *   node scripts/promote-session.cjs --latest --faq --min=1
 *   node scripts/promote-session.cjs --latest --dry
 *   node scripts/promote-session.cjs --latest --summary   # 额外写 sessions/{id}-summary.md
 */
const fs = require("fs");
const path = require("path");
const {
  SESSIONS_DIR,
  readSession,
  writeSummary,
  sessionPath
} = require("../lib/sessionLog.cjs");
const {
  sinkAdvisorAnswer,
  promoteToDistilled,
  promoteToFaq,
  ensureDirs
} = require("../lib/knowledgeSink.cjs");
const { questionFingerprint } = require("../lib/duplexPolicy.cjs");
const { normalizeDazhiAliases } = require("../lib/agentMode.cjs");
const { cacheKey } = require("../lib/answerCache.cjs");

function parseArgs(argv) {
  const opts = {
    id: "",
    latest: false,
    all: false,
    faq: false,
    dry: false,
    summary: false,
    min: 1
  };
  for (const a of argv) {
    if (a === "--latest") opts.latest = true;
    else if (a === "--all") opts.all = true;
    else if (a === "--faq") opts.faq = true;
    else if (a === "--dry") opts.dry = true;
    else if (a === "--summary") opts.summary = true;
    else if (a.startsWith("--id=")) opts.id = a.slice(5).trim();
    else if (a.startsWith("--min=")) opts.min = Number(a.slice(6)) || 1;
  }
  return opts;
}

function listSessionIds() {
  ensureDirs();
  let files = [];
  try {
    files = fs.readdirSync(SESSIONS_DIR).filter((f) => /^mtg_.+\.jsonl$/i.test(f) || /^[\w\-]+\.jsonl$/i.test(f));
  } catch (_) {
    return [];
  }
  return files
    .map((f) => ({
      id: f.replace(/\.jsonl$/i, ""),
      mtime: fs.statSync(path.join(SESSIONS_DIR, f)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime);
}

function isHostSpeaker(sp) {
  return /大智|AI|主席|Host|李老师/i.test(String(sp || ""));
}

function isFloorSpeaker(sp) {
  return /会场|园长|用户|参会/i.test(String(sp || "")) || !isHostSpeaker(sp);
}

function looksLikeQuestion(text) {
  const t = String(text || "").trim();
  if (t.length < 4) return false;
  if (/[？?]/.test(t)) return true;
  if (/(是什么|什么是|如何|怎么|怎样|多少钱|有没有|是不是|能不能|可不可以|吗|呢)$/.test(t)) {
    return true;
  }
  return /(收益保障|全园美语|四端|一园两制|三笔账|3900|招生|倒闭)/.test(t) && t.length >= 8;
}

/**
 * 从会话行抽出 Q→A 对（会场问紧随后面大智答）
 * @param {Array<{speaker:string,text:string,ts?:number}>} rows
 */
function extractQAPairs(rows) {
  const pairs = [];
  const list = rows || [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    if (!isFloorSpeaker(row.speaker)) continue;
    const q = normalizeDazhiAliases(String(row.text || "").trim());
    if (!looksLikeQuestion(q)) continue;
    if (/^(喂+|好+|嗯+|大智+|谢谢大智)/.test(q) && q.length < 10) continue;
    let answer = "";
    for (let j = i + 1; j < Math.min(i + 6, list.length); j++) {
      const nxt = list[j];
      if (isHostSpeaker(nxt.speaker)) {
        const t = String(nxt.text || "").trim();
        if (/我是大智，请讲|嗯，我想一下|要我帮您总结/.test(t)) continue;
        if (t.length >= 12) {
          answer = t;
          break;
        }
      }
      if (isFloorSpeaker(nxt.speaker) && looksLikeQuestion(nxt.text)) break;
    }
    if (!answer) continue;
    pairs.push({
      q: q.slice(0, 240),
      tts: answer.slice(0, 200),
      questionFp: questionFingerprint(q) || cacheKey(q),
      cacheKey: cacheKey(q)
    });
  }
  return pairs;
}

/**
 * 按 cacheKey / questionFp 聚合
 */
function aggregatePairs(pairs) {
  const map = new Map();
  for (const p of pairs) {
    const key = p.cacheKey || p.questionFp || p.q;
    if (!key) continue;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...p, count: 1 });
      continue;
    }
    prev.count += 1;
    if ((p.tts || "").length >= (prev.tts || "").length) {
      prev.tts = p.tts;
      prev.q = p.q;
    }
  }
  return [...map.values()];
}

function buildSummaryMarkdown(meetingId, pairs) {
  const lines = [
    `# 会议问答摘要 · ${meetingId}`,
    "",
    `生成时间：${new Date().toISOString()}`,
    `问答对数：${pairs.length}`,
    ""
  ];
  pairs.forEach((p, i) => {
    lines.push(`## ${i + 1}. ${p.q}`);
    lines.push("");
    lines.push(`**口播**：${p.tts}`);
    lines.push("");
    lines.push(`> 出现 ${p.count || 1} 次`);
    lines.push("");
  });
  return lines.join("\n");
}

function promoteOne(meetingId, opts) {
  const rows = readSession(meetingId);
  if (!rows.length) {
    console.log(`[promote-session] ${meetingId}: 无会话行`);
    return { ok: false, reason: "empty" };
  }
  const pairs = aggregatePairs(extractQAPairs(rows));
  console.log(`[promote-session] ${meetingId}: 抽出 ${pairs.length} 条去重问答`);

  if (opts.dry) {
    for (const p of pairs) {
      console.log(`- x${p.count} ${p.q.slice(0, 40)} → ${p.tts.slice(0, 40)}`);
    }
    return { ok: true, dry: true, count: pairs.length };
  }

  if (opts.summary) {
    const md = buildSummaryMarkdown(meetingId, pairs);
    writeSummary(meetingId, md);
    console.log(`[promote-session] 已写 summary → sessions/${meetingId}-summary.md`);
  }

  const entries = pairs.map((p) => ({
    level: "L2",
    questionFp: p.questionFp,
    q: p.q,
    rewritten: p.q,
    tts: p.tts,
    steps: [],
    cite: ["session"],
    meetingId,
    arkMode: "session-promote",
    ts: new Date().toISOString(),
    _count: p.count
  }));

  // 写入 inbox（便于后续 promote-inbox）
  let inboxN = 0;
  for (const e of entries) {
    const r = sinkAdvisorAnswer({
      level: "L2",
      question: e.q,
      rewritten: e.q,
      tts: e.tts,
      steps: [],
      cite: ["session"],
      meetingId,
      arkMode: "session-promote"
    });
    if (r.ok) inboxN += 1;
  }
  console.log(`[promote-session] inbox 写入 ${inboxN} 条`);

  const d = promoteToDistilled(entries);
  console.log(`[promote-session] distilled 写入 ${d.count} 个文件`);

  let faqN = 0;
  if (opts.faq) {
    for (const e of entries) {
      if ((e._count || 1) < opts.min) continue;
      if (String(e.tts || "").length > 100) continue;
      const r = promoteToFaq(e, { force: false });
      if (r.ok) {
        faqN += 1;
        console.log(`[promote-session] FAQ + ${e.q.slice(0, 40)}`);
      }
    }
    console.log(`[promote-session] FAQ 新增 ${faqN}（min=${opts.min}）`);
  }

  return { ok: true, pairs: pairs.length, inbox: inboxN, distilled: d.count, faq: faqN };
}

function main() {
  ensureDirs();
  const opts = parseArgs(process.argv.slice(2));
  const listed = listSessionIds();
  if (!listed.length) {
    console.log("[promote-session] knowledge/sessions/ 下无 jsonl");
    return;
  }

  let ids = [];
  if (opts.id) ids = [opts.id.replace(/\.jsonl$/i, "")];
  else if (opts.latest) ids = [listed[0].id];
  else if (opts.all) ids = listed.map((x) => x.id);
  else {
    console.log("请指定 --latest / --id=mtg_xxx / --all");
    console.log("最近会话：");
    listed.slice(0, 8).forEach((x) => console.log(`  ${x.id}`));
    return;
  }

  for (const id of ids) {
    if (!fs.existsSync(sessionPath(id))) {
      console.log(`[promote-session] 找不到 ${id}.jsonl`);
      continue;
    }
    promoteOne(id, opts);
  }
  console.log("[promote-session] 建议接着跑: npm run rag:index");
}

main();
