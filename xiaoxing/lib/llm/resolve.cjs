/**
 * 小星 LLM BYOK（方舟 OpenAI 兼容）。禁止 require desktop/ 源码。
 * LLM_API_KEY / DOUBAO_API_KEY / ARK_API_KEY
 * LLM_BASE_URL / ARK_BASE_URL
 * LLM_MODEL / DOUBAO_CHAT_MODEL / DOUBAO_MODEL_ENDPOINT
 */
"use strict";

function normalizeProvider(raw) {
  const p = String(raw || "doubao").trim().toLowerCase();
  if (p === "ark" || p === "volc" || p === "volcengine") return "doubao";
  return p || "doubao";
}

function resolveLlmConfig(opts = {}) {
  const provider = normalizeProvider(process.env.LLM_PROVIDER || "doubao");
  if (provider !== "doubao") {
    return {
      ok: false,
      provider,
      error: `当前仅支持 doubao/ark，收到 LLM_PROVIDER=${provider}`,
      apiKey: "",
      baseUrl: "",
      model: ""
    };
  }

  const apiKey = (
    process.env.LLM_API_KEY ||
    process.env.DOUBAO_API_KEY ||
    process.env.ARK_API_KEY ||
    ""
  ).trim();

  const baseUrl = (
    process.env.LLM_BASE_URL ||
    process.env.ARK_BASE_URL ||
    "https://ark.cn-beijing.volces.com/api/v3"
  )
    .trim()
    .replace(/\/$/, "");

  const model = (
    opts.model ||
    process.env.LLM_MODEL ||
    process.env.DOUBAO_CHAT_MODEL ||
    process.env.DOUBAO_MODEL_ENDPOINT ||
    process.env.DOUBAO_CHAT_FAST_MODEL ||
    ""
  ).trim();

  if (!apiKey) {
    return { ok: false, provider, error: "no_api_key", apiKey: "", baseUrl, model };
  }
  if (!model) {
    return { ok: false, provider, error: "no_model_endpoint", apiKey, baseUrl, model: "" };
  }

  return {
    ok: true,
    provider,
    apiKey,
    baseUrl,
    model,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    }
  };
}

function hasLlmKey() {
  return Boolean(
    (
      process.env.LLM_API_KEY ||
      process.env.DOUBAO_API_KEY ||
      process.env.ARK_API_KEY ||
      ""
    ).trim()
  );
}

function llmStatus() {
  const cfg = resolveLlmConfig();
  return {
    provider: cfg.provider || "doubao",
    hasKey: hasLlmKey(),
    modelConfigured: Boolean(cfg.model),
    baseUrl: cfg.baseUrl || "",
    ok: Boolean(cfg.ok),
    error: cfg.ok ? null : cfg.error || null
  };
}

module.exports = { resolveLlmConfig, hasLlmKey, llmStatus, normalizeProvider };
