/**
 * Wave R4：统一观测字段（gate / source / draftFp…），供 Strategy / Copilot 日志共用。
 */

/**
 * @param {object} [state]
 * @param {object} [extra]
 */
function observeTurn(state, extra = {}) {
  const intel = state?.lastIntelligence || null;
  const draft = state?.lastSpeakDraft || intel?.draft || null;
  const card = intel?.card || null;
  const gate = intel?.gate || extra.gate || null;
  let source = extra.source || null;
  if (!source) {
    if (extra.stage === "refined" || extra.refined) source = "refined";
    else if (extra.stage === "aligned" || extra.aligned) source = "aligned";
    else if (extra.stage === "instant") source = "template";
    else if (gate === "agent" || intel?.debug?.releasedToAgent) source = "agent";
    else if (gate === "committed" || draft?.text) source = draft?.arkMode || "local";
  }
  return {
    gate,
    cardId: String(card?.title || extra.cardId || extra.speakTitle || "").slice(0, 80) || null,
    posterior:
      card?.posterior != null
        ? Number(card.posterior)
        : extra.posterior != null
          ? Number(extra.posterior)
          : null,
    align: card?.align != null ? Number(card.align) : extra.align != null ? Number(extra.align) : null,
    source,
    draftFp: draft?.draftFp || extra.draftFp || null,
    refine_model: extra.refine_model || null,
    releasedToAgent: Boolean(intel?.debug?.releasedToAgent || extra.releasedToAgent)
  };
}

module.exports = { observeTurn };
