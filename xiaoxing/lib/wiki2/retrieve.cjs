"use strict";

const { loadOrBuildIndex, tokenize } = require("./buildIndex.cjs");

function bm25Score(queryToks, docToks, df, nDocs, k1 = 1.2, b = 0.75) {
  if (!queryToks.length || !docToks.length) return 0;
  const tfMap = {};
  for (const t of docToks) tfMap[t] = (tfMap[t] || 0) + 1;
  const avgdl = 48;
  const dl = docToks.length;
  let score = 0;
  for (const q of queryToks) {
    const tf = tfMap[q] || 0;
    if (!tf) continue;
    const n = df[q] || 0;
    const idf = Math.log(1 + (nDocs - n + 0.5) / (n + 0.5));
    score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * dl) / avgdl)));
  }
  return score;
}

/**
 * Fast Read：无 LLM。无正分命中返回 wiki2-empty（禁止兜底无关页）
 */
function retrieveWiki2(query, opts = {}) {
  const t0 = Date.now();
  const q = String(query || "").trim();
  if (!q) {
    return { hits: [], evidence: [], preview: "", ms: 0, mode: "empty", page_count: 0 };
  }
  const index = loadOrBuildIndex();
  const pages = index.pages || [];
  const qToks = tokenize(q);
  const nDocs = index.n_docs || pages.length || 1;
  const df = index.df || {};
  const backlinks = index.backlinks || {};

  const scored = pages.map((p) => {
    let score = bm25Score(qToks, p.tokens || tokenize(p.search_text), df, nDocs);
    const blob = `${p.title} ${(p.aliases || []).join(" ")}`.toLowerCase();
    for (const t of qToks) {
      if (blob.includes(t)) score += 1.5;
    }
    if (String(p.snapshot || "").includes(q.slice(0, 8))) score += 0.8;
    return { page: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topK = Number(opts.topK) || 3;
  let top = scored.filter((s) => s.score > 0).slice(0, topK);
  if (!top.length) {
    return {
      hits: [],
      evidence: [],
      preview: "",
      ms: Date.now() - t0,
      mode: "wiki2-empty",
      page_count: pages.length
    };
  }

  const expand = opts.expandHops !== 0;
  const seen = new Set(top.map((t) => t.page.id));
  if (expand) {
    const byId = Object.fromEntries(pages.map((p) => [p.id, p]));
    const slugToId = {};
    for (const p of pages) {
      slugToId[p.slug] = p.id;
      for (const a of p.aliases || []) slugToId[String(a).toLowerCase()] = p.id;
    }
    for (const hit of [...top]) {
      for (const link of hit.page.links_to || []) {
        const tid = slugToId[link] || slugToId[String(link).toLowerCase()];
        if (tid && !seen.has(tid) && byId[tid]) {
          seen.add(tid);
          top.push({ page: byId[tid], score: hit.score * 0.55, hop: 1 });
        }
      }
      for (const bid of backlinks[hit.page.id] || []) {
        if (!seen.has(bid) && byId[bid]) {
          seen.add(bid);
          top.push({ page: byId[bid], score: hit.score * 0.45, hop: 1 });
        }
      }
    }
    top.sort((a, b) => b.score - a.score);
    top = top.slice(0, topK + 2);
  }

  const evidence = top.map(({ page, score, hop }) => ({
    id: page.id,
    slug: page.slug,
    title: page.title,
    score: Math.round(score * 1000) / 1000,
    hop: hop || 0,
    snapshot: page.snapshot || page.speak || "",
    speak: page.speak || "",
    sources: page.sources || []
  }));

  const preview = evidence
    .map((e) => `【${e.title}】${e.snapshot || e.speak || ""}`)
    .join("\n");

  return {
    hits: evidence,
    evidence,
    preview,
    ms: Date.now() - t0,
    mode: "wiki2",
    page_count: pages.length
  };
}

/**
 * 适配旧 scorePagesForQuery 形状，供 ask / suggest 复用
 */
function scorePagesWiki2(query, topK = 3) {
  const r = retrieveWiki2(query, { topK, expandHops: 1 });
  if (r.mode === "wiki2-empty" || !r.hits?.length) return [];
  // 把 BM25 分数映射到与旧启发式相近的量级（约 0–40）
  return r.hits.map((h) => ({
    slug: h.slug,
    title: h.title,
    speak: h.speak || h.snapshot,
    facts: "",
    sources: h.sources || [],
    aliases: [],
    // 映射到与旧启发式相近的 0–40 量级，避免 UI 分数爆炸
    score: Math.min(40, Math.round(h.score * 1.2 + (h.hop ? 2 : 8))),
    hop: h.hop || 0,
    mode: "wiki2"
  }));
}

module.exports = { retrieveWiki2, scorePagesWiki2, bm25Score };
