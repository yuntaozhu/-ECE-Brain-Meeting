/**
 * Meeting knowledge + 大智 system prompt loader (local files).
 * 检索：闭题可用 FAQ；复杂问走语义 RAG（semanticRag）或经营顾问，关键词作降级。
 */
const fs = require("fs");
const path = require("path");
const { normalizeForMatch, detectWake, isIntroSelfTalk, extractFloorLines } = require("../duplex");
const { knowledgeReadRoot } = require("../platform/appPaths.cjs");
const { alignScore, buildDf } = require("./align.cjs");
const { load, rx } = require("./schemaStore.cjs");

function faqPat(name) {
  return rx("faq", name);
}

const DEFAULT_AGENDA = load().faq.defaultAgenda;

function promptFile() {
  return path.join(knowledgeReadRoot(), "li-laoshi-system-prompt.txt");
}
function faqFile() {
  return path.join(knowledgeReadRoot(), "faq-meeting.txt");
}
function kbFile() {
  return path.join(knowledgeReadRoot(), "quan-yuan-meiyu.txt");
}

let cachedPrompt = null;
let cachedKb = null;
let cachedFaq = null;
let kbSections = null;
let faqSections = null;
let faqAlignModel = null;

function readUtf8(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (err) {
    return null;
  }
}

function getSystemPrompt() {
  if (cachedPrompt) return cachedPrompt;
  cachedPrompt = readUtf8(promptFile()) || "你是李老师 AI 专家助手。";
  return cachedPrompt;
}

function getKnowledgeRaw() {
  if (cachedKb != null) return cachedKb;
  cachedKb = readUtf8(kbFile()) || "";
  return cachedKb;
}

function getFaqRaw() {
  if (cachedFaq != null) return cachedFaq;
  cachedFaq = readUtf8(faqFile()) || "";
  return cachedFaq;
}

function splitSections(raw) {
  const text = String(raw || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parts = text.split(/\n(?=#{1,3}\s)/);
  const out = [];
  for (const p of parts) {
    const t = p.trim();
    if (t.length < 40) continue;
    const title = (t.split("\n")[0] || "").replace(/^#+\s*/, "").trim();
    out.push({ title, body: t.slice(0, 2500) });
  }
  return out.length ? out : [{ title: "全库", body: text.slice(0, 4000) }];
}

function getSections() {
  if (kbSections) return kbSections;
  kbSections = splitSections(getKnowledgeRaw()).map((s) => ({ ...s, source: "kb" }));
  return kbSections;
}

function getFaqSections() {
  if (faqSections) return faqSections;
  const raw = getFaqRaw();
  if (!raw || raw.length < 40) {
    faqSections = [];
    return faqSections;
  }
  faqSections = splitSections(raw).map((s) => ({ ...s, source: "faq" }));
  faqAlignModel = buildDf(faqSections.map((s) => s.title || ""));
  return faqSections;
}

function alignModel() {
  getFaqSections();
  return faqAlignModel || buildDf([]);
}

function scoreSection(sec, keys, q) {
  let score = 0;
  const low = sec.body.toLowerCase();
  const title = sec.title || "";
  for (const k of keys) {
    const kk = k.toLowerCase();
    if (title.includes(k)) score += 5;
    try {
      const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const m = sec.body.match(re);
      if (m) score += Math.min(8, m.length);
    } catch (_) {
      /* ignore bad token */
    }
    if (low.includes(kk)) score += 1;
  }
  // FAQ 优先加权；标题含 Q: 再加分
  if (sec.source === "faq") {
    score += 12;
    if (/^Q:/i.test(title.trim()) || /Q:/.test(title)) score += 4;
  }
  // 问句与 FAQ 标题高度重叠
  const qn = normalizeForMatch(q).replace(/\s+/g, "");
  const tn = normalizeForMatch(title).replace(/\s+/g, "");
  if (qn.length >= 4 && tn.length >= 4) {
    if (tn.includes(qn.slice(0, Math.min(12, qn.length))) || qn.includes(tn.slice(0, Math.min(12, tn.length)))) {
      score += sec.source === "faq" ? 20 : 6;
    }
  }
  // 标题结构对齐：不靠意图词表，高频标题二元组在 align 里已降权
  if (sec.source === "faq" && title) {
    score += Math.round(alignScore(q, title, alignModel()) * 100);
  }
  return score;
}

/**
 * 从 FAQ 块中抽出可口播的 A: 正文。
 * @param {string} body
 */
function extractFaqSpeakText(body) {
  const text = String(body || "").replace(/\r\n/g, "\n");
  const m = text.match(/(?:^|\n)A[:：]\s*([\s\S]+)/i);
  if (!m) return "";
  return m[1]
    .split(/\n##\s/)[0]
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

/**
 * FAQ 强命中候选（是否直出由 queryRewrite.shouldFaqInstant 决定）。
 * 闭题句优先按标题实体重叠选中，避免粘连句误命中「全园美语是什么」。
 */
function matchFaqInstant(query) {
  let q = normalizeForMatch(String(query || "").trim());
  const glued = q.match(faqPat("gluedTail"));
  if (glued) q = normalizeForMatch(glued[1]);
  if (!q || q.length < 2) return null;
  const r = retrieveKnowledge(q, 3);
  const faqHits = (r.hits || []).filter((h) => h.source === "faq");
  if (!faqHits.length) return null;

  const qn = q.replace(/\s+/g, "");
  const cfg = load().faq;
  const entities = cfg.entities || [];
  const diffAsk = faqPat("diffAsk").test(qn) && !faqPat("diffAskNot").test(qn);
  const priceAsk = faqPat("priceAsk").test(qn);
  const condAsk = faqPat("condAsk").test(qn);
  const enrollAsk = faqPat("enrollAsk").test(qn);
  const launchAsk = faqPat("launchAsk").test(qn) && !priceAsk;
  let best = null;
  for (const hit of faqHits) {
    if ((hit.score || 0) < cfg.minScore) continue;
    const tn = normalizeForMatch(hit.title || "").replace(/\s+/g, "");
    const titlePrice = faqPat("titlePrice").test(tn);
    const titleDiff = faqPat("titleDiff").test(tn);
    const titleCond = faqPat("titleCond").test(tn);
    const titleEnroll = faqPat("titleEnroll").test(tn);
    const titleLaunch = faqPat("titleLaunch").test(tn);
    if (priceAsk && faqPat("presence").test(tn)) continue;
    if (diffAsk && titlePrice && !titleDiff) continue;
    if (priceAsk && titleDiff && !titlePrice) continue;
    if (condAsk && titlePrice && !titleCond) continue;
    if (enrollAsk && titlePrice && !titleEnroll) continue;
    if (launchAsk && titlePrice && !titleLaunch) continue;
    let score = hit.score || 0;
    if (faqPat("definitionCue").test(qn)) {
      const focus = entities.find((e) => qn.includes(e));
      if (focus && !tn.includes(focus)) continue;
    }
    const specificAsk = faqPat("specificAsk").test(qn);
    const genericDef = faqPat("genericDef").test(tn);
    if (specificAsk && genericDef && !faqPat("defMark").test(qn)) score -= cfg.specificPenalty;
    if (diffAsk && titleDiff) score += cfg.intentBoost;
    if (priceAsk && titlePrice) score += cfg.intentBoost;
    if (condAsk && titleCond) score += cfg.pairBoost;
    if (enrollAsk && titleEnroll) score += cfg.pairBoost;
    if (launchAsk && titleLaunch) score += cfg.pairBoost;
    for (const e of entities) {
      if (qn.includes(e) && tn.includes(e.replace(/联动$/, ""))) {
        if (genericDef && specificAsk) continue;
        if (e === cfg.genericEntity && titlePrice && !priceAsk) continue;
        score += e === cfg.genericEntity ? cfg.genericBoost : cfg.entityBoost;
        break;
      }
    }
    if (qn.length >= 4 && tn.includes(qn.slice(0, Math.min(cfg.titleSlice, qn.length)))) score += cfg.overlapBoost;
    for (const kw of cfg.softKeywords || []) {
      if (qn.includes(kw.replace(/与|和/g, "")) || (kw.length >= 4 && qn.includes(kw.slice(0, 4)))) {
        if (tn.includes(kw.slice(0, 4)) || tn.includes(kw.replace(/与|和/g, ""))) score += cfg.softBoost;
      }
    }
    if (!best || score > best._s) best = { ...hit, _s: score };
  }
  if (!best || (best._s || 0) < cfg.minScore) return null;
  const sec = getFaqSections().find((s) => s.title === best.title) || null;
  const answer = extractFaqSpeakText(sec?.body || best.snippet || "");
  if (!answer || answer.length < 4) return null;
  return { answer, title: best.title, score: best._s };
}

/**
 * Lightweight keyword retrieval：FAQ 优先，详版兜底。
 * @param {string} query
 * @param {number} [topK]
 */
function retrieveKnowledge(query, topK = 3) {
  const q = normalizeForMatch(String(query || "").trim());
  if (!q) return { hits: [], preview: "", fromFaq: false };
  const tokens = q
    .replace(/[，。！？、；：""''（）\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 12);
  const extra = [];
  const boosts = load().faq.boosts || [];
  for (const b of boosts) {
    if (q.includes(b)) extra.push(b);
  }
  const keys = [...new Set([...tokens, ...extra])];

  const faqList = getFaqSections();
  const kbList = getSections();

  if (!keys.length) {
    if (faqList.length) {
      const head = faqList.slice(0, Math.min(2, topK));
      const preview = head.map((h, i) => `【FAQ${i + 1}·${h.title}】\n${h.body.slice(0, 500)}`).join("\n\n");
      return {
        hits: head.map((h) => ({
          title: h.title,
          score: 1,
          snippet: h.body.slice(0, 400),
          source: "faq"
        })),
        preview: preview.slice(0, 1200),
        fromFaq: true
      };
    }
    const head = getKnowledgeRaw().slice(0, 800);
    return { hits: [{ title: "概览", score: 1, snippet: head, source: "kb" }], preview: head, fromFaq: false };
  }

  const scoreAll = (list) =>
    list
      .map((sec) => ({ ...sec, score: scoreSection(sec, keys, q) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

  const faqHits = scoreAll(faqList);
  const kbHits = scoreAll(kbList);

  // 先填 FAQ，不足再用详版补齐
  const merged = [];
  for (const h of faqHits) {
    if (merged.length >= topK) break;
    merged.push(h);
  }
  for (const h of kbHits) {
    if (merged.length >= topK) break;
    merged.push(h);
  }

  if (!merged.length) {
    if (faqList[0]) {
      const h = faqList[0];
      return {
        hits: [{ title: h.title, score: 0, snippet: h.body.slice(0, 400), source: "faq" }],
        preview: h.body.slice(0, 800),
        fromFaq: true
      };
    }
    const head = getKnowledgeRaw().slice(0, 800);
    return { hits: [{ title: "概览", score: 0, snippet: head, source: "kb" }], preview: head, fromFaq: false };
  }

  const fromFaq = merged.some((h) => h.source === "faq");
  const bodyCap = topK <= 1 ? 700 : 900;
  const previewCap = topK <= 1 ? 900 : 4500;
  const preview = merged
    .map((h, i) => {
      const tag = h.source === "faq" ? "FAQ" : "资料";
      return `【${tag}${i + 1}·${h.title}】\n${h.body.slice(0, bodyCap)}`;
    })
    .join("\n\n");

  return {
    hits: merged.map((h) => ({
      title: h.title,
      score: h.score,
      snippet: h.body.slice(0, 400),
      source: h.source || "kb"
    })),
    preview: preview.slice(0, previewCap),
    fromFaq,
    instantAnswer:
      fromFaq && merged[0]?.source === "faq" && (merged[0].score || 0) >= 45
        ? extractFaqSpeakText(merged[0].body)
        : ""
  };
}

function knowledgeStatus() {
  const promptOk = Boolean(readUtf8(promptFile()));
  const kb = getKnowledgeRaw();
  const faq = getFaqRaw();
  return {
    promptOk,
    kbOk: kb.length > 100,
    kbChars: kb.length,
    faqOk: faq.length > 40,
    faqChars: faq.length,
    sections: getSections().length,
    faqSections: getFaqSections().length,
    agendaDefault: DEFAULT_AGENDA,
    promptPath: promptFile(),
    faqPath: faqFile(),
    kbPath: kbFile()
  };
}

module.exports = {
  DEFAULT_AGENDA,
  getSystemPrompt,
  getKnowledgeRaw,
  getFaqRaw,
  retrieveKnowledge,
  matchFaqInstant,
  getFaqSections,
  extractFaqSpeakText,
  knowledgeStatus,
  detectWake,
  isIntroSelfTalk,
  extractFloorLines
};
