/**
 * 检索闸门：召回和「能当答案」分开。
 * 分数量纲来自本仓库，不要照抄外部客服项目的 0.76：
 * - FAQ 关键词（corpus.retrieveKnowledge）强命中约 ≥45
 * - Wiki 关键词（queryWiki）强命中约 ≥5，语义检索里会被抬到 0.9 附近
 * - 纯向量余弦：中文无关句也常在 0.6 上下，作答线取 0.62，只用于没有 Wiki/FAQ 强命中时
 */
const { bestTitleView, buildDf } = require("../../knowledge/align.cjs");

const FAQ_KEYWORD_ANSWERABLE = 45;
const WIKI_KEYWORD_ANSWERABLE = 5;
const SEMANTIC_ANSWERABLE = 0.62;
const CLARIFY_CONFIDENCE = 0.5;

const GROUNDED_INTENTS = new Set([
  "loss_fear",
  "roi_confirm",
  "profit_how",
  "how_calc",
  "parent_reason",
  "alternate_path",
  "operate",
  "teacher",
  "rollout",
  "hq_support",
  "pricing_follow"
]);

function topScore(retrieval) {
  const hits = retrieval?.hits || [];
  if (!hits.length) return 0;
  return Number(hits[0].score) || 0;
}

function topSource(retrieval) {
  return String(retrieval?.hits?.[0]?.source || "");
}

/**
 * 这次检索能不能直接当口播依据。
 * Wiki 被抬到 0.9 的命中看原始 mode；关键词 FAQ 看 ≥45。
 */
function isAnswerable(retrieval) {
  if (!retrieval) return false;
  const score = topScore(retrieval);
  const source = topSource(retrieval);
  const mode = String(retrieval.mode || "");
  if (retrieval.instantAnswer && source === "faq" && score >= 0.72 && score <= 1.2) return true;
  if (retrieval.instantAnswer && source === "faq" && score >= FAQ_KEYWORD_ANSWERABLE) return true;
  if (source === "faq" && score >= FAQ_KEYWORD_ANSWERABLE) return true;
  if (mode === "wiki" || mode === "wiki+semantic") {
    if (score >= WIKI_KEYWORD_ANSWERABLE || score >= 0.85) return Boolean(retrieval.instantAnswer || retrieval.preview);
  }
  if (source === "wiki" && score >= WIKI_KEYWORD_ANSWERABLE && score < 2) return true;
  if (score > 0 && score <= 1.2 && score >= SEMANTIC_ANSWERABLE && source === "wiki") return true;
  return false;
}

/** 粘滞改写只留下本句，供检索和似然共用。 */
function focusAsk(askText) {
  let q = String(askText || "").trim();
  q = q.replace(/^(大智|大致)[，,：:\s]*/, "");
  const quoted = q.match(/(?:针对上一答|追问)「[\s\S]{0,240}」[：:]\s*(.{2,120})$/);
  const plain = q.match(/追问[：:]\s*(.{2,120})$/);
  if (quoted) q = quoted[1].trim();
  else if (plain) q = plain[1].trim();
  return q;
}

function stripAsk(askText) {
  return focusAsk(askText).replace(/[？?。！!\s]/g, "");
}

/**
 * 残句后验。先验偏低；句末裸疑问词抬高，句末语气词或已有谓语压低。
 * 「你如何做」有谓语，不是残句；「如何通」疑问词后缺谓语，是残句。
 */
function truncationPosterior(askText) {
  const q = stripAsk(askText);
  if (!q || q.length > 18) return 0.02;
  let logOdds = q.length <= 8 ? Math.log(0.22 / 0.78) : Math.log(0.06 / 0.94);
  if (/[吗嘛呢吧]$/.test(q)) logOdds -= 2.4;
  // 只有疑问词本身，或疑问词后面没接上谓语，才像半句。「会议主题是什么」是完整特指问。
  if (/^(什么|哪些|为什么|如何|怎么|怎样)$/.test(q)) logOdds += 2.8;
  if (/^(如何|怎么|怎样).{0,1}$/.test(q) && !/[做办算用学看讲说买开吗嘛呢吧]$/.test(q)) logOdds += 2.4;
  if (/(做|办|算|落地|收费|准备|什么)$/.test(q) && q.length >= 4) logOdds -= 1.6;
  return 1 / (1 + Math.exp(-logOdds));
}

function isTruncatedAsk(askText) {
  return truncationPosterior(askText) >= 0.7;
}

function repeatLine() {
  return "后半句没听清，请再说一遍。";
}

function clarifyLine() {
  return "这句我还没对上，请再说具体一点。";
}

/** 虚词二元组：不算问句内容锚点 */
const STOP_BIGRAM = new Set([
  "什么",
  "怎么",
  "如何",
  "怎样",
  "可以",
  "是否",
  "你们",
  "我们",
  "这个",
  "那个",
  "一下",
  "还有",
  "以及",
  "或者",
  "因为",
  "所以",
  "如果",
  "那么",
  "一个",
  "一些",
  "没有",
  "不是",
  "能不能",
  "大智",
  "大致"
]);

function contentBigrams(text) {
  const s = String(text || "")
    .replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, "")
    .toLowerCase();
  const out = [];
  for (let i = 0; i < s.length - 1; i += 1) {
    out.push(s.slice(i, i + 2));
  }
  return out;
}

/**
 * 问句 ↔ 候选（标题/正文）内容重叠比。
 * 结构闸门：不靠业务词表，用字二元组重合；虚词二元组不计入分子。
 */
function askSpeakOverlap(askText, speakText) {
  const askRaw = contentBigrams(stripAsk(askText));
  const speakSet = new Set(contentBigrams(speakText));
  if (!askRaw.length || !speakSet.size) return 0;
  const pool = askRaw.filter((b) => !STOP_BIGRAM.has(b));
  const use = pool.length ? pool : askRaw;
  let hit = 0;
  for (const b of use) {
    if (speakSet.has(b)) hit += 1;
  }
  return hit / use.length;
}

/**
 * 候选是否对得上本句。短问要求更高重合，避免「区别」撞上万能经营句。
 */
function isAlignedSpeak(askText, speakText, opts = {}) {
  const speak = String(speakText || "").trim();
  if (!speak) return false;
  const askLen = stripAsk(askText).length;
  const min = opts.minOverlap != null ? opts.minOverlap : askLen <= 8 ? 0.2 : 0.12;
  return askSpeakOverlap(askText, speak) >= min;
}

/**
 * 经营万能软句指纹（样板开口 + 护收费/三笔账），禁止当任意问句兜底。
 * 不扫业务关键词表，只认这条模板结构。
 */
function isUniversalOperateSoft(text) {
  const t = String(text || "");
  if (!t) return false;
  const hasSample = /样板班开口实拍|月度测评.*成果展|开口实拍/.test(t);
  const hasLedger = /先护收费|护收费盘面|对照三笔账|三笔账里招生/.test(t);
  const hasLead = /把美语做成家长看得见的选择理由/.test(t);
  return (hasLead && (hasSample || hasLedger)) || (hasSample && hasLedger);
}

/** Lanczos log-gamma，供 Beta 似然。 */
function lgamma(z) {
  const p = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  let x = p[0];
  z -= 1;
  for (let i = 1; i < p.length; i += 1) x += p[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function logBetaPdf(x, alpha, beta) {
  const t = Math.min(1 - 1e-4, Math.max(1e-4, x));
  const logB = lgamma(alpha) + lgamma(beta) - lgamma(alpha + beta);
  return (alpha - 1) * Math.log(t) + (beta - 1) * Math.log(1 - t) - logB;
}

let faqDf = null;
function faqAlignModel() {
  if (faqDf) return faqDf;
  try {
    const { getFaqRaw } = require("../../knowledge/corpus.cjs");
    const titles = String(getFaqRaw() || "")
      .split(/\n/)
      .filter((line) => /^##\s*Q:/.test(line));
    faqDf = buildDf(titles);
  } catch (_) {
    faqDf = buildDf([]);
  }
  return faqDf;
}

function hitSpeak(hit) {
  const raw = String(hit?.speak || hit?.snippet || hit?.body || "");
  const m = raw.match(/A[:：]\s*([\s\S]+)/);
  return (m ? m[1] : raw).replace(/\s+/g, " ").trim().slice(0, 160);
}

function scriptEligible(intent, script) {
  const name = String(intent?.intent || "");
  const conf = Number(intent?.confidence) || 0;
  return GROUNDED_INTENTS.has(name) && conf >= 0.75 && String(script || "").trim().length > 12;
}

/**
 * 贝叶斯口播决策。
 * 候选文档的先验来自检索分（去掉 FAQ 常数底分）；
 * 似然是对齐度与「标题更窄」的 Beta 对数似然比。
 * 后验最高的文档须同时压过「没有证据」和第二名（Bayes factor ≥ 3）才作答。
 * 否则：意图脚本仅在分类器已经认定该意图、且没有任何文档胜出时出口；再否则澄清。
 *
 * @returns {{ action: "answer"|"clarify"|"repeat", speak: string, reason: string, posterior?: number, title?: string }}
 */
function decideSpeak({ ask, hits, intent, script } = {}) {
  const focused = focusAsk(ask);
  if (isTruncatedAsk(focused)) {
    return { action: "repeat", speak: repeatLine(), reason: "truncated", posterior: truncationPosterior(focused) };
  }

  const model = faqAlignModel();
  const askLen = stripAsk(focused).length;
  const short = askLen > 0 && askLen <= 6;
  const list = (hits || []).filter((h) => h && (h.title || h.snippet || h.speak));

  const prior0 = 0.62;
  const priorScript = scriptEligible(intent, script) ? 0.22 : 0;
  const priorDocMass = Math.max(0.05, 1 - prior0 - priorScript);

  // score 底分 16–18 几乎是 FAQ 常数，不给先验
  const lifted = list.map((h) => {
    const s = Number(h.score) || 0;
    return s > 22 ? Math.log1p(s - 18) : 0;
  });
  const sumW = lifted.reduce((a, b) => a + b, 0) || 1;

  const logUnnorm = [];
  for (let i = 0; i < list.length; i += 1) {
    const h = list[i];
    const title = String(h.title || "");
    const view = bestTitleView(focused, title, model);
    const a = view.align;
    const e = view.extra;
    const llrAlign = logBetaPdf(a, 6, 2) - logBetaPdf(a, 1.4, 5);
    const relExtra = short ? [1.4, 8] : [2, 4];
    const irrExtra = short ? [6, 1.5] : [4, 2];
    const llrExtra = logBetaPdf(e, relExtra[0], relExtra[1]) - logBetaPdf(e, irrExtra[0], irrExtra[1]);
    const prior = priorDocMass * (sumW > 0 && lifted[i] > 0 ? lifted[i] / sumW : 1 / Math.max(1, list.length));
    logUnnorm.push({
      i,
      logU: Math.log(Math.max(prior, 1e-8)) + llrAlign + llrExtra,
      title,
      align: a,
      extra: e
    });
  }

  const logU0 = Math.log(prior0);
  // 意图脚本：分类器给出该意图，相当于一条弱证据，只够在文档都不像时赢过「没证据」
  const logUScript = priorScript > 0 ? Math.log(priorScript) + Math.log(3) : -Infinity;

  const terms = [...logUnnorm.map((x) => x.logU), logU0, logUScript].filter((x) => Number.isFinite(x));
  const maxL = Math.max(...terms, -1e9);
  const Z = terms.reduce((acc, x) => acc + Math.exp(x - maxL), 0);
  const post = (logU) => (Number.isFinite(logU) ? Math.exp(logU - maxL) / Z : 0);

  const p0 = post(logU0);
  const pScript = post(logUScript);
  const ranked = logUnnorm
    .map((x) => ({ ...x, p: post(x.logU) }))
    .sort((a, b) => b.p - a.p);
  const best = ranked[0];
  const second = ranked[1];
  const bfSecond = best && second && second.p > 1e-6 ? best.p / second.p : best ? Infinity : 0;

  if (best && best.p >= 0.42 && best.p > p0 && bfSecond >= 3 && best.align >= 0.28) {
    const speak = hitSpeak(list[best.i]);
    if (speak) {
      return {
        action: "answer",
        speak,
        reason: "posterior",
        posterior: best.p,
        title: best.title,
        align: best.align,
        extra: best.extra
      };
    }
  }

  if (pScript > p0 && (!best || pScript >= best.p)) {
    return {
      action: "answer",
      speak: String(script).trim().slice(0, 160),
      reason: "script",
      posterior: pScript
    };
  }

  return {
    action: "clarify",
    speak: clarifyLine(),
    reason: best && bfSecond < 3 ? "ambiguous" : "no_evidence",
    posterior: best ? best.p : p0,
    title: best?.title || ""
  };
}

module.exports = {
  FAQ_KEYWORD_ANSWERABLE,
  WIKI_KEYWORD_ANSWERABLE,
  SEMANTIC_ANSWERABLE,
  CLARIFY_CONFIDENCE,
  GROUNDED_INTENTS,
  topScore,
  isAnswerable,
  focusAsk,
  stripAsk,
  isTruncatedAsk,
  truncationPosterior,
  repeatLine,
  clarifyLine,
  askSpeakOverlap,
  isAlignedSpeak,
  isUniversalOperateSoft,
  decideSpeak
};
