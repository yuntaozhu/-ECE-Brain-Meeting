/**
 * MeetingAgent 意图层（M1）：豆包 JSON Understand + schema 规则兜底。
 * 经营句式只在 knowledge/schema/intent-rules.json，这里只做匹配与归一化。
 */
const { normalizeDazhiAliases } = require("../../meetingSession");
const { arkChat } = require("../llm/transport.cjs");
const { scriptLine } = require("../../knowledge/schemaStore.cjs");
const {
  matchIntent,
  softScriptFor,
  moneyIntentSet,
  lockedIntentSet,
  contentSpeakSet,
  intentList,
  enrichFor,
  understandSystem
} = require("./intentMatch.cjs");

const INTENTS = intentList();
const MONEY_INTENTS = moneyIntentSet();
const UNDERSTAND_MS = 900;

function emptyIntent(partial = {}) {
  return {
    intent: "other",
    confidence: 0,
    must_answer: "",
    must_not: [],
    retrieve_queries: [],
    speak_policy: "neutral_bridge",
    depth: "L2",
    source: "default",
    ...partial
  };
}

function normalizeIntent(raw, askText) {
  const q = String(askText || "");
  let intent = String(raw?.intent || "other").trim();
  if (!INTENTS.includes(intent)) intent = "other";
  const confidence = Math.max(0, Math.min(1, Number(raw?.confidence) || 0));
  const must_answer = String(raw?.must_answer || q).slice(0, 120);
  let must_not = Array.isArray(raw?.must_not)
    ? raw.must_not.map((x) => String(x).slice(0, 40)).slice(0, 8)
    : [];
  let retrieve_queries = Array.isArray(raw?.retrieve_queries)
    ? raw.retrieve_queries.map((x) => String(x).slice(0, 40)).filter(Boolean).slice(0, 4)
    : [];
  let speak_policy = String(raw?.speak_policy || "").trim();
  if (!["neutral_bridge", "content_ok", "wait"].includes(speak_policy)) {
    speak_policy = contentSpeakSet().has(intent) ? "content_ok" : "neutral_bridge";
  }
  let depth = String(raw?.depth || "L2").trim();
  if (!["L1", "L2", "L3"].includes(depth)) depth = "L2";

  const enrich = enrichFor(intent);
  if (enrich) {
    if (Array.isArray(enrich.must_not)) must_not = [...new Set([...must_not, ...enrich.must_not])];
    if (!retrieve_queries.length && Array.isArray(enrich.retrieve_queries)) {
      retrieve_queries = enrich.retrieve_queries.slice();
    }
    if (enrich.speak_policy) speak_policy = enrich.speak_policy;
  }
  if (!retrieve_queries.length && q) retrieve_queries = [q.slice(0, 40)];

  return {
    intent,
    confidence,
    must_answer,
    must_not,
    retrieve_queries,
    speak_policy,
    depth,
    source: raw?.source || "llm"
  };
}

function currentUtterance(askText) {
  const q = normalizeDazhiAliases(String(askText || ""));
  const m = q.match(require("../../knowledge/schemaStore.cjs").rx("operators", "stickyTail"));
  if (m) return normalizeDazhiAliases(m[1]);
  return q;
}

function ruleUnderstand(askText, opts = {}) {
  const q = currentUtterance(askText);
  const lastHost = String(opts.lastHostAnswer || "");
  const hit = matchIntent(q, { lastHostAnswer: lastHost });
  if (!hit) {
    return emptyIntent({
      intent: "other",
      confidence: 0.4,
      must_answer: q.slice(0, 80),
      retrieve_queries: [q.slice(0, 40)],
      speak_policy: "neutral_bridge",
      source: "rule"
    });
  }
  return normalizeIntent(
    {
      intent: hit.intent,
      confidence: hit.confidence,
      must_answer: hit.must_answer || q.slice(0, 40),
      speak_policy: hit.speak_policy || undefined,
      source: "rule"
    },
    q
  );
}

function parseIntentJson(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch (_) {
    return null;
  }
}

async function understandIntent(askText, opts = {}) {
  const q = String(askText || "").trim();
  const floors = Array.isArray(opts.recentFloors) ? opts.recentFloors.slice(-4).join("\n") : "";
  const lastHost = String(opts.lastHostAnswer || "").slice(0, 120);
  const rule = ruleUnderstand(q, { lastHostAnswer: lastHost });

  const apiKey = (process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim();
  if (!apiKey || opts.forceRule) {
    return rule;
  }

  const user =
    `【近场】\n${floors.slice(0, 300) || "（无）"}\n【上一答】${lastHost || "（无）"}\n【园长说】${q}\n请分类。`;

  try {
    const res = await arkChat(understandSystem(), user, {
      fast: true,
      temperature: 0,
      timeoutMs: opts.timeoutMs != null ? opts.timeoutMs : UNDERSTAND_MS,
      signal: opts.signal,
      maxTokens: 220
    });
    if (res?.ok && res.content) {
      const parsed = parseIntentJson(res.content);
      if (parsed?.intent) {
        const norm = normalizeIntent({ ...parsed, source: "llm" }, q);
        const locked = lockedIntentSet();
        if (locked.has(rule.intent) && rule.confidence >= 0.85 && norm.intent !== rule.intent) {
          return { ...rule, source: "rule-override" };
        }
        if ((Number(norm.confidence) || 0) < 0.5 && rule.intent === "other") {
          return { ...norm, intent: "other", speak_policy: "wait", confidence: norm.confidence };
        }
        return norm;
      }
    }
  } catch (_) {
    /* fall through */
  }
  return rule;
}

function intentSoftAnswer(intentObj, askText) {
  const intent = intentObj?.intent || ruleUnderstand(askText).intent;
  const ask = askText || "";
  const variant = softScriptFor(intent, ask) || softScriptFor(intent, currentUtterance(ask));
  if (variant) return scriptLine(variant);
  if (intent === "loss_fear") return scriptLine("loss_fear");
  return scriptLine(intent) || "";
}

function neutralBridgeFor(intentObj) {
  const intent = intentObj?.intent || "other";
  if (contentSpeakSet().has(intent)) return "我按资料帮你看这笔账。";
  if (intent === "alternate_path") return "我换一条路径说。";
  return "嗯，我想一下。";
}

function contentLeadForIntent() {
  return "";
}

function isMoneyIntent(intent) {
  return moneyIntentSet().has(String(intent || ""));
}

module.exports = {
  get INTENTS() {
    return intentList();
  },
  get MONEY_INTENTS() {
    return moneyIntentSet();
  },
  UNDERSTAND_MS,
  understandIntent,
  ruleUnderstand,
  normalizeIntent,
  intentSoftAnswer,
  neutralBridgeFor,
  contentLeadForIntent,
  isMoneyIntent
};
