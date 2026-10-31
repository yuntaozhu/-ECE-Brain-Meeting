/**
 * Speculative RAG：Others 说话中途预检索 FAQ/知识块，供建议卡降低 TTFT。
 * 旁路模块，不进入 decideSpeak。
 */
const { matchFaqInstant, retrieveKnowledge } = require("../knowledge");
const { classifyCopilotIntent, lastTranscriptSegment, copilotCfg } = require("./gate.cjs");
const { buildWiki2Evidence } = require("../wiki2/index.cjs");

const state = {
  startedAt: 0,
  lastAt: 0,
  lastSegment: "",
  pending: null,
  cache: null // { q, at, faq, hits, keyFacts }
};

function prefetchCfg() {
  return copilotCfg().prefetch || {};
}

function prefetchCueRe() {
  try {
    const { schemaStore } = require("../knowledge");
    const re = schemaStore.rx("copilot", "prefetchCue");
    if (re) return re;
  } catch (_) {}
  return /(怎么|如何|为什么|方案|架构|接口|延迟|配额|ASR|TTS|Whisper|选型|评审|风险|排期|\?|？)/i;
}

function shouldPrefetch(segment, gate) {
  const t = String(segment || "").trim();
  if (!t || t.length < 6) return false;
  if (gate?.should_trigger) return true;
  if (gate?.category === "CHITCHAT") return false;
  return prefetchCueRe().test(t) || t.length >= 28;
}

function buildEvidence(query) {
  const q = String(query || "").trim();
  if (!q) return null;
  let faq = null;
  let hits = [];
  let wiki2 = null;
  try {
    wiki2 = buildWiki2Evidence(q, { topK: 3 });
  } catch (_) {}
  try {
    faq = matchFaqInstant(q);
  } catch (_) {}
  try {
    const r = retrieveKnowledge(q, 3);
    hits = (r?.hits || []).slice(0, 3).map((h) => ({
      source: h.source,
      title: h.title,
      score: h.score,
      snippet: String(h.snippet || "").replace(/\s+/g, " ").trim().slice(0, 120)
    }));
  } catch (_) {}
  const keyFacts = [];
  for (const f of wiki2?.facts || []) {
    if (f) keyFacts.push(String(f).slice(0, 100));
  }
  if (faq?.title) keyFacts.push(String(faq.title).slice(0, 40));
  if (faq?.answer) keyFacts.push(String(faq.answer).replace(/\s+/g, " ").trim().slice(0, 48));
  for (const h of hits) {
    if (h.title && !keyFacts.includes(h.title)) keyFacts.push(String(h.title).slice(0, 40));
  }
  if (!faq && !hits.length && !keyFacts.length) return null;
  return {
    q,
    at: Date.now(),
    faq: faq ? { title: faq.title, answer: faq.answer, score: faq.score } : null,
    hits,
    wiki2,
    superseded: wiki2?.superseded || [],
    keyFacts: keyFacts.slice(0, 6)
  };
}

function runPrefetch(segment) {
  const q = String(segment || "").trim();
  if (!q) return null;
  if (state.cache?.q === q && Date.now() - state.cache.at < 8000) return state.cache;
  const ev = buildEvidence(q);
  if (ev) state.cache = ev;
  return ev;
}

/**
 * 巡检/转写增量时调用：满足「连续发言 + 线索」则预热。
 */
function noteOthersForPrefetch(transcript) {
  const cfg = prefetchCfg();
  if (cfg.enabled === false) return { skipped: true, reason: "disabled" };
  const segment = lastTranscriptSegment(transcript);
  const gate = classifyCopilotIntent(segment);
  const now = Date.now();
  const resetGap = Number(cfg.resetGapMs) || 8000;
  if (!state.startedAt || now - state.lastAt > resetGap) {
    state.startedAt = now;
  }
  state.lastAt = now;
  state.lastSegment = segment;

  const speakingMs = now - (state.startedAt || now);
  const minMs = Number(cfg.minSpeakingMs) || 3000;
  const cue = shouldPrefetch(segment, gate);
  if (!cue) return { skipped: true, reason: "no_cue", speakingMs, category: gate.category };
  if (speakingMs < minMs && !gate.should_trigger) {
    return { skipped: true, reason: "too_early", speakingMs, category: gate.category };
  }
  const ev = runPrefetch(segment);
  return {
    skipped: false,
    speakingMs,
    category: gate.category,
    cached: Boolean(ev),
    faq: ev?.faq?.title || null
  };
}

function takePrefetch(query) {
  const q = String(query || "").trim();
  if (!state.cache) return null;
  const ttl = Number(prefetchCfg().ttlMs) || 15000;
  if (Date.now() - state.cache.at > ttl) {
    state.cache = null;
    return null;
  }
  if (!q) return state.cache;
  const a = q.replace(/\s+/g, "").slice(0, 24);
  const b = String(state.cache.q || "")
    .replace(/\s+/g, "")
    .slice(0, 24);
  if (a && b && (a.includes(b.slice(0, 10)) || b.includes(a.slice(0, 10)) || a === b)) {
    return state.cache;
  }
  // 弱相关也允许复用最近一次预热（句尾停顿后完整问句常比预热更长）
  if (b && a.startsWith(b.slice(0, Math.min(8, b.length)))) return state.cache;
  return state.cache;
}

function clearPrefetch() {
  state.cache = null;
  state.startedAt = 0;
  state.lastAt = 0;
  state.lastSegment = "";
}

function prefetchStatus() {
  return {
    hasCache: Boolean(state.cache),
    q: state.cache?.q?.slice(0, 60) || "",
    ageMs: state.cache ? Date.now() - state.cache.at : null,
    faq: state.cache?.faq?.title || null
  };
}

module.exports = {
  noteOthersForPrefetch,
  runPrefetch,
  takePrefetch,
  clearPrefetch,
  prefetchStatus,
  buildEvidence,
  shouldPrefetch
};
