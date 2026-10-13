/**
 * 半双工 — 文本归一、截断、楼层抽取、问句形态
 */

/** 与议程/知识库相关（辅助，非开口唯一条件） */
const TOPIC_HINT_RE =
  /美语|美蚁|梅雨|全[园员]|四端|家园|共育|招生|3900|三千九|教研|英语|经营|课程|教师|家长|一园两制|一元两制|一圆两制|自然拼读|绘本|TPR|启蒙|园所|试点|落地|主题|议程|元是什么|成功|做成|两制|菲教|非教|Teacher|Family|ABCmouse/;
/** 纯会务闲聊，不抢答 */
const LOGISTICS_RE =
  /几点|三点|3\s*点|办公室|会议室|下午|挤出来|下次再|喂喂|好喂|行行|不好意思|电瓶|电平|扬声器|CABLE|cable/i;

const INTRO_BOILERPLATE_RE =
  /(我已就位|全程(在线)?收听|收听记录|随时叫[「「"']?李老师|随时呼叫[「「"']?李老师|随时叫我就|随时呼叫我就可以|需要我时叫李老师)/g;

function normText(s) {
  return String(s || "")
    .replace(/\s+/g, "")
    .replace(/[，。！？、；：""''「」（）()【】\[\]…·]/g, "");
}

/**
 * ASR 变体归一：金额、美语错听、一园两制错听等。
 * @param {string} s
 */
function normalizeForMatch(s) {
  let t = String(s || "");
  t = t.replace(/美蚁/g, "美语");
  t = t.replace(/梅雨/g, "美语");
  t = t.replace(/全美语系统/g, "全园美语系统");
  t = t.replace(/全员美语/g, "全园美语");
  t = t.replace(/全员美育/g, "全园美语");
  t = t.replace(/签约美语/g, "全园美语");
  t = t.replace(/田园美语/g, "全园美语");
  t = t.replace(/一元两制|一圆两制|一园两治/g, "一园两制");
  t = t.replace(/大致|大志|大制|达智/g, "大智");
  t = t.replace(/原所|我的原(?=要|所|园)/g, "园所");
  t = t.replace(/原要倒闭/g, "园要倒闭");
  t = t.replace(/全员美女|全园美女/g, "全园美语");
  t = t.replace(/公办员/g, "公办园");
  t = t.replace(/样板单/g, "样板班");
  t = t.replace(/盐云港/g, "盐城连云港");
  t = t.replace(/非叫/g, "非教");
  t = t.replace(/色显优势|特色显优势/g, "特色优势");
  t = t.replace(/家园共浴/g, "家园共育");
  t = t.replace(/离院后/g, "离园后");
  t = t.replace(/三千九百\s*元?/g, "3900元");
  t = t.replace(/30\s*[,，.．]\s*900/g, "39000");
  t = t.replace(/(?<!\d)30900(?!\d)/g, "39000");
  t = t.replace(/3\s*万\s*9(?!千)/g, "三万九");
  t = t.replace(/3\s*[,，]\s*900/g, "3900");
  t = t.replace(/3\s*900/g, "3900");
  t = t.replace(/评测/g, "测评");
  return t;
}

/**
 * 先开口用的短句：约 28 字，优先停在逗号或句号，播完大约 5 秒。
 * @param {string} text
 * @param {number} [max]
 */
function leadClause(text, max = 28) {
  const t = String(text || "")
    .replace(/^["「]|["」]$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "";
  if (t.length <= max) return t;
  const window = t.slice(0, max + 10);
  let cut = -1;
  for (const ch of ["。", "！", "？", "；", "，"]) {
    const i = window.indexOf(ch);
    if (i >= 8 && (cut < 0 || i < cut)) cut = i;
  }
  if (cut >= 8) {
    const keep = /[。！？]/.test(window[cut]);
    return window.slice(0, cut + (keep ? 1 : 0)).trim();
  }
  return window.slice(0, max).trim();
}

/**
 * 口播截断：160 字内优先停在句号，避免切在「用」这种半句上。
 * @param {string} text
 * @param {number} [max]
 */
function clipUtterance(text, max = 160) {
  let t = String(text || "")
    .replace(/^["「]|["」]$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t || t.length <= max) return t;
  const window = t.slice(0, max);
  let end = -1;
  for (const ch of ["。", "！", "？", "!", "?"]) {
    end = Math.max(end, window.lastIndexOf(ch));
  }
  if (end >= 8) return window.slice(0, end + 1).trim();
  for (const ch of ["；", ";", "，", ","]) {
    end = Math.max(end, window.lastIndexOf(ch));
  }
  if (end >= 8) return window.slice(0, end).trim();
  return window.trim();
}

function extractFloorLines(transcript, max = 2) {
  return String(transcript || "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => /^会场/.test(l))
    .map((l) => l.replace(/^会场(\(识别中\))?[：:]\s*/, ""))
    .filter(Boolean)
    .slice(-Math.max(1, max));
}

function questionFingerprint(text) {
  const t = normText(text).slice(0, 48);
  if (t.length < 4) return "";
  return t;
}

function stripIntroBoilerplate(text) {
  let t = String(text || "").trim();
  if (!t) return t;
  const parts = t.split(/(?<=[。！？])/);
  const kept = parts.filter((p) => {
    const n = normText(p);
    if (!n) return false;
    if (/我已就位|全程(在线)?收听|收听记录/.test(p) && /四端|美语|家园|园所/.test(p)) return false;
    if (/随时叫|随时呼叫/.test(p) && /李老师|叫我/.test(p)) return false;
    return true;
  });
  t = (kept.length ? kept.join("") : t).replace(INTRO_BOILERPLATE_RE, "").trim();
  t = t.replace(/^[，,。.\s]+/, "").replace(/[，,]\s*$/, "");
  return t;
}

function isIntroSelfTalk(text) {
  const t = normText(text);
  if (t.length < 10) return false;
  const hasListen =
    /全程(在线)?收听|我已就位|随时呼叫我|随时叫我就|收听记录|需要我时叫李老师/.test(t);
  const hasTheme = /四端联动|全园美语|全员美语|家园共育|家园公寓|园所经营|美语教育/.test(t);
  return hasListen && hasTheme;
}

function isQuestionForm(text) {
  const s = String(text || "").trim();
  if (!s) return false;
  if (/[？?]/.test(s)) return true;
  if (/(什么意思|是什么|怎么[样办]|为什么|为何|能不能|可不可以|是否|咋办|真的吗|真的能|行不行)/.test(s))
    return true;
  if (/(吗|呢|吧)\s*[。.!！]?$/.test(s) && s.length >= 4) return true;
  return false;
}

/**
 * 真追问：带疑问/求证，即使与 Host 部分重合也不当回灌。
 */
function isFollowUpNotEcho(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (isQuestionForm(t)) return true;
  if (/(真的|能不能|可不可以|怎么办|为啥|为何|是不是|有没有)/.test(t)) return true;
  return false;
}

module.exports = {
  TOPIC_HINT_RE,
  LOGISTICS_RE,
  normText,
  normalizeForMatch,
  leadClause,
  clipUtterance,
  extractFloorLines,
  questionFingerprint,
  stripIntroBoilerplate,
  isIntroSelfTalk,
  isQuestionForm,
  isFollowUpNotEcho
};
