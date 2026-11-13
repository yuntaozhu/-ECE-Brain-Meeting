/**
 * Wave R9c：MeetingAgent 有限工具两跳。
 * hop1 核心检索 → hop2 补检索/读记忆 → 立刻收口；禁止无限递归。
 * searchWeb 仅 strategy 且 AGENT_SEARCH_WEB=1。
 */
const { topScore, focusAsk, isAnswerable } = require("./relevance.cjs");

const MAX_TOOL_HOPS = 2;

function searchWebEnabled() {
  const v = String(process.env.AGENT_SEARCH_WEB || "0")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

function mergeHits(into, more) {
  const seen = new Set(into.map((h) => String(h.title || "")));
  for (const h of more || []) {
    const key = String(h?.title || "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    into.push(h);
  }
  return into;
}

function weakRetrieval(retrieval) {
  if (!retrieval) return true;
  if (isAnswerable(retrieval)) return false;
  return topScore(retrieval) < 12;
}

/**
 * @param {object} deps { retrieveKnowledge, retrieveSemantic, queryWiki }
 * @param {object} args
 */
async function runToolHops(deps, args = {}) {
  const {
    askText,
    intentObj,
    opts = {},
    state = null,
    askLane = "hard"
  } = args;
  const S = deps;
  const hops = [];
  const hits = [];
  let preview = "";
  let instantAnswer = "";
  const focus = focusAsk(askText);
  const q1 = String(focus || askText || "").trim();

  // —— Hop 1：searchFAQ ——
  if (hops.length < MAX_TOOL_HOPS && q1) {
    const kw = S.retrieveKnowledge(q1, 4);
    mergeHits(hits, kw?.hits);
    if (kw?.preview) preview = kw.preview;
    if (kw?.instantAnswer) instantAnswer = kw.instantAnswer;
    hops.push({
      tool: "searchFAQ",
      query: q1.slice(0, 80),
      hitCount: (kw?.hits || []).length,
      topScore: topScore({ hits })
    });
  }

  let bag = { hits, preview, instantAnswer };
  const needSecond = hops.length < MAX_TOOL_HOPS && weakRetrieval(bag);

  // —— Hop 2：至多一个补工具（searchWeb 开关 | searchWiki | readMemory）——
  if (needSecond && hops.length < MAX_TOOL_HOPS) {
    if (askLane === "strategy" && searchWebEnabled()) {
      hops.push({
        tool: "searchWeb",
        query: q1.slice(0, 80),
        hitCount: 0,
        skipped: true,
        reason: "search_web_disabled_or_stub"
      });
    } else {
      let didTool = false;
      if (!(opts.forceRule || !S.hasApiKey?.())) {
        try {
          const sem = await S.retrieveSemantic(q1, 4, {
            signal: opts.signal,
            preferBiz: true
          });
          mergeHits(hits, sem?.hits);
          if (!preview && sem?.preview) preview = sem.preview;
          hops.push({
            tool: "searchWiki",
            query: q1.slice(0, 80),
            hitCount: (sem?.hits || []).length,
            topScore: topScore({ hits })
          });
          didTool = true;
        } catch (_) {
          /* fall through */
        }
      }
      if (!didTool && typeof S.queryWiki === "function") {
        const wiki = S.queryWiki(q1, 3);
        const wikiHits = (wiki?.hits || []).map((h) => ({
          title: h.title || h.slug || "",
          speak: h.speak || "",
          score: h.score || 0,
          source: "wiki"
        }));
        mergeHits(hits, wikiHits);
        if (!preview && wikiHits[0]?.speak) preview = wikiHits[0].speak;
        hops.push({
          tool: "searchWiki",
          query: q1.slice(0, 80),
          hitCount: wikiHits.length,
          topScore: topScore({ hits })
        });
        didTool = true;
      }
      if (!didTool) {
        const memAsk = String(state?.lastRealAsk || "").trim();
        const memSpeak = String(state?.lastContentSpeak || "").trim();
        hops.push({
          tool: "readMemory",
          query: "lastRealAsk|lastContentSpeak",
          hitCount: memAsk || memSpeak ? 1 : 0,
          memory: {
            lastRealAsk: memAsk.slice(0, 80),
            lastContentSpeak: memSpeak.slice(0, 80)
          }
        });
        if (memSpeak && !instantAnswer) instantAnswer = memSpeak;
      }
    }
  }

  // 意图附带的额外 query：若仍有 hop 额度且仍弱，最多再吃剩余额度（总≤2）
  const extraQs = [...(intentObj?.retrieve_queries || [])]
    .map((q) => String(q || "").trim())
    .filter((q) => q && q !== q1);
  while (hops.length < MAX_TOOL_HOPS && weakRetrieval({ hits }) && extraQs.length) {
    const q = extraQs.shift();
    const kw = S.retrieveKnowledge(q, 3);
    mergeHits(hits, kw?.hits);
    if (!preview && kw?.preview) preview = kw.preview;
    if (!instantAnswer && kw?.instantAnswer) instantAnswer = kw.instantAnswer;
    hops.push({
      tool: "searchFAQ",
      query: q.slice(0, 80),
      hitCount: (kw?.hits || []).length,
      topScore: topScore({ hits })
    });
  }

  return {
    hits,
    preview,
    instantAnswer,
    tool: hops.map((h) => h.tool).join("+") || "searchFAQ",
    mode: "two_hop",
    hops,
    hopCount: hops.length,
    maxHops: MAX_TOOL_HOPS,
    toolsExhausted: hops.length >= MAX_TOOL_HOPS || !weakRetrieval({ hits }),
    evidenceInsufficient: weakRetrieval({ hits }) && hops.length >= MAX_TOOL_HOPS
  };
}

module.exports = {
  MAX_TOOL_HOPS,
  searchWebEnabled,
  runToolHops,
  weakRetrieval,
  mergeHits
};
