/**
 * 闭题 / 复杂题 / 经营意图 / 残句判定。
 */
const { isQuestionForm } = require("../../duplex");
const {
  normalizeDazhiAliases,
  isEnrollmentBenefitAsk
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
  /(招生|倒闭|起死回生|破局|经营|盈利|赚钱|营收|机构走向|收费|样板班|0\s*[~到+\-－—]\s*1|0\s*\+\s*1|实施|落地|开展|签约|准备|园所|重生|增量|非教|延时|续费|公办|培育老师|养老师|培训老师|亏损|亏本|回本|值得|投资|投入|三万九|39000|我有\s*\d+\s*园|\d+\s*家园|\d+\s*个园)/;
const FOLLOW_UP_RE =
  /(还有|其他|别的|那|然后|下一步|第一步|怎么走|具体|再细|再具体|更多|详细|展开|多说|说细|怎么算|怎么计算|如何计算|算出来|测算|这个方案|刚才|为什么|什么意思|理由)/;

/** L3 Deep Thinking 触发 */
const DEEP_RE =
  /(起死回生|倒闭|破局|重生|深入分析|深度思考|深度分析|还有更好|还有其他方案|别的办法|对比分析|多路径)/;

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
  // 指代型经营追问：勿当定义闭题（否则断 sticky，掉进议程重定向）
  if (
    /(怎么计算|如何计算|怎么算出来|如何算出来|测算依据|怎么测算|这个方案|针对上一答|选择.*理由|家长.*理由|理由是什么)/.test(
      t
    )
  ) {
    return false;
  }
  // 园长追问场景：有独立 FAQ，不当开放经营题，避免定义页或「对不上」兜底
  if (
    /(普惠|具备什么条件|什么条件|专业英语老师|专业的英语老师|培训班|少儿英语|区别与优势|区别和优势|教育局|赚钱吗|营收|如何收费|怎么收费|你们是如何收费|太贵|付不起|没信心|没有信心|哪些支持|给予哪些支持|具体要如何做|要开办|开办|说服家长|家长报名|不敢开口|开口.{0,12}认可|家长.{0,8}认可)/.test(
      t
    )
  ) {
    return true;
  }
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

module.exports = {
  COMPLEX_RE,
  CLOSED_FAQ_RE,
  OPEN_OPERATE_RE,
  RESIDUAL_BARE_RE,
  ENTITY_RE,
  BIZ_RE,
  DEEP_RE,
  FOLLOW_UP_RE,
  peelClosedFaqCore,
  isResidualUtterance,
  isComplexQuestion,
  isClosedFaqQuestion,
  isBusinessIntent
};
