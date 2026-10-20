/**
 * Offline chain generation: Doubao when available, else clause-grounded rule path.
 */
const { arkChat } = require("../../meetingStrategy/llm/transport.cjs");
const { distillCfg, fillTpl } = require("./schema.cjs");
const { pickEvidence, evidenceText, answerClauses, focusFromClause } = require("./evidence.cjs");
const { roundtripAsk, supportAnswer } = require("./roundtrip.cjs");
const { alignScore, buildDf } = require("../align.cjs");

function hasArk() {
  return Boolean((process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim());
}

function parseJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}

function normalizeSteps(rawSteps, cfg) {
  const min = Number(cfg.minSteps) || 3;
  const max = Number(cfg.maxSteps) || 6;
  const maxAns = Number(cfg.answerMaxChars) || 80;
  const list = Array.isArray(rawSteps) ? rawSteps : [];
  const out = [];
  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    const ask = String(row.ask || row.q || "").trim();
    if (ask.length < 4) continue;
    const gap = Boolean(row.gap);
    let answer = String(row.answer || row.tts || "").trim().replace(/\s+/g, " ");
    if (answer.length > maxAns) answer = answer.slice(0, maxAns);
    const cite = String(row.cite || "").trim().slice(0, 200);
    out.push({ ask, answer: gap ? "" : answer, cite, gap });
    if (out.length >= max) break;
  }
  if (out.length < min) return out;
  return out.slice(0, max);
}

function seedFocus(card) {
  const title = String((card.titles && card.titles[0]) || "")
    .replace(/[？?。！!]/g, "")
    .replace(/^(什么是|如何|怎么|怎样)/, "")
    .replace(/(是什么|怎么做|如何做)$/g, "")
    .trim();
  if (title.length >= 2 && title.length <= 16) return title;
  return focusFromClause(card.spokenText || title);
}

function makeAsk(focus, cue, cfg) {
  const f = String(focus || "").trim();
  const c = String(cue || "").trim();
  if (!f) return "";
  if (!c) return fillTpl(cfg.clauseAskTpl || "{focus}", { focus: f });
  if (/[？?]$/.test(c)) return `${f}${c}`;
  return `${f}${c}？`;
}

function howDoCue(text, cfg) {
  const cues = Array.isArray(cfg.howDoCues) ? cfg.howDoCues : [];
  const s = String(text || "");
  return cues.some((c) => c && s.includes(c));
}

function distinctFromSeed(answer, seed, cfg) {
  const a = String(answer || "").trim();
  const seedText = String(seed || "").trim();
  if (!a) return "";
  if (!seedText) return a;
  const max = Number(cfg.sameAnswerAlignMax) || 0.72;
  const model = buildDf([seedText, a]);
  const first = seedText.split(/[。！？；;]/)[0] || seedText;
  if (alignScore(a, seedText, model) >= max) return "";
  if (alignScore(a, first, model) >= max) return "";
  return a;
}

function howDoAnswer(card, packs, cfg, usedAnswers, preferCues) {
  const seed = String(card.spokenText || "");
  const maxChars = Number(cfg.answerMaxChars) || 80;
  const cues = Array.isArray(cfg.howDoEvidenceCues) ? cfg.howDoEvidenceCues : [];
  const prefer = Array.isArray(preferCues) ? preferCues : [];
  const focus = seedFocus(card);
  const howPacks = pickEvidence(card, { howDo: true, top: 4 });
  // Seed-aligned packs first so topic-specific evidence beats global calendar.
  const merged = [...(packs || []), ...(howPacks || [])];
  const seen = new Set();
  const candidates = [];
  const used = usedAnswers || new Set();
  const sameMax = Number(cfg.sameAnswerAlignMax) || 0.72;

  // Prefer later seed clauses / colon tails — often the real how-do line.
  const seedBits = seed
    .split(/[。！？；;：:\n]+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 10);
  for (let i = 0; i < seedBits.length; i += 1) {
    const s = seedBits[i];
    if (seen.has(s)) continue;
    seen.add(s);
    let boost = i === 0 ? 0 : 6;
    boost += prefer.filter((c) => c && s.includes(c)).length * 2;
    boost += cues.filter((c) => c && s.includes(c)).length;
    candidates.push({ s, boost, cite: s });
  }

  for (const pack of merged) {
    for (const clause of String(pack.text || "").split(/[。！？；;\n]/)) {
      let s = clause.replace(/\s+/g, " ").trim();
      s = s.replace(/^[\d０-９]+[.、．)）]\s*/, "").trim();
      if (s.length < 12 || s.length > 120) continue;
      if (/^(时间|执行岗位|重要工作)/.test(s)) continue;
      if (seen.has(s)) continue;
      seen.add(s);
      let boost =
        cues.filter((c) => c && s.includes(c)).length +
        prefer.filter((c) => c && s.includes(c)).length * 2;
      if (focus && focus.length >= 2 && s.includes(focus.slice(0, Math.min(4, focus.length)))) {
        boost += 5;
      }
      // Later seed clauses are valid how-do fallbacks and stay on-topic.
      if (seed.includes(s)) boost += 3;
      candidates.push({
        s,
        boost,
        cite: String(pack.text || "").slice(0, 160)
      });
    }
  }
  candidates.sort((a, b) => b.boost - a.boost || b.s.length - a.s.length);
  for (const row of candidates) {
    const ok = distinctFromSeed(row.s, seed, cfg);
    if (!ok) continue;
    const model = buildDf([ok, ...used]);
    let dup = false;
    for (const prev of used) {
      if (alignScore(ok, prev, model) >= sameMax) {
        dup = true;
        break;
      }
    }
    if (dup) continue;
    return { answer: ok.slice(0, maxChars), cite: row.cite };
  }
  const clauses = answerClauses(seed);
  for (let i = 1; i < clauses.length; i += 1) {
    const ok = distinctFromSeed(clauses[i], clauses[0] || seed, cfg);
    if (ok) return { answer: ok.slice(0, maxChars), cite: ok };
  }
  return { answer: "", cite: "", gap: true };
}

function ruleSteps(card, evidencePacks, cfg) {
  const cues = Array.isArray(cfg.deepenCues) ? cfg.deepenCues : [];
  const clauses = answerClauses(card.spokenText);
  const packs = evidencePacks || [];
  const steps = [];
  const seen = new Set();
  const anchor = seedFocus(card);
  const seed = String(card.spokenText || "");
  const maxChars = Number(cfg.answerMaxChars) || 80;
  const usedHowAnswers = new Set();

  const seedAskSet = new Set(
    (card.titles || []).map((t) => String(t).replace(/\s+/g, "").replace(/[？?]/g, ""))
  );
  const push = (ask, answer, cite, gap) => {
    const key = ask.replace(/\s+/g, "").replace(/[？?]/g, "");
    if (seen.has(key) || ask.length < 4) return;
    if (seedAskSet.has(key)) return;
    seen.add(key);
    const clean = gap ? "" : distinctFromSeed(answer, seed, cfg);
    if (clean) usedHowAnswers.add(clean);
    steps.push({
      ask,
      answer: clean ? clean.slice(0, maxChars) : "",
      cite: String(cite || "").slice(0, 200),
      gap: Boolean(gap) || !clean
    });
  };

  for (let i = 0; i < cues.length && steps.length < (Number(cfg.maxSteps) || 6); i += 1) {
    const cue = cues[i];
    const ask = makeAsk(anchor, cue, cfg);
    if (howDoCue(cue, cfg) || howDoCue(ask, cfg)) {
      const prefer =
        /先做|第一步/.test(cue) ? ["先", "逐一", "落实", "开课"] :
        /开展|实施|落地/.test(cue) ? ["落地", "实施", "开展", "推进"] :
        ["落地", "四端", "样板", "开口", "行事历"];
      const picked = howDoAnswer(card, packs, cfg, usedHowAnswers, prefer);
      push(ask, picked.answer, picked.cite, picked.gap);
      continue;
    }
    const clause = clauses[i] || clauses[0] || seed;
    const pack = packs[i];
    const answer = distinctFromSeed(clause, seed, cfg) ||
      (pack && distinctFromSeed(String(pack.text || "").split(/[。！？]/)[0], seed, cfg)) ||
      "";
    const cite = answer || clause || (pack && String(pack.text || "").slice(0, 120)) || "";
    push(ask, answer, cite, !answer);
  }

  for (let i = 0; i < packs.length && steps.length < (Number(cfg.maxSteps) || 6); i += 1) {
    const pack = packs[i];
    const focus = focusFromClause(pack.title || "");
    if (!focus) continue;
    const cue = cues[(i + 2) % Math.max(1, cues.length)] || "";
    const ask = makeAsk(anchor, cue || focus, cfg);
    const ans = String(pack.text || "").split(/[。！？]/)[0] || pack.text;
    push(ask, ans, String(pack.text || "").slice(0, 120), false);
  }

  return steps.slice(0, Number(cfg.maxSteps) || 6);
}

async function arkSteps(card, evidencePacks, cfg) {
  const system = String(cfg.systemPrompt || "");
  const user = fillTpl(cfg.userPromptTpl || "", {
    seedAsks: (card.titles || []).join(" / "),
    seedAnswer: String(card.spokenText || "").slice(0, 240),
    evidence: evidenceText(evidencePacks).slice(0, Number(cfg.evidenceChars) || 900)
  });
  const res = await arkChat(system, user, {
    timeoutMs: Number(cfg.arkTimeoutMs) || 20000,
    temperature: Number(cfg.arkTemperature) || 0.2,
    maxTokens: Number(cfg.arkMaxTokens) || 1200
  });
  if (!res.ok || !res.content) {
    return { ok: false, steps: [], error: res.error || "ark_empty" };
  }
  const parsed = parseJsonObject(res.content);
  const steps = normalizeSteps(parsed && parsed.steps, cfg);
  return { ok: steps.length > 0, steps, error: steps.length ? null : "parse_empty" };
}

function decorateSteps(steps, seedCard, allCards, evidencePacks) {
  const kept = [];
  const tune = [];
  const howPacks = pickEvidence(seedCard, { howDo: true, top: 4 });
  const supportPacks = [...(evidencePacks || []), ...(howPacks || [])];
  for (const step of steps || []) {
    const rt = roundtripAsk(step.ask, seedCard, allCards, supportPacks);
    const support = step.gap
      ? { ok: false, align: 0 }
      : supportAnswer(step.answer, seedCard, supportPacks);
    const citeHit =
      !step.gap &&
      step.answer &&
      String(step.cite || "").includes(String(step.answer).slice(0, 20));
    const accepted = Boolean(rt.ok && (step.gap || support.ok || citeHit));
    const row = {
      ...step,
      roundtrip: rt,
      supportAlign: support.align || (citeHit ? 1 : 0),
      accepted
    };
    if (row.accepted && !step.gap) kept.push(row);
    else if (row.accepted && step.gap) tune.push(row);
    else tune.push(row);
  }
  // Prefer non-gap steps; fill with gap only if below min.
  if (kept.length < (Number(distillCfg().minSteps) || 3)) {
    for (const row of tune) {
      if (!row.gap || !row.roundtrip?.ok) continue;
      kept.push({ ...row, accepted: true });
      if (kept.length >= (Number(distillCfg().minSteps) || 3)) break;
    }
  }
  return { kept, tune };
}

/**
 * Build one continuous chain for a FAQ card.
 * @param {{ forceRule?: boolean }} opts
 */
async function generateChain(card, allCards, opts = {}) {
  const cfg = distillCfg();
  const evidencePacks = pickEvidence(card);
  const forceRule = Boolean(opts.forceRule) || !hasArk();
  let source = "rule";
  let steps = [];
  let error = null;

  if (!forceRule) {
    const ark = await arkSteps(card, evidencePacks, cfg);
    if (ark.ok) {
      steps = ark.steps;
      source = "ark";
    } else {
      error = ark.error;
      steps = ruleSteps(card, evidencePacks, cfg);
      source = "rule_fallback";
    }
  } else {
    steps = ruleSteps(card, evidencePacks, cfg);
  }

  const { kept, tune } = decorateSteps(steps, card, allCards, evidencePacks);
  const min = Number(cfg.minSteps) || 3;
  return {
    cardId: card.cardId,
    seedTitles: card.titles || [],
    seedAnswer: card.spokenText || "",
    evidence: evidencePacks.map((p) => ({ title: p.title, score: p.score })),
    source,
    error,
    steps: kept,
    tuneSamples: tune,
    ready: kept.length >= min
  };
}

module.exports = {
  hasArk,
  generateChain,
  ruleSteps,
  parseJsonObject,
  decorateSteps
};
