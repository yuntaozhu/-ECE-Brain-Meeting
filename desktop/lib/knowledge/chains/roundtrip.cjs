/**
 * Promptagator-style filter: predicted ask must align back to source FAQ or evidence.
 */
const { alignScore, buildDf, bestTitleView } = require("../align.cjs");
const { distillCfg } = require("./schema.cjs");

function faqModel(cards) {
  const titles = [];
  for (const card of cards || []) {
    for (const t of card.titles || []) titles.push(t);
  }
  return buildDf(titles);
}

/**
 * @returns {{ ok: boolean, align: number, hitCardId: string, hitTitle: string, reason: string }}
 */
function roundtripAsk(ask, seedCard, allCards, evidencePacks) {
  const cfg = distillCfg();
  const floor = Number(cfg.roundtripAlignMin) || 0.18;
  const model = faqModel(allCards);
  let best = { align: 0, hitCardId: "", hitTitle: "", reason: "miss" };

  for (const card of allCards || []) {
    const title = (card.titles || []).join(" / ");
    const view = bestTitleView(ask, title, model);
    const speakAlign = alignScore(ask, card.spokenText || "", model);
    const score = Math.max(view.align || 0, speakAlign * 0.85);
    if (score > best.align) {
      best = {
        align: score,
        hitCardId: card.cardId || "",
        hitTitle: view.segment || (card.titles && card.titles[0]) || "",
        reason: score >= floor ? "faq" : "miss"
      };
    }
  }

  if (best.align < floor) {
    for (const pack of evidencePacks || []) {
      const a = Math.max(alignScore(ask, pack.title, model), alignScore(ask, pack.text, model));
      if (a > best.align) {
        best = {
          align: a,
          hitCardId: seedCard.cardId || "",
          hitTitle: pack.title || "",
          reason: a >= floor ? "evidence" : "miss"
        };
      }
    }
  }

  const seedTitle = (seedCard.titles || []).join(" / ");
  const seedAlign = Math.max(
    bestTitleView(ask, seedTitle, model).align || 0,
    alignScore(ask, seedCard.spokenText || "", model)
  );
  if (seedAlign >= floor && seedAlign >= best.align) {
    best = {
      align: seedAlign,
      hitCardId: seedCard.cardId || "",
      hitTitle: (seedCard.titles && seedCard.titles[0]) || "",
      reason: "seed"
    };
  }

  return {
    ok: best.align >= floor,
    align: Number(best.align.toFixed(4)),
    hitCardId: best.hitCardId,
    hitTitle: best.hitTitle,
    reason: best.align >= floor ? best.reason : "miss"
  };
}

/** Answer must share content with evidence or seed speak (atomic support lite). */
function supportAnswer(answer, seedCard, evidencePacks) {
  const text = String(answer || "").trim();
  if (!text) return { ok: false, align: 0 };
  const seed = String(seedCard.spokenText || "");
  if (seed.includes(text)) return { ok: true, align: 1 };
  for (const pack of evidencePacks || []) {
    const body = String(pack.text || "");
    if (body.includes(text)) return { ok: true, align: 1 };
  }
  const model = buildDf([
    ...(seedCard.titles || []),
    ...((evidencePacks || []).map((p) => p.title) || [])
  ]);
  let best = alignScore(text, seed, model);
  for (const pack of evidencePacks || []) {
    const a = alignScore(text, pack.text || "", model);
    if (a > best) best = a;
  }
  const floor = Number(distillCfg().roundtripAlignMin) || 0.18;
  return { ok: best >= floor * 0.6, align: Number(best.toFixed(4)) };
}

module.exports = { roundtripAsk, supportAnswer, faqModel };
