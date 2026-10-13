/**
 * 问句改写 + 闭题/复杂题分流（步骤1）
 * 复杂问禁止 FAQ 直出；闭题且强匹配才秒答；闭题禁止进经营顾问。
 */
/**
 * meetingStrategy/query — 问句改写与闭题/复杂/经营分流
 */
const { normalizeForMatch, isQuestionForm } = require("../../duplex");
const {
  normalizeDazhiAliases,
  isEnrollmentBenefitAsk,
  isCasualChitchat,
  isBizStickyFollowUp,
  peelWakePayload
} = require("../../meetingSession");

const COMPLEX_RE =
  /(如何|怎么|怎样|还有|其他方案|别的办法|第一步|0\s*[~到+\-－—]\s*1|0\s*\+\s*1|起死回生|破局|倒闭|重生|实施|落地|开展|推进|铺开|签约|准备|哪些准备|我手上有|我有\s*\d+|怎么办|怎么走|步骤)/;

/** 闭题标记：只认问法，不认裸实体名（避免「加入全园美语…落地准备」被当成定义） */
const CLOSED_FAQ_RE =
  /(是什么|什么是|是谁|谁是|你是谁|你是什么|多少钱|多少元|什么意思|有哪些|权益|八大|在吗|听得到吗|会议主题是什么|今天开什么会|这次会议的主题|三笔账是什么|一园两制是什么|四端联动是什么|四端是什么|收益保障|有没有收益保障|收益保障如何|有没有保障|值得吗|值不值|划算吗|值不值得|我掏钱为了啥|交了钱没营收|怎么收费|收费多少|要收多少|出多少钱|怎么收钱|项目多少钱)/;

/** 开放落地/准备：即使句中有「全园美语」也不当闭题（定价问走闭题，勿放「怎么收费」） */
const OPEN_OPERATE_RE =
  /(落地|签约|准备|实施|开展|行事历|第一步|如何用|怎样用|经营得更好|哪些准备|从签约)/;

/** 半截残句：禁止进 LLM（日志「一是」「美语是。」拖 15–25s） */
const RESIDUAL_BARE_RE =
  /^(一是|二是|三是|然后|那个|这个|就是|还有|如|如果|所|所以|那|嗯|啊|哦|喂)[。．.!！]?$/;

const ENTITY_RE =
  /四端联动|四端|全园美语|全员美语|全美语系统|一园两制|三笔账|AI测评|八大核心权益|八大权益|家庭端|教师端|学生端|运营端|菲教|非教|ABCmouse|Teacher说|Family说|项目|收益保障/;

const BIZ_RE =
  /(招生|倒闭|起死回生|破局|经营|收费|样板班|0\s*[~到+\-－—]\s*1|0\s*\+\s*1|实施|落地|开展|签约|准备|园所|重生|增量|非教|延时|续费|公办|培育老师|养老师|培训老师|我有\s*\d+\s*园|\d+\s*家园|\d+\s*个园)/;

const FOLLOW_UP_RE = /(还有|其他|别的|那|然后|下一步|第一步|怎么走|具体|再细)/;

/** L3 Deep Thinking 触发 */
const DEEP_RE =
  /(起死回生|倒闭|破局|重生|深入分析|深度思考|深度分析|还有更好|还有其他方案|别的办法|对比分析|多路径)/;

/** 上一答在让用户选题（「想先听哪一块」） */
const CHOICE_INVITE_RE = /想先听|先听哪|听哪一块|哪一块|先说哪|选哪|听哪一/;

/**
 * 从上一口播里抽出候选项。例：「四端联动、校园经营与家园共育。想先听哪一块？」
 * @param {string} hostText
 * @returns {string[]}
 */
function extractOfferedChoices(hostText) {
  const h = String(hostText || "").trim();
  if (!h || !CHOICE_INVITE_RE.test(h)) return [];
  let chunk = "";
  const colon = h.match(/[：:]([^。！？?\n]{4,80})/);
  if (colon) chunk = colon[1];
  else {
    const idx = h.search(CHOICE_INVITE_RE);
    if (idx > 4) chunk = h.slice(Math.max(0, idx - 48), idx);
  }
  chunk = chunk.replace(/与/g, "、");
  const parts = chunk
    .split(/[、，,/／]/)
    .map((s) =>
      String(s || "")
        .replace(/^(今天主题是|本场围绕|全园美语系统教研)/, "")
        .replace(/[的呢啊哦呀\s]/g, "")
        .trim()
    )
    .filter((s) => s.length >= 2 && s.length <= 12)
    .filter((s) => !/系统教研|今天主题|想先听|哪一块/.test(s));
  return [...new Set(parts)];
}

/**
 * 会场短句是否在选上一答给出的选项。命中则改写成可秒答问句。
 * @param {string} floor
 * @param {string} lastHostAnswer
 * @returns {{ choice: string, rewritten: string } | null}
 */
function matchOfferedChoice(floor, lastHostAnswer) {
  const raw = normalizeDazhiAliases(String(floor || "").trim());
  const bare = raw.replace(/[，,。．.!！？?\s]/g, "");
  if (!bare || bare.length < 2 || bare.length > 14) return null;
  if (/(大智|谢谢|会议开始|会议结束|听我说|我说完了)/.test(bare)) return null;
  const choices = extractOfferedChoices(lastHostAnswer);
  if (!choices.length) return null;
  for (const c of choices) {
    const cb = String(c || "").replace(/\s+/g, "");
    if (!cb) continue;
    if (bare === cb || bare.includes(cb) || cb.includes(bare)) {
      let rewritten = `${cb}是什么`;
      if (/家园共育|家庭端|Family说/.test(cb)) rewritten = "家园共育怎么做";
      else if (/校园经营|园所经营|经营/.test(cb)) rewritten = "校园经营怎么做";
      else if (/四端/.test(cb)) rewritten = "四端联动是什么";
      return { choice: cb, rewritten };
    }
  }
  return null;
}

/**
 * 从回灌粘连句里抠出闭题核心
 * 「…招生引擎。四端联动是什么？」→「四端联动是什么？」
 * 「…招生引擎。什么是四端联动」→「什么是四端联动」
 * @param {string} text
 */
function peelClosedFaqCore(text) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t) return null;
  const mEntityFirst = t.match(
    new RegExp(
      `((?:${ENTITY_RE.source})[^。；;！!？?\\n]{0,24}(?:是什么|什么是|是谁|谁是|多少钱|多少元|什么意思|有哪些)[？?]?\\s*)$`,
      "i"
    )
  );
  if (mEntityFirst) return mEntityFirst[1].replace(/^[，,。.\s]+/, "").trim();
  const mWhatIs = t.match(
    new RegExp(
      `((?:什么是|谁是)\\s*(?:${ENTITY_RE.source})[^。；;！!？?\\n]{0,16}[？?]?\\s*)$`,
      "i"
    )
  );
  if (mWhatIs) return mWhatIs[1].replace(/^[，,。.\s]+/, "").trim();
  if (
    /(是什么|什么是|是谁|谁是|多少钱|多少元|什么意思)\s*[？?]?\s*$/.test(t) &&
    t.length > 36
  ) {
    const parts = t.split(/[。！？!?；;\n]/).map((p) => p.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && CLOSED_FAQ_RE.test(last) && last.length <= 40) return last;
  }
  return null;
}

/**
 * ASR 半截残句：不完整、不像问句，禁止调 Chat / 经营顾问。
 * @param {string} text
 */
function isResidualUtterance(text) {
  const raw = String(text || "").trim();
  if (!raw) return true;
  const t = normalizeDazhiAliases(raw);
  const bare = t.replace(/[，,。．.!！？?\s]/g, "");
  if (!bare) return true;
  if (RESIDUAL_BARE_RE.test(bare) || RESIDUAL_BARE_RE.test(t)) return true;
  // 「美语是。」「全园美语是」——缺「什么/谁/多少」
  if (
    bare.length <= 12 &&
    /是$/.test(bare) &&
    !/(什么|谁|多少|哪些|吗|呢|在吗)/.test(t)
  ) {
    return true;
  }
  // 过短且无问句形态、非口令
  if (
    bare.length <= 4 &&
    !isQuestionForm(t) &&
    !CLOSED_FAQ_RE.test(t) &&
    !/(大智|李老师|总结|暂停|继续|要总结)/.test(t)
  ) {
    return true;
  }
  // 单字/双字碎片
  if (bare.length <= 2 && !/(大智|在吗)/.test(t)) return true;
  return false;
}

/**
 * 复杂经营/步骤/追问：禁止 FAQ 直出。
 * @param {string} text
 */
function isComplexQuestion(text) {
  // 闭题（含收益保障如何）不算复杂，允许 FAQ 秒答
  if (isClosedFaqQuestion(text)) return false;
  const peeled = peelClosedFaqCore(text);
  if (peeled && CLOSED_FAQ_RE.test(peeled) && !FOLLOW_UP_RE.test(peeled)) {
    return false;
  }
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t || t.length < 4) return false;
  // 「收益保障如何」只问口径，不是落地步骤
  if (/收益保障/.test(t) && !/(落地|实施|开展|步骤|招生|倒闭|起死回生)/.test(t)) {
    return false;
  }
  if (COMPLEX_RE.test(t)) return true;
  if (/\d+\s*(园|个园|家园)/.test(t) && /(如何|怎么|实施|落地|开展)/.test(t)) return true;
  if (FOLLOW_UP_RE.test(t) && isQuestionForm(t)) return true;
  return false;
}

/**
 * 闭题定义/价格/身份：允许 FAQ 秒答候选。
 * @param {string} text
 */
function isClosedFaqQuestion(text) {
  const peeled = peelClosedFaqCore(text);
  const t = normalizeDazhiAliases(peeled || String(text || "").trim());
  if (!t) return false;
  if (isResidualUtterance(t)) return false;
  // 落地/签约/准备等开放题：即使带「全园美语系统」也不进定义秒答
  if (OPEN_OPERATE_RE.test(t) && !/(是什么|什么是|什么意思)/.test(t)) {
    return false;
  }
  if (CLOSED_FAQ_RE.test(t)) return true;
  if (t.length <= 28 && /(是什么|什么是|是谁|谁是|什么意思|多少钱|多少元|在吗)/.test(t)) {
    return true;
  }
  // 「介绍全园美语」算定义；「加入全园美语…准备」已在上面排除
  if (
    /(全园美语|全美语系统)/.test(t) &&
    /(是什么|什么是|介绍|帮我介绍)/.test(t) &&
    !OPEN_OPERATE_RE.test(t)
  ) {
    return true;
  }
  // 收益保障口径问（「如何」在此不算开放题）
  if (
    /收益保障/.test(t) &&
    t.length <= 36 &&
    /(如何|怎样|什么|有没有|有无|怎么算|怎么保)/.test(t) &&
    !/(落地|实施|开展|步骤|倒闭|招生引擎)/.test(t)
  ) {
    return true;
  }
  // 「投入三万九值得吗」：投产口径，走 FAQ，不进经营启发式半截口播
  if (
    /(值得吗|值不值|划算吗|值不值得)/.test(t) &&
    (/(三万九|39000|3900|3\s*万\s*9|投入|项目|掏钱)/.test(t) || t.length <= 24)
  ) {
    return true;
  }
  // 「怎么收费 / 收费多少」：定价口径，走 FAQ 三万九，禁止经营样板班
  if (
    /(怎么收费|收费多少|要收多少|出多少钱|怎么收钱|项目多少钱|多少钱|多少元)/.test(t) &&
    t.length <= 40 &&
    !/(落地|签约|行事历|招生引擎|起死回生)/.test(t)
  ) {
    return true;
  }
  // 「加入对招生有帮助吗」：价值确认，走 FAQ / 三笔账第三笔
  if (isEnrollmentBenefitAsk(t)) return true;
  return false;
}

/**
 * 经营顾问触发。闭题（含回灌粘连的「…是什么」）一律禁止。
 * @param {string} text
 */
function isBusinessIntent(text) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t) return false;
  if (isClosedFaqQuestion(t)) return false;
  if (isEnrollmentBenefitAsk(t)) return false;
  const peeled = peelClosedFaqCore(t);
  if (peeled && isClosedFaqQuestion(peeled)) return false;
  return BIZ_RE.test(t);
}

/**
 * 去掉回灌半句前缀（Host 尾句粘连）。
 * @param {string} text
 * @param {string} [lastHostAnswer]
 */
function stripEchoPrefix(text, lastHostAnswer) {
  let t = String(text || "").trim();
  if (!t) return "";
  const host = String(lastHostAnswer || "").replace(/\s+/g, "");
  if (host.length >= 12) {
    // 若问句前半与 Host 尾部重叠，裁掉重叠前缀
    const tn = t.replace(/\s+/g, "");
    for (let len = Math.min(40, Math.floor(host.length / 2)); len >= 8; len -= 2) {
      const tail = host.slice(-len);
      if (tn.startsWith(tail)) {
        t = t.replace(/\s+/g, "").slice(len);
        break;
      }
      // 模糊：问句开头像 Host 中间碎片
      const idx = tn.indexOf(tail);
      if (idx >= 0 && idx < 8 && tn.length - idx > 10) {
        const after = tn.slice(idx + len);
        if (/(还有|其他|怎么|如何|第一步|怎么办)/.test(after) || /[？?]/.test(text)) {
          t = after;
          break;
        }
      }
    }
  }
  // 常见回灌碎片开头
  t = t.replace(/^[，,。.\s]+/, "");
  t = t.replace(/^(面|看|对|用|再|把)[，,、]?\s*/, (m) =>
    /还有|其他|怎么|如何/.test(t.slice(m.length)) ? "" : m
  );
  return normalizeDazhiAliases(t).trim() || String(text || "").trim();
}

/**
 * 规则改写：清洗 + 多轮继承（不强制调 LLM，降低延迟）。
 * @param {{ lastFloor: string, recentFloors?: string[], lastHostAnswer?: string }} opts
 */
function rewriteQueryRuleBased(opts = {}) {
  const lastFloor = String(opts.lastFloor || "").trim();
  const recent = (opts.recentFloors || []).map((x) => String(x || "").trim()).filter(Boolean);
  const lastHost = String(opts.lastHostAnswer || "").trim();
  // 口令/闲聊：禁止「针对上一答…追问」污染
  const skipFollowGlue =
    opts.skipFollowGlue === true ||
    isCasualChitchat(lastFloor) ||
    /谢谢大智|停止大智|听我说|请继续/.test(lastFloor);
  let cleaned = stripEchoPrefix(lastFloor, lastHost);
  cleaned = normalizeDazhiAliases(cleaned);
  // 长粘连：优先用 peel 后的唤醒正文
  if (opts.preferPeeled && opts.peeledPayload) {
    const peeled = normalizeDazhiAliases(String(opts.peeledPayload || "").trim());
    if (peeled.length >= 4) cleaned = peeled;
  } else if (cleaned.length > 60 && /大智/.test(cleaned)) {
    const peeled = peelWakePayload(cleaned);
    if (peeled.length >= 4 && peeled.length < cleaned.length) cleaned = peeled;
  }

  // 上一答「想先听哪一块」→ 用户只回选项名，直接改写成可秒答问句
  const choiceHit = matchOfferedChoice(cleaned, lastHost) || matchOfferedChoice(lastFloor, lastHost);
  if (choiceHit) {
    return {
      rewritten: choiceHit.rewritten.slice(0, 200),
      original: lastFloor,
      contextHint: choiceHit.choice,
      complex: false,
      closed: true,
      business: false,
      residual: false,
      followUp: true,
      choicePick: true,
      choice: choiceHit.choice
    };
  }

  // 闭题优先：从粘连句抠出「XXX是什么 / 什么是XXX」
  const closedCore = peelClosedFaqCore(cleaned) || peelClosedFaqCore(lastFloor);
  if (closedCore) cleaned = closedCore;
  if (cleaned.length > 80) {
    const parts = cleaned.split(/[。！？!?；;]/).map((p) => p.trim()).filter(Boolean);
    const last = parts[parts.length - 1] || cleaned.slice(-80);
    if (isQuestionForm(last) || CLOSED_FAQ_RE.test(last) || last.length >= 8) {
      cleaned = last;
    }
  }
  // 「是谁」按定义闭题处理，便于命中 FAQ
  cleaned = cleaned.replace(/是谁([？?]?)\s*$/, "是什么$1");

  const residual =
    isResidualUtterance(cleaned) ||
    isResidualUtterance(lastFloor) ||
    isCasualChitchat(cleaned);
  const closed = !residual && isClosedFaqQuestion(cleaned);
  const isFollow =
    !skipFollowGlue &&
    !closed &&
    !residual &&
    isBizStickyFollowUp(cleaned) &&
    (FOLLOW_UP_RE.test(cleaned) ||
      (isQuestionForm(cleaned) &&
        cleaned.length < 22 &&
        /(方案|步骤|怎么走|下一步|具体点)/.test(cleaned) &&
        !/(开展|实施|倒闭|重生|起死回生|是什么|多少钱|全园美语课程)/.test(cleaned)));

  let contextHint = "";
  if (isFollow) {
    const priorUser = [...recent]
      .reverse()
      .find(
        (l) =>
          l !== lastFloor &&
          (/(倒闭|重生|起死回生|招生|实施|开展|美语|经营)/.test(l) || l.length >= 16)
      );
    if (priorUser) {
      contextHint = priorUser.slice(0, 80);
      if (cleaned.length < 36 || /还有|其他方案|第一步|怎么走|0.?1/.test(cleaned)) {
        cleaned = `${contextHint}。追问：${cleaned}`;
      }
    } else if (lastHost && /(样板|招生|收费|非教|美语)/.test(lastHost)) {
      cleaned = `针对上一答「${lastHost.slice(0, 40)}」：${cleaned}`;
    }
  } else if (
    !skipFollowGlue &&
    !closed &&
    cleaned.length < 28 &&
    FOLLOW_UP_RE.test(lastFloor) &&
    isBizStickyFollowUp(cleaned) &&
    recent.length
  ) {
    const priorUser = [...recent].reverse().find((l) => l !== lastFloor && l.length >= 12);
    if (priorUser) {
      contextHint = priorUser.slice(0, 80);
      cleaned = `${contextHint}。追问：${cleaned}`;
    }
  }

  const complex =
    !closed && !residual && (isComplexQuestion(cleaned) || isComplexQuestion(lastFloor));
  const business =
    !closed &&
    !residual &&
    !isCasualChitchat(cleaned) &&
    (isBusinessIntent(cleaned) || isBusinessIntent(lastFloor));

  return {
    rewritten: cleaned.slice(0, 200),
    original: lastFloor,
    contextHint,
    complex,
    closed,
    business,
    residual,
    followUp: Boolean(isFollow),
    choicePick: false,
    choice: ""
  };
}

/**
 * 答法分层：L1 模板 / L2 RAG+LLM / L3 Deep Thinking
 * @param {string} text
 * @param {{ bizFollowUps?: number, forceDeep?: boolean }} [opts]
 * @returns {"L1"|"L2"|"L3"}
 */
function classifyAnswerTier(text, opts = {}) {
  const t = normalizeDazhiAliases(String(text || "").trim());
  if (!t) return "L2";
  if (isClosedFaqQuestion(t)) return "L1";
  if (opts.forceDeep) return "L3";
  if (DEEP_RE.test(t)) return "L3";
  if ((opts.bizFollowUps || 0) >= 2 && (isBusinessIntent(t) || isComplexQuestion(t))) {
    return "L3";
  }
  if (isBusinessIntent(t) || isComplexQuestion(t)) return "L2";
  return "L2";
}

/**
 * 是否允许 FAQ 直出口播。
 * @param {string} text 改写后问句
 * @param {{ answer?: string, title?: string, score?: number }|null} faqHit
 * @param {{ minScore?: number }} [opts]
 */
function shouldFaqInstant(text, faqHit, opts = {}) {
  const minScore = opts.minScore != null ? opts.minScore : 45;
  if (!faqHit?.answer) return false;
  const closed = isClosedFaqQuestion(text);
  // 复杂开放题禁止 FAQ；但闭题或「收益保障」高分命中例外
  if (!closed && isComplexQuestion(text)) {
    const qn = normalizeForMatch(text).replace(/\s+/g, "");
    const tn = normalizeForMatch(faqHit.title || "").replace(/\s+/g, "");
    const topicOk =
      (/收益保障/.test(qn) && /收益保障/.test(tn)) ||
      (/三笔账/.test(qn) && /三笔账/.test(tn)) ||
      (/一园两制/.test(qn) && /一园两制/.test(tn));
    if (!topicOk || (faqHit.score || 0) < Math.max(40, minScore)) return false;
  } else {
    if (!closed && isBusinessIntent(text)) return false;
    if (!closed && (faqHit.score || 0) < minScore + 10) return false;
    if ((faqHit.score || 0) < minScore) return false;
  }

  const qn = normalizeForMatch(text).replace(/\s+/g, "");
  const tn = normalizeForMatch(faqHit.title || "").replace(/\s+/g, "");
  const priceAsk = /三万九|39000|买的是什么|项目多少钱/.test(qn);
  const presenceFaq = /在吗|有没有在听/.test(tn);
  if (priceAsk && presenceFaq) return false;
  if (qn.length >= 4 && tn.length >= 4) {
    const slice = Math.min(10, qn.length);
    if (tn.includes(qn.slice(0, slice)) || qn.includes(tn.replace(/^Q:/, "").slice(0, 10))) {
      return true;
    }
    // 实体重叠（收益保障等）
    for (const e of ["收益保障", "三笔账", "一园两制", "四端联动", "全园美语", "三万九", "39000", "3900"]) {
      if (qn.includes(e) && tn.includes(e)) return true;
    }
  }
  return closed && (faqHit.score || 0) >= Math.max(22, minScore - 10);
}

module.exports = {
  isComplexQuestion,
  isClosedFaqQuestion,
  isBusinessIntent,
  isResidualUtterance,
  classifyAnswerTier,
  peelClosedFaqCore,
  stripEchoPrefix,
  extractOfferedChoices,
  matchOfferedChoice,
  rewriteQueryRuleBased,
  shouldFaqInstant,
  COMPLEX_RE,
  CLOSED_FAQ_RE,
  OPEN_OPERATE_RE,
  BIZ_RE,
  DEEP_RE,
  CHOICE_INVITE_RE
};
