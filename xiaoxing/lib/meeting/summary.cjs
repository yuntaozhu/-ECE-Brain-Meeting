"use strict";

const fs = require("fs");
const path = require("path");
const { sessionsDir, ensureDir } = require("../knowledge/paths.cjs");
const { writeInbox } = require("../knowledge/inbox.cjs");
const { ingestMeetingGaps } = require("../followup/board.cjs");
const { ingestGapsAsTasks } = require("../knowledge/ingestTaskFromGap.cjs");

/**
 * 会后摘要：读 mtg jsonl → markdown；可选把缺口/未答会场问写入 inbox
 * @param {{ id: string, file: string, startedAt?: string, lines?: number }} meeting
 * @param {{ writeInboxGaps?: boolean }} [opts]
 */
function summarizeMeeting(meeting, opts = {}) {
  if (!meeting?.file || !fs.existsSync(meeting.file)) {
    return { ok: false, reason: "missing_file" };
  }
  const writeGaps = opts.writeInboxGaps !== false;
  const raw = fs.readFileSync(meeting.file, "utf8");
  const rows = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch (_) {
        return null;
      }
    })
    .filter(Boolean);

  const others = [];
  const me = [];
  const attributed = [];
  const drafts = [];
  const confirmed = [];
  const consults = [];
  const gaps = [];
  const focuses = [];

  for (const r of rows) {
    if (r.type === "transcript" && r.text) {
      const speaker = r.speaker || (r.track === "me" ? "me" : "others");
      const line = {
        speaker,
        track: r.track || "unknown",
        text: r.text,
        provider: r.provider || "xiaoxing_local",
        draft: r.draft !== false && r.confirmed !== true,
        ts: r.ts || r.at || null
      };
      attributed.push(line);
      if (line.draft) drafts.push(line);
      else confirmed.push(line);
      if (r.track === "others") others.push(r.text);
      if (r.track === "me") me.push(r.text);
    }
    if (r.type === "consult_mark" || r.action === "consult") {
      consults.push({ query: r.query || r.text, layer: r.layer });
    }
    if (r.type === "focus_commit" && r.query) {
      focuses.push({ query: r.query, source: r.source || "me" });
    }
    if (r.type === "focus_snapshot" && r.focus?.query) {
      focuses.push({
        query: r.focus.query,
        source: r.focus.source || "me",
        status: r.focus.status
      });
    }
  }

  // 从同场 ask session 不易关联；用 jsonl 里若写入了 consult 结果
  for (const r of rows) {
    if (r.layer === "gap" || r.layer === "refuse") {
      gaps.push({ query: r.query || r.text, layer: r.layer, reply: r.reply });
    }
  }

  // 启发式：会场疑似问句且本场未咨询过 → inbox（咨询缺口已在 ask 时写入）
  const inboxFiles = [];
  if (writeGaps) {
    for (const q of others) {
      if (!/[？?]|什么|怎么|是否|多少|哪/.test(q)) continue;
      if (q.length < 6) continue;
      const hit = consults.some(
        (c) => c.query && (q.includes(String(c.query).slice(0, 6)) || String(c.query).includes(q.slice(0, 6)))
      );
      if (hit) continue;
      const file = writeInbox({
        query: q,
        reason: "meeting_others_unanswered",
        reply: "",
        meta: { meetingId: meeting.id, source: "meeting-summary" }
      });
      inboxFiles.push(file);
      gaps.push({ query: q, layer: "others_unanswered" });
    }
  }

  const gapForBoard = gaps.filter((g) => g.layer === "others_unanswered" || g.layer === "gap");
  const followup = ingestMeetingGaps(meeting, gapForBoard);
  const ingest = ingestGapsAsTasks(meeting, gapForBoard);

  ensureDir(sessionsDir());
  const summaryPath = path.join(sessionsDir(), `${meeting.id}-summary.md`);
  const ingestLines =
    ingest.created?.length > 0
      ? ingest.created.map((c) => {
          const t = c.ingest || {};
          const srcs = (t.suggested_source_ids || []).join(", ") || "（无白名单源/需手工摘录）";
          return `- [${t.gap_kind}] ${t.query || ""} → ${srcs}`;
        })
      : ["- （本场无结构化补库任务）"];
  const fmtLine = (l) => {
    const tag = l.draft ? "草稿" : "已确认";
    const who = l.speaker || l.track || "?";
    return `- [${tag}][${who}] ${l.text}`;
  };
  const md = [
    `# 小星会议摘要 · ${meeting.id}`,
    ``,
    `- 开始：${meeting.startedAt || ""}`,
    `- 结束：${new Date().toISOString()}`,
    `- 日志行：${meeting.lines ?? rows.length}`,
    `- 会场句：${others.length} · 我：${me.length} · 带说话人：${attributed.length}（草稿 ${drafts.length} / 已确认 ${confirmed.length}）`,
    `- Focus：${focuses.length} · 缺口卡：${gaps.length} · 跟进 ${followup.created?.length || 0} · 补库任务 ${ingest.created?.length || 0}`,
    `- 说明：自动转写默认标「草稿」；用户确认后标「已确认」。模型生成不等于用户确认。`,
    ``,
    `## 转写（按说话人）`,
    ...(attributed.length ? attributed.map(fmtLine) : ["- （无）"]),
    ``,
    `## 会场（Others）`,
    ...(others.length ? others.map((t) => `- ${t}`) : ["- （无）"]),
    ``,
    `## 我（Me）`,
    ...(me.length ? me.map((t) => `- ${t}`) : ["- （无）"]),
    ``,
    `## Focus 槽`,
    ...(focuses.length
      ? focuses.map(
          (f) =>
            `- [${f.source}${f.status ? "/" + f.status : ""}] ${f.query}`
        )
      : ["- （无）"]),
    ``,
    `## 待复盘`,
    ...(gaps.length
      ? gaps.map((g) => `- [${g.layer}] ${g.query || ""}`)
      : ["- （无）"]),
    ``,
    `## 补库任务`,
    ...ingestLines,
    ``,
    `## 农服跟进`,
    ...(followup.created?.length
      ? followup.created.map((t) => `- [todo] ${t.title}`)
      : ["- （本场无新跟进）"]),
    ...(ingest.created?.length
      ? ingest.created.map((c) => `- [todo/ingest] ${c.followup.title}`)
      : []),
    ``
  ].join("\n");
  fs.writeFileSync(summaryPath, md, "utf8");

  let memory = null;
  try {
    const { registerMeeting } = require("./projectMemory.cjs");
    memory = registerMeeting(meeting, {
      summaryPath,
      gaps: gaps.map((g) => g.query).filter(Boolean),
      ingestTasks: ingest.created || [],
      others: others.length,
      me: me.length,
      headlineHints: [
        ...focuses.map((f) => f.query),
        ...consults.map((c) => c.query),
        ...others.slice(0, 8),
        ...me.slice(0, 8)
      ].filter(Boolean)
    });
  } catch (_) {}

  return {
    ok: true,
    summaryPath,
    others: others.length,
    me: me.length,
    attributed: attributed.length,
    drafts: drafts.length,
    confirmed: confirmed.length,
    focuses: focuses.length,
    gaps: gaps.length,
    inboxFiles,
    followups: followup.created || [],
    ingestTasks: ingest.created || [],
    memory
  };
}

module.exports = { summarizeMeeting };
