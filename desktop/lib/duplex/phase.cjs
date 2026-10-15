/**
 * 半双工 — PHASE 状态机与时序窗
 */

const PHASE = {
  IDLE: "IDLE",
  SPEAKING: "SPEAKING",
  COOLDOWN: "COOLDOWN"
};

/** Host 播完后禁止唤起/冷场的冷却（ms）；Phase A 缩短以尽快恢复听写 */
const COOLDOWN_MS = 1500;
/** 冷场巡检静音阈值（ms） */
const SILENCE_PATROL_MS = 22000;
/** 开场后禁止 SILENCE 的保护期（不阻挡唤起/主题问答） */
const GREETING_SILENCE_GUARD_MS = 20000;
/** 同类唤起最短间隔 */
const WAKE_COOLDOWN_MS = 12000;
/** 同一问句指纹去重窗口 */
const QUESTION_DEDUP_MS = 60000;
/** Host 播完后，主题碎片/「好的+主题」视为回灌的窗口 */
const POST_HOST_ECHO_MS = 4500;

/**
 * 估算播报后回灌防护时长。
 * 有 chunks 时跟真实 TTS；开播前仅短预测，避免 19s 锁死上行。
 * @param {string} text
 * @param {{ chunks?: number }} [opts]
 */
function estimateHoldMs(text, opts = {}) {
  const chunks = Number(opts.chunks) || 0;
  if (chunks > 0) {
    // 上限 10s：避免长答把真问句/唤醒压死在回灌窗内
    return Math.min(10000, Math.max(1200, Math.round(chunks * 280 + 500)));
  }
  const len = String(text || "").length;
  return Math.min(8000, Math.max(1800, Math.round(len * 100) + 600));
}

/**
 * 是否允许 SILENCE 干预
 */
function canSilenceIntervene(opts = {}) {
  const now = Date.now();
  if (opts.phase && opts.phase !== PHASE.IDLE) return { ok: false, reason: "phase-" + opts.phase };
  if (opts.listenStartedAt && now - opts.listenStartedAt < GREETING_SILENCE_GUARD_MS) {
    return { ok: false, reason: "greeting-guard" };
  }
  if (opts.lastHostSpeakAt && now - opts.lastHostSpeakAt < WAKE_COOLDOWN_MS) {
    return { ok: false, reason: "post-speak-cooldown" };
  }
  if (opts.quietMs != null && opts.quietMs < SILENCE_PATROL_MS) {
    return { ok: false, reason: "quiet-too-short", quietMs: opts.quietMs };
  }
  return { ok: true, reason: "ok" };
}

module.exports = {
  PHASE,
  COOLDOWN_MS,
  SILENCE_PATROL_MS,
  GREETING_SILENCE_GUARD_MS,
  WAKE_COOLDOWN_MS,
  QUESTION_DEDUP_MS,
  POST_HOST_ECHO_MS,
  estimateHoldMs,
  canSilenceIntervene
};
