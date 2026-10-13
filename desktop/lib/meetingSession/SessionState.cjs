/**
 * 会议会话 — 状态机（互动姿态 / 生命周期）
 */
const {
  AGENT_MODE,
  MEETING_LIFE,
  HA_STICKY_MS
} = require("./constants.cjs");
const { normalizeDazhiAliases } = require("./commands/normalize.cjs");

/** 静默态：只收听，非表内口令不插话 */
function isSilentMode(mode) {
  return mode === AGENT_MODE.IDLE_LISTEN || mode === AGENT_MODE.HH || mode === AGENT_MODE.PAUSED;
}

/** 咨询粘滞态 */
function isConsultMode(mode) {
  return mode === AGENT_MODE.HA_ASK || mode === AGENT_MODE.HA_TALK || mode === AGENT_MODE.HA_BIZ;
}

function createAgentState(meetingId) {
  return {
    mode: AGENT_MODE.IDLE_LISTEN,
    lifecycle: MEETING_LIFE.SILENT,
    segmentId: `seg_${Date.now()}`,
    steerCount: 0,
    lastSteerAt: 0,
    weakOffTopicStreak: 0,
    haLockedUntil: 0,
    holdToEnd: false,
    interrupted: false,
    interruptAt: 0,
    lastInterruptedText: "",
    /** @type {{ fullText: string, interruptedAt: number, chunks: number } | null} */
    interruptBuffer: null,
    holdFloorLines: [],
    objectionLevel: 1,
    meetingId: meetingId || `mtg_${Date.now()}`,
    meetingOpen: true,
    agenda: "",
    summaryPendingConfirm: false,
    floorLinesSinceSummary: 0,
    bizFollowUps: 0,
    lastRealAsk: "",
    lastRealAskAt: 0
  };
}

const createMeetingSession = createAgentState;

/**
 * 确保旁听/答问时 meetingOpen，避免 lifecycle 长期 OFF。
 * @param {object} state
 * @param {string} [agenda]
 */
function ensureMeetingOpen(state, agenda) {
  if (!state) return;
  if (!state.meetingOpen) {
    state.meetingOpen = true;
    if (agenda) state.agenda = state.agenda || agenda;
  }
  if (state.lifecycle === MEETING_LIFE.OFF || !state.lifecycle) {
    setLifecycle(
      state,
      isConsultMode(state.mode) ? MEETING_LIFE.CONSULT : MEETING_LIFE.SILENT
    );
  }
}

/** 由 session + 半双工/占麦 推导生命周期展示 */
function deriveMeetingLife(state, opts = {}) {
  if (!state) return MEETING_LIFE.OFF;
  if (state.lifecycle === MEETING_LIFE.CLOSING) return MEETING_LIFE.CLOSING;
  if (state.lifecycle === MEETING_LIFE.OPENING) return MEETING_LIFE.OPENING;
  if (!state.meetingOpen) {
    if (opts.listening) return MEETING_LIFE.SILENT;
    return MEETING_LIFE.OFF;
  }
  if (state.holdToEnd || opts.holdListening) return MEETING_LIFE.HOLD;
  if (state.mode === AGENT_MODE.HH_SUM) return MEETING_LIFE.SUMMARY;
  if (isConsultMode(state.mode)) return MEETING_LIFE.CONSULT;
  return MEETING_LIFE.SILENT;
}

function setLifecycle(state, life) {
  if (!state) return;
  state.lifecycle = life;
  return life;
}

function newSegment(state) {
  state.segmentId = `seg_${Date.now()}`;
  state.steerCount = 0;
  state.weakOffTopicStreak = 0;
  state.objectionLevel = 1;
  state.summaryPendingConfirm = false;
  state.floorLinesSinceSummary = 0;
}

function setMode(state, mode, opts = {}) {
  const prev = state.mode;
  state.mode = mode;
  if (opts.newSegment) newSegment(state);
  if (mode === AGENT_MODE.HA_ASK || mode === AGENT_MODE.HA_TALK || mode === AGENT_MODE.HA_BIZ) {
    const lockMs = opts.lockMs != null ? opts.lockMs : HA_STICKY_MS;
    state.haLockedUntil = Date.now() + lockMs;
  }
  if (mode === AGENT_MODE.IDLE_LISTEN || mode === AGENT_MODE.HH) {
    state.haLockedUntil = 0;
  }
  if (prev === AGENT_MODE.HA_BIZ && mode !== AGENT_MODE.HA_BIZ) {
    state.bizFollowUps = 0;
  }
  return { prev, mode };
}

function bumpObjectionLevel(state, text) {
  const t = normalizeDazhiAliases(text);
  let lvl = state.objectionLevel || 1;
  if (/(崩溃|加负担|预算|不愿意|为了啥|你自己信|说得通|身兼数职|忙不过来)/.test(t)) {
    lvl = Math.min(5, lvl + 1);
  }
  state.objectionLevel = lvl;
  return lvl;
}

module.exports = {
  isSilentMode,
  isConsultMode,
  createAgentState,
  createMeetingSession,
  ensureMeetingOpen,
  deriveMeetingLife,
  setLifecycle,
  newSegment,
  setMode,
  bumpObjectionLevel
};
