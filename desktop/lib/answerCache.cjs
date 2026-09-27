/**
 * 会中重复问答缓存：答过一次 → 同场再问秒答（跳过 Chat）
 * 键做轻量归一，兼容「大智大智」「引入项目后」「是如何进行的」等变体。
 */
const { normalizeForMatch, questionFingerprint } = require("./duplexPolicy.cjs");
const { normalizeDazhiAliases } = require("./agentMode.cjs");
const { debugLog } = require("./debugLog.cjs");

/** @type {Map<string, Map<string, { q: string, tts: string, ts: number, hits: number, arkMode: string }>>} */
const byMeeting = new Map();

const MAX_PER_MEETING = 80;
const TTL_MS = 6 * 60 * 60 * 1000; // 6h

/**
 * 缓存键：去唤醒词/口水，归一「如何」类问法。
 * @param {string} text
 */
function cacheKey(text) {
  let t = normalizeDazhiAliases(normalizeForMatch(String(text || "")));
  t = t
    .replace(/大智+/g, "")
    .replace(/李老师/g, "")
    .replace(/引入(这个|该)?项目后[,，]?/g, "")
    .replace(/这个项目/g, "项目")
    .replace(/有没有/g, "有")
    .replace(/是如何进行的|如何进行|怎么样|怎样办|怎样/g, "如何")
    .replace(/[，,。．.!！？?\s]/g, "");
  if (t.length < 4) {
    return questionFingerprint(text) || t;
  }
  return t.slice(0, 56);
}

function meetingBucket(meetingId) {
  const id = String(meetingId || "default");
  let m = byMeeting.get(id);
  if (!m) {
    m = new Map();
    byMeeting.set(id, m);
  }
  return m;
}

/**
 * @param {string} meetingId
 * @param {string} question
 * @returns {{ tts: string, q: string, hits: number, arkMode: string }|null}
 */
function lookupAnswer(meetingId, question) {
  const key = cacheKey(question);
  if (!key || key.length < 4) return null;
  const m = meetingBucket(meetingId);
  const hit = m.get(key);
  if (!hit) return null;
  if (Date.now() - (hit.ts || 0) > TTL_MS) {
    m.delete(key);
    return null;
  }
  hit.hits = (hit.hits || 0) + 1;
  debugLog.info("AnswerCache", "命中秒答", {
    key: key.slice(0, 28),
    hits: hit.hits,
    tts: String(hit.tts || "").slice(0, 40)
  });
  return hit;
}

/**
 * @param {string} meetingId
 * @param {{ question: string, tts: string, arkMode?: string }} entry
 */
function rememberAnswer(meetingId, entry = {}) {
  const q = String(entry.question || "").trim();
  const tts = String(entry.tts || "").trim();
  if (!q || tts.length < 8) return { ok: false, reason: "empty" };
  // 不应声/残句不缓存
  if (/我是大智，请讲|嗯，我想一下/.test(tts)) return { ok: false, reason: "ack" };
  const key = cacheKey(q);
  if (!key || key.length < 4) return { ok: false, reason: "key" };
  const m = meetingBucket(meetingId);
  if (m.size >= MAX_PER_MEETING && !m.has(key)) {
    // 删最旧
    let oldestK = null;
    let oldestTs = Infinity;
    for (const [k, v] of m) {
      if ((v.ts || 0) < oldestTs) {
        oldestTs = v.ts || 0;
        oldestK = k;
      }
    }
    if (oldestK) m.delete(oldestK);
  }
  const prev = m.get(key);
  m.set(key, {
    q: q.slice(0, 160),
    tts: tts.slice(0, 200),
    ts: Date.now(),
    hits: (prev?.hits || 0) + 1,
    arkMode: String(entry.arkMode || "cache").slice(0, 32)
  });
  debugLog.info("AnswerCache", "已缓存", {
    key: key.slice(0, 28),
    size: m.size
  });
  return { ok: true, key };
}

function clearMeetingCache(meetingId) {
  byMeeting.delete(String(meetingId || "default"));
}

function cacheStats(meetingId) {
  const m = meetingBucket(meetingId);
  return { size: m.size, keys: [...m.keys()].slice(0, 20) };
}

module.exports = {
  cacheKey,
  lookupAnswer,
  rememberAnswer,
  clearMeetingCache,
  cacheStats
};
