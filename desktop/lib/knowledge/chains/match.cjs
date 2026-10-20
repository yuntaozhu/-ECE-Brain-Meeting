/**
 * Live consult: match current ask to an offline follow-up chain step.
 * Guards: step + core align; stay on last topic when core still matches;
 * switch only via preferred winner or clearly stronger seed.
 */
const fs = require("fs");
const path = require("path");
const { knowledgeReadRoot } = require("../../platform/appPaths.cjs");
const { alignScore, buildDf } = require("../align.cjs");
const { distillCfg } = require("./schema.cjs");

function byCardReadDir() {
  return path.join(knowledgeReadRoot(), "chains", "by-card");
}

function normKey(text) {
  return String(text || "")
    .replace(/^Q[:：]\s*/i, "")
    .replace(/[？?。！!\s]/g, "")
    .trim();
}

function peelCues(text, cues) {
  let t = String(text || "");
  const list = Array.isArray(cues) ? cues.slice().sort((a, b) => String(b).length - String(a).length) : [];
  for (const cue of list) {
    const c = String(cue || "").trim();
    if (!c) continue;
    t = t.split(c).join("");
  }
  return t.replace(/[？?。！!，,、\s]/g, "").trim();
}

let cache = null;

function loadChains() {
  if (cache) return cache;
  const dir = byCardReadDir();
  const list = [];
  let names = [];
  try {
    names = fs.readdirSync(dir).filter((n) => n.endsWith(".json"));
  } catch (_) {
    cache = [];
    return cache;
  }
  for (const name of names) {
    try {
      const row = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
      if (!row || row.kind !== "followup-chain") continue;
      const steps = (row.steps || []).filter(
        (s) => s && !s.gap && String(s.answer || "").trim().length >= 4
      );
      if (!steps.length && !(row.seedAnswer || "").trim()) continue;
      list.push({
        cardId: row.cardId || "",
        seedTitles: row.seedTitles || [],
        seedAnswer: String(row.seedAnswer || "").trim(),
        nextHints: row.nextHints || steps.map((s) => s.ask),
        steps,
        file: name
      });
    } catch (_) {
      /* skip bad file */
    }
  }
  cache = list;
  return cache;
}

function clearChainCache() {
  cache = null;
}

function chainMatchesHypothesis(chain, hypothesisId) {
  const hid = normKey(hypothesisId);
  if (!hid || hid.length < 4) return false;
  if (chain.cardId && hid.includes(normKey(chain.cardId))) return true;
  for (const t of chain.seedTitles || []) {
    const k = normKey(t);
    if (k.length >= 4 && (hid.includes(k) || k.includes(hid.slice(0, Math.min(12, hid.length))))) {
      return true;
    }
  }
  return false;
}

function findChainForHypothesis(hypothesisId) {
  const chains = loadChains();
  for (const chain of chains) {
    if (chainMatchesHypothesis(chain, hypothesisId)) return chain;
  }
  return null;
}

function seedBlob(chain) {
  return (chain.seedTitles || []).join(" / ");
}

function seedAlign(ask, chain, model) {
  let best = alignScore(ask, seedBlob(chain), model);
  for (const t of chain.seedTitles || []) {
    const a = alignScore(ask, t, model);
    if (a > best) best = a;
  }
  return best;
}

function floors(opts) {
  const cfg = distillCfg();
  return {
    step:
      Number(opts.alignMin) > 0
        ? Number(opts.alignMin)
        : Number(cfg.matchAlignMin) || 0.28,
    seed: Number(cfg.seedAlignMin) || 0.22,
    core: Number(cfg.coreAlignMin) || 0.28,
    margin: Number(cfg.topicSwitchMargin) || 0.08,
    cues: Array.isArray(cfg.deepenCues) ? cfg.deepenCues : []
  };
}

function scoreStep(ask, stepAsk, model, cues, coreFloor) {
  const stepAlign = alignScore(ask, stepAsk, model);
  const askCore = peelCues(ask, cues);
  const stepCore = peelCues(stepAsk, cues);
  let core = 1;
  if (askCore.length >= 2 && stepCore.length >= 2) {
    core = alignScore(askCore, stepCore, model);
  } else if (askCore.length >= 2 || stepCore.length >= 2) {
    core = 0;
  }
  return { stepAlign, core, askCore, stepCore, ok: stepAlign > 0 && core >= coreFloor };
}

function coreHeld(ask, chain, model, cues, coreFloor) {
  const askCore = peelCues(ask, cues);
  if (askCore.length < 2) return false;
  const seedCore = peelCues(seedBlob(chain), cues);
  if (seedCore.length >= 2 && alignScore(askCore, seedCore, model) >= coreFloor) return true;
  for (const t of chain.seedTitles || []) {
    const c = peelCues(t, cues);
    if (c.length < 2) continue;
    if (alignScore(askCore, c, model) >= coreFloor) return true;
    const nk = normKey(askCore);
    const ck = normKey(c);
    if (nk.length >= 2 && ck.length >= 2 && (nk.includes(ck) || ck.includes(nk))) return true;
  }
  return false;
}

function bestStepOnChain(ask, chain, opts = {}) {
  if (!chain) return null;
  const f = floors(opts);
  const model = buildDf([
    ...(chain.seedTitles || []),
    ...chain.steps.map((s) => s.ask),
    ...(chain.nextHints || [])
  ]);
  const q = String(ask || "").trim();
  if (q.length < 4) return null;

  const sAlign = seedAlign(q, chain, model);
  let best = null;

  if (chain.seedAnswer) {
    for (const title of chain.seedTitles || []) {
      const scored = scoreStep(q, title, model, f.cues, f.core);
      // Seed title must be a near paraphrase, not a shared entity fragment.
      if (scored.stepAlign < 0.85 && scored.core < 0.85) continue;
      const askK = normKey(scored.askCore || peelCues(q, f.cues));
      const titleK = normKey(scored.stepCore || peelCues(title, f.cues));
      if (askK.length >= 2 && titleK.length >= 2) {
        const cover =
          askK.includes(titleK) || titleK.includes(askK)
            ? Math.min(askK.length, titleK.length) / Math.max(askK.length, titleK.length)
            : scored.core;
        if (cover < 0.7) continue;
      }
      const align = Math.max(scored.stepAlign, scored.core);
      if (!best || align > best.align) {
        best = {
          ask: title,
          answer: chain.seedAnswer,
          index: -1,
          align: Number(align.toFixed(4)),
          cardId: chain.cardId,
          seedAlign: Number(sAlign.toFixed(4))
        };
      }
    }
  }

  chain.steps.forEach((step, index) => {
    const scored = scoreStep(q, step.ask, model, f.cues, f.core);
    if (!scored.ok) return;
    if (scored.stepAlign < f.step) return;
    const align = scored.stepAlign;
    if (!best || align > best.align) {
      best = {
        ask: step.ask,
        answer: String(step.answer || "").trim(),
        index,
        align: Number(align.toFixed(4)),
        cardId: chain.cardId,
        seedAlign: Number(sAlign.toFixed(4))
      };
    }
  });

  return best && best.answer ? best : null;
}

function bestSeedAmongChains(ask) {
  const chains = loadChains();
  const model = buildDf(chains.flatMap((c) => c.seedTitles || []));
  let best = { chain: null, align: 0 };
  for (const chain of chains) {
    const a = seedAlign(ask, chain, model);
    if (a > best.align) best = { chain, align: a };
  }
  return best;
}

function sameChainTopic(a, b) {
  if (!a || !b) return false;
  if (a.cardId && b.cardId && a.cardId === b.cardId) return true;
  return chainMatchesHypothesis(a, seedBlob(b)) || chainMatchesHypothesis(b, seedBlob(a));
}

function isHowDoAsk(ask) {
  const cfg = distillCfg();
  const cues = Array.isArray(cfg.howDoCues) ? cfg.howDoCues : [];
  const s = String(ask || "");
  return cues.some((c) => c && s.includes(c));
}

/**
 * How-do steps must not repeat the seed definition line.
 * Prefer another step answer, else a later seed clause, else null answer (caller may miss).
 */
function repairHowDoHit(hit, chain, liveAsk) {
  if (!hit || !chain) return hit;
  if (!isHowDoAsk(hit.ask) && !isHowDoAsk(liveAsk)) return hit;
  const seed = String(chain.seedAnswer || "");
  if (!seed || !hit.answer) return hit;
  const max = Number(distillCfg().sameAnswerAlignMax) || 0.72;
  const model = buildDf([seed, hit.answer]);
  const first = seed.split(/[。！？；;]/)[0] || seed;
  if (alignScore(hit.answer, seed, model) < max && alignScore(hit.answer, first, model) < max) {
    return hit;
  }
  for (const step of chain.steps || []) {
    const ans = String(step.answer || "").trim();
    if (!ans || step.gap) continue;
    if (alignScore(ans, seed, model) >= max) continue;
    if (alignScore(ans, first, model) >= max) continue;
    return {
      ...hit,
      ask: step.ask || hit.ask,
      answer: ans,
      repaired: true
    };
  }
  const clauses = seed
    .split(/[。！？；;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8);
  for (let i = 1; i < clauses.length; i += 1) {
    if (alignScore(clauses[i], first, model) >= max) continue;
    return { ...hit, answer: clauses[i].slice(0, 80), repaired: true };
  }
  return { ...hit, answer: "", gap: true, repaired: true };
}

function finalizeHit(hit, ask, lastChain, topicChain) {
  if (!hit) return null;
  const chain =
    (hit.cardId && loadChains().find((c) => c.cardId === hit.cardId)) ||
    lastChain ||
    topicChain;
  const fixed = repairHowDoHit(hit, chain, ask);
  if (fixed && fixed.gap && !fixed.answer) return null;
  return fixed;
}

function matchChainStep(ask, hypothesisId, opts = {}) {
  const f = floors(opts);
  const preferred = String(opts.preferredTitle || "").trim();
  const lastChain = findChainForHypothesis(hypothesisId);
  const preferredChain = preferred ? findChainForHypothesis(preferred) : null;
  const model = buildDf(loadChains().flatMap((c) => c.seedTitles || []));
  const topic = bestSeedAmongChains(ask);

  if (preferredChain && lastChain && !sameChainTopic(preferredChain, lastChain)) {
    const hit = bestStepOnChain(ask, preferredChain, opts);
    if (hit) return finalizeHit(hit, ask, preferredChain, topic.chain);
  } else if (preferredChain && !lastChain) {
    const hit = bestStepOnChain(ask, preferredChain, opts);
    if (hit) return finalizeHit(hit, ask, preferredChain, topic.chain);
  }

  if (lastChain && coreHeld(ask, lastChain, model, f.cues, f.core)) {
    return finalizeHit(bestStepOnChain(ask, lastChain, opts), ask, lastChain, topic.chain);
  }

  if (lastChain && topic.chain && !sameChainTopic(topic.chain, lastChain)) {
    const lastSeed = seedAlign(ask, lastChain, model);
    if (topic.align >= lastSeed + f.margin && topic.align >= f.seed + f.margin) {
      const switched = bestStepOnChain(ask, topic.chain, opts);
      if (switched) return finalizeHit(switched, ask, topic.chain, topic.chain);
      if (lastSeed < f.seed) return null;
    }
  }

  if (!lastChain) {
    if (topic.chain && topic.align >= f.seed) {
      return finalizeHit(bestStepOnChain(ask, topic.chain, opts), ask, topic.chain, topic.chain);
    }
    return null;
  }

  return finalizeHit(bestStepOnChain(ask, lastChain, opts), ask, lastChain, topic.chain);
}

module.exports = {
  loadChains,
  clearChainCache,
  findChainForHypothesis,
  matchChainStep,
  bestStepOnChain,
  repairHowDoHit,
  isHowDoAsk,
  peelCues,
  byCardReadDir
};
