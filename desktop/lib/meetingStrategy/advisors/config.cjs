/** 经营顾问：模型 / 超时 / thinking */
function apiKey() {
  return (process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim();
}

function chatModelL2() {
  // 经营 L2 优先快答 Endpoint，减少超时→heuristic
  return (
    process.env.DOUBAO_CHAT_FAST_MODEL ||
    process.env.DOUBAO_CHAT_MODEL ||
    process.env.DOUBAO_MODEL_ENDPOINT ||
    ""
  );
}

function chatModelL3() {
  return (
    process.env.DOUBAO_CHAT_DEEP_MODEL ||
    process.env.DOUBAO_CHAT_MODEL ||
    process.env.DOUBAO_MODEL_ENDPOINT ||
    ""
  );
}

function timeoutMsForTier(tier) {
  if (tier === "L3") {
    const n = Number(process.env.BIZ_DEEP_TIMEOUT_MS);
    // Deep Thinking 更慢；方舟文档建议长超时，会议场景默认 120s
    return Number.isFinite(n) && n > 0 ? n : 120000;
  }
  const n = Number(process.env.BIZ_LLM_TIMEOUT_MS);
  // L2 默认 15s：超时立刻走 Wiki 口播，避免会中空等
  return Number.isFinite(n) && n > 0 ? n : 15000;
}

/**
 * Deep Thinking：evolving 模型名，或当前即 DOUBAO_CHAT_DEEP_MODEL（Endpoint ID）。
 * turbo / lite 接入点不要带 thinking，避免 400。
 */
function modelSupportsThinking(model) {
  const m = String(model || "").trim();
  if (!m) return false;
  if (/seed-evolving/i.test(m)) return true;
  const deep = (process.env.DOUBAO_CHAT_DEEP_MODEL || "").trim();
  return Boolean(deep && m === deep);
}

/**
 * turbo / lite 接入点不带 thinking，避免 400。
 * Evolving：L3 默认 enabled，L2 默认 disabled。
 * @param {boolean} deep
 * @param {string} model
 * @returns {"enabled"|"disabled"|null}
 */
function resolveThinkingType(deep, model) {
  if (!modelSupportsThinking(model)) return null;
  if (deep) {
    if (process.env.BIZ_DEEP_THINKING === "0" || process.env.BIZ_DEEP_THINKING === "disabled") {
      return "disabled";
    }
    return "enabled";
  }
  if (process.env.BIZ_L2_THINKING === "1" || process.env.BIZ_L2_THINKING === "enabled") {
    return "enabled";
  }
  return "disabled";
}

module.exports = {
  apiKey,
  chatModelL2,
  chatModelL3,
  timeoutMsForTier,
  modelSupportsThinking,
  resolveThinkingType
};
