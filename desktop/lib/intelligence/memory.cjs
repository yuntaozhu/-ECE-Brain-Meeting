/**
 * Wave R9a + R10a：会话记忆三槽 + Focus SSOT（按 At 最新）。
 * Answer 槽：incomplete / interrupted / failed 不写。
 * Ask/Focus：完整实质问受理即可写，不绑成功口播。
 */
const DRAFT_STATES = Object.freeze({
  STREAMING: "streaming",
  COMMITTED: "committed",
  INTERRUPTED: "interrupted",
  FAILED: "failed"
});

const SLOT_TTL_MS_DEFAULT = 30 * 60 * 1000;

function isWritableDraftState(draftState) {
  const s = String(draftState || DRAFT_STATES.COMMITTED).toLowerCase();
  return s === DRAFT_STATES.COMMITTED;
}

function clip(text, max) {
  const t = String(text || "").trim();
  if (!t) return "";
  return t.length > max ? t.slice(0, max) : t;
}

function readSlots(state) {
  if (!state) {
    return {
      lastRealAsk: "",
      lastRealAskAt: 0,
      lastContentSpeak: "",
      lastContentSpeakAt: 0,
      lastMetaSpeak: "",
      lastMetaSpeakAt: 0,
      prevRealAsk: "",
      prevRealAskAt: 0,
      pendingAsk: "",
      pendingAskAt: 0,
      lastOpenAsk: "",
      lastOpenAskAt: 0
    };
  }
  return {
    lastRealAsk: String(state.lastRealAsk || "").trim(),
    lastRealAskAt: Number(state.lastRealAskAt) || 0,
    lastContentSpeak: String(state.lastContentSpeak || "").trim(),
    lastContentSpeakAt: Number(state.lastContentSpeakAt) || 0,
    lastMetaSpeak: String(state.lastMetaSpeak || "").trim(),
    lastMetaSpeakAt: Number(state.lastMetaSpeakAt) || 0,
    prevRealAsk: String(state.prevRealAsk || "").trim(),
    prevRealAskAt: Number(state.prevRealAskAt) || 0,
    pendingAsk: String(state.pendingAsk || "").trim(),
    pendingAskAt: Number(state.pendingAskAt) || 0,
    lastOpenAsk: String(state.lastOpenAsk || "").trim(),
    lastOpenAskAt: Number(state.lastOpenAskAt) || 0
  };
}

function pickFresh(text, at, ttlMs) {
  const t = String(text || "").trim();
  if (!t) return "";
  const ttl = Number(ttlMs) > 0 ? Number(ttlMs) : SLOT_TTL_MS_DEFAULT;
  if (at && Date.now() - at >= ttl) return "";
  return t;
}

/**
 * R10a：回放/催答 SSOT — 在 lastRealAsk / pendingAsk / lastOpenAsk 中取 At 最新。
 * @param {object|null|undefined} state
 * @param {{ ttlMs?: number, minLen?: number, reject?: (t: string) => boolean }} [opts]
 * @returns {{ text: string, at: number, source: string }}
 */
function pickLatestFocus(state, opts = {}) {
  const ttl = Number(opts.ttlMs) > 0 ? Number(opts.ttlMs) : SLOT_TTL_MS_DEFAULT;
  const minLen = Number(opts.minLen) > 0 ? Number(opts.minLen) : 6;
  const reject = typeof opts.reject === "function" ? opts.reject : () => false;
  const slots = readSlots(state);
  const cands = [
    { text: slots.lastRealAsk, at: slots.lastRealAskAt, source: "lastRealAsk" },
    { text: slots.pendingAsk, at: slots.pendingAskAt, source: "pendingAsk" },
    { text: slots.lastOpenAsk, at: slots.lastOpenAskAt, source: "lastOpenAsk" }
  ];
  let best = { text: "", at: 0, source: "" };
  for (const c of cands) {
    const t = pickFresh(c.text, c.at, ttl);
    if (!t || t.length < minLen) continue;
    if (reject(t)) continue;
    if (!best.text || (c.at || 0) >= (best.at || 0)) {
      best = { text: t, at: c.at || 0, source: c.source };
    }
  }
  if (!best.text) {
    const prev = pickFresh(slots.prevRealAsk, slots.prevRealAskAt, ttl);
    if (prev && prev.length >= minLen && !reject(prev)) {
      return { text: prev, at: slots.prevRealAskAt || 0, source: "prevRealAsk" };
    }
  }
  return best;
}

/**
 * 受理完整实质问：写 lastRealAsk，并同步 pending/open 焦点（不要求已口播）。
 */
function commitFocusAsk(state, question, opts = {}) {
  if (!state) return false;
  const q = clip(question, 200);
  if (!q || q.length < 8) return false;
  const fn =
    typeof opts.rememberRealAsk === "function"
      ? opts.rememberRealAsk
      : require("../meetingStrategy/internal/result.cjs").rememberRealAsk;
  fn(state, q);
  const now = Date.now();
  if (opts.asPending !== false) {
    state.pendingAsk = q;
    state.pendingAskAt = now;
    state.lastOpenAsk = q;
    state.lastOpenAskAt = now;
  }
  state.focusUnanswered = opts.answered === true ? false : true;
  return Boolean(String(state.lastRealAsk || "").trim());
}

function markFocusAnswered(state) {
  if (!state) return;
  state.focusUnanswered = false;
}

/**
 * @param {object|null|undefined} state
 * @param {string} text
 * @param {{ draftState?: string }} [opts]
 */
function commitContentSpeak(state, text, opts = {}) {
  if (!state || !isWritableDraftState(opts.draftState)) return false;
  const line = clip(text, 200);
  if (!line) return false;
  state.lastContentSpeak = line;
  state.lastContentSpeakAt = Date.now();
  markFocusAnswered(state);
  return true;
}

/**
 * @param {object|null|undefined} state
 * @param {string} text
 * @param {{ draftState?: string }} [opts]
 */
function commitMetaSpeak(state, text, opts = {}) {
  if (!state || !isWritableDraftState(opts.draftState)) return false;
  const line = clip(text, 200);
  if (!line) return false;
  state.lastMetaSpeak = line;
  state.lastMetaSpeakAt = Date.now();
  return true;
}

/**
 * 包裹实质问写入；incomplete 时 no-op（仅 Answer 路径严格态）。
 * R10a 受理写请用 commitFocusAsk。
 */
function rememberRealAskSafe(state, question, opts = {}) {
  if (!state || !isWritableDraftState(opts.draftState)) return false;
  const fn =
    typeof opts.rememberRealAsk === "function"
      ? opts.rememberRealAsk
      : require("../meetingStrategy/internal/result.cjs").rememberRealAsk;
  fn(state, question);
  return Boolean(String(state.lastRealAsk || "").trim());
}

function rejectWriteIfIncomplete(draftState) {
  return !isWritableDraftState(draftState);
}

function extractAskRepairBody(text) {
  const t = String(text || "").trim();
  if (!t) return "";
  try {
    const { rx } = require("../knowledge/schemaStore.cjs");
    const m = rx("commands", "askRepairBody").exec(t) || rx("dialogueMeta", "askRepairBody").exec(t);
    if (!m) return "";
    return clip(m[1] || m[2] || "", 200);
  } catch (_) {
    return "";
  }
}

function focusGlueMs() {
  try {
    const { hp } = require("../knowledge/schemaStore.cjs");
    const n = Number(hp("focusGlueMs"));
    return n > 0 ? n : 2500;
  } catch (_) {
    return 2500;
  }
}

module.exports = {
  DRAFT_STATES,
  SLOT_TTL_MS_DEFAULT,
  isWritableDraftState,
  readSlots,
  pickFresh,
  pickLatestFocus,
  commitFocusAsk,
  markFocusAnswered,
  commitContentSpeak,
  commitMetaSpeak,
  rememberRealAskSafe,
  rejectWriteIfIncomplete,
  extractAskRepairBody,
  focusGlueMs
};
