/**
 * 策略薄封装 → 主进程 lib（sync IPC）
 */
import { S } from "./state.js";

function sync(op, args) {
  try {
    return window.bridge?.policySync?.(op, args);
  } catch (_) {
    return null;
  }
}

export function displayCorrectAsr(text) {
  const v = sync("displayCorrectAsr", { text });
  return v != null ? v : String(text || "").trim();
}

export function looksLikeBargeInLocal(text) {
  return Boolean(sync("looksLikeBargeIn", { text }));
}

export function looksLikeHostEcho(text) {
  const sinceHostMs = S.lastWakeSpeakAt ? Date.now() - S.lastWakeSpeakAt : null;
  const v = sync("looksLikeHostEcho", {
    text,
    recentHostUtterances: S.recentHostUtterances,
    sinceHostMs
  });
  return v && typeof v === "object" ? v : { echo: false, score: 0, reason: "" };
}

export function shouldImmediatePatrol(text) {
  return Boolean(
    sync("shouldImmediatePatrol", {
      text,
      mode: S.interactionModeUi,
      duplexPhase: S.duplexPhase,
      recentHostUtterances: S.recentHostUtterances,
      lastWakeSpeakAt: S.lastWakeSpeakAt
    })
  );
}

export function estimateHoldMsLocal(text, chunks) {
  const v = sync("estimateHoldMs", { text, chunks });
  if (typeof v === "number" && v > 0) return v;
  const c = Number(chunks) || 0;
  if (c > 0) return Math.min(20000, Math.max(1500, Math.round(c * 400 + 600)));
  const len = String(text || "").length;
  return Math.min(12000, Math.max(2200, Math.round(len * 120) + 800));
}

export function rememberHostUtterance(text) {
  const t = String(text || "")
    .trim()
    .replace(/（合成中…）$/, "")
    .replace(/（合成失败）$/, "")
    .replace(/（未播报：通道未就绪）$/, "");
  if (!t || t.length < 6) return;
  S.recentHostUtterances.unshift(t);
  if (S.recentHostUtterances.length > 6) S.recentHostUtterances.length = 6;
}

/** 由 ui 注入，避免 policy ↔ ui 静态环依赖 */
let _onHoldChanged = null;
export function setHoldChangeHandler(fn) {
  _onHoldChanged = fn;
}

export function applyHoldUntil(until, why) {
  const u = Number(until) || 0;
  const prev = S.hostSpeakingUntil;
  if (u > S.hostSpeakingUntil) S.hostSpeakingUntil = u;
  if (u > S.holdUntil) S.holdUntil = u;
  if (typeof _onHoldChanged === "function") {
    _onHoldChanged({ why, prev, until: u });
  }
}

export function extendHostMute(ms, why) {
  applyHoldUntil(Date.now() + Math.max(0, ms || 0), why);
}
