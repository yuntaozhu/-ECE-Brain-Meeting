/**
 * Wave R7：问答应受众/议题帧一致（规则来自 schema/query-frame.json，无业务字面量进调用方）。
 */
const { load, rx } = require("../knowledge/schemaStore.cjs");

const AUDIENCES = Object.freeze({
  CHILD: "child",
  CAMPUS: "campus",
  ROLLOUT: "rollout",
  TEACHER: "teacher",
  NONE: ""
});

function fr(name) {
  try {
    return rx("frame", name);
  } catch (_) {
    return /$a/;
  }
}

/**
 * @param {string} text
 * @returns {{ audience: string, facet: string }}
 */
function extractAskFrame(text) {
  const t = String(text || "").trim();
  if (!t) return { audience: AUDIENCES.NONE, facet: "" };
  if (fr("askChild").test(t)) return { audience: AUDIENCES.CHILD, facet: "benefit" };
  if (fr("askCampusBenefit").test(t)) return { audience: AUDIENCES.CAMPUS, facet: "enrollment" };
  if (fr("askRollout").test(t)) return { audience: AUDIENCES.ROLLOUT, facet: "rollout" };
  if (fr("askTeacher").test(t)) return { audience: AUDIENCES.TEACHER, facet: "teacher" };
  return { audience: AUDIENCES.NONE, facet: "" };
}

/**
 * @param {string} title
 * @param {string} [speak]
 * @returns {{ audience: string, facet: string }}
 */
function extractCardFrame(title, speak) {
  const blob = `${String(title || "")} ${String(speak || "")}`.trim();
  if (!blob) return { audience: AUDIENCES.NONE, facet: "" };
  if (fr("cardChild").test(blob)) return { audience: AUDIENCES.CHILD, facet: "benefit" };
  if (fr("cardEnrollment").test(blob)) return { audience: AUDIENCES.CAMPUS, facet: "enrollment" };
  if (fr("cardRollout").test(blob)) return { audience: AUDIENCES.ROLLOUT, facet: "rollout" };
  if (fr("cardTeacher").test(blob)) return { audience: AUDIENCES.TEACHER, facet: "teacher" };
  return { audience: AUDIENCES.NONE, facet: "" };
}

/**
 * 问句有明确受众时，卡必须同受众；卡无帧则放行（避免误杀旧卡）。
 * @param {string} askText
 * @param {string} [cardTitle]
 * @param {string} [cardSpeak]
 * @returns {{ ok: boolean, why: string, ask: object, card: object }}
 */
function evaluateFrameMatch(askText, cardTitle, cardSpeak) {
  const ask = extractAskFrame(askText);
  const card = extractCardFrame(cardTitle, cardSpeak);
  if (!ask.audience) {
    return { ok: true, why: "", ask, card };
  }
  if (!card.audience) {
    return { ok: true, why: "card_unframed", ask, card };
  }
  if (ask.audience !== card.audience) {
    return {
      ok: false,
      why: `audience_mismatch:${ask.audience}->${card.audience}`,
      ask,
      card
    };
  }
  return { ok: true, why: "", ask, card };
}

function frameCfg() {
  const lim = (load().frame && load().frame.limits) || {};
  return {
    correctWindowMs: Number(lim.correctWindowMs) || 180000,
    banCardTtlMs: Number(lim.banCardTtlMs) || 120000
  };
}

/**
 * 卡标题是否命中本轮禁卡（纠偏后禁止同卡粘滞）。
 * @param {object|null|undefined} state
 * @param {string} cardTitle
 */
function isBannedCard(state, cardTitle) {
  if (!state || !cardTitle) return false;
  const ban = String(state.banCardTitle || "").trim();
  if (!ban) return false;
  const until = Number(state.banCardUntil || 0);
  if (until && Date.now() > until) return false;
  const title = String(cardTitle || "");
  return title.includes(ban.slice(0, Math.min(24, ban.length))) || ban.includes(title.slice(0, 24));
}

/**
 * @param {object|null|undefined} state
 * @param {string} cardTitle
 */
function banCard(state, cardTitle) {
  if (!state) return;
  const t = String(cardTitle || "").trim();
  if (!t) return;
  const cfg = frameCfg();
  state.banCardTitle = t.slice(0, 120);
  state.banCardUntil = Date.now() + cfg.banCardTtlMs;
  state.correctingUntil = Date.now() + cfg.correctWindowMs;
}

function inCorrectingWindow(state) {
  if (!state) return false;
  return Date.now() < Number(state.correctingUntil || 0);
}

module.exports = {
  AUDIENCES,
  extractAskFrame,
  extractCardFrame,
  evaluateFrameMatch,
  evaluateFrameOk: evaluateFrameMatch,
  isBannedCard,
  banCard,
  inCorrectingWindow,
  frameCfg
};
