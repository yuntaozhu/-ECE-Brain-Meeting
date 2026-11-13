/**
 * Wave R9b：车道模糊仲裁（规则补判优先；可选 LLM，仅 ambiguous）。
 * 不替换 askLane 主路径；不直接回答业务。
 */
const { load, rx } = require("../knowledge/schemaStore.cjs");
const { LANES, classifyAskLane, laneCfg } = require("./askLane.cjs");

function laneRx(name) {
  try {
    return rx("askLane", name);
  } catch (_) {
    return /$a/;
  }
}

function isAmbiguous(info) {
  if (!info) return true;
  return info.why === "default" || info.why === "empty" || info.why === "arbiter_pending";
}

/**
 * schema 侧对 default 的二次提示（无 LLM）。
 * @param {string} text
 * @param {{ lane: string, why: string, hits: string[] }} base
 */
function arbitrateBySchema(text, base) {
  const t = String(text || "").trim();
  if (!t || !isAmbiguous(base)) return { ...base, source: "rule" };

  if (laneRx("needMoreInfo").test(t)) {
    return {
      lane: LANES.HARD,
      why: "need_more_info",
      hits: ["needMoreInfo"],
      needMoreInfo: true,
      source: "schema"
    };
  }
  if (laneRx("softAmbiguous").test(t)) {
    return {
      lane: LANES.SOFT,
      why: "softAmbiguous",
      hits: ["softAmbiguous"],
      source: "schema"
    };
  }
  if (laneRx("strategyAmbiguous").test(t)) {
    return {
      lane: LANES.STRATEGY,
      why: "strategyAmbiguous",
      hits: ["strategyAmbiguous"],
      source: "schema"
    };
  }
  return { ...base, source: "rule" };
}

function llmLaneEnabled() {
  const v = String(process.env.LANE_ARBITER_LLM || "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

function validateLaneJson(raw) {
  let obj = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(
        raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")
      );
    } catch (_) {
      return { ok: false, value: null, error: "json_parse" };
    }
  }
  if (!obj || typeof obj !== "object") return { ok: false, value: null, error: "not_object" };
  const lane = String(obj.lane || "");
  const allowed = new Set([LANES.HARD, LANES.SOFT, LANES.STRATEGY, "need_more_info"]);
  if (!allowed.has(lane)) return { ok: false, value: null, error: "bad_lane" };
  const confidence = Math.max(0, Math.min(1, Number(obj.confidence)));
  if (!Number.isFinite(confidence)) return { ok: false, value: null, error: "bad_confidence" };
  return {
    ok: true,
    value: {
      lane: lane === "need_more_info" ? LANES.HARD : lane,
      why: lane === "need_more_info" ? "need_more_info" : `llm:${lane}`,
      hits: ["laneArbiter"],
      needMoreInfo: lane === "need_more_info" || Boolean(obj.needMoreInfo),
      confidence,
      retrieval: obj.retrieval || "none",
      reason: String(obj.reason || "").slice(0, 80),
      source: "llm"
    },
    error: null
  };
}

/**
 * 同步：classify + schema 仲裁。
 * @param {string} text
 */
function resolveAskLane(text) {
  const base = classifyAskLane(text);
  return arbitrateBySchema(text, base);
}

/**
 * 异步：仅 ambiguous 且开 LANE_ARBITER_LLM 时打 lane channel。
 * @param {string} text
 * @param {{ signal?: AbortSignal }} [opts]
 */
async function resolveAskLaneAsync(text, opts = {}) {
  const synced = resolveAskLane(text);
  if (!isAmbiguous(synced) && synced.why !== "need_more_info") return synced;
  // need_more_info / softAmbiguous / strategyAmbiguous 已由 schema 定论则不再打 LLM
  if (synced.source === "schema" && synced.why !== "default") return synced;
  if (!llmLaneEnabled()) return synced;

  const bag = load().askLane || {};
  const system = String(bag.laneSystem || "").trim();
  if (!system) return synced;

  try {
    const { llmChatJson } = require("../meetingStrategy/llm/transport.cjs");
    const res = await llmChatJson(system, `问句：${String(text || "").slice(0, 120)}`, {
      channel: "lane",
      fast: true,
      disableThinking: true,
      temperature: 0.1,
      timeoutMs: 2000,
      signal: opts.signal,
      maxTokens: 120,
      validate: validateLaneJson
    });
    if (!res.ok || !res.value) return synced;
    const minConf = Number(bag.limits?.arbiterMinConfidence) || 0.6;
    if (Number(res.value.confidence) < minConf) return synced;
    return res.value;
  } catch (_) {
    return synced;
  }
}

function isOpenIntelligenceLaneResolved(laneOrText) {
  const lane =
    laneOrText === LANES.SOFT ||
    laneOrText === LANES.STRATEGY ||
    laneOrText === LANES.HARD
      ? laneOrText
      : resolveAskLane(laneOrText).lane;
  return lane === LANES.SOFT || lane === LANES.STRATEGY;
}

module.exports = {
  isAmbiguous,
  arbitrateBySchema,
  resolveAskLane,
  resolveAskLaneAsync,
  validateLaneJson,
  isOpenIntelligenceLaneResolved,
  llmLaneEnabled
};
