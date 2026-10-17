/**
 * 半双工 — 文本归一、截断、楼层抽取、问句形态。
 * 词表只读 knowledge/schema/linguistic-operators.json。
 */
const { load, rx } = require("../knowledge/schemaStore.cjs");

function op(name, flags) {
  return rx("operators", name, flags);
}

function normText(s) {
  return String(s || "")
    .replace(/\s+/g, "")
    .replace(/[，。！？、；：""''「」（）()【】\[\]…·]/g, "");
}

/**
 * ASR 变体归一：金额、美语错听、一园两制错听等。
 * @param {string} s
 */
function normalizeForMatch(s) {
  let t = String(s || "");
  for (const pair of load().operators.matchNormalize || []) {
    if (!pair || !pair[0]) continue;
    t = t.replace(new RegExp(pair[0], "g"), pair[1] == null ? "" : String(pair[1]));
  }
  return t;
}

/**
 * 先开口用的短句：约 28 字，优先停在逗号或句号，播完大约 5 秒。
 * @param {string} text
 * @param {number} [max]
 */
function leadClause(text, max = 28) {
  const t = String(text || "")
    .replace(/^["「]|["」]$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "";
  if (t.length <= max) return t;
  const window = t.slice(0, max + 10);
  let cut = -1;
  for (const ch of ["。", "！", "？", "；", "，"]) {
    const i = window.indexOf(ch);
    if (i >= 8 && (cut < 0 || i < cut)) cut = i;
  }
  if (cut >= 8) {
    const keep = /[。！？]/.test(window[cut]);
    return window.slice(0, cut + (keep ? 1 : 0)).trim();
  }
  return window.slice(0, max).trim();
}

/**
 * 口播截断：160 字内优先停在句号，避免切在「用」这种半句上。
 * @param {string} text
 * @param {number} [max]
 */
function clipUtterance(text, max = 160) {
  let t = String(text || "")
    .replace(/^["「]|["」]$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t || t.length <= max) return t;
  const window = t.slice(0, max);
  let end = -1;
  for (const ch of ["。", "！", "？", "!", "?"]) {
    end = Math.max(end, window.lastIndexOf(ch));
  }
  if (end >= 8) return window.slice(0, end + 1).trim();
  for (const ch of ["；", ";", "，", ","]) {
    end = Math.max(end, window.lastIndexOf(ch));
  }
  if (end >= 8) return window.slice(0, end).trim();
  return window.trim();
}

function extractFloorLines(transcript, max = 2) {
  return String(transcript || "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => op("floorMark").test(l))
    .map((l) => l.replace(op("floorStrip"), ""))
    .filter(Boolean)
    .slice(-Math.max(1, max));
}

function questionFingerprint(text) {
  const t = normText(text).slice(0, 48);
  if (t.length < 4) return "";
  return t;
}

function stripIntroBoilerplate(text) {
  let t = String(text || "").trim();
  if (!t) return t;
  const parts = t.split(/(?<=[。！？])/);
  const kept = parts.filter((p) => {
    const n = normText(p);
    if (!n) return false;
    if (op("introListen").test(p) && op("introTheme").test(p)) return false;
    if (op("introCall").test(p) && op("introCallWho").test(p)) return false;
    return true;
  });
  t = (kept.length ? kept.join("") : t).replace(op("introBoilerplate", "g"), "").trim();
  t = t.replace(/^[，,。.\s]+/, "").replace(/[，,]\s*$/, "");
  return t;
}

function isIntroSelfTalk(text) {
  const t = normText(text);
  if (t.length < 10) return false;
  const hasListen = op("selfTalkListen").test(t);
  const hasTheme = op("selfTalkTheme").test(t);
  return hasListen && hasTheme;
}

function isQuestionForm(text) {
  const s = String(text || "").trim();
  if (!s) return false;
  if (op("questionMark").test(s)) return true;
  if (op("questionCue").test(s)) return true;
  if (op("questionTail").test(s) && s.length >= 4) return true;
  return false;
}

/**
 * 真追问：带疑问/求证，即使与 Host 部分重合也不当回灌。
 */
function isFollowUpNotEcho(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (isQuestionForm(t)) return true;
  if (op("followUpCue").test(t)) return true;
  return false;
}

module.exports = {
  get TOPIC_HINT_RE() {
    return op("topicHint");
  },
  get LOGISTICS_RE() {
    return op("logistics", "i");
  },
  normText,
  normalizeForMatch,
  leadClause,
  clipUtterance,
  extractFloorLines,
  questionFingerprint,
  stripIntroBoilerplate,
  isIntroSelfTalk,
  isQuestionForm,
  isFollowUpNotEcho
};
