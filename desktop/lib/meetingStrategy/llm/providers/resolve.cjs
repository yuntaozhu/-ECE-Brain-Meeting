/**
 * BYOK 解析：当前仅落地豆包（方舟 OpenAI 兼容）。
 * 其它供应商（openai / deepseek / ollama）保留枚举，未申请账号前拒绝启动该通道。
 *
 * 统一变量（优先）→ 豆包兼容回退：
 *   LLM_PROVIDER=doubao
 *   LLM_API_KEY → DOUBAO_API_KEY / ARK_API_KEY
 *   LLM_BASE_URL → ARK_BASE_URL
 *   LLM_MODEL / LLM_MODEL_FAST → DOUBAO_CHAT_* Endpoint
 */
const SUPPORTED = new Set(["doubao", "ark"]);
const PLANNED = new Set(["openai", "deepseek", "claude", "ollama", "groq"]);

function normalizeProvider(raw) {
  const p = String(raw || "doubao").trim().toLowerCase();
  if (p === "ark" || p === "volc" || p === "volcengine") return "doubao";
  return p || "doubao";
}

function resolveLlmConfig(opts = {}) {
  const provider = normalizeProvider(process.env.LLM_PROVIDER || "doubao");
  if (!SUPPORTED.has(provider)) {
    const hint = PLANNED.has(provider)
      ? `供应商 ${provider} 已列入 BYOK 规划，但账号未接入；请设 LLM_PROVIDER=doubao`
      : `未知 LLM_PROVIDER=${provider}；当前仅支持 doubao`;
    return {
      ok: false,
      provider,
      error: hint,
      apiKey: "",
      baseUrl: "",
      model: "",
      fastModel: ""
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

  const fastModel = (
    process.env.LLM_MODEL_FAST ||
    process.env.DOUBAO_CHAT_FAST_MODEL ||
    process.env.DOUBAO_CHAT_MODEL ||
    process.env.DOUBAO_MODEL_ENDPOINT ||
    ""
  ).trim();

  const model = (
    (opts.fast ? fastModel : null) ||
    process.env.LLM_MODEL ||
    process.env.DOUBAO_CHAT_MODEL ||
    process.env.DOUBAO_MODEL_ENDPOINT ||
    process.env.DOUBAO_CHAT_FAST_MODEL ||
    ""
  ).trim();

  if (!apiKey) {
    return {
      ok: false,
      provider: "doubao",
      error: "no_api_key",
      apiKey: "",
      baseUrl,
      model,
      fastModel
    };
  }
  if (!model) {
    return {
      ok: false,
      provider: "doubao",
      error: "no_model_endpoint",
      apiKey,
      baseUrl,
      model: "",
      fastModel
    };
  }

  return {
    ok: true,
    provider: "doubao",
    apiKey,
    baseUrl,
    model,
    fastModel,
    /** 方舟兼容鉴权头 */
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    }
  };
}

function hasLlmKey() {
  const key = (
    process.env.LLM_API_KEY ||
    process.env.DOUBAO_API_KEY ||
    process.env.ARK_API_KEY ||
    ""
  ).trim();
  const provider = normalizeProvider(process.env.LLM_PROVIDER || "doubao");
  return Boolean(key) && SUPPORTED.has(provider);
}

function llmProviderStatus() {
  const provider = normalizeProvider(process.env.LLM_PROVIDER || "doubao");
  const cfg = resolveLlmConfig({ fast: true });
  return {
    provider,
    supported: SUPPORTED.has(provider),
    planned: PLANNED.has(provider),
    hasKey: hasLlmKey(),
    baseUrl: cfg.baseUrl || "",
    modelConfigured: Boolean(cfg.model || cfg.fastModel),
    error: cfg.ok ? null : cfg.error || null
  };
}

module.exports = {
  SUPPORTED,
  PLANNED,
  normalizeProvider,
  resolveLlmConfig,
  hasLlmKey,
  llmProviderStatus
};
