/** meetingStrategy/advisors — 经营顾问 */
const { diagnose } = require("./diagnose.cjs");
const {
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
} = require("./heuristics.cjs");
const { isDefinitionSpeak } = require("./speakGuards.cjs");
const { buildFastLead, pickWikiForIntent, ragSpeakFallback } = require("./lead.cjs");
const { runBusinessAdvisor } = require("./run.cjs");

module.exports = {
  diagnose,
  heuristicPlan,
  alternateHeuristic,
  ragSpeakFallback,
  pickWikiForIntent,
  buildFastLead,
  isOperateQuestion,
  isOperateBetterAsk,
  isProfitAsk,
  isRoiConfirmAsk,
  isLossFearAsk,
  isAlternatePathAsk,
  isHowCalcAsk,
  isParentReasonAsk,
  isDefinitionSpeak,
  OPERATE_BETTER_TTS,
  PROFIT_TTS,
  ROI_CONFIRM_TTS,
  HOW_CALC_TTS,
  PARENT_REASON_TTS,
  runBusinessAdvisor
};
