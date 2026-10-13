/** meetingStrategy/advisors — 经营顾问 */
const { diagnose } = require("./diagnose.cjs");
const {
  heuristicPlan,
  alternateHeuristic,
  sameAnswer,
  isOperateQuestion,
  isOperateBetterAsk,
  OPERATE_BETTER_TTS
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
  isDefinitionSpeak,
  OPERATE_BETTER_TTS,
  runBusinessAdvisor
};
