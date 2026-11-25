const { matchFaq } = require("../knowledge/faq.cjs");
const { scorePagesForQuery, listConceptPages } = require("../knowledge/wiki.cjs");
const { writeInbox } = require("../knowledge/inbox.cjs");
const { checkRefuse, loadBoundary } = require("./gate.cjs");
const { appendSession } = require("./session.cjs");
const {
  collectMoreQuestions,
  formatMoreQuestionsNote
} = require("./moreQuestions.cjs");
const {
  matchMarketQuote,
  looksLikePriceQuery,
  buildMarketMiss
} = require("../market/retrieve.cjs");
const { matchPestAlert, looksLikePestQuery } = require("../market/pest.cjs");
const { liveFetchForQuery } = require("../market/liveFetch.cjs");
const { loadProductCfg } = require("../market/productGate.cjs");
const { tryLlmGapAnswer, llmAskEnabled, loadLlmAskCfg } = require("./llmFallback.cjs");

function withMoreQuestions(result, query, ctx = {}) {
  const moreQuestions =
    result.moreQuestions && result.moreQuestions.length
      ? result.moreQuestions
      : collectMoreQuestions(query, {
          slug: ctx.slug || result.slug,
          title: ctx.title || result.title,
          layer: result.layer,
          max: 5
        });
  const note = formatMoreQuestionsNote(moreQuestions);
  return {
    ...result,
    moreQuestions,
    replyDisplay: note ? `${result.reply || ""}${note}` : result.reply
  };
}

function finalize(result, query, opts, ctx = {}) {
  const writeGap = opts.writeGap !== false;
  const doSession = opts.session !== false;
  const out = withMoreQuestions(result, query, ctx);
  const llmCfg = loadLlmAskCfg();
  const shouldInbox =
    writeGap &&
    (out.layer === "gap" ||
      out.layer === "market_miss" ||
      out.layer === "refuse" ||
      (out.layer === "llm" && llmCfg.writeInboxOnLlm !== false));
  if (shouldInbox) {
    writeInbox({
      query,
      reason: out.reason || out.layer,
      reply: out.reply,
      meta: {
        layer: out.layer,
        liveAttempted: out.liveAttempted || false,
        llm: Boolean(out.llm)
      }
    });
  }
  if (doSession) appendSession({ query, ...out });
  return out;
}

/**
 * 同步解析（不写 inbox/session）；供 ask / askAsync 共用
 */
function resolveAskSync(query, opts = {}) {
  const q = String(query || "").trim();
  const boundary = loadBoundary();

  if (!q) {
    return { ok: false, layer: "empty", reply: "请先说出你的问题。", sources: [], moreQuestions: [] };
  }

  const identityCue = /你是谁|小星是什么|你能做什么/.test(q);
  if (identityCue) {
    return {
      ok: true,
      layer: "identity",
      reply: boundary.identityReply,
      sources: ["schema/boundary.json"],
      score: 100
    };
  }

  const refused = checkRefuse(q);
  if (refused.refuse) {
    return {
      ok: true,
      layer: "refuse",
      reply: refused.reply,
      reason: refused.reason,
      sources: ["schema/boundary.json"],
      score: 100
    };
  }

  if (looksLikePriceQuery(q)) {
    const marketHit = matchMarketQuote(q);
    if (marketHit) {
      return { ...marketHit, moreQuestions: marketHit.moreQuestions || [] };
    }
    if (opts._deferMiss) {
      return { ok: true, layer: "_price_miss", query: q };
    }
    return buildMarketMiss(q);
  }

  if (looksLikePestQuery(q)) {
    const pestHit = matchPestAlert(q);
    if (pestHit) {
      return { ...pestHit, moreQuestions: pestHit.moreQuestions || [] };
    }
  }

  const faq = matchFaq(q, boundary.minFaqScore || 18);
  if (faq) {
    const pages = scorePagesForQuery(q, 2);
    const slug = pages[0]?.slug;
    return {
      ok: true,
      layer: "faq",
      reply: faq.answer,
      sources: [faq.file || "faq", faq.title],
      score: faq.score,
      title: faq.title,
      slug: slug || undefined
    };
  }

  const pages = scorePagesForQuery(q, 3);
  const top = pages[0];
  if (top && top.score >= (boundary.minWikiScore || 12) && top.speak) {
    const full = listConceptPages().find((p) => p.slug === top.slug);
    return {
      ok: true,
      layer: top.mode === "wiki2" ? "wiki2" : "wiki",
      reply: top.speak,
      sources: [`wiki/concepts/${top.slug}.md`, ...(top.sources || []).slice(0, 3)],
      score: top.score,
      slug: top.slug,
      title: top.title || full?.title,
      related: pages.slice(1).map((p) => p.slug),
      hop: top.hop || 0
    };
  }

  return {
    ok: true,
    layer: "gap",
    reply: boundary.noEvidenceReply,
    reason: "no_evidence",
    sources: [],
    score: top?.score || 0,
    candidates: pages.map((p) => ({ slug: p.slug, score: p.score }))
  };
}

function ask(query, opts = {}) {
  const q = String(query || "").trim();
  const raw = resolveAskSync(q, { ...opts, _deferMiss: false });
  return finalize(raw, q, opts, { slug: raw.slug, title: raw.title, layer: raw.layer });
}

/**
 * 异步 Ask：价格 miss → live；知识 gap → LLM 参考答复（可关）
 */
async function askAsync(query, opts = {}) {
  const q = String(query || "").trim();
  const cfg = loadProductCfg();
  const wantLive = opts.live !== false && cfg.liveOnMiss !== false;
  const wantLlm = opts.llm !== false && llmAskEnabled("gap");

  const first = resolveAskSync(q, {
    ...opts,
    _deferMiss: wantLive && looksLikePriceQuery(q)
  });

  if (first.layer === "_price_miss") {
    if (typeof opts.onLiveStart === "function") {
      try {
        opts.onLiveStart({ query: q });
      } catch (_) {}
    }

    let liveMeta = null;
    try {
      liveMeta = await liveFetchForQuery(q, {
        live: true,
        scrapeFn: opts.scrapeFn,
        skipCooldown: opts.skipCooldown,
        timeoutMs: opts.timeoutMs
      });
    } catch (err) {
      liveMeta = { ok: false, error: String(err.message || err), reason: "exception" };
    }

    const again = matchMarketQuote(q);
    if (again) {
      return finalize(
        {
          ...again,
          live: true,
          liveMeta,
          moreQuestions: again.moreQuestions || []
        },
        q,
        opts,
        { layer: "market" }
      );
    }

    const miss = buildMarketMiss(q, {
      liveAttempted: true,
      liveOk: Boolean(liveMeta?.ok),
      liveError:
        liveMeta?.error ||
        liveMeta?.reason ||
        (liveMeta?.skipped ? liveMeta.reason : null)
    });
    return finalize(miss, q, opts, { layer: "market_miss" });
  }

  if (first.layer === "gap" && wantLlm) {
    if (typeof opts.onLlmStart === "function") {
      try {
        opts.onLlmStart({ query: q });
      } catch (_) {}
    }
    const llm = await tryLlmGapAnswer(q, {
      candidates: first.candidates || [],
      chatFn: opts.chatFn
    });
    if (llm.ok) {
      return finalize(llm, q, opts, { layer: "llm" });
    }
    // LLM 失败：回落诚实 gap
    return finalize(
      {
        ...first,
        llmError: llm.error || "llm_fail"
      },
      q,
      opts,
      { layer: "gap" }
    );
  }

  return finalize(first, q, opts, { slug: first.slug, title: first.title, layer: first.layer });
}

module.exports = { ask, askAsync, resolveAskSync };
