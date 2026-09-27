/**
 * L2/L3 答后沉淀：inbox 候选 → distilled 知识 / FAQ 升格（半自动）
 */
const fs = require("fs");
const path = require("path");
const { debugLog } = require("./debugLog.cjs");
const { questionFingerprint } = require("./duplexPolicy.cjs");

const ROOT = path.join(__dirname, "..", "knowledge");
const INBOX_DIR = path.join(ROOT, "inbox");
const DISTILLED_DIR = path.join(ROOT, "distilled");
const FAQ_FILE = path.join(ROOT, "faq-meeting.txt");

function ensureDirs() {
  for (const d of [INBOX_DIR, DISTILLED_DIR]) {
    try {
      fs.mkdirSync(d, { recursive: true });
    } catch (_) {}
  }
}

function dayStamp(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * L2/L3 成功回复写入 inbox（自动，低门槛）
 * @param {{
 *   level: string,
 *   question: string,
 *   rewritten?: string,
 *   tts: string,
 *   analysis?: string,
 *   steps?: string[],
 *   risks?: string[],
 *   cite?: string[],
 *   ragHits?: unknown[],
 *   model?: string,
 *   meetingId?: string,
 *   arkMode?: string
 * }} entry
 */
function sinkAdvisorAnswer(entry = {}) {
  const q = String(entry.question || "").trim();
  const tts = String(entry.tts || "").trim();
  if (!q || !tts) return { ok: false, reason: "empty" };
  ensureDirs();
  const level = entry.level === "L3" ? "L3" : "L2";
  const fp = questionFingerprint(q) || q.slice(0, 40).replace(/\s+/g, "");
  const row = {
    level,
    questionFp: fp,
    q: q.slice(0, 240),
    rewritten: String(entry.rewritten || q).slice(0, 240),
    tts: tts.slice(0, 200),
    analysis: String(entry.analysis || "").slice(0, 800),
    steps: Array.isArray(entry.steps) ? entry.steps.slice(0, 6) : [],
    risks: Array.isArray(entry.risks) ? entry.risks.slice(0, 4) : [],
    cite: Array.isArray(entry.cite) ? entry.cite.slice(0, 6) : [],
    ragHits: Array.isArray(entry.ragHits) ? entry.ragHits.slice(0, 6) : [],
    model: String(entry.model || "").slice(0, 80),
    meetingId: String(entry.meetingId || "").slice(0, 64),
    arkMode: String(entry.arkMode || "").slice(0, 32),
    ts: new Date().toISOString()
  };
  const file = path.join(INBOX_DIR, `${level.toLowerCase()}-${dayStamp()}.jsonl`);
  try {
    fs.appendFileSync(file, JSON.stringify(row) + "\n", "utf8");
    debugLog.info("KnowledgeSink", "inbox 已写", {
      level,
      file: path.basename(file),
      fp: fp.slice(0, 24)
    });
    return { ok: true, file, questionFp: fp };
  } catch (err) {
    debugLog.warn("KnowledgeSink", "inbox 写入失败", { error: String(err?.message || err) });
    return { ok: false, error: String(err?.message || err) };
  }
}

/** 读取 inbox 全部 jsonl 行 */
function readInboxEntries() {
  ensureDirs();
  const out = [];
  let files = [];
  try {
    files = fs.readdirSync(INBOX_DIR).filter((f) => /^l[23]-\d{4}-\d{2}-\d{2}\.jsonl$/i.test(f));
  } catch (_) {
    return out;
  }
  for (const f of files.sort()) {
    let text = "";
    try {
      text = fs.readFileSync(path.join(INBOX_DIR, f), "utf8");
    } catch (_) {
      continue;
    }
    for (const line of text.split("\n")) {
      const s = line.trim();
      if (!s) continue;
      try {
        out.push(JSON.parse(s));
      } catch (_) {}
    }
  }
  return out;
}

/**
 * 按 questionFp 聚合，同 fp 保留最新完整一版
 * @returns {Map<string, { entry: object, count: number }>}
 */
function aggregateInbox() {
  const map = new Map();
  for (const e of readInboxEntries()) {
    const fp = e.questionFp || questionFingerprint(e.q || "") || e.q;
    if (!fp) continue;
    const prev = map.get(fp);
    if (!prev) {
      map.set(fp, { entry: e, count: 1 });
      continue;
    }
    prev.count += 1;
    const newer = String(e.ts || "") >= String(prev.entry.ts || "");
    const richer =
      (e.steps?.length || 0) + (e.analysis ? 1 : 0) >=
      (prev.entry.steps?.length || 0) + (prev.entry.analysis ? 1 : 0);
    if (newer || richer) prev.entry = e;
  }
  return map;
}

function entryToMarkdown(entry) {
  const q = entry.q || entry.rewritten || "";
  const lines = [
    `## ${String(q).slice(0, 60)}`,
    "",
    `> 来源：${entry.level || "L2"} · ${entry.arkMode || ""} · ${entry.ts || ""}`,
    "",
    `**口播**：${entry.tts || ""}`,
    ""
  ];
  if (entry.analysis) {
    lines.push("**分析**：", entry.analysis, "");
  }
  if (entry.steps?.length) {
    lines.push("**步骤**：");
    entry.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push("");
  }
  if (entry.risks?.length) {
    lines.push("**风险**：" + entry.risks.join("；"));
    lines.push("");
  }
  if (entry.cite?.length) {
    lines.push("**依据**：" + entry.cite.join("、"));
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * 审核通过项写入 distilled（强化下次 RAG）
 * @param {object[]} entries
 */
function promoteToDistilled(entries) {
  ensureDirs();
  const written = [];
  for (const e of entries) {
    const fp = (e.questionFp || questionFingerprint(e.q || "") || "x")
      .slice(0, 40)
      .replace(/[^\w\u4e00-\u9fff\-]+/g, "_");
    const file = path.join(DISTILLED_DIR, `${e.level || "L2"}-${fp}.md`);
    try {
      fs.writeFileSync(file, entryToMarkdown(e), "utf8");
      written.push(file);
    } catch (err) {
      debugLog.warn("KnowledgeSink", "distilled 写入失败", { error: String(err?.message || err) });
    }
  }
  return { ok: true, count: written.length, files: written };
}

function faqAlreadyHasQuestion(q) {
  let raw = "";
  try {
    raw = fs.readFileSync(FAQ_FILE, "utf8");
  } catch (_) {
    return false;
  }
  const key = String(q || "")
    .replace(/\s+/g, "")
    .slice(0, 16);
  if (key.length < 6) return false;
  return raw.replace(/\s+/g, "").includes(key);
}

/**
 * 常见短答升格 FAQ（高门槛；不覆盖已有）
 * @param {object} entry
 * @param {{ minCount?: number, force?: boolean }} [opts]
 */
function promoteToFaq(entry, opts = {}) {
  const tts = String(entry.tts || "").trim();
  const q = String(entry.q || entry.rewritten || "").trim();
  if (!tts || !q) return { ok: false, reason: "empty" };
  if (tts.length > 100) return { ok: false, reason: "tts_too_long" };
  if (!opts.force && faqAlreadyHasQuestion(q)) {
    return { ok: false, reason: "faq_exists" };
  }
  const block =
    `\n## Q: ${q.slice(0, 80)}\n\n` +
    `A: ${tts}\n`;
  try {
    fs.appendFileSync(FAQ_FILE, block, "utf8");
    debugLog.info("KnowledgeSink", "FAQ 已追加", { q: q.slice(0, 40) });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

/** 读取 distilled 目录合并文本（供 RAG） */
function getDistilledRaw() {
  ensureDirs();
  let files = [];
  try {
    files = fs
      .readdirSync(DISTILLED_DIR)
      .filter((f) => /\.(md|txt)$/i.test(f))
      .sort();
  } catch (_) {
    return "";
  }
  const parts = [];
  for (const f of files) {
    try {
      const t = fs.readFileSync(path.join(DISTILLED_DIR, f), "utf8").trim();
      if (t.length >= 40) parts.push(t);
    } catch (_) {}
  }
  return parts.join("\n\n");
}

module.exports = {
  INBOX_DIR,
  DISTILLED_DIR,
  sinkAdvisorAnswer,
  readInboxEntries,
  aggregateInbox,
  promoteToDistilled,
  promoteToFaq,
  getDistilledRaw,
  entryToMarkdown,
  ensureDirs
};
