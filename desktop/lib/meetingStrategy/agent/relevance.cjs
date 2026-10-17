/**
 * 检索闸门：召回和「能当答案」分开。
 * 分数量纲来自本仓库，不要照抄外部客服项目的 0.76：
 * - FAQ 关键词（corpus.retrieveKnowledge）强命中约 ≥45
 * - Wiki 关键词（queryWiki）强命中约 ≥5，语义检索里会被抬到 0.9 附近
 * - 纯向量余弦：中文无关句也常在 0.6 上下，作答线取 0.62，只用于没有 Wiki/FAQ 强命中时
 */
const { bestTitleView, buildDf } = require("../../knowledge/align.cjs");
const { isDefinitionSpeak } = require("../advisors/speakGuards.cjs");

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
  // 「我如何能够通」：疑问词前有短前缀，后面只剩「能够/可以」加一个残字。
  if (q.length <= 8 && /(如何|怎么|怎样)/.test(q)) {
    const after = q.replace(/^.*?(如何|怎么|怎样)/, "");
    if (/^(能够|可以).{1}$/.test(after) && !/[做办算]/.test(after)) logOdds += 2.6;
  }
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
  for (let i = 0; i < s.length - 1; i += 1) out.push(s.slice(i, i + 2));
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

const MATCH_KEEP = 0.3;
const PAIR_MIN_P = 0.08;
const EIG_MIN_BITS = 0.05;

function sigmoid(x) {
  if (x >= 20) return 1;
  if (x <= -20) return 0;
  return 1 / (1 + Math.exp(-x));
}

function binaryEntropy(p) {
  const t = Math.min(1 - 1e-12, Math.max(1e-12, p));
  return -(t * Math.log2(t) + (1 - t) * Math.log2(1 - t));
}

function designOf(type, hypothesisId, segments, depth) {
  const kind = type || "";
  return {
    type: kind,
    hypothesisId: hypothesisId || "",
    segments: (segments || []).filter(Boolean).slice(0, 2),
    depth: depth || (kind === "answer" ? "final" : kind === "clarify" ? "split" : ""),
    at: Date.now()
  };
}

/** 无证据引导才切词。结巴懒加载，不参与对齐。 */
function contentFocus(ask) {
  const { focusPhrase } = require("../../text/zhSegment.cjs");
  return focusPhrase(stripAsk(ask));
}

function probeLine(focus) {
  return localAsk(focus);
}

const TOPIC_DROP = new Set([
  "什么", "怎么", "如何", "怎样", "可以", "能够", "现在", "这个", "那个", "我们", "你们",
  "一下", "告诉", "想要", "需要", "进行", "实施", "知道", "请问", "能不能"
]);

function usableHost(text) {
  const t = String(text || "").trim();
  if (t.length < 12) return "";
  if (/现在是什么情况|写成固定步骤|你想先听哪一步|后半句没听清/.test(t)) return "";
  return t;
}

/** 上一句资料里还没单独说过的后半句。整句已经播完就返回空。 */
function hostRest(lastHost) {
  const raw = usableHost(lastHost);
  if (!raw) return "";
  const parts = raw.split(/[。！？]/).map((s) => s.trim()).filter((s) => s.length >= 8);
  if (parts.length < 2) return "";
  return parts.slice(1).join("。").slice(0, 80);
}

const GENERIC_TOPIC = new Set(["家长", "老师", "系统", "园所", "课程", "孩子", "学生", "英语", "美语"]);

/** 共有片段必须是正面出现。「不执行」里的「执行」不算同一主题。 */
function mentionedIn(host, topic) {
  const h = String(host || "");
  const t = String(topic || "");
  if (!h || !t) return false;
  let from = 0;
  while (from <= h.length - t.length) {
    const i = h.indexOf(t, from);
    if (i < 0) return false;
    const prev = i > 0 ? h[i - 1] : "";
    if (!"不没别非".includes(prev)) return true;
    from = i + 1;
  }
  return false;
}

/** 本句和上一句口播共有的内容。优先句中焦点，其次更长的共有片段。 */
function sharedTopic(ask, lastHost) {
  const host = usableHost(lastHost).replace(/[^\u4e00-\u9fff]/g, "");
  const q = stripAsk(ask).replace(/[^\u4e00-\u9fff]/g, "");
  if (!host || q.length < 2) return "";
  const focus = contentFocus(ask);
  if (focus && mentionedIn(host, focus)) return focus;
  let best = "";
  const nMax = Math.min(6, q.length);
  for (let n = 2; n <= nMax; n += 1) {
    for (let i = 0; i + n <= q.length; i += 1) {
      const s = q.slice(i, i + n);
      if (TOPIC_DROP.has(s) || !mentionedIn(host, s)) continue;
      if (s.length < 3 && GENERIC_TOPIC.has(s)) continue;
      if (s.length >= best.length) best = s;
    }
  }
  return best;
}

function localAsk(focus) {
  const f = String(focus || "").trim();
  if (!f) return "你想先听哪一步？";
  return `${f}你想先听哪一步？`;
}

function boundaryFor(focus) {
  const f = String(focus || "").trim();
  if (!f) return "资料没有把这一步写成固定步骤。能答的按已有说明说，没写到的不编。";
  if (/成果展/.test(f)) {
    return "资料没有把成果展写成固定场次或台本。能做的是开口、测评和阶段性活动，不要承诺每月一场。";
  }
  return `资料没有把「${f}」写成固定步骤。能答的按已有说明说，没写到的不编。`;
}

function sameProbe(prev, focus) {
  if (!prev || prev.hypothesisId !== "probe" || !focus) return false;
  return (prev.segments || []).some((s) => {
    const t = String(s || "");
    return t && (t === focus || t.includes(focus) || focus.includes(t));
  });
}

function pairKey(a, b) {
  return [String(a || "").trim(), String(b || "").trim()].sort().join("\n");
}

function splitQuestion(segA, segB) {
  return `你是在问「${segA}」还是「${segB}」？`;
}

/** 问的是期限时，句子里要有「几个月」这种跨度。账期里的「一年/三年」不算。 */
function asksWhen(text) {
  return /多久|多长时间|什么时候/.test(String(text || ""));
}

function answersWhen(text) {
  return /[0-9一二两三四五六七八九十]+\s*个?月|个月/.test(String(text || ""));
}

/** 确认能不能回本：答句要同时有回本和边界，不能只念三笔账开场。 */
function asksReturnBoundary(text) {
  const q = String(text || "");
  if (asksWhen(q) || /(如何|怎么|怎样)/.test(q)) return false;
  return /回本|会不会亏|亏损|亏本/.test(q);
}

function answersReturnBoundary(text) {
  const s = String(text || "");
  return /回本/.test(s) && /不保证|参考测算|不是承诺/.test(s);
}

/** 问怎么赚/怎么扭亏：答句要有测算结构，月份时间表不算。 */
function asksHowLedger(text) {
  const q = String(text || "");
  if (asksWhen(q) || asksReturnBoundary(q)) return false;
  return /(如何|怎么|怎样)/.test(q) && /盈利|赚钱|扭亏|回本/.test(q);
}

function answersHowLedger(text) {
  return /三笔账|测算|一点八|延时/.test(String(text || ""));
}

function slotOk(ask, speak) {
  if (asksWhen(ask) && !answersWhen(speak)) return false;
  if (asksReturnBoundary(ask) && !answersReturnBoundary(speak)) return false;
  if (asksHowLedger(ask) && !answersHowLedger(speak)) return false;
  return true;
}

function isInterrogative(text) {
  return /[？?]|(如何|怎么|怎样|吗|呢|嘛|能否|会不会|能不能|是不是|什么|哪些|为什么|多久|多长时间|什么时候|可不可以)/.test(
    String(text || "")
  );
}

/** 句末感叹、且没有疑问形态：表态，不出口播脚本。 */
function isExclamation(text) {
  const s = focusAsk(text).trim();
  return /[！!]$/.test(s) && !isInterrogative(s);
}

/** 澄清句只含两个分段，不夹进任一条正文。 */
function clarifyCommitOk(speak, bodies) {
  const s = String(speak || "");
  if (!s) return false;
  for (const body of bodies) {
    const b = String(body || "").trim();
    if (b.length >= 12 && s.includes(b.slice(0, 12))) return false;
  }
  return true;
}

/**
 * 贝叶斯口播决策。观测 → 信念（0.30 过滤）→ 停止则作答，否则按 EIG 澄清或复述。
 * 作答阈值不变：后验 ≥ 0.42、压过「没有证据」、Bayes factor ≥ 3、对齐 ≥ 0.28。
 * 意图脚本只参加停止，不进入提问配对。
 *
 * @returns {{ action: "answer"|"clarify"|"repeat", speak: string, reason: string, posterior?: number, title?: string, hypotheses?: object[], eig?: number, design?: object, downgraded?: boolean }}
 */
function decideSpeak({ ask, hits, intent, script, prevDesign, lastHost } = {}) {
  const focused = focusAsk(ask);
  if (isTruncatedAsk(focused)) {
    return {
      action: "repeat",
      speak: repeatLine(),
      reason: "truncated",
      posterior: truncationPosterior(focused),
      hypotheses: [],
      eig: 0,
      design: designOf("repeat", "", []),
      downgraded: false
    };
  }

  if (isExclamation(focused)) {
    return {
      action: "clarify",
      speak: "听到了。若要问怎么做，请把问题说完整。",
      reason: "statement",
      posterior: 0,
      hypotheses: [],
      eig: 0,
      design: designOf("clarify", "", []),
      downgraded: false
    };
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
    const llrAlign = logBetaPdf(a, 3, 2.2) - logBetaPdf(a, 1.2, 5);
    // 窄度只进入后验，不进入相容过滤。短问的过窄标题靠停止规则挡住，避免似然把假设滤成空集。
    const llrExtra = logBetaPdf(e, 2, 3) - logBetaPdf(e, 2.5, 2);
    const prior = priorDocMass * (sumW > 0 && lifted[i] > 0 ? lifted[i] / sumW : 1 / Math.max(1, list.length));
    const m = sigmoid(llrAlign);
    logUnnorm.push({
      i,
      id: `h${i}`,
      logU: Math.log(Math.max(prior, 1e-8)) + llrAlign + llrExtra,
      title,
      segment: view.segment || title,
      align: a,
      extra: e,
      m,
      speak: hitSpeak(h)
    });
  }

  const askedPair =
    prevDesign && prevDesign.type === "clarify" && (prevDesign.segments || []).length === 2
      ? pairKey(prevDesign.segments[0], prevDesign.segments[1])
      : "";

  const logU0 = Math.log(prior0);
  const logUScript = priorScript > 0 ? Math.log(priorScript) + Math.log(3) : -Infinity;
  const keptRaw = logUnnorm.filter((x) => x.m >= MATCH_KEEP);
  const terms = [...keptRaw.map((x) => x.logU), logU0, logUScript].filter((x) => Number.isFinite(x));
  const maxL = Math.max(...terms, -1e9);
  const Z = terms.reduce((acc, x) => acc + Math.exp(x - maxL), 0) || 1;
  const post = (logU) => (Number.isFinite(logU) ? Math.exp(logU - maxL) / Z : 0);

  const p0 = post(logU0);
  const pScript = post(logUScript);
  const hypotheses = logUnnorm
    .map((x) => ({
      id: x.title || x.id,
      segment: x.segment,
      m: x.m,
      kept: x.m >= MATCH_KEEP,
      p: x.m >= MATCH_KEEP ? post(x.logU) : 0,
      align: x.align,
      extra: x.extra
    }))
    .sort((a, b) => b.p - a.p || b.m - a.m);

  const ranked = keptRaw
    .map((x) => ({ ...x, p: post(x.logU) }))
    .sort((a, b) => b.p - a.p);
  const best = ranked[0];
  const second = ranked[1];
  const bfSecond = best && second && second.p > 1e-6 ? best.p / second.p : best ? Infinity : 0;
  const bodies = ranked.map((x) => x.speak);

  function operateBlocked(speak, reason) {
    if (!isUniversalOperateSoft(speak)) return false;
    if (reason === "posterior") return false;
    return !(reason === "script" && intent?.intent === "operate");
  }

  const pairMass = [{ id: "__h0", p: p0 }, { id: "__script", p: pScript }, ...ranked.map((x) => ({ id: x.id, p: x.p }))];
  function eigOf(a, b) {
    let py = 0;
    let cond = 0;
    for (const mass of pairMass) {
      const pyA = mass.id === a.id ? 0.85 : mass.id === b.id ? 0.15 : 0.5;
      py += pyA * mass.p;
      cond += mass.p * binaryEntropy(pyA);
    }
    return binaryEntropy(py) - cond;
  }

  function bestSplit() {
    let win = null;
    for (let i = 0; i < ranked.length; i += 1) {
      if (ranked[i].p < PAIR_MIN_P || !ranked[i].segment) continue;
      for (let j = i + 1; j < ranked.length; j += 1) {
        if (ranked[j].p < PAIR_MIN_P || !ranked[j].segment) continue;
        if (ranked[i].segment === ranked[j].segment) continue;
        if (askedPair && pairKey(ranked[i].segment, ranked[j].segment) === askedPair) continue;
        const eig = eigOf(ranked[i], ranked[j]);
        if (!win || eig > win.eig) win = { a: ranked[i], b: ranked[j], eig };
      }
    }
    if (!win || win.eig < EIG_MIN_BITS) return null;
    const speak = splitQuestion(win.a.segment, win.b.segment);
    if (!clarifyCommitOk(speak, bodies) || operateBlocked(speak, "clarify")) return null;
    return win;
  }

  const split = bestSplit();
  let focusMemo = null;
  const ensureFocus = () => {
    if (focusMemo == null) focusMemo = contentFocus(focused);
    return focusMemo;
  };

  if (prevDesign && prevDesign.hypothesisId === "probe") {
    const focus = ensureFocus();
    const focusedHit = focus
      ? ranked.find(
          (h) =>
            h.speak &&
            h.align >= 0.4 &&
            h.extra < 0.55 &&
            String(h.segment || "").includes(focus) &&
            slotOk(focused, h.speak)
        )
      : null;
    if (focusedHit && !operateBlocked(focusedHit.speak, "posterior")) {
      return {
        action: "answer",
        speak: focusedHit.speak,
        reason: "posterior",
        posterior: focusedHit.p,
        title: focusedHit.title,
        align: focusedHit.align,
        extra: focusedHit.extra,
        hypotheses,
        eig: split ? split.eig : 0,
        design: designOf("answer", focusedHit.title, [focus], "final"),
        downgraded: false
      };
    }
  }

  const answerable = ranked.find((h) => h.speak && slotOk(focused, h.speak)) || null;
  const bestSlot = answerable && best && answerable.i === best.i ? best : answerable;

  if (bestSlot && bestSlot.p >= 0.42 && bestSlot.p > p0 && (bestSlot.i === best?.i ? bfSecond >= 3 : true) && bestSlot.align >= 0.28 && bestSlot.speak) {
    const alignFail = bestSlot.i === best?.i && second && second.align > bestSlot.align;
    const tooNarrow = (short && bestSlot.extra >= 0.7) || (bestSlot.extra >= 0.55 && bestSlot.align < 0.72);
    const definitionMismatch = isDefinitionSpeak(bestSlot.speak) && !/(是什么|什么是)/.test(focused);
    if (!alignFail && !tooNarrow && !definitionMismatch && !operateBlocked(bestSlot.speak, "posterior")) {
      return {
        action: "answer",
        speak: bestSlot.speak,
        reason: "posterior",
        posterior: bestSlot.p,
        title: bestSlot.title,
        align: bestSlot.align,
        extra: bestSlot.extra,
        hypotheses,
        eig: split ? split.eig : 0,
        design: designOf("answer", bestSlot.title, [bestSlot.segment]),
        downgraded: false
      };
    }
  }

  const scriptSpeak = String(script || "").trim().slice(0, 160);
  if (
    pScript > p0 &&
    (!bestSlot || pScript >= bestSlot.p) &&
    scriptSpeak &&
    slotOk(focused, scriptSpeak) &&
    !((intent?.intent === "rollout" || intent?.intent === "teacher") && askSpeakOverlap(focused, scriptSpeak) < 0.12) &&
    !operateBlocked(scriptSpeak, "script")
  ) {
    return {
      action: "answer",
      speak: scriptSpeak,
      reason: "script",
      posterior: pScript,
      hypotheses,
      eig: split ? split.eig : 0,
      design: designOf("answer", String(intent?.intent || "script"), []),
      downgraded: false
    };
  }

  const downgraded = Boolean(best && best.p >= 0.42 && best.speak);
  if (split) {
    return {
      action: "clarify",
      speak: splitQuestion(split.a.segment, split.b.segment),
      reason: best && bfSecond < 3 ? "ambiguous" : "no_evidence",
      posterior: best ? best.p : p0,
      title: best?.title || "",
      hypotheses,
      eig: split.eig,
      design: designOf("clarify", "", [split.a.segment, split.b.segment]),
      downgraded
    };
  }

  // 上一句已经是资料口播：能接上就说后半句，不再新开套话。
  const host = usableHost(lastHost);
  const topic = host ? sharedTopic(focused, host) : "";
  const rest = topic ? hostRest(host) : "";
  if (topic && rest) {
    const alreadyCarried = prevDesign?.hypothesisId === "carry" && (prevDesign.segments || []).includes(topic);
    if (!alreadyCarried) {
      return {
        action: "answer",
        speak: rest,
        reason: "carry",
        posterior: best ? best.p : p0,
        title: best?.title || "",
        hypotheses,
        eig: 0,
        design: designOf("answer", "carry", [topic], "final"),
        downgraded
      };
    }
  }

  // 同一焦点已经问过，或上一句后半句已经说过：交给豆包补一句。
  const focus = topic || ensureFocus();
  if ((topic || sameProbe(prevDesign, focus)) && !(best && best.align >= 0.28)) {
    return {
      action: "clarify",
      speak: "",
      reason: "draft",
      posterior: best ? best.p : p0,
      title: "",
      hypotheses,
      eig: 0,
      design: designOf("clarify", "probe", focus ? [focus] : [], "final"),
      downgraded
    };
  }

  // 闭题：标题里已经有本句焦点就念这张卡，不必再确认。
  const focusForCard = ensureFocus();
  if (focusForCard) {
    let closedAsk = false;
    try {
      const { isClosedFaqQuestion } = require("../query/classify.cjs");
      closedAsk = isClosedFaqQuestion(focused);
    } catch (_) {
      closedAsk = false;
    }
    if (closedAsk) {
      const card = logUnnorm
        .filter(
          (h) =>
            h.speak &&
            h.align >= 0.18 &&
            slotOk(focused, h.speak) &&
            `${h.title || ""}\n${h.segment || ""}`.includes(focusForCard)
        )
        .sort((a, b) => b.align - a.align)[0];
      if (card && !operateBlocked(card.speak, "posterior")) {
        return {
          action: "answer",
          speak: card.speak,
          reason: "posterior",
          posterior: card.p,
          title: card.title,
          align: card.align,
          extra: card.extra,
          hypotheses,
          eig: split ? split.eig : 0,
          design: designOf("answer", card.title, [focusForCard], "final"),
          downgraded
        };
      }
    }
  }

  // 有近义标题但不够作答：先确认那一条。过窄标题改为引导，不念「你是说」。
  const nearTooNarrow = best && ((short && best.extra >= 0.7) || (best.extra >= 0.55 && best.align < 0.72));
  const focusForNear = ensureFocus();
  const nearHoldsFocus =
    !focusForNear ||
    String(best?.segment || "").includes(focusForNear) ||
    String(best?.title || "").includes(focusForNear);
  const near =
    nearHoldsFocus && !nearTooNarrow && best && best.segment && best.align >= 0.18
      ? String(best.segment).slice(0, 18)
      : "";
  if (near) {
    return {
      action: "clarify",
      speak: `你是说「${near}」吗？我们按这个往下看。`,
      reason: best.speak && !slotOk(focused, best.speak) ? "slot" : "near",
      posterior: best.p,
      title: best.title || "",
      hypotheses,
      eig: 0,
      design: designOf("clarify", "probe", [near], "partial"),
      downgraded
    };
  }

  if (focus) {
    return {
      action: "clarify",
      speak: localAsk(focus),
      reason: "probe",
      posterior: p0,
      title: "",
      hypotheses,
      eig: 0,
      design: designOf("clarify", "probe", [focus], "ask"),
      downgraded
    };
  }

  return {
    action: "clarify",
    speak: clarifyLine(),
    reason: "no_evidence",
    posterior: p0,
    title: "",
    hypotheses,
    eig: 0,
    design: designOf("clarify", "", []),
    downgraded
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
  contentFocus,
  probeLine,
  boundaryFor,
  localAsk,
  hostRest,
  decideSpeak
};
