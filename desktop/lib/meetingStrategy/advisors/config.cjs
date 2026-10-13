/** 经营顾问：模型 / 超时 / thinking */
function apiKey() {
  return (process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim();
}

function chatModelL2() {
  // 经营 L2 优先快答接入点，减少 20s 超时→heuristic
  return (
    process.env.DOUBAO_CHAT_FAST_MODEL ||
    process.env.DOUBAO_CHAT_MODEL ||
    process.env.DOUBAO_MODEL_ENDPOINT ||
    "doubao-seed-2-1-turbo-260628"
  );
}

function chatModelL3() {
  return (
    process.env.DOUBAO_CHAT_DEEP_MODEL ||
    process.env.DOUBAO_CHAT_MODEL ||
    process.env.DOUBAO_MODEL_ENDPOINT ||
    "doubao-seed-evolving"
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

/** 仅 doubao-seed-evolving 接受 thinking.type（enabled|disabled，无 auto） */
function modelSupportsThinking(model) {
  return /seed-evolving/i.test(String(model || ""));
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
