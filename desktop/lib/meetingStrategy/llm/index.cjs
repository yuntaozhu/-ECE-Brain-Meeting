/** Ark Chat / speakViaChat / fallback */
const D = require("../internal/deps.cjs");
const scripts = require("../internal/scripts.cjs");
const { newEvent } = require("../internal/result.cjs");
const {
  debugLog,
  matchFaqInstant,
  isRecallLastAsk,
  isSessionMemoryMeta,
  isCasualChitchat,
  isEnrollmentBenefitAsk,
  isBusinessIntent,
  isOperateQuestion,
  DEFAULT_AGENDA
} = D;
const {
  THINKING_FILLER,
  FAST_LLM_MS,
  IDENTITY_LINE,
  CLOSED_MISS_LINE,
  CHITCHAT_LINE
} = scripts;

function isBillingOverdue(status, body) {
  const s = String(body || "");
  return status === 403 && (/AccountOverdueError/i.test(s) || /overdue|欠费|过期|余额不足/i.test(s));
}

function resolveChatModel(opts = {}) {
  if (opts.fast) {
    return (
      process.env.DOUBAO_CHAT_FAST_MODEL ||
      process.env.DOUBAO_CHAT_MODEL ||
      process.env.DOUBAO_MODEL_ENDPOINT ||
      "doubao-seed-2-1-turbo-260628"
    );
  }
  return (
    process.env.DOUBAO_CHAT_MODEL ||
    process.env.DOUBAO_MODEL_ENDPOINT ||
    "doubao-seed-2-1-turbo-260628"
  );
}


function chatFallbackFor(askText, state, agenda) {
  const q = String(askText || "").trim();
  if (isRecallLastAsk(q)) {
    const prev = String(state?.lastRealAsk || "").trim();
    if (prev) return `刚才您问的是：${clipUtterance(prev, 80)}`;
    return "我这边还没记下您上一句实质问题。请再说一遍。";
  }
  if (isSessionMemoryMeta(q)) {
    const prev = String(state?.lastRealAsk || "").trim();
    return prev
      ? `上一问我记着：${clipUtterance(prev, 60)}。也可以说「大智总结一下」。`
      : "本场转写有记。您可以说「大智总结一下」听要点。";
  }
  if (isCasualChitchat(q)) return CHITCHAT_LINE;
  if (/(你是谁|你是什么|你叫什么)/.test(q)) return IDENTITY_LINE;
  if (/(会议主题|开什么会|今天.*主题|这次会议的主题)/.test(q)) {
    return (
      matchFaqInstant("今天会议主题是什么")?.answer ||
      matchFaqInstant(q)?.answer ||
      `今天主题是${agenda || DEFAULT_AGENDA}。`
    );
  }
  const faq = matchFaqInstant(q);
  if (faq?.answer) return leadClause(faq.answer, 72);
  if (isEnrollmentBenefitAsk(q)) {
    return (
      matchFaqInstant("加入全园美语对招生有帮助吗")?.answer ||
      "有帮助。项目核心目标是让美语特色成为招生引擎，测算口径不等于保证招满。"
    );
  }
  if (isBusinessIntent(q) || isOperateQuestion(q)) {
    const lead = buildFastLead(q).lead;
    if (lead && !isDefinitionSpeak(lead)) return lead;
  }
  return CLOSED_MISS_LINE;
}

async function arkChatStream(system, user, opts = {}) {
  const apiKey = (process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim();
  const model = opts.model || resolveChatModel(opts);
  if (!apiKey) return { ok: false, content: null, error: "no_api_key", billingOverdue: false };
  if (opts.signal?.aborted) return { ok: false, content: null, error: "aborted", billingOverdue: false };
  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : 0;
  const ac = new AbortController();
  const onParentAbort = () => ac.abort();
  if (opts.signal) opts.signal.addEventListener("abort", onParentAbort, { once: true });
  const timer = timeoutMs ? setTimeout(() => ac.abort(), timeoutMs) : null;
  debugLog.info("Strategy", "arkChat stream request", {
    model,
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
    response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
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
  const apiKey = (process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim();
  const model = resolveChatModel(opts);
  if (!apiKey) return { ok: false, content: null, error: "no_api_key", billingOverdue: false };
  if (opts.signal?.aborted) return { ok: false, content: null, error: "aborted", billingOverdue: false };
  if (opts.stream) return arkChatStream(system, user, { ...opts, model });
  debugLog.info("Strategy", "arkChat request", {
    model,
    systemLen: system.length,
    userLen: user.length,
    userPreview: user.slice(0, 160)
  });
  let response;
  try {
    response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: opts.temperature != null ? opts.temperature : 0.3
      }),
      signal: opts.signal
    });
  } catch (err) {
    if (opts.signal?.aborted || err?.name === "AbortError") {
      return { ok: false, content: null, error: "aborted", billingOverdue: false };
    }
    throw err;
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      ok: false,
      content: null,
      error: `Ark HTTP ${response.status}`,
      status: response.status,
      billingOverdue: isBillingOverdue(response.status, body)
    };
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || null;
  debugLog.info("Strategy", "arkChat ok", { preview: String(content || "").slice(0, 160) });
  return { ok: true, content, error: null, billingOverdue: false };
}

/**
 * P0：思考占位仅 UI；正式答整段一次 TTS（不再 early+queue 拆播）。
 */
async function speakViaChat(system, userTask, opts, a2aTrace) {
  let thinkingTimer = null;
  const armThinking = () => {
    thinkingTimer = setTimeout(() => {
      a2aTrace.push(newEvent("HostAgent", "AudioBridge", "THINKING_FILLER", { text: THINKING_FILLER, uiOnly: true }));
      Promise.resolve(opts.onThinking?.(THINKING_FILLER)).catch(() => {});
    }, 650);
  };
  const clearThinking = () => {
    if (thinkingTimer) clearTimeout(thinkingTimer);
    thinkingTimer = null;
  };
  let answer = "";
  let arkBillingOverdue = false;
  let arkError = null;
  let arkMode = "llm";
  try {
    if (opts.signal?.aborted) throw new Error("aborted");
    armThinking();
    let res = await arkChat(system, userTask, {
      fast: true,
      stream: true,
      temperature: opts.temperature,
      signal: opts.signal,
      timeoutMs: opts.timeoutMs || FAST_LLM_MS,
      onClause: opts.onClause
    });
    if (opts.signal?.aborted) {
      clearThinking();
      return {
        answer: "",
        speakTail: "",
        spokenPrefix: "",
        earlyCovered: false,
        arkMode: "aborted",
        arkBillingOverdue: false,
        arkError: "aborted",
        aborted: true
      };
    }
    if (!res.ok || !res.content) {
      if (res.error === "aborted") throw new Error("timeout");
      res = await arkChat(system, userTask, {
        fast: true,
        stream: false,
        temperature: opts.temperature,
        signal: opts.signal,
        timeoutMs: opts.timeoutMs || FAST_LLM_MS
      });
    }
    clearThinking();
    if (opts.signal?.aborted || res.error === "aborted") {
      return {
        answer: "",
        speakTail: "",
        spokenPrefix: "",
        earlyCovered: false,
        arkMode: "aborted",
        arkBillingOverdue: false,
        arkError: "aborted",
        aborted: true
      };
    }
    if (res.billingOverdue) {
      arkBillingOverdue = true;
      arkError = res.error;
    }
    if (res.ok && res.content) answer = stripIntroBoilerplate(clipSpeak(res.content, opts.maxLen || 100));
    else throw new Error(res.error || "empty");
  } catch (err) {
    clearThinking();
    if (opts.signal?.aborted || err?.message === "aborted" || err?.name === "AbortError") {
      return {
        answer: "",
        speakTail: "",
        spokenPrefix: "",
        earlyCovered: false,
        arkMode: "aborted",
        arkBillingOverdue: false,
        arkError: "aborted",
        aborted: true
      };
    }
    arkMode = "heuristic";
    debugLog.warn("Strategy", "对话回退", { error: String(err?.message || err) });
    answer = opts.fallback || "我在。请再说具体一点，我结合资料答您。";
  }
  // 整段一次播报：speakTail = 全文，无 early 前缀
  return {
    answer,
    speakTail: answer,
    spokenPrefix: "",
    earlyCovered: false,
    arkMode,
    arkBillingOverdue,
    arkError,
    aborted: false
  };
}


module.exports = {
  isBillingOverdue,
  resolveChatModel,
  chatFallbackFor,
  arkChatStream,
  arkChat,
  speakViaChat,
  FAST_LLM_MS
};
