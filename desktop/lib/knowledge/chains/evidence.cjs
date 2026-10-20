/**
 * Pick detail passages for a FAQ seed card (offline only).
 */
const fs = require("fs");
const path = require("path");
const { knowledgeReadRoot } = require("../../platform/appPaths.cjs");
const { grams, alignScore, buildDf } = require("../align.cjs");
const { distillCfg } = require("./schema.cjs");

function detailPath() {
  return path.join(knowledgeReadRoot(), "quan-yuan-meiyu.txt");
}

function splitSections(raw) {
  const text = String(raw || "").replace(/\r\n/g, "\n");
  const parts = text.split(/\n(?=#{1,3}\s)/);
  const out = [];
  for (const part of parts) {
    const t = part.trim();
    if (t.length < 40) continue;
    const title = (t.split("\n")[0] || "").replace(/^#+\s*/, "").trim();
    const body = t
      .split("\n")
      .slice(1)
      .join("\n")
      .replace(/\s+/g, " ")
      .trim();
    if (!title || !body) continue;
    out.push({ title, body });
  }
  return out;
}

let cachedSections = null;

function allSections() {
  if (cachedSections) return cachedSections;
  let raw = "";
  try {
    raw = fs.readFileSync(detailPath(), "utf8");
  } catch (_) {
    cachedSections = [];
    return cachedSections;
  }
  cachedSections = splitSections(raw);
  return cachedSections;
}

function seedBlob(card) {
  const titles = (card.titles || []).join(" ");
  return `${titles} ${card.spokenText || ""}`.slice(0, 400);
}

/** Rank detail sections by title+body align to the seed card. */
function pickEvidence(card, opts = {}) {
  const cfg = distillCfg();
  const topN = Number(opts.top) > 0 ? Number(opts.top) : Number(cfg.evidenceTop) || 3;
  const maxChars = Number(opts.chars) > 0 ? Number(opts.chars) : Number(cfg.evidenceChars) || 900;
  const howDoBoost = Boolean(opts.howDo);
  const cues = Array.isArray(cfg.howDoEvidenceCues) ? cfg.howDoEvidenceCues : [];
  const sections = allSections();
  const model = buildDf(sections.map((s) => s.title));
  const ask = seedBlob(card);
  const ranked = sections
    .map((sec) => {
      const titleAlign = alignScore(ask, sec.title, model);
      const bodyAlign = alignScore(ask, sec.body.slice(0, 200), model);
      const base = titleAlign * 0.7 + bodyAlign * 0.3;
      let score = base;
      // How-do boost only on sections already near the seed — avoid calendar hijack.
      if (howDoBoost && cues.length && base >= 0.06) {
        const blob = `${sec.title} ${sec.body.slice(0, 400)}`;
        const hits = cues.filter((c) => c && blob.includes(c)).length;
        score += Math.min(0.24, hits * 0.06);
      }
      return { ...sec, score, base };
    })
    .filter((row) => row.score > 0 && (!howDoBoost || row.base >= 0.04))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  const packs = [];
  let used = 0;
  for (const row of ranked) {
    const slice = row.body.slice(0, Math.max(120, maxChars - used));
    if (!slice) continue;
    packs.push({ title: row.title, text: slice, score: Number(row.score.toFixed(4)) });
    used += slice.length;
    if (used >= maxChars) break;
  }
  if (!packs.length && card.spokenText) {
    packs.push({ title: (card.titles && card.titles[0]) || "faq", text: String(card.spokenText), score: 1 });
  }
  return packs;
}

function evidenceText(packs) {
  return (packs || [])
    .map((p, i) => `[${i + 1}] ${p.title}\n${p.text}`)
    .join("\n\n");
}

/** Split spoken text into grounded clauses for rule fallback. */
function answerClauses(spokenText) {
  return String(spokenText || "")
    .split(/[。！？；;\n]+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 6);
}

function focusFromClause(clause) {
  const s = String(clause || "").replace(/[，,：:].*$/, "").trim();
  const grams2 = grams(s).slice(0, 6);
  if (s.length <= 12) return s;
  if (grams2.length >= 2) return s.slice(0, 12);
  return s.slice(0, 10);
}

module.exports = {
  allSections,
  pickEvidence,
  evidenceText,
  answerClauses,
  focusFromClause,
  seedBlob
};
