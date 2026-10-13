/** Wiki Query：打分与整页召回 */
const { normalizeText } = require("./parse.cjs");
const { listConceptPages, parseIndexEntries, getPageBySlug } = require("./catalog.cjs");

const DEFINITION_FOCUS = [
  "ai测评",
  "abcmouse",
  "abc说",
  "teacher说",
  "family说",
  "四端联动",
  "一园两制",
  "收益保障",
  "八大核心权益",
  "八大权益",
  "全园美语",
  "菲教",
  "成果展"
].sort((a, b) => b.length - a.length);

function definitionFocus(qn) {
  if (!/(什么是|是什么|介绍一下|介绍下|能介绍)/.test(qn)) return "";
  for (const e of DEFINITION_FOCUS) {
    if (qn.includes(e)) return e;
  }
  return "";
}

/** 中文问句切成 2–4 字片 + 英文词，避免整句当一个 token */
function queryTokens(query) {
  const q = String(query || "");
  const out = new Set();
  const latin = q.match(/[A-Za-z0-9][A-Za-z0-9.\-]{1,}/g) || [];
  for (const t of latin) out.add(t.toLowerCase());
  const cjk = q.replace(/[^\u4e00-\u9fff]/g, "");
  for (let n = 2; n <= 4; n++) {
    for (let i = 0; i + n <= cjk.length; i++) out.add(cjk.slice(i, i + n));
  }
  // 整句（短问）
  const compact = normalizeText(q);
  if (compact.length >= 4 && compact.length <= 24) out.add(compact);
  return [...out];
}

/**
 * 关键词 + 别名打分（无需 embedding 的快速 Query）
 * @param {string} query
 * @param {number} [topK]
 */
function scorePagesForQuery(query, topK = 3) {
  const q = String(query || "").trim();
  const qn = normalizeText(q);
  if (!qn) return [];
  const pages = listConceptPages();
  const indexMap = new Map(parseIndexEntries().map((e) => [e.slug, e]));
  const tokens = queryTokens(q);

  const scored = pages.map((p) => {
    const idx = indexMap.get(p.slug);
    const aliases = [...new Set([...(p.aliases || []), ...(idx?.aliases || [])])];
    const titleN = normalizeText(p.title);
    const speakN = normalizeText(p.speak);
    const factsN = normalizeText(p.facts);
    const blurbN = normalizeText(idx?.blurb || "");
    // 检索正文：不含 aliases，避免「别名在 hay 里永远命中」虚高
    const hay = titleN + speakN + factsN + blurbN;
    let score = 0;

    if (qn.length >= 4 && hay.includes(qn)) score += 12;
    if (titleN && (qn.includes(titleN) || titleN.includes(qn))) score += 10;

    let bestAlias = 0;
    for (const a of aliases) {
      const an = normalizeText(a);
      if (an.length < 2) continue;
      if (qn === an) bestAlias = Math.max(bestAlias, 14);
      else if (qn.includes(an) && an.length >= 3) bestAlias = Math.max(bestAlias, 10);
      else if (an.includes(qn) && qn.length >= 4) bestAlias = Math.max(bestAlias, 8);
      else {
        // 「怎么/如何…」类别名：用去前缀核心短语匹配
        const core = an.replace(/^(怎么|如何|怎样|什么是|是不是|能否|可否)/, "");
        if (core.length >= 4 && qn.includes(core)) bestAlias = Math.max(bestAlias, 9);
      }
    }
    score += bestAlias;

    let tokenHits = 0;
    for (const t of tokens) {
      if (t.length < 2) continue;
      if (titleN.includes(t)) tokenHits += t.length >= 3 ? 3 : 1;
      else if (speakN.includes(t) || factsN.includes(t)) tokenHits += t.length >= 3 ? 2 : 1;
    }
    score += Math.min(16, tokenHits);

    // 「什么是 X」只抬标题/问法就是 X 的页，正文顺带提到的页降权
    const focus = definitionFocus(qn);
    if (focus) {
      const aliasHit = aliases.some((a) => {
        const an = normalizeText(a);
        return an.includes(focus) && an.length <= focus.length + 8;
      });
      const titleHit = titleN.includes(focus) && titleN.length <= focus.length + 16;
      if (titleHit || aliasHit) score += 20;
      else if (speakN.includes(focus) || factsN.includes(focus)) score -= 8;
    }

    // 主题锚点：问句与词条共享经营关键词才加分
    const anchors = [
      ["收益", "保障", "退差", "盈利", "39000", "3万9"],
      ["四端", "联动"],
      ["菲教", "外教", "25分钟"],
      ["一园两制", "普通生", "全美语"],
      ["行事历", "落地", "申请"],
      ["成长案例", "记录成长", "成果展"],
      ["八大", "权益", "1.3"],
      ["招生", "1.8万", "引擎"],
      ["增值", "150", "500", "1800"],
      ["服务半径", "250", "156", "1.3"],
      ["abcmouse", "abc说", "teacher", "family", "ai测评"]
    ];
    const qLow = qn;
    const pLow = titleN + speakN;
    for (const group of anchors) {
      const qHit = group.some((k) => qLow.includes(normalizeText(k)));
      const pHit = group.some((k) => pLow.includes(normalizeText(k)));
      if (qHit && pHit) score += 6;
    }

    return { ...p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const minScore = 6;
  return scored.filter((x) => x.score >= minScore).slice(0, Math.max(1, topK));
}

/**
 * 会中 Query：返回整页上下文（优先）
 * @param {string} query
 * @param {number} [topK]
 */
function synthesizeEightBenefits() {
  const page = getPageBySlug("eight-core-benefits");
  const speak =
    (page?.speak ||
      "八大权益含 ABCmouse、ABC说、AI测评、线上菲教、Teacher说、Family说、美语成果展，以及约 1.3 倍账号空间。").slice(
      0,
      80
    );
  return {
    title: page?.title || "八大核心权益",
    slug: "eight-core-benefits",
    score: 22,
    snippet: speak,
    speak,
    bounds: page?.bounds || "",
    source: "wiki",
    body: page?.body || speak
  };
}

function queryWiki(query, topK = 3) {
  const qn = normalizeText(query);
  if (/八大(核心)?权益|有哪些权益/.test(String(query || "")) || qn.includes("八大权益")) {
    const eight = synthesizeEightBenefits();
    const rest = scorePagesForQuery(query, topK).filter((h) => h.slug !== "eight-core-benefits");
    const expanded = [eight, ...rest].slice(0, Math.max(1, topK));
    return {
      hits: expanded.map((h) => ({
        title: h.title,
        slug: h.slug,
        score: h.score,
        snippet: h.speak || h.snippet || "",
        speak: h.speak || "",
        bounds: h.bounds || "",
        source: "wiki",
        body: h.body
      })),
      preview: `【词条1·${eight.title}】\n口播：${eight.speak}\n事实：${(getPageBySlug("eight-core-benefits")?.facts || "").slice(0, 500)}`,
      speakHint: eight.speak,
      mode: "wiki"
    };
  }
  const hits = scorePagesForQuery(query, topK);
  if (!hits.length) {
    return { hits: [], preview: "", speakHint: "", mode: "wiki-empty" };
  }

  // 展开相关页（最多再补 1 页）
  const bySlug = new Map(listConceptPages().map((p) => [p.slug, p]));
  const expanded = [...hits];
  if (hits[0]?.related?.length && expanded.length < topK) {
    for (const rel of hits[0].related) {
      if (expanded.some((h) => h.slug === rel)) continue;
      const p = bySlug.get(rel);
      if (p) {
        expanded.push({ ...p, score: (hits[0].score || 1) * 0.5 });
        if (expanded.length >= topK) break;
      }
    }
  }

  const preview = expanded
    .map((h, i) => {
      return (
        `【词条${i + 1}·${h.title}·${h.slug}】\n` +
        `口播：${h.speak || ""}\n` +
        `事实：${(h.facts || "").slice(0, 500)}\n` +
        `边界：${(h.bounds || "").slice(0, 280)}`
      );
    })
    .join("\n\n")
    .slice(0, 3600);

  return {
    hits: expanded.map((h) => ({
      title: h.title,
      slug: h.slug,
      score: h.score,
      snippet: h.speak || h.summary || "",
      speak: h.speak || "",
      bounds: h.bounds || "",
      source: "wiki",
      body: h.body
    })),
    preview,
    speakHint: hits[0]?.speak || "",
    mode: "wiki"
  };
}

/**
 * 供向量索引：每页一条（用 summary 做 embed 文本，检索后再取整页）
 */
function getWikiIndexChunks() {
  return listConceptPages().map((p) => ({
    id: `wiki:${p.slug}`,
    title: p.title,
    body: [p.speak, p.facts, p.bounds, (p.aliases || []).join("；")]
      .filter(Boolean)
      .join("\n")
      .slice(0, 1800),
    source: "wiki",
    slug: p.slug,
    speak: p.speak,
    fullBody: p.body
  }));
}

function matchConceptForQuestion(question) {
  const hits = scorePagesForQuery(question, 1);
  if (!hits.length || hits[0].score < 3) return null;
  return hits[0];
}

module.exports = {
  definitionFocus,
  queryTokens,
  scorePagesForQuery,
  synthesizeEightBenefits,
  queryWiki,
  getWikiIndexChunks,
  matchConceptForQuestion
};
