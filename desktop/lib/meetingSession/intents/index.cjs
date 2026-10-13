/**
 * 会议会话 — 意图谓词（招生/回忆/闲聊/偏题等）
 */
const { isQuestionForm, TOPIC_HINT_RE, LOGISTICS_RE, normText } = require("../../duplex");
const { AGENT_MODE, DAZHI_RE, OFF_TOPIC_RE } = require("../constants.cjs");
const { normalizeDazhiAliases } = require("../commands/normalize.cjs");
const { detectAgentCommand } = require("../commands/detectCommand.cjs");

function isPolicyLikeQuestion(text) {
  const t = normalizeDazhiAliases(text);
  return (
    /(3900|三万九|50%|百分之五十|保底|分成|定价|加收|非教|四端|一园两制|样板班|参观|项目多少钱)/.test(
      t
    ) && isQuestionForm(t)
  );
}

function classifyHaIntent(lastFloor, currentHa) {
  const cmd = detectAgentCommand(lastFloor);
  if (cmd.talkMode || cmd.command === "WAKE_TALK") return "HA_TALK";
  if (cmd.askMode || cmd.command === "WAKE_ASK") return "HA_ASK";
  if (/(抵触|为难|为了啥|崩溃|不想干|两难|身兼数职|加负担)/.test(cmd.text)) return "HA_TALK";
  if (currentHa === AGENT_MODE.HA_TALK && !/标准答案|标准口径|准确数字/.test(cmd.text)) {
    if (isPolicyLikeQuestion(cmd.text)) return "HA_ASK";
    return "HA_TALK";
  }
  if (isPolicyLikeQuestion(cmd.text)) return "HA_ASK";
  if (isQuestionForm(cmd.text)) return "HA_ASK";
  return currentHa === AGENT_MODE.HA_TALK ? "HA_TALK" : "HA_ASK";
}

function shouldSteerOffTopic(lastFloor, agenda) {
  const t = normalizeDazhiAliases(lastFloor);
  if (!t || t.length < 6) return { steer: false, reason: "", weak: false };
  if (LOGISTICS_RE.test(t) && !TOPIC_HINT_RE.test(t)) {
    return { steer: false, reason: "logistics", weak: false };
  }
  if (OFF_TOPIC_RE.test(t) && !TOPIC_HINT_RE.test(t)) {
    return { steer: true, reason: "off-topic-dict", weak: false };
  }
  const agendaHit = agenda && normText(t).includes(normText(agenda).slice(0, 4));
  if (t.length >= 16 && !TOPIC_HINT_RE.test(t) && !agendaHit && !DAZHI_RE.test(t)) {
    return { steer: false, reason: "weak-no-topic", weak: true };
  }
  return { steer: false, reason: "on-topic", weak: false };
}

function isLocalVisitIntent(text) {
  const t = normalizeDazhiAliases(text);
  return /(参观|示范园|落地园|附近.*(园|所)|盐城|连云港|江苏.*(园|参观)|有没有.*(园|所).*参观)/.test(
    t
  );
}

function isWhyInvestIntent(text) {
  const t = normalizeDazhiAliases(text);
  return /(为了啥|图什么|我掏钱|没有营收|我交了钱|投入.*回报|我为了什么|值得吗|值不值|划算吗|值不值得|投入.{0,12}(值得|划算)|三万九.{0,12}(值得|划算)|3900\d?.{0,12}(值得|划算)|3\s*万\s*9.{0,12}(值得|划算))/.test(
    t
  );
}

/**
 * 加入/引进后「对招生有没有帮助」——价值确认，非破局操作题。
 * @param {string} text
 */
function isEnrollmentBenefitAsk(text) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t || !/(招生|生源)/.test(t)) return false;
  if (/(怎么破|怎么招|招不到|破局|起死回生|收费高|样板班怎么)/.test(t)) return false;
  if (/(有帮助|有没有用|有用吗|帮助吗|能帮|能不能帮|有没有帮助|对招生有|帮(助)?招生吗|多大帮助)/.test(t)) {
    return true;
  }
  return (
    /(加入|引进|上了|用了).{0,16}(全园美语|美语系统|这个项目)/.test(t) &&
    /招生/.test(t) &&
    /(吗|呢|\?|？)/.test(t) &&
    t.length <= 56
  );
}

/**
 * 回顾上一实质问：刚才问了什么 / 我们问了你什么。
 * @param {string} text
 */
function isRecallLastAsk(text) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t) return false;
  if (/^(大智[，,\s]*)?(什么问题|问的什么|上一问)[？?。.!！]?$/.test(t)) return true;
  return /(刚刚|刚才|上[一1]个?).{0,10}(问了|问的|什么问题)|问了(你|大智)?什么|我(们)?问的是什么|还记不记得.{0,16}问|上一问是什么|刚才什么问题|问的什么问题|他也不知道|问的什么(问题)?/.test(
    t
  );
}

/**
 * 元问题：记录看不看得到 / 有没有对话记忆。
 * @param {string} text
 */
function isSessionMemoryMeta(text) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t) return false;
  return /(记录.{0,8}(看|有)|看不到记录|有没有记录|对话记录|里面有没有|里面是没有|没有这个问题|失忆|记不住)/.test(
    t
  );
}

/**
 * 闲聊/工程吐槽：禁止进经营粘滞与慢 LLM。
 * @param {string} text
 */
function isCasualChitchat(text) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t) return false;
  const bare = t.replace(/\s/g, "");
  if (/^(大智)?(我)?(好累|累了|累死了|没事了|哈哈|呵呵|嗯嗯)[。.!！？?]*$/.test(bare)) return true;
  return /(虚拟声卡|腾讯会议接到|朱医生|回不到你|这块还要优化|流程能正常走|回复质量)/.test(t);
}

/**
 * stickyBiz 续问：须仍是经营实体/步骤，且非口令/闲聊/元问题。
 * @param {string} text
 */
function isBizStickyFollowUp(text) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t || t.length < 4) return false;
  if (isCasualChitchat(t) || isRecallLastAsk(t) || isSessionMemoryMeta(t)) return false;
  if (/谢谢大智|停止大智|听我说|请继续|总结一下/.test(t)) return false;
  return /(还有|其他方案|别的|下一步|怎么走|具体|再细|第一步|样板|招生|落地|签约|准备|收费|非教|老师|抵触|倒闭|经营|增量|续费)/.test(
    t
  );
}

/**
 * 投诉/纠错/辱骂：不走经营启发式样板班。
 * @returns {"retry"|"insult"|null}
 */
function detectUserTone(text) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t) return null;
  if (/(弱智|傻[逼比]|白痴|智障|脑子有病|有病吧|滚吧|去死)/.test(t)) return "insult";
  if (
    /(答非所问|说错了|你说错|说的不对|不对吧|重说|重新答|没听懂|牛头不对马嘴|问的不是这个|你听懂没有)/.test(
      t
    )
  ) {
    return "retry";
  }
  return null;
}

function isTrustChallenge(text) {
  const t = normalizeDazhiAliases(text);
  return /(你自己信吗|说得通吗|能跟老师讲吗|你相信吗|信服吗)/.test(t);
}

module.exports = {
  isPolicyLikeQuestion,
  classifyHaIntent,
  shouldSteerOffTopic,
  isLocalVisitIntent,
  isWhyInvestIntent,
  isEnrollmentBenefitAsk,
  isRecallLastAsk,
  isSessionMemoryMeta,
  isCasualChitchat,
  isBizStickyFollowUp,
  detectUserTone,
  isTrustChallenge
};
