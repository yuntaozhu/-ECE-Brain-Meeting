/**
 * 非流式 chat/completions（方舟兼容）
 */
"use strict";

const { resolveLlmConfig } = require("./resolve.cjs");

async function llmChat(system, user, opts = {}) {
  const cfg = resolveLlmConfig(opts);
  if (!cfg.ok) {
    return { ok: false, content: null, error: cfg.error || "llm_config", provider: cfg.provider };
  }

  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 20000;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  try {
    const body = {
      model: cfg.model,
      messages: [
        { role: "system", content: String(system || "") },
        { role: "user", content: String(user || "") }
      ],
      temperature: opts.temperature != null ? opts.temperature : 0.3
    };
    if (Number(opts.maxTokens) > 0) body.max_tokens = Number(opts.maxTokens);
    if (opts.disableThinking !== false) {
      body.thinking = { type: "disabled" };
    }

    const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: cfg.headers,
      body: JSON.stringify(body),
      signal: ac.signal
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      return {
        ok: false,
        content: null,
        error: `LLM HTTP ${response.status}`,
        status: response.status,
        detail: String(errBody).slice(0, 200),
        provider: cfg.provider,
        model: cfg.model
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || null;
    if (!content || !String(content).trim()) {
      return { ok: false, content: null, error: "empty_content", provider: cfg.provider, model: cfg.model };
    }
    return {
      ok: true,
      content: String(content).trim(),
      error: null,
      provider: cfg.provider,
      model: cfg.model
    };
  } catch (err) {
    if (err?.name === "AbortError" || ac.signal.aborted) {
      return { ok: false, content: null, error: "timeout", provider: cfg.provider, model: cfg.model };
    }
    return {
      ok: false,
      content: null,
      error: String(err.message || err).slice(0, 120),
      provider: cfg.provider,
      model: cfg.model
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { llmChat };
