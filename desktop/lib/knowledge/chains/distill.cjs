/**
 * Offline distillation entry: FAQ seeds -> continuous follow-up chains.
 */
const fs = require("fs");
const path = require("path");
const { knowledgeReadRoot } = require("../../platform/appPaths.cjs");
const { distillCfg } = require("./schema.cjs");
const { generateChain, hasArk } = require("./generate.cjs");
const { writeChain, writeIndex, writeMergedReadable, ensureDirs } = require("./write.cjs");

function parseFaqCards(raw) {
  const blocks = String(raw || "").replace(/\r\n/g, "\n").split(/\n(?=##\s)/);
  const cards = [];
  let i = 0;
  for (const block of blocks) {
    const t = block.trim();
    if (!/^##\s/.test(t)) continue;
    const head = (t.split("\n")[0] || "").replace(/^##\s*/, "").replace(/^Q[:：]\s*/, "");
    const titles = head
      .split(/\s*\/\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    const answerMatch = t.match(/A[:：]\s*([\s\S]+)/);
    const spokenText = (answerMatch ? answerMatch[1] : "").replace(/\s+/g, " ").trim();
    if (!titles.length || !spokenText) continue;
    i += 1;
    cards.push({
      source: "faq",
      cardId: "faq_" + String(i).padStart(3, "0"),
      titles,
      spokenText
    });
  }
  return cards;
}

function loadFaqCards() {
  const file = path.join(knowledgeReadRoot(), "faq-meeting.txt");
  return parseFaqCards(fs.readFileSync(file, "utf8"));
}

function pickSeeds(cards, opts = {}) {
  const cfg = distillCfg();
  const limit =
    Number(opts.limit) > 0
      ? Number(opts.limit)
      : Number(cfg.seedLimitDefault) || 5;
  const keys = Array.isArray(opts.keys) && opts.keys.length ? opts.keys : cfg.seedCardKeys || [];
  if (opts.all) return cards.slice();
  if (!keys.length) return cards.slice(0, limit);

  const picked = [];
  const used = new Set();
  for (const key of keys) {
    const k = String(key || "").trim();
    if (!k) continue;
    const hit = cards.find((c) => (c.titles || []).some((t) => t.includes(k)) && !used.has(c.cardId));
    if (hit) {
      picked.push(hit);
      used.add(hit.cardId);
    }
    if (picked.length >= limit) break;
  }
  if (picked.length < limit) {
    for (const c of cards) {
      if (used.has(c.cardId)) continue;
      picked.push(c);
      used.add(c.cardId);
      if (picked.length >= limit) break;
    }
  }
  return picked;
}

/**
 * @param {{
 *   limit?: number,
 *   all?: boolean,
 *   keys?: string[],
 *   forceRule?: boolean,
 *   dry?: boolean
 * }} opts
 */
async function distillChains(opts = {}) {
  ensureDirs();
  const allCards = loadFaqCards();
  const seeds = pickSeeds(allCards, opts);
  const forceRule = Boolean(opts.forceRule) || !hasArk();
  const written = [];

  for (const card of seeds) {
    const chain = await generateChain(card, allCards, { forceRule });
    if (chain.error) {
      // eslint-disable-next-line no-console
      console.warn(`[distill-chains] ark miss ${card.cardId}: ${chain.error}`);
    }
    const nextHints = (chain.steps || []).map((s) => s.ask);
    const file = writeChain({ ...chain, nextHints }, { dry: opts.dry });
    written.push({ ...chain, nextHints, slug: file.slug });
  }

  const index = writeIndex(written, {
    dry: opts.dry,
    sourceMode: forceRule ? "rule" : "ark_or_rule"
  });
  const merged = writeMergedReadable(written, { dry: opts.dry });

  return {
    totalFaq: allCards.length,
    distilled: written.length,
    ready: written.filter((c) => c.ready).length,
    forceRule,
    hasArk: hasArk(),
    index,
    mergedPath: merged,
    chains: written
  };
}

module.exports = {
  parseFaqCards,
  loadFaqCards,
  pickSeeds,
  distillChains
};
