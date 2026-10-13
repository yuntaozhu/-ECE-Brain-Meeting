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

/**
 * 是否应进入「自由对话」回复（参会者直接聊，不要求叫名）。
 * 会务闲聊 / 语气词不接；问句与主题相关发言要接。
 * @param {string} text
 */
function shouldChatReply(text) {
  const last = normalizeForMatch(String(text || "").trim());
  if (!last || last.length < 2) return false;
  if (/谢谢大智|谢谢李老师|停止大智/.test(last)) return false;
  if (isIntroSelfTalk(last)) return false;
  if (/^(喂+|好+|嗯+|啊+|哦+|行+|对+|是+|没+|不是)[。.!！？]?$/i.test(last)) return false;

  const logisticsOnly = LOGISTICS_RE.test(last) && !TOPIC_HINT_RE.test(last);

  if (/大智|大致|李老师|你觉得|你怎么看|帮(我|忙)|请问/.test(last)) return true;
  if (isQuestionForm(last) && /大智|大致|李老师/.test(last)) {
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
  if (/大智|大致|李老师|总结|暂停记录|继续记录|要总结|听我说完|我说完了/.test(last)) {
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

  const thanks = /谢谢李老师/.test(t);
  const summary = /李老师\s*(总结|小结|归纳)/.test(t);
  const presenceCheck =
    !thanks &&
    /(李老师在吗|有人(在)?听吗|AI\s*没响应|听得到吗|李老师[，,]\s*你在吗)/.test(last || t);

  const wakeNamed =
    /李老师/.test(t) &&
    !thanks &&
    (/李老师[，,：:\s]*(你|您|请|帮|讲|说|介绍|回答|怎么|什么|为何|为什么|能否|可以)/.test(t) ||
      /(叫|请问|问一下|听听|请教).{0,8}李老师|李老师.{0,8}(叫|请问|问一下)/.test(t) ||
      /李老师[？?]/.test(t) ||
      summary ||
      /李老师.{0,16}(吗|呢|吧|啊)/.test(t) ||
      /(?:^|[。！？\n])\s*李老师\s*[。！？]?$/.test(last) ||
      presenceCheck);

  const openQuestion =
    !thanks &&
    /(今天(的)?会议主题是什么|会议主题是什么|今天主题是什么|本次会议主题是什么|全[园员]美语是什么|什么是全[园员]美语|全[园员]美语是什么项目|今天开什么会)/.test(
      last || t
    );

  const askTheme = /李老师/.test(t) && /(主题是什么|议程是什么)/.test(t);
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
  const a = agenda || "全园美语系统教研会：四端联动、校园经营与家园共育";
  return `今天主题是：${a}。想先听哪一块？`;
}

module.exports = {
  shouldChatReply,
  shouldImmediatePatrol,
  detectWake,
  themeShortAnswer
};
