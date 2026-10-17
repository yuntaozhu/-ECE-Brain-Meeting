/**
 * 半双工 — 巡检/唤醒启发式（麦控侧；业务口令见 meetingSession）
 */
const {
  TOPIC_HINT_RE,
  LOGISTICS_RE,
  normalizeForMatch,
  extractFloorLines,
  isIntroSelfTalk,
  isQuestionForm
} = require("./textNorm.cjs");
const { rx } = require("../knowledge/schemaStore.cjs");

function op(name, flags) {
  return rx("operators", name, flags);
}

/**
 * 是否应进入「自由对话」回复（参会者直接聊，不要求叫名）。
 * 会务闲聊 / 语气词不接；问句与主题相关发言要接。
 * @param {string} text
 */
function shouldChatReply(text) {
  const last = normalizeForMatch(String(text || "").trim());
  if (!last || last.length < 2) return false;
  if (op("chatStop").test(last)) return false;
  if (isIntroSelfTalk(last)) return false;
  if (op("chatFiller", "i").test(last)) return false;

  const logisticsOnly = LOGISTICS_RE.test(last) && !TOPIC_HINT_RE.test(last);

  if (op("chatAddress").test(last)) return true;
  if (isQuestionForm(last) && op("chatNamed").test(last)) {
    if (logisticsOnly && last.length < 16) return false;
    return true;
  }
  return false;
}

/**
 * 单句是否立刻巡检。v2 默认旁听，口令/点名才立刻巡检。
 * @param {string} text
 */
function shouldImmediatePatrol(text) {
  const last = normalizeForMatch(String(text || "").trim());
  if (op("patrolImmediate").test(last)) {
    return true;
  }
  return shouldChatReply(text);
}

/**
 * 唤醒/对话意图检测：只看最近会场句。
 * chatReply=true 表示应按 Chat 主播接话（不要求叫「李老师」）。
 * @param {string} transcript
 */
function detectWake(transcript) {
  const floorArr = extractFloorLines(transcript, 3).map((l) => normalizeForMatch(l));
  const t = floorArr.join("\n");
  const last = floorArr[floorArr.length - 1] || "";

  if (isIntroSelfTalk(t) || isIntroSelfTalk(last)) {
    return {
      wake: false,
      thanks: false,
      summary: false,
      openQuestion: false,
      directQuestion: false,
      presenceCheck: false,
      chatReply: false,
      echoSkipped: true,
      floorText: t,
      lastFloor: last
    };
  }

  const thanks = op("thanksTeacher").test(t);
  const summary = op("summaryTeacher").test(t);
  const presenceCheck = !thanks && op("presenceCheck").test(last || t);

  const wakeNamed =
    op("teacherName").test(t) &&
    !thanks &&
    (op("wakeTeacherCue").test(t) ||
      op("wakeTeacherCall").test(t) ||
      op("wakeTeacherQ").test(t) ||
      summary ||
      op("wakeTeacherParticle").test(t) ||
      op("wakeTeacherBare").test(last) ||
      presenceCheck);

  const openQuestion = !thanks && op("openTheme").test(last || t);

  const askTheme = op("teacherName").test(t) && op("askThemeCue").test(t);
  const chatReply = !thanks && shouldChatReply(last);
  const directQuestion = chatReply && isQuestionForm(last);
  const wake = wakeNamed || askTheme || openQuestion || directQuestion || presenceCheck || chatReply;

  return {
    wake,
    thanks,
    summary,
    openQuestion,
    directQuestion,
    presenceCheck,
    chatReply,
    echoSkipped: false,
    floorText: t,
    lastFloor: last
  };
}

function themeShortAnswer(agenda) {
  const { load, speakFill } = require("../knowledge/schemaStore.cjs");
  const a = agenda || load().faq.defaultAgenda;
  return speakFill("themeShort", { agenda: a });
}

module.exports = {
  shouldChatReply,
  shouldImmediatePatrol,
  detectWake,
  themeShortAnswer
};
