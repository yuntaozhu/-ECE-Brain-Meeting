const fs = require("fs");
const path = require("path");
const { faqFiles } = require("./paths.cjs");
const { normalizeText, parseFaqCards } = require("./parse.cjs");

let cache = null;

function loadFaqCards() {
  if (cache) return cache;
  const cards = [];
  for (const file of faqFiles()) {
    if (!fs.existsSync(file)) continue;
    const raw = fs.readFileSync(file, "utf8");
    const base = path.basename(file);
    for (const card of parseFaqCards(raw)) {
      cards.push({ ...card, file: base });
    }
  }
  cache = cards;
  return cache;
}

function clearFaqCache() {
  cache = null;
}

function scoreFaqCard(card, qn) {
  let score = 0;
  for (const q of card.questions) {
    const qn2 = normalizeText(q);
    if (!qn2) continue;
    if (qn === qn2) score = Math.max(score, 40);
    else if (qn.includes(qn2) && qn2.length >= 3) score = Math.max(score, 28);
    else if (qn2.includes(qn) && qn.length >= 4) score = Math.max(score, 22);
  }
  const titleN = normalizeText(card.title);
  if (qn.length >= 4 && titleN.includes(qn)) score = Math.max(score, 18);

  // token overlap on CJK bigrams
  const cjk = qn.replace(/[^\u4e00-\u9fff]/g, "");
  let hits = 0;
  for (let i = 0; i + 2 <= cjk.length; i++) {
    const bi = cjk.slice(i, i + 2);
    if (titleN.includes(bi) || normalizeText(card.answer).includes(bi)) hits += 1;
  }
  score += Math.min(12, hits);
  return score;
}

function matchFaq(query, minScore = 18) {
  const qn = normalizeText(query);
  if (qn.length < 2) return null;
  let best = null;
  for (const card of loadFaqCards()) {
    const score = scoreFaqCard(card, qn);
    if (score < minScore) continue;
    if (!best || score > best.score) best = { ...card, score, source: "faq" };
  }
  return best;
}

module.exports = { loadFaqCards, clearFaqCache, matchFaq, scoreFaqCard };
