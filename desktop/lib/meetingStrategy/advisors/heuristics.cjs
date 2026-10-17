/**
 * 启发式方案与经营题判定。
 * 意图句式读 intent-rules；阶段方案读 advisor-plans.json。
 */
const { normalizeDazhiAliases } = require("../../meetingSession");
const { load, scriptLine } = require("../../knowledge/schemaStore.cjs");
const { matchIntent } = require("../agent/intentMatch.cjs");

const PROFIT_TTS = scriptLine("profit_how");
const ROI_CONFIRM_TTS = scriptLine("roi_confirm");
const HOW_CALC_TTS = scriptLine("how_calc");
const PARENT_REASON_TTS = scriptLine("parent_reason");
const OPERATE_BETTER_TTS = scriptLine("operate");

function hitIntent(question, names) {
  const q = normalizeDazhiAliases(String(question || ""));
  if (!q) return false;
  const hit = matchIntent(q);
  return Boolean(hit && names.includes(hit.intent));
}

function isLossFearAsk(question) {
  return hitIntent(question, ["loss_fear"]);
}

function isRoiConfirmAsk(question) {
  return hitIntent(question, ["roi_confirm", "loss_fear"]);
}

function isAlternatePathAsk(question) {
  return hitIntent(question, ["alternate_path"]);
}

function isHowCalcAsk(question) {
  return hitIntent(question, ["how_calc"]);
}

function isParentReasonAsk(question) {
  return hitIntent(question, ["parent_reason"]);
}

function isProfitAsk(question) {
  return hitIntent(question, ["profit_how"]);
}

function planOf(key, vars) {
  const row = load().plans[key];
  if (!row) return { tts: "", steps: [], risks: [], cite: [] };
  let tts = row.tts || "";
  if (row.ttsScript) tts = scriptLine(row.ttsScript) || tts;
  if (row.ttsTpl) {
    tts = row.ttsTpl.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? String(vars[k]) : ""));
  }
  const steps = (row.stepsTpl || row.steps || []).map((s) =>
    String(s).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? String(vars[k]) : ""))
  );
  return {
    tts,
    steps,
    risks: row.risks || [],
    cite: row.cite || []
  };
}

function heuristicPlan(diag, question) {
  const q = String(question || "");
  const plans = load().plans;
  if (diag.stage === "roi-confirm" || isRoiConfirmAsk(q) || isLossFearAsk(q)) {
    return planOf("roi-confirm");
  }
  if (diag.stage === "how-calc" || isHowCalcAsk(q)) {
    return planOf("how-calc");
  }
  if (diag.stage === "show-value" || isParentReasonAsk(q)) {
    return planOf("show-value");
  }
  if (isAlternatePathAsk(q)) {
    return planOf("alternate_path");
  }
  if (diag.stage === "profit" || isProfitAsk(q)) {
    return planOf("profit");
  }
  const teacher = plans.teacher;
  if (
    (diag.stage === "teacher" || (teacher?.match && new RegExp(teacher.match).test(q))) &&
    !(teacher?.unless && new RegExp(teacher.unless).test(q))
  ) {
    return planOf("teacher");
  }
  const steps01 = plans["steps-0-1"];
  if (steps01?.match && new RegExp(steps01.match).test(q)) {
    return planOf("steps-0-1");
  }
  if (diag.multiGarden || diag.gardenCount) {
    const n = diag.gardenCount || plans["multi-garden"]?.defaultGardens || 20;
    return planOf("multi-garden", { n });
  }
  const rescue = plans.rescue;
  if (diag.stage === "rescue" || (rescue?.match && new RegExp(rescue.match).test(q))) {
    return planOf("rescue");
  }
  return planOf("explore");
}

function alternateHeuristic(diag, question, lastTts) {
  const last = String(lastTts || "").replace(/\s+/g, "");
  const tries = [];
  const alt = load().plans.alternateTries || {};
  if (isRoiConfirmAsk(question) || diag.stage === "roi-confirm") {
    tries.push(() => heuristicPlan({ ...diag, stage: "roi-confirm" }, question));
    for (const prefix of alt.roi || []) {
      tries.push(() => heuristicPlan({ ...diag, stage: "how-calc" }, `${prefix}${question}`));
    }
  } else if (isHowCalcAsk(question) || diag.stage === "how-calc") {
    tries.push(() => heuristicPlan({ ...diag, stage: "how-calc" }, question));
  } else if (isParentReasonAsk(question) || diag.stage === "show-value") {
    tries.push(() => heuristicPlan({ ...diag, stage: "show-value" }, question));
  } else {
    const explore = alt.explore || [];
    if (explore[0]) tries.push(() => heuristicPlan({ ...diag, stage: "explore" }, `${explore[0]}${question}`));
    if (explore[1]) tries.push(() => heuristicPlan({ ...diag, stage: "profit" }, `${explore[1]}${question}`));
    if (explore[2]) tries.push(() => heuristicPlan({ ...diag, stage: "show-value" }, `${explore[2]}${question}`));
    if (explore[3]) tries.push(() => heuristicPlan({ ...diag, stage: "teacher" }, `${explore[3]}${question}`));
    if (explore[4]) tries.push(() => heuristicPlan({ ...diag, stage: "rollout" }, `${explore[4]}${question}`));
  }
  tries.push(() => heuristicPlan({ ...diag, stage: "explore" }, question));
  for (const fn of tries) {
    const p = fn();
    const now = String(p.tts || "").replace(/\s+/g, "");
    if (now.length < 12) continue;
    if (now === last || (last.length >= 20 && last.includes(now.slice(0, 24)))) continue;
    return p;
  }
  const fallbackPrefix = (alt.explore || ["还有其他方案吗？"])[0];
  return heuristicPlan({ ...diag, stage: "explore" }, `${fallbackPrefix}${question}`);
}

function sameAnswer(a, b) {
  const x = String(a || "").replace(/\s+/g, "");
  const y = String(b || "").replace(/\s+/g, "");
  if (x.length < 20 || y.length < 20) return false;
  return x === y || x.includes(y.slice(0, 24)) || y.includes(x.slice(0, 24));
}

function isOperateQuestion(question) {
  const { isOperateQuestion: fromSchema } = require("../query/classify.cjs");
  return fromSchema(question);
}

function isOperateBetterAsk(question) {
  return hitIntent(question, ["operate"]);
}

module.exports = {
  heuristicPlan,
  alternateHeuristic,
  sameAnswer,
  isOperateQuestion,
  isOperateBetterAsk,
  isProfitAsk,
  isRoiConfirmAsk,
  isLossFearAsk,
  isAlternatePathAsk,
  isHowCalcAsk,
  isParentReasonAsk,
  OPERATE_BETTER_TTS,
  PROFIT_TTS,
  ROI_CONFIRM_TTS,
  HOW_CALC_TTS,
  PARENT_REASON_TTS
};
