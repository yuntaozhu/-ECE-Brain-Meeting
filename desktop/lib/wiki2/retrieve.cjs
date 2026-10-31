"use strict";

const { loadOrBuildIndex, tokenize } = require("./buildIndex.cjs");

function bm25Score(queryToks, docToks, df, nDocs, k1 = 1.2, b = 0.75) {
  if (!queryToks.length || !docToks.length) return 0;
  const tfMap = {};
  for (const t of docToks) tfMap[t] = (tfMap[t] || 0) + 1;
  const avgdl = 40;
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
 * Fast Read：无 LLM。返回 Snapshot + Active/Superseded 摘要。
 * @param {string} query
 * @param {{ topK?: number, expandHops?: number }} [opts]
 */
function retrieveWiki2(query, opts = {}) {
  const t0 = Date.now();
  const q = String(query || "").trim();
  if (!q) {
    return { hits: [], evidence: [], preview: "", ms: 0, mode: "empty" };
  }
  const index = loadOrBuildIndex();
  const pages = index.pages || [];
  const qToks = tokenize(q);
  const nDocs = index.n_docs || pages.length || 1;
  const df = index.df || {};
  const backlinks = index.backlinks || {};

  const scored = pages.map((p) => {
    let score = bm25Score(qToks, p.tokens || tokenize(p.search_text), df, nDocs);
    // 标题/别名精确加权
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
  if (!top.length) top = scored.slice(0, Math.min(1, scored.length)).filter((s) => s.page);

  // 1-hop 扩展：从命中页的 links / backlinks 拉 Snapshot
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
    title: page.title,
    type: page.type,
    score: Math.round(score * 1000) / 1000,
    hop: hop || 0,
    snapshot: page.snapshot || "",
    active_claims: (page.active_claims || []).slice(0, 3),
    superseded_claims: (page.superseded_claims || []).slice(0, 2)
  }));

  const preview = evidence
    .map((e) => {
      const act = (e.active_claims || [])
        .map((c) => `· ${c.id}: ${c.statement}`)
        .join("\n");
      const sup = (e.superseded_claims || [])
        .map((c) => `· 已否决 ${c.id}: ${c.statement}${c.reason_for_rejection ? `（${c.reason_for_rejection}）` : ""}`)
        .join("\n");
      return (
        `【${e.title}】\n` +
        `Snapshot: ${e.snapshot}\n` +
        (act ? `Active:\n${act}\n` : "") +
        (sup ? `Superseded:\n${sup}` : "")
      );
    })
    .join("\n\n")
    .slice(0, 2400);

  return {
    hits: evidence,
    evidence,
    preview,
    ms: Date.now() - t0,
    mode: "wiki2-fast",
    page_count: pages.length
  };
}

/**
 * 供副驾驶注入的紧凑 facts 列表。
 */
function wiki2EvidenceFacts(query, opts = {}) {
  const r = retrieveWiki2(query, opts);
  const facts = [];
  for (const e of r.evidence || []) {
    if (e.snapshot) facts.push(e.snapshot.slice(0, 100));
    for (const c of e.active_claims || []) {
      facts.push(`[${c.id}] ${String(c.statement || "").slice(0, 72)}`);
    }
    for (const c of e.superseded_claims || []) {
      const why = c.reason_for_rejection ? `；原因：${c.reason_for_rejection}` : "";
      facts.push(`[否决·${c.id}] ${String(c.statement || "").slice(0, 56)}${why}`.slice(0, 100));
    }
  }
  return {
    facts: facts.slice(0, 6),
    superseded: (r.evidence || []).flatMap((e) => e.superseded_claims || []).slice(0, 3),
    preview: r.preview,
    ms: r.ms,
    hits: r.hits
  };
}

module.exports = {
  retrieveWiki2,
  wiki2EvidenceFacts,
  bm25Score
};
