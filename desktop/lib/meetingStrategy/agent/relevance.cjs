/**
 * 检索闸门：召回和「能当答案」分开。
 * 分数量纲来自本仓库，不要照抄外部客服项目的 0.76：
 * - FAQ 关键词（corpus.retrieveKnowledge）强命中约 ≥45
 * - Wiki 关键词（queryWiki）强命中约 ≥5，语义检索里会被抬到 0.9 附近
 * - 纯向量余弦：中文无关句也常在 0.6 上下，作答线取 0.62，只用于没有 Wiki/FAQ 强命中时
 */
const { bestTitleView, buildDf, alignScore, titleSegments } = require("../../knowledge/align.cjs");
const { isDefinitionSpeak } = require("../advisors/speakGuards.cjs");
const { load, rx, words, hp, fill } = require("../../knowledge/schemaStore.cjs");

function H() {
  return load().hyper;
}

const FAQ_KEYWORD_ANSWERABLE = hp("faqKeywordAnswerable");
const WIKI_KEYWORD_ANSWERABLE = hp("wikiKeywordAnswerable");
const SEMANTIC_ANSWERABLE = hp("semanticAnswerable");
const CLARIFY_CONFIDENCE = hp("clarifyConfidence");
const GROUNDED_INTENTS = new Set(hp("groundedIntents"));

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
  const cfg = H();
  if (retrieval.instantAnswer && source === "faq" && score >= cfg.instantFaqLow && score <= cfg.instantFaqHigh) return true;
  if (retrieval.instantAnswer && source === "faq" && score >= FAQ_KEYWORD_ANSWERABLE) return true;
  if (source === "faq" && score >= FAQ_KEYWORD_ANSWERABLE) return true;
  if (mode === "wiki" || mode === "wiki+semantic") {
    if (score >= WIKI_KEYWORD_ANSWERABLE || score >= cfg.wikiLifted) return Boolean(retrieval.instantAnswer || retrieval.preview);
  }
  if (source === "wiki" && score >= WIKI_KEYWORD_ANSWERABLE && score < cfg.wikiKeywordUpper) return true;
  if (score > 0 && score <= cfg.instantFaqHigh && score >= SEMANTIC_ANSWERABLE && source === "wiki") return true;
  return false;
}

/** 粘滞改写只留下本句，供检索和似然共用。 */
function focusAsk(askText) {
  let q = String(askText || "").trim();
  q = q.replace(rx("operators", "wakePrefix"), "");
  const quoted = q.match(rx("operators", "quotedTail"));
  const plain = q.match(rx("operators", "plainTail"));
  if (quoted) q = quoted[1].trim();
  else if (plain) q = plain[1].trim();
  return q;
}

function stripAsk(askText) {
  return focusAsk(askText).replace(/[？?。！!\s]/g, "");
}

/**
 * 句尾完备度。低于阈值且不是高置信闭题时，按残句复述。
 */
function truncationPosterior(askText) {
  const { evaluateSyntacticCompleteness } = require("../../text/universalOperators.cjs");
  const score = evaluateSyntacticCompleteness(stripAsk(askText));
  return 1 - score;
}

function isTruncatedAsk(askText) {
  const q = stripAsk(askText);
  if (!q || q.length > H().truncMaxLen) return false;
  const { evaluateSyntacticCompleteness } = require("../../text/universalOperators.cjs");
  if (evaluateSyntacticCompleteness(q) >= H().completenessIncomplete) return false;
  try {
    const { isClosedFaqQuestion } = require("../query/classify.cjs");
    if (isClosedFaqQuestion(q)) return false;
  } catch (_) {
    /* 闭题模块未就绪时只看完备度 */
  }
  return true;
}

function repeatLine() {
  return fill("repeat");
}

function clarifyLine() {
  return fill("clarify");
}

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
  const pool = askRaw.filter((b) => !words("operators", "stopBigram").has(b));
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
  const cfg = H();
  const askLen = stripAsk(askText).length;
  const min = opts.minOverlap != null ? opts.minOverlap : askLen <= cfg.alignShortLen ? cfg.alignShortMin : cfg.alignLongMin;
  return askSpeakOverlap(askText, speak) >= min;
}

/**
 * 经营万能软句指纹（样板开口 + 护收费/三笔账），禁止当任意问句兜底。
 * 不扫业务关键词表，只认这条模板结构。
 */
function softRx(name) {
  return new RegExp(load().operators.universalSoft[name]);
}

function isUniversalOperateSoft(text) {
  const t = String(text || "");
  if (!t) return false;
  const hasSample = softRx("sample").test(t);
  const hasLedger = softRx("ledger").test(t);
  const hasLead = softRx("lead").test(t);
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
  return (m ? m[1] : raw).replace(/\s+/g, " ").trim().slice(0, H().hitSpeakMax);
}

function scriptEligible(intent, script) {
  const name = String(intent?.intent || "");
  const conf = Number(intent?.confidence) || 0;
  const cfg = H();
  return GROUNDED_INTENTS.has(name) && conf >= cfg.scriptConfidenceMin && String(script || "").trim().length > cfg.scriptMinChars;
}


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

function probeLine(_focus) {
  return "";
}

function usableHost(text) {
  const t = String(text || "").trim();
  if (t.length < H().hostMinLen) return "";
  if (new RegExp(load().operators.templates.hostReject).test(t)) return "";
  return t;
}

/** 上一句资料里还没单独说过的后半句。整句已经播完就返回空。 */
function hostRest(lastHost) {
  const raw = usableHost(lastHost);
  if (!raw) return "";
  const parts = raw.split(/[。！？]/).map((s) => s.trim()).filter((s) => s.length >= H().hostClauseMin);
  if (parts.length < 2) return "";
  return parts.slice(1).join("。").slice(0, H().hostRestMax);
}

/** 共有片段必须是正面出现。否定窗口内的片段不算同一主题。 */
function mentionedIn(host, topic) {
  const { topicMentionedPositively } = require("../../text/universalOperators.cjs");
  return topicMentionedPositively(host, topic);
}

/** 本句和上一句口播共有的内容。优先句中焦点，其次更长的共有片段。 */
function sharedTopic(ask, lastHost) {
  const host = usableHost(lastHost).replace(/[^\u4e00-\u9fff]/g, "");
  const q = stripAsk(ask).replace(/[^\u4e00-\u9fff]/g, "");
  if (!host || q.length < 2) return "";
  const focus = contentFocus(ask);
  if (focus && mentionedIn(host, focus)) return focus;
  let best = "";
  const cfg = H();
  const nMax = Math.min(cfg.sharedTopicMax, q.length);
  for (let n = cfg.sharedTopicMin; n <= nMax; n += 1) {
    for (let i = 0; i + n <= q.length; i += 1) {
      const s = q.slice(i, i + n);
      if (words("operators", "topicDrop").has(s) || !mentionedIn(host, s)) continue;
      if (s.length < cfg.genericTopicMax && words("operators", "genericTopic").has(s)) continue;
      if (s.length >= best.length) best = s;
    }
  }
  return best;
}

function localAsk(focus) {
  const f = String(focus || "").trim();
  if (!f) return fill("localAskEmpty");
  return fill("localAsk", { focus: f });
}

function plainChars(text) {
  return String(text || "").replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, "");
}

/** 完整新问：疑问骨架 / 问号 / 异议完整句（付不起等）。残句不算。 */
function asksNewQuestion(ask) {
  const raw = String(ask || "");
  let hit = false;
  try {
    hit = rx("operators", "interrogative").test(raw);
    if (!hit) hit = rx("operators", "objectionComplete").test(raw);
  } catch (_) {
    hit = /[？?]|(怎么|怎样|如何|吗|呢)/.test(raw);
  }
  if (!hit) return false;
  return !isTruncatedAsk(raw);
}

/** 候选口播是否明显异于上一句资料（换卡，非同一卡续尾） */
function speakDiffersFromHost(speak, host) {
  const a = plainChars(speak);
  const h = plainChars(host);
  if (!a || !h || a.length < 8) return false;
  if (a === h) return false;
  if (h.includes(a) && a.length >= 10) return false;
  if (a.includes(h) && h.length >= 24) return false;
  const head = a.slice(0, Math.min(16, a.length));
  if (head && h.startsWith(head)) return false;
  return true;
}

/** 近胜出异卡：posterior 未过线也可念新卡全文，禁止旧口播 carry 顶答 */
function cardSwitchAnswer(best, host, hypotheses, downgraded, cfg) {
  if (!best || !best.speak || !host) return null;
  if (!speakDiffersFromHost(best.speak, host)) return null;
  const align = Number(best.align) || 0;
  const p = Number(best.p) || 0;
  // 近胜出：对齐过闭题线，或后验已明显高于「没有证据」底
  if (align < cfg.closedAlignMin && p < 0.25) return null;
  return {
    action: "answer",
    speak: best.speak,
    reason: best.p >= cfg.posteriorMin ? "posterior" : "card-switch",
    posterior: best.p,
    title: best.title || "",
    align: best.align,
    extra: best.extra,
    hypotheses,
    eig: 0,
    design: designOf("answer", best.title || "", [], "final"),
    downgraded: Boolean(downgraded),
    speakSource: "card-switch"
  };
}

let hostCardPack = null;
function hostCards() {
  if (hostCardPack) return hostCardPack;
  const { getFaqRaw, extractFaqSpeakText } = require("../../knowledge/corpus.cjs");
  const raw = String(getFaqRaw() || "").replace(/\r\n/g, "\n");
  const cards = [];
  for (const part of raw.split(/\n(?=## )/)) {
    const title = (part.trim().split("\n")[0] || "").replace(/^##\s*/, "").trim();
    const speak = extractFaqSpeakText(part);
    if (title && speak) cards.push({ title, speak });
  }
  hostCardPack = { cards, model: buildDf(cards.map((card) => card.speak)) };
  return hostCardPack;
}

function unspokenClauses(speak, host) {
  const seen = plainChars(host);
  return String(speak || "")
    .split(/[。！？；]/)
    .map((s) => s.trim())
    .filter((s) => {
      const plain = plainChars(s);
      return plain.length >= H().hostClauseMin && !seen.includes(plain);
    });
}

/** 分句或标题问法对本句的最高对齐。比较前去掉疑问骨架，避免骨架词把别的卡抬过闭题线。 */
function peelMeta(text) {
  let s = String(text || "");
  const keys = [...words("operators", "dropWords"), ...words("operators", "topicDrop")]
    .filter((w) => w && String(w).length >= 2)
    .sort((a, b) => b.length - a.length);
  for (const w of keys) {
    if (s.includes(w)) s = s.split(w).join("");
  }
  return s;
}

function bestAskAlign(ask, texts, model) {
  const q = peelMeta(ask);
  let score = -1;
  let text = "";
  for (const row of texts || []) {
    const s = alignScore(q, peelMeta(row), model);
    if (s > score) {
      score = s;
      text = row;
    }
  }
  return { score: score < 0 ? 0 : score, text };
}

function cardOffer(ask, card, host, model) {
  const clause = bestAskAlign(ask, unspokenClauses(card.speak, host), model);
  const titled = bestAskAlign(ask, titleSegments(card.title), model);
  return { card, clause, titled, score: Math.max(clause.score, titled.score) };
}

/**
 * 把对本句已达闭题对齐的卡并进假设池，换卡走后验，不走 progress 旁路。
 */
function mergeAlignedHostCards(ask, host, list) {
  const hostText = usableHost(host);
  if (!hostText || !asksNewQuestion(ask)) return list || [];
  const pack = hostCards();
  const floor = H().closedAlignMin;
  const out = (list || []).slice();
  const seen = new Set(out.map((h) => plainChars(h.speak || h.snippet || "")));
  for (const card of pack.cards) {
    const offer = cardOffer(ask, card, hostText, pack.model);
    if (offer.score < floor) continue;
    const key = plainChars(card.speak);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ title: card.title, speak: card.speak, snippet: card.speak, score: 0 });
  }
  return out;
}

/**
 * 上一句已经播过资料、本句又是完整新问时：
 * 别的卡已达闭题线 → 不在此换卡（由 mergeAlignedHostCards + 后验处理）。
 * 锚卡未播分句达闭题线 → progress。
 * 全场都低于闭题线 → 仍继承锚卡未播分句（零交集短追问）。
 */
function unspokenProgress(ask, host, ranked) {
  const pack = hostCards();
  const floor = H().closedAlignMin;
  let anchor = null;
  let hostAlign = -1;
  for (const card of pack.cards) {
    const score = alignScore(host, card.speak, pack.model);
    if (score > hostAlign) {
      hostAlign = score;
      anchor = card;
    }
  }
  if (!anchor || hostAlign <= 0) return null;
  const anchorOffer = cardOffer(ask, anchor, host, pack.model);
  let bestOther = -1;
  const pool = pack.cards.slice();
  for (const row of ranked || []) {
    const speak = String(row.speak || "");
    const title = String(row.title || "");
    if (!speak || plainChars(speak) === plainChars(anchor.speak)) continue;
    pool.push({ title, speak });
  }
  for (const card of pool) {
    if (plainChars(card.speak) === plainChars(anchor.speak)) continue;
    const offer = cardOffer(ask, card, host, pack.model);
    if (offer.score > bestOther) bestOther = offer.score;
  }
  if (bestOther >= floor && bestOther > anchorOffer.clause.score) {
    return null;
  }
  if (anchorOffer.clause.text && (anchorOffer.clause.score >= floor || bestOther < floor)) {
    return { clause: anchorOffer.clause.text, title: anchor.title };
  }
  return null;
}

/** 豆包未出口时的本地一句。别的卡已经对上本句时不复读；无证据不拼焦点菜单句。 */
function offlineFollow(ask, lastHost, focus) {
  const raw = String(ask || "").trim();
  // 催答、控制话轮、残句：不续播上一句资料后半句
  try {
    const { rx } = require("../../knowledge/schemaStore.cjs");
    if (rx("commands", "urgeAct").test(raw) || rx("commands", "dialogueControl").test(raw)) return "";
    if (rx("commands", "commitAct").test(raw) && !rx("operators", "interrogative").test(raw)) return "";
  } catch (_) {
    /* schema 未就绪时仍走下面 */
  }
  if (raw.length <= 8 && !asksNewQuestion(raw)) return "";
  const host = usableHost(lastHost);
  if (host && asksNewQuestion(ask)) {
    const progressed = unspokenProgress(ask, host, []);
    if (progressed && progressed.clause) return progressed.clause;
    const pack = hostCards();
    const floor = H().closedAlignMin;
    let top = 0;
    for (const card of pack.cards) {
      const offer = cardOffer(ask, card, host, pack.model);
      if (offer.score > top) top = offer.score;
    }
    if (top >= floor) return "";
  }
  // 完整新问对不上卡时保持沉默，不要拿上一句尾巴顶替
  if (asksNewQuestion(ask)) return "";
  return hostRest(lastHost) || "";
}

function boundaryFor(focus) {
  const f = String(focus || "").trim();
  if (!f) return fill("boundaryEmpty");
  for (const row of load().operators.boundarySpecial || []) {
    if (row && row.pattern && new RegExp(row.pattern).test(f)) return row.line;
  }
  return fill("boundaryDefault", { focus: f });
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
  return fill("split", { a: segA, b: segB });
}

function slotOk(ask, speak) {
  const { validateSlots } = require("../../text/universalOperators.cjs");
  return validateSlots(ask, speak);
}

function isInterrogative(text) {
  return rx("operators", "interrogative").test(String(text || ""));
}

/** 句末感叹、且没有疑问形态：表态，不出口播脚本。 */
function isExclamation(text) {
  const s = focusAsk(text).trim();
  return rx("operators", "exclamationEnd").test(s) && !isInterrogative(s);
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
function decideCore({ ask, hits, intent, script, prevDesign, lastHost, measure, priorScale } = {}) {
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
      speak: fill("statement"),
      reason: "statement",
      posterior: 0,
      hypotheses: [],
      eig: 0,
      design: designOf("clarify", "", []),
      downgraded: false
    };
  }

  const cfg = H();
  const model = faqAlignModel();
  const askLen = stripAsk(focused).length;
  const short = askLen > 0 && askLen <= cfg.shortAskLen;
  const list = mergeAlignedHostCards(
    focused,
    lastHost,
    (hits || []).filter((h) => h && (h.title || h.snippet || h.speak))
  );

  const markovKey = prevDesign && (prevDesign.hypothesisId || prevDesign.type);
  const markov = priorScale
    ? priorScale
    : (cfg.markov && (cfg.markov[markovKey] || cfg.markov.default)) || { absent: 1, script: 1, doc: 1 };
  const absentScale = Number(markov.absent) || 1;
  const scriptScale = Number(markov.script) || 1;
  const docScale = Number(markov.doc) || 1;
  const prior0 = cfg.priorAbsent * absentScale;
  const scriptBase = scriptEligible(intent, script) ? cfg.priorScript * scriptScale : 0;
  const priorScript = scriptBase;
  const priorDocMass = Math.max(cfg.priorDocFloor, (1 - cfg.priorAbsent - (scriptEligible(intent, script) ? cfg.priorScript : 0)) * docScale);

  // score 底分几乎是 FAQ 常数，不给先验
  const lifted = list.map((h) => {
    const s = Number(h.score) || 0;
    return s > cfg.scoreLiftAbove ? Math.log1p(s - cfg.scoreLiftBase) : 0;
  });
  const sumW = lifted.reduce((a, b) => a + b, 0) || 1;

  const logUnnorm = [];
  for (let i = 0; i < list.length; i += 1) {
    const h = list[i];
    const title = String(h.title || "");
    const view = bestTitleView(focused, title, model);
    let a = view.align;
    let e = view.extra;
    if (typeof measure === "function") {
      const weighed = measure(focused, view.segment || title) || {};
      if (Number.isFinite(weighed.align)) a = weighed.align;
      if (Number.isFinite(weighed.extra)) e = weighed.extra;
    }
    const ba = cfg.betaAlignYes;
    const bn = cfg.betaAlignNo;
    const ea = cfg.betaExtraYes;
    const en = cfg.betaExtraNo;
    const llrAlign = logBetaPdf(a, ba[0], ba[1]) - logBetaPdf(a, bn[0], bn[1]);
    // 窄度只进入后验，不进入相容过滤。短问的过窄标题靠停止规则挡住，避免似然把假设滤成空集。
    const llrExtra = logBetaPdf(e, ea[0], ea[1]) - logBetaPdf(e, en[0], en[1]);
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

  const logU0 = Math.log(Math.max(prior0, 1e-8));
  const specScale = priorScript > 0 ? scriptLikelihoodScale(intent, cfg) : 1;
  // 特异度只约束「脚本 vs 卡片」，不削弱脚本相对「没有证据」的加成。
  const logUScript = priorScript > 0 ? Math.log(priorScript) + Math.log(cfg.scriptLogBoost) : -Infinity;
  const keptRaw = logUnnorm.filter((x) => x.m >= cfg.matchKeep);
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
      kept: x.m >= cfg.matchKeep,
      p: x.m >= cfg.matchKeep ? post(x.logU) : 0,
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
      const pyA = mass.id === a.id ? cfg.eigHit : mass.id === b.id ? cfg.eigMiss : cfg.eigOther;
      py += pyA * mass.p;
      cond += mass.p * binaryEntropy(pyA);
    }
    return binaryEntropy(py) - cond;
  }

  function bestSplit() {
    let win = null;
    for (let i = 0; i < ranked.length; i += 1) {
      if (ranked[i].p < cfg.pairMinP || !ranked[i].segment) continue;
      for (let j = i + 1; j < ranked.length; j += 1) {
        if (ranked[j].p < cfg.pairMinP || !ranked[j].segment) continue;
        if (ranked[i].segment === ranked[j].segment) continue;
        if (askedPair && pairKey(ranked[i].segment, ranked[j].segment) === askedPair) continue;
        const eig = eigOf(ranked[i], ranked[j]);
        if (!win || eig > win.eig) win = { a: ranked[i], b: ranked[j], eig };
      }
    }
    if (!win || win.eig < cfg.eigMinBits) return null;
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
            h.align >= cfg.probeAlignMin &&
            h.extra < cfg.probeExtraMax &&
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

  if (
    bestSlot &&
    bestSlot.p >= cfg.posteriorMin &&
    bestSlot.p > p0 &&
    (bestSlot.i === best?.i ? bfSecond >= cfg.bayesFactor : true) &&
    bestSlot.align >= cfg.alignMin &&
    bestSlot.speak
  ) {
    const alignFail = bestSlot.i === best?.i && second && second.align > bestSlot.align;
    const tooNarrow =
      (short && bestSlot.extra >= cfg.tooNarrowShortExtra) ||
      (bestSlot.extra >= cfg.tooNarrowExtra && bestSlot.align < cfg.tooNarrowAlign);
    const definitionMismatch =
      isDefinitionSpeak(bestSlot.speak) && !rx("operators", "definitionAsk").test(focused);
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

  const scriptSpeak = String(script || "").trim().slice(0, cfg.scriptSpeakMax);
  const overlapIntents = new Set(cfg.scriptOverlapIntents || []);
  const scriptBeatsCard = !bestSlot || pScript * specScale >= bestSlot.p;
  if (
    pScript > p0 &&
    scriptBeatsCard &&
    scriptSpeak &&
    slotOk(focused, scriptSpeak) &&
    !(overlapIntents.has(intent?.intent) && askSpeakOverlap(focused, scriptSpeak) < cfg.scriptOverlapMin) &&
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

  const downgraded = Boolean(best && best.p >= cfg.posteriorMin && best.speak);
  if (split) {
    return {
      action: "clarify",
      speak: splitQuestion(split.a.segment, split.b.segment),
      reason: best && bfSecond < cfg.bayesFactor ? "ambiguous" : "no_evidence",
      posterior: best ? best.p : p0,
      title: best?.title || "",
      hypotheses,
      eig: split.eig,
      design: designOf("clarify", "", [split.a.segment, split.b.segment]),
      downgraded
    };
  }

  // 上一句已经是资料口播。完整新问不复读后半句，改说这张卡里还没播过的分句。
  const host = usableHost(lastHost);
  const freshQuestion = host && asksNewQuestion(focused);
  if (freshQuestion) {
    const progressed = unspokenProgress(focused, host, ranked);
    if (progressed) {
      return {
        action: "answer",
        speak: progressed.clause,
        reason: "progress",
        posterior: best ? best.p : p0,
        title: progressed.title,
        hypotheses,
        eig: 0,
        design: designOf("answer", progressed.title, [], "final"),
        downgraded,
        speakSource: "progress"
      };
    }
    // 新问已指向另一张卡但未过 posterior 线：念近胜出全文，勿落到 carry
    const switched = cardSwitchAnswer(bestSlot || best, host, hypotheses, downgraded, cfg);
    if (switched) return switched;
  }
  const topic = host ? sharedTopic(focused, host) : "";
  const rest = topic && !freshQuestion ? hostRest(host) : "";
  if (topic && rest) {
    // 换卡 carry 禁令：标题/近胜出已是异卡 → 禁止续播旧口播尾巴
    const switched = cardSwitchAnswer(bestSlot || best, host, hypotheses, downgraded, cfg);
    if (switched) return switched;
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
        downgraded,
        speakSource: "carry"
      };
    }
  }

  // 同一焦点已经问过，或上一句后半句已经说过：交给豆包补一句。
  const focus = topic || ensureFocus();
  if ((topic || sameProbe(prevDesign, focus)) && !(best && best.align >= cfg.alignMin)) {
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
            h.align >= cfg.closedAlignMin &&
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
  const nearTooNarrow =
    best &&
    ((short && best.extra >= cfg.tooNarrowShortExtra) ||
      (best.extra >= cfg.tooNarrowExtra && best.align < cfg.tooNarrowAlign));
  const focusForNear = ensureFocus();
  const nearHoldsFocus =
    !focusForNear ||
    String(best?.segment || "").includes(focusForNear) ||
    String(best?.title || "").includes(focusForNear);
  const near =
    nearHoldsFocus && !nearTooNarrow && best && best.segment && best.align >= cfg.closedAlignMin
      ? String(best.segment).slice(0, cfg.nearMax)
      : "";
  if (near) {
    return {
      action: "clarify",
      speak: fill("near", { near }),
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
      speak: "",
      reason: "no_evidence",
      posterior: p0,
      title: "",
      hypotheses,
      eig: 0,
      design: designOf("clarify", "probe", focus ? [focus] : [], "ask"),
      downgraded
    };
  }

  return {
    action: "clarify",
    speak: "",
    reason: "no_evidence",
    posterior: p0,
    title: "",
    hypotheses,
    eig: 0,
    design: designOf("clarify", "", []),
    downgraded
  };
}

/** 脚本特异度只读 schema，不按 FAQ 正文反查。宽脚本（经营）天然更弱。 */
function scriptLikelihoodScale(intent, cfg) {
  const ref = Number(cfg.scriptSpecificityRef) || 0.35;
  const floor = Number(cfg.scriptSpecMin) || 1;
  const by = cfg.scriptSpecificityByIntent || {};
  const name = String(intent?.intent || "");
  let spec = Number(by[name]);
  if (!Number.isFinite(spec)) spec = Number(cfg.scriptSpecificityDefault);
  if (!Number.isFinite(spec)) spec = ref;
  return Math.max(floor, Math.min(1, spec / ref));
}

function winnerBucketOf(result) {
  if (!result || (result.action !== "answer" && result.reason !== "no_evidence")) return "";
  if (result.reason === "script" && result.action === "answer") return "script";
  if (result.reason === "posterior" && result.action === "answer") return "doc";
  if (result.reason === "no_evidence") return "absent";
  return "";
}

function winnerIdOf(result, intent) {
  if (!result) return "";
  if (result.reason === "script") return String(intent?.intent || "script");
  return String(result.title || "");
}

function weightedMeasure(ask, segment) {
  const { extractWeightedPolarityBigrams, computeAlignmentAndExtra } = require("../../text/universalOperators.cjs");
  const scored = computeAlignmentAndExtra(
    extractWeightedPolarityBigrams(ask),
    extractWeightedPolarityBigrams(segment)
  );
  return { align: scored.align, extra: scored.extra };
}

function shadowPriorScale(prevDesign) {
  const bucket = prevDesign && prevDesign.winnerBucket;
  const table = require("../../knowledge/schemaStore.cjs").load().hyper.shadowMarkov;
  const row = bucket && table && table[bucket];
  if (!row) return { absent: 1, script: 1, doc: 1 };
  return {
    absent: Number(row.absent) || 1,
    script: Number(row.script) || 1,
    doc: Number(row.doc) || 1
  };
}

function attachShadow(args, result) {
  try {
    const { diagnoseShadow } = require("../../knowledge/compiler.cjs");
    const { debugLog } = require("../../platform");
    const { appendDecision } = require("../../runtime/decisionLog.cjs");
    const shadow = diagnoseShadow({
      ask: args && args.ask,
      title: result && result.title,
      speak: result && result.speak,
      align: result && result.align,
      extra: result && result.extra
    });
    const bucket = winnerBucketOf(result);
    const formalId = winnerIdOf(result, args && args.intent);
    result.winnerBucket = bucket;
    if (result.design) result.design.winnerBucket = bucket;
    let shadowAction = "";
    let shadowWinner = "";
    let shadowSpeak = "";
    let isDiverged = false;
    try {
      const alt = decideCore({
        ask: args && args.ask,
        hits: args && args.hits,
        intent: args && args.intent,
        script: args && args.script,
        prevDesign: args && args.prevDesign,
        lastHost: args && args.lastHost,
        measure: weightedMeasure,
        priorScale: shadowPriorScale(args && args.prevDesign)
      });
      shadowAction = alt.action || "";
      shadowWinner = winnerIdOf(alt, args && args.intent);
      shadowSpeak = shadowAction === "answer" ? String(alt.speak || "").trim() : "";
      isDiverged = shadowAction !== result.action || shadowWinner !== formalId;
    } catch (_) {
      shadowAction = "";
      shadowWinner = "";
      shadowSpeak = "";
      isDiverged = false;
    }
    const intent = args && args.intent;
    const report = {
      ...shadow,
      winnerBucket: bucket,
      formalAction: result.action,
      formalWinnerId: formalId,
      shadowAction,
      shadowWinner,
      shadowSpeak,
      isDiverged,
      doubaoConfidence: intent && intent.source === "llm" ? Number(intent.confidence) || 0 : null
    };
    result.shadow = report;
    debugLog.info("Strategy", "编译影子", report);
    appendDecision(args && args.meetingId, {
      winnerBucket: bucket,
      intent: intent && intent.intent ? String(intent.intent) : "",
      doubaoConfidence: report.doubaoConfidence,
      action: result.action,
      winnerId: formalId,
      reason: result.reason || ""
    });
  } catch (_) {
    /* 影子失败不影响开口 */
  }
}

function decideSpeak(args) {
  const result = decideCore(args || {});
  attachShadow(args || {}, result);
  return result;
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
  offlineFollow,
  decideSpeak
};
