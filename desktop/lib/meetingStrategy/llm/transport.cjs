/** LLM HTTP：BYOK 解析后走 OpenAI 兼容 chat/completions（当前仅豆包方舟）。 */
// 直连 platform，避开 deps↔advisors↔agent↔llm 循环依赖导致 debugLog 为 undefined
const { debugLog } = require("../../platform/debugLog.cjs");
const { resolveLlmConfig } = require("./providers/resolve.cjs");

function arkBaseUrl() {
  return resolveLlmConfig().baseUrl || "https://ark.cn-beijing.volces.com/api/v3";
}

function isBillingOverdue(status, body) {
  const s = String(body || "");
  return status === 403 && (/AccountOverdueError/i.test(s) || /overdue|欠费|过期|余额不足/i.test(s));
}

function resolveChatModel(opts = {}) {
  const cfg = resolveLlmConfig(opts);
  return cfg.model || "";
}

async function arkChatStream(system, user, opts = {}) {
  const cfg = resolveLlmConfig(opts);
  const apiKey = cfg.apiKey;
  const model = opts.model || cfg.model;
  if (!cfg.ok && cfg.error && cfg.error !== "no_api_key" && cfg.error !== "no_model_endpoint") {
    return { ok: false, content: null, error: cfg.error, billingOverdue: false };
  }
  if (!apiKey) return { ok: false, content: null, error: "no_api_key", billingOverdue: false };
  if (!model) return { ok: false, content: null, error: "no_model_endpoint", billingOverdue: false };
  if (opts.signal?.aborted) return { ok: false, content: null, error: "aborted", billingOverdue: false };
  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 0;
  const ac = new AbortController();
  const onParentAbort = () => ac.abort();
  if (opts.signal) opts.signal.addEventListener("abort", onParentAbort, { once: true });
  const timer = timeoutMs ? setTimeout(() => ac.abort(), timeoutMs) : null;
  debugLog.info("Strategy", "llmChat stream request", {
    provider: cfg.provider,
    model,
    baseUrl: cfg.baseUrl,
    systemLen: system.length,
    userLen: user.length,
    timeoutMs: timeoutMs || null
  });
  let response;
  let firedClause = false;
  const maybeClause = (content) => {
    if (firedClause || !opts.onClause) return;
    const m = String(content || "").match(/^[\s\S]{8,80}?[。！？]/);
    if (!m) return;
    firedClause = true;
    try {
      opts.onClause(m[0].trim());
    } catch (_) {}
  };
  try {
    response = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: cfg.headers || {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: opts.temperature != null ? opts.temperature : 0.3,
        stream: true
      }),
      signal: ac.signal
    });
  } catch (err) {
    if (timer) clearTimeout(timer);
    if (opts.signal) opts.signal.removeEventListener("abort", onParentAbort);
    if (ac.signal.aborted || opts.signal?.aborted || err?.name === "AbortError") {
      return { ok: false, content: null, error: "aborted", billingOverdue: false };
    }
    throw err;
  }
  if (!response.ok) {
    if (timer) clearTimeout(timer);
    if (opts.signal) opts.signal.removeEventListener("abort", onParentAbort);
    const body = await response.text().catch(() => "");
    return {
      ok: false,
      content: null,
      error: `Ark HTTP ${response.status}`,
      status: response.status,
      billingOverdue: isBillingOverdue(response.status, body)
    };
  }
  let content = "";
  const finish = (partial) => {
    if (timer) clearTimeout(timer);
    if (opts.signal) opts.signal.removeEventListener("abort", onParentAbort);
    if (!content) return { ok: false, content: null, error: partial ? "aborted" : "empty_stream", billingOverdue: false };
    debugLog.info("Strategy", partial ? "arkChat stream 截断" : "arkChat stream ok", {
      preview: content.slice(0, 120)
    });
    return { ok: true, content, error: null, billingOverdue: false, partial: Boolean(partial) };
  };
  try {
    const reader = response.body?.getReader?.();
    if (!reader) {
      const raw = await response.text();
      for (const line of raw.split(/\n/)) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const j = JSON.parse(payload);
          content += j.choices?.[0]?.delta?.content || "";
          maybeClause(content);
        } catch (_) {}
      }
    } else {
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        if (ac.signal.aborted) {
          try {
            await reader.cancel();
          } catch (_) {}
          return finish(true);
        }
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n");
        buf = parts.pop() || "";
        for (const line of parts) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            const delta = j.choices?.[0]?.delta?.content || "";
            if (!delta) continue;
            content += delta;
            maybeClause(content);
          } catch (_) {}
        }
      }
    }
    return finish(false);
  } catch (err) {
    if (ac.signal.aborted || err?.name === "AbortError") return finish(true);
    if (timer) clearTimeout(timer);
    if (opts.signal) opts.signal.removeEventListener("abort", onParentAbort);
    throw err;
  }
}

async function arkChat(system, user, opts = {}) {
  const cfg = resolveLlmConfig(opts);
  const apiKey = cfg.apiKey;
  const model = opts.model || cfg.model;
  if (!cfg.ok && cfg.error && cfg.error !== "no_api_key" && cfg.error !== "no_model_endpoint") {
    return { ok: false, content: null, error: cfg.error, billingOverdue: false };
  }
  if (!apiKey) return { ok: false, content: null, error: "no_api_key", billingOverdue: false };
  if (!model) return { ok: false, content: null, error: "no_model_endpoint", billingOverdue: false };
  if (opts.signal?.aborted) return { ok: false, content: null, error: "aborted", billingOverdue: false };
  if (opts.stream) return arkChatStream(system, user, { ...opts, model });
  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 0;
  const ac = new AbortController();
  const onParentAbort = () => ac.abort();
  if (opts.signal) opts.signal.addEventListener("abort", onParentAbort, { once: true });
  const timer = timeoutMs ? setTimeout(() => ac.abort(), timeoutMs) : null;
  debugLog.info("Strategy", "llmChat request", {
    provider: cfg.provider,
    model,
    baseUrl: cfg.baseUrl,
    systemLen: system.length,
    userLen: user.length,
    userPreview: user.slice(0, 160),
    timeoutMs: timeoutMs || null
  });
  let response;
  try {
    const body = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: opts.temperature != null ? opts.temperature : 0.3
    };
    if (Number(opts.maxTokens) > 0) body.max_tokens = Number(opts.maxTokens);
    response = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: cfg.headers || {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: ac.signal
    });
  } catch (err) {
    if (timer) clearTimeout(timer);
    if (opts.signal) opts.signal.removeEventListener("abort", onParentAbort);
    if (ac.signal.aborted || opts.signal?.aborted || err?.name === "AbortError") {
      return { ok: false, content: null, error: "aborted", billingOverdue: false };
    }
    throw err;
  }
  if (timer) clearTimeout(timer);
  if (opts.signal) opts.signal.removeEventListener("abort", onParentAbort);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      ok: false,
      content: null,
      error: `LLM HTTP ${response.status}`,
      status: response.status,
      billingOverdue: isBillingOverdue(response.status, body)
    };
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || null;
  debugLog.info("Strategy", "llmChat ok", {
    provider: cfg.provider,
    preview: String(content || "").slice(0, 160)
  });
  return { ok: true, content, error: null, billingOverdue: false, provider: cfg.provider };
}

module.exports = {
  isBillingOverdue,
  resolveChatModel,
  arkChatStream,
  arkChat,
  /** 别名：BYOK 语义 */
  llmChat: arkChat,
  llmChatStream: arkChatStream,
  arkBaseUrl
};
