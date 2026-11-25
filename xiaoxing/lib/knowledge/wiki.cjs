const fs = require("fs");
const path = require("path");
const { wikiConceptsDir, wikiIndexFile } = require("./paths.cjs");
const { normalizeText, parseConceptMarkdown } = require("./parse.cjs");
const { scorePagesWiki2 } = require("../wiki2/retrieve.cjs");

let pageCache = null;
let indexCache = null;

function parseIndexEntries() {
  if (indexCache) return indexCache;
  const raw = fs.readFileSync(wikiIndexFile(), "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const entries = [];
  for (const line of raw.split("\n")) {
    const m = line.match(/^-\s+([^|]+)\|([^|]*)\|(.*)$/);
    if (!m) continue;
    const slug = m[1].trim();
    const blurb = m[2].trim();
    const rest = m[3];
    const aliasesM = rest.match(/aliases=([^|]*)/);
    const aliases = aliasesM
      ? aliasesM[1]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    entries.push({ slug, blurb, aliases });
  }
  indexCache = entries;
  return entries;
}

function listConceptPages() {
  if (pageCache) return pageCache;
  const dir = wikiConceptsDir();
  const indexMap = new Map(parseIndexEntries().map((e) => [e.slug, e]));
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  pageCache = files.map((f) => {
    const slug = f.replace(/\.md$/, "");
    const md = fs.readFileSync(path.join(dir, f), "utf8");
    const parsed = parseConceptMarkdown(md);
    const idx = indexMap.get(slug);
    return {
      slug,
      ...parsed,
      aliases: [...new Set([...(parsed.aliases || []), ...(idx?.aliases || [])])],
      blurb: idx?.blurb || ""
    };
  });
  return pageCache;
}

function clearWikiCache() {
  pageCache = null;
  indexCache = null;
}

function queryTokens(query) {
  const q = String(query || "");
  const out = new Set();
  const cjk = q.replace(/[^\u4e00-\u9fff]/g, "");
  for (let n = 2; n <= 4; n++) {
    for (let i = 0; i + n <= cjk.length; i++) out.add(cjk.slice(i, i + n));
  }
  return [...out];
}

function scorePagesLegacy(query, topK = 3) {
  const qn = normalizeText(query);
  if (!qn) return [];
  const tokens = queryTokens(query);
  const scored = listConceptPages().map((p) => {
    const titleN = normalizeText(p.title);
    const speakN = normalizeText(p.speak);
    const factsN = normalizeText(p.facts);
    const blurbN = normalizeText(p.blurb);
    const hay = titleN + speakN + factsN + blurbN;
    let score = 0;
    if (qn.length >= 4 && hay.includes(qn)) score += 12;
    if (titleN && (qn.includes(titleN) || titleN.includes(qn))) score += 10;

    let bestAlias = 0;
    for (const a of p.aliases || []) {
      const an = normalizeText(a);
      if (an.length < 2) continue;
      if (qn === an) bestAlias = Math.max(bestAlias, 14);
      else if (qn.includes(an) && an.length >= 2) bestAlias = Math.max(bestAlias, 10);
      else if (an.includes(qn) && qn.length >= 4) bestAlias = Math.max(bestAlias, 8);
    }
    score += bestAlias;

    let tokenHits = 0;
    for (const t of tokens) {
      if (titleN.includes(t)) tokenHits += t.length >= 3 ? 3 : 1;
      else if (speakN.includes(t) || factsN.includes(t)) tokenHits += t.length >= 3 ? 2 : 1;
    }
    score += Math.min(16, tokenHits);
    return { ...p, score };
  });
  return scored
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * 优先 Wiki2 Fast Read；空命中或异常时回落旧启发式
 */
function scorePagesForQuery(query, topK = 3) {
  try {
    const wiki2 = scorePagesWiki2(query, topK);
    if (wiki2.length) return wiki2;
  } catch (_) {}
  return scorePagesLegacy(query, topK);
}

module.exports = {
  parseIndexEntries,
  listConceptPages,
  clearWikiCache,
  scorePagesForQuery,
  scorePagesLegacy
};
