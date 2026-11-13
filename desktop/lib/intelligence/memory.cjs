/**
 * Wave R9a：会话记忆三槽（实质问 / 业务口播 / Meta 口播）。
 * incomplete / interrupted / failed 一律不写槽。
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
      prevRealAskAt: 0
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
    prevRealAskAt: Number(state.prevRealAskAt) || 0
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
 * 包裹实质问写入；incomplete 时 no-op。
 * @param {object|null|undefined} state
 * @param {string} question
 * @param {{ draftState?: string, rememberRealAsk?: Function }} [opts]
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

module.exports = {
  DRAFT_STATES,
  SLOT_TTL_MS_DEFAULT,
  isWritableDraftState,
  readSlots,
  pickFresh,
  commitContentSpeak,
  commitMetaSpeak,
  rememberRealAskSafe,
  rejectWriteIfIncomplete
};
