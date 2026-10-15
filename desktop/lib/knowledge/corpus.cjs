/**
 * Meeting knowledge + 大智 system prompt loader (local files).
 * 检索：闭题可用 FAQ；复杂问走语义 RAG（semanticRag）或经营顾问，关键词作降级。
 */
const fs = require("fs");
const path = require("path");
const { normalizeForMatch, detectWake, isIntroSelfTalk, extractFloorLines } = require("../duplex");
const { knowledgeReadRoot } = require("../platform/appPaths.cjs");

function promptFile() {
  return path.join(knowledgeReadRoot(), "li-laoshi-system-prompt.txt");
}
function faqFile() {
  return path.join(knowledgeReadRoot(), "faq-meeting.txt");
}
function kbFile() {
  return path.join(knowledgeReadRoot(), "quan-yuan-meiyu.txt");
}

const DEFAULT_AGENDA = "全园美语系统教研会：四端联动、校园经营与家园共育";

let cachedPrompt = null;
let cachedKb = null;
let cachedFaq = null;
let kbSections = null;
let faqSections = null;

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
    const title = (t.split("\n")[0] || "").replace(/^#+\s*/, "").slice(0, 80);
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
  return faqSections;
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
  const glued = q.match(/(?:针对上一答|追问)[^：:]{0,80}[：:]\s*(.{4,80})$/);
  if (glued) q = normalizeForMatch(glued[1]);
  if (!q || q.length < 2) return null;
  const r = retrieveKnowledge(q, 3);
  const faqHits = (r.hits || []).filter((h) => h.source === "faq");
  if (!faqHits.length) return null;

  const qn = q.replace(/\s+/g, "");
  const entities = [
    "四端联动",
    "四端",
    "一园两制",
    "三笔账",
    "全园美语",
    "收益保障",
    "AI测评",
    "八大核心",
    "会议主题",
    "3900",
    "39000",
    "三万九",
    "菲教",
    "非教",
    "ABCmouse",
    "Teacher说",
    "Family说"
  ];
  // 意图互斥：区别问不得命中收费条；收费问不得命中区别条
  const diffAsk = /区别|优势|培训班|少儿英语培训/.test(qn) && !/怎么收费|收费多少|多少钱|三万九|39000/.test(qn);
  const priceAsk = /三万九|39000|买的是什么|项目多少钱|怎么收费|收费多少|要收多少|出多少钱|怎么收钱|如何收费/.test(
    qn
  );
  const condAsk = /条件|具备/.test(qn);
  const enrollAsk = /说服家长|家长报名|如何招生/.test(qn);
  const launchAsk = /开办|如何做|落地|签约到/.test(qn) && !priceAsk;
  let best = null;
  for (const hit of faqHits) {
    if ((hit.score || 0) < 22) continue;
    const tn = normalizeForMatch(hit.title || "").replace(/\s+/g, "");
    const titlePrice = /怎么收费|如何收费|收费多少|多少钱|三万九|39000|3900/.test(tn);
    const titleDiff = /区别|优势|培训班/.test(tn);
    const titleCond = /条件|具备/.test(tn);
    const titleEnroll = /说服家长|家长报名|招生怎么破局|怎么用美语招生/.test(tn);
    const titleLaunch = /签约到落地|要准备|开办|具体要如何做|落地前/.test(tn);
    if (priceAsk && /在吗|有没有在听/.test(tn)) continue;
    if (diffAsk && titlePrice && !titleDiff) continue;
    if (priceAsk && titleDiff && !titlePrice) continue;
    if (condAsk && titlePrice && !titleCond) continue;
    if (enrollAsk && titlePrice && !titleEnroll) continue;
    if (launchAsk && titlePrice && !titleLaunch) continue;
    let score = hit.score || 0;
    if (/(什么是|是什么|介绍)/.test(qn)) {
      const focus = entities.find((e) => qn.includes(e));
      if (focus && !tn.includes(focus)) continue;
    }
    const specificAsk =
      /普惠|条件|专业|培训班|区别|教育局|赚钱|营收|收费|太贵|付不起|信心|支持|开办|说服家长|不敢开口|开口|认可/.test(
        qn
      );
    const genericDef = /全园美语是什么|什么是全园美语/.test(tn);
    if (specificAsk && genericDef && !/(是什么|什么是)/.test(qn)) score -= 80;
    // 意图对齐加分
    if (diffAsk && titleDiff) score += 55;
    if (priceAsk && titlePrice) score += 55;
    if (condAsk && titleCond) score += 50;
    if (enrollAsk && titleEnroll) score += 50;
    if (launchAsk && titleLaunch) score += 50;
    for (const e of entities) {
      if (qn.includes(e) && tn.includes(e.replace(/联动$/, ""))) {
        if (genericDef && specificAsk) continue;
        // 「全园美语」 alone 不再强抬收费条（区别问已互斥跳过）
        if (e === "全园美语" && titlePrice && !priceAsk) continue;
        score += e === "全园美语" ? 12 : 40;
        break;
      }
    }
    if (qn.length >= 4 && tn.includes(qn.slice(0, Math.min(8, qn.length)))) score += 20;
    // 关键词软重叠：说服/报名/条件/开办
    for (const kw of ["说服家长", "家长报名", "具备什么条件", "什么条件", "具体要如何做", "如何做", "区别与优势", "区别和优势"]) {
      if (qn.includes(kw.replace(/与|和/g, "")) || (kw.length >= 4 && qn.includes(kw.slice(0, 4)))) {
        if (tn.includes(kw.slice(0, 4)) || tn.includes(kw.replace(/与|和/g, ""))) score += 25;
      }
    }
    if (!best || score > best._s) best = { ...hit, _s: score };
  }
  if (!best || (best._s || 0) < 22) return null;
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
  const boosts = [
    "全园美语",
    "ABCmouse",
    "ABC说",
    "菲教",
    "招生",
    "一园两制",
    "AI测评",
    "家园",
    "四端",
    "3900",
    "39000",
    "三万九",
    "三笔账",
    "收益保障",
    "会议主题"
  ];
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
  extractFaqSpeakText,
  knowledgeStatus,
  detectWake,
  isIntroSelfTalk,
  extractFloorLines
};
