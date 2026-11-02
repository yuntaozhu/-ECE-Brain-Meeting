/**
 * 两阶段建议卡精炼：instant 模板之后可选豆包 LLM 刷新（旁路，不改 decideSpeak）。
 * Option C 按 counter_pattern 专治；出口统一 sanitize。
 */
const { llmChat } = require("../meetingStrategy/llm/transport.cjs");
const { resolveLlmConfig } = require("../meetingStrategy/llm/providers/resolve.cjs");
const { smartClip } = require("./suggestClip.cjs");
const { copilotCfg } = require("./gate.cjs");
const { sanitizeSpeakText } = require("./sanitizeSpeakText.cjs");

function shouldRefineCopilot(opts = {}) {
  const v = String(process.env.COPILOT_LLM_REFINE || "0").trim().toLowerCase();
  if (opts.force) return true;
  if (v === "1" || v === "true" || v === "on") return true;
  if (v === "auto") return true;
  return false;
}

function extractJson(text) {
  const s = String(text || "").trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : s;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}

function clipSpeak(text, maxChars) {
  return smartClip(sanitizeSpeakText(text), maxChars);
}

/**
 * 仅精炼 Option C（失败则保留 instant）。
 */
async function refineCounterInquiryAsync(packet, opts = {}) {
  if (!packet?.suggestions?.counter_inquiry) {
    return { ok: false, error: "no_counter" };
  }
  if (opts.signal?.aborted) return { ok: false, error: "aborted" };

  let cfg;
  try {
    cfg = resolveLlmConfig({ fast: true });
  } catch (_) {
    return { ok: false, error: "resolve_failed" };
  }
  if (!cfg?.ok || !cfg.apiKey) return { ok: false, error: "no_api_key" };

  const maxChars = Number(opts.maxChars) || 80;
  const gate = copilotCfg();
  const patternId = packet.counter_pattern || "generic";
  const system =
    gate.refine?.counterSystem ||
    "你只精炼 Option C 一句澄清反问。必须使用「您」，禁止「对方」。只输出 JSON：{\"counter_inquiry\":\"...\",\"pattern_id\":\"...\"}";

  const user = [
    `pattern_id: ${patternId}`,
    `会场片段: ${packet.segment || ""}`,
    `topic: ${packet.target_topic || ""}`,
    `instant_C: ${packet.suggestions.counter_inquiry}`,
    opts.transcript ? `Context:\n${String(opts.transcript).slice(-500)}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  const t0 = Date.now();
  const res = await llmChat(system, user, {
    signal: opts.signal,
    timeoutMs: Number(opts.timeoutMs) || 8000,
    temperature: 0.35,
    maxTokens: 220,
    fast: true
  });
  if (opts.signal?.aborted) return { ok: false, error: "aborted" };
  if (!res?.ok || !res.content) {
    return { ok: false, error: res?.error || "empty" };
  }
  const parsed = extractJson(res.content);
  const nextC = clipSpeak(
    (parsed && parsed.counter_inquiry) || packet.suggestions.counter_inquiry,
    maxChars
  );
  if (!nextC) return { ok: false, error: "empty_counter" };

  return {
    ok: true,
    packet: {
      ...packet,
      suggestions: {
        ...packet.suggestions,
        counter_inquiry: nextC
      },
      counter_pattern:
        (parsed && parsed.pattern_id) || packet.counter_pattern || patternId,
      stage: packet.stage === "refined" ? "refined" : "counter_refined",
      counter_refined: true,
      counter_refine_ms: Date.now() - t0,
      refine_provider: res.provider || "doubao"
    }
  };
}

/**
 * @param {object} packet buildCopilotPacket 产物
 * @param {{ transcript?: string, agenda?: string, signal?: AbortSignal, timeoutMs?: number, maxChars?: number, counterOnly?: boolean }} [opts]
 */
async function refineCopilotPacketAsync(packet, opts = {}) {
  if (!packet?.should_trigger || !packet.suggestions) {
    return { ok: false, error: "no_packet" };
  }
  if (opts.signal?.aborted) return { ok: false, error: "aborted" };

  if (opts.counterOnly) {
    return refineCounterInquiryAsync(packet, opts);
  }

  let cfg;
  try {
    cfg = resolveLlmConfig({ fast: true });
  } catch (_) {
    return { ok: false, error: "resolve_failed" };
  }
  if (!cfg?.ok || !cfg.apiKey) return { ok: false, error: "no_api_key" };

  const maxChars = Number(opts.maxChars) || 80;
  const patternId = packet.counter_pattern || "generic";
  const system = `你是会中副驾驶话术精炼器。把三条建议改成可对会场脱口而出的口语。
人称：自述用「我」，反问用「您」；禁止「对方/会场/控场」。
Option C 必须贴合 pattern_id=${patternId}，禁止万金油「成功标准」套话（除非 pattern 就是 success_criteria）。
deep_dive.speak_script 只含可口述正文，禁止「历史已否决/可参考FAQ/可反问」。
只输出 JSON（不要 markdown 围栏）：
{"push_forward":"...","push_back":"...","counter_inquiry":"...","deep_dive":{"thesis":"...","bullets":["..."],"speak_script":"..."}}
约束：每条建议≤${maxChars}字；push_back 体现风险/边界但不念「历史已否决」原文；deep_dive.speak_script≈100字。`;

  const facts = (packet.key_facts || []).slice(0, 6).join("\n· ");
  const user = [
    `议程: ${opts.agenda || packet.agenda || ""}`,
    `会场片段: ${packet.segment || ""}`,
    `意图分类: ${packet.category || ""} / ${packet.urgency || ""}`,
    `counter_pattern: ${patternId}`,
    facts ? `[Evidence]\n· ${facts}` : "",
    packet.wiki_evidence?.preview
      ? `[Wiki Preview]\n${String(packet.wiki_evidence.preview).slice(0, 500)}`
      : "",
    packet.screen_context ? `[Screen]\n${packet.screen_context}` : "",
    `[Instant Templates]\n${JSON.stringify(packet.suggestions)}`,
    packet.deep_dive ? `[DeepDive]\n${JSON.stringify(packet.deep_dive)}` : "",
    opts.transcript ? `[Context]\n${String(opts.transcript).slice(-800)}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");

  const t0 = Date.now();
  const res = await llmChat(system, user, {
    signal: opts.signal,
    timeoutMs: Number(opts.timeoutMs) || 10000,
    temperature: 0.35,
    maxTokens: 700,
    fast: true
  });
  if (opts.signal?.aborted) return { ok: false, error: "aborted" };
  if (!res?.ok || !res.content) {
    // 全量精炼失败时仍尝试只修 C
    const onlyC = await refineCounterInquiryAsync(packet, opts);
    if (onlyC.ok) return onlyC;
    return { ok: false, error: res?.error || "empty" };
  }

  const parsed = extractJson(res.content);
  if (!parsed || typeof parsed !== "object") {
    const onlyC = await refineCounterInquiryAsync(packet, opts);
    if (onlyC.ok) return onlyC;
    return { ok: false, error: "parse_failed", preview: String(res.content).slice(0, 120) };
  }

  const nextSuggestions = {
    push_forward: clipSpeak(
      parsed.push_forward || packet.suggestions.push_forward,
      maxChars
    ),
    push_back: clipSpeak(parsed.push_back || packet.suggestions.push_back, maxChars),
    counter_inquiry: clipSpeak(
      parsed.counter_inquiry || packet.suggestions.counter_inquiry,
      maxChars
    )
  };

  let deepDive = packet.deep_dive || null;
  if (parsed.deep_dive && typeof parsed.deep_dive === "object") {
    const d = parsed.deep_dive;
    const speakable = clipSpeak(
      d.speak_script || d.speakable || packet.deep_dive?.speakable || "",
      140
    );
    deepDive = {
      ...(packet.deep_dive || {}),
      thesis: clipSpeak(d.thesis || packet.deep_dive?.thesis || "", 80),
      bullets: Array.isArray(d.bullets)
        ? d.bullets.map((b) => smartClip(b, 72)).filter(Boolean).slice(0, 3)
        : packet.deep_dive?.bullets || [],
      speakable,
      speak_script: speakable,
      internal: packet.deep_dive?.internal || [],
      evidence: packet.deep_dive?.evidence || []
    };
  }

  return {
    ok: true,
    packet: {
      ...packet,
      suggestions: nextSuggestions,
      deep_dive: deepDive,
      stage: "refined",
      refined: true,
      refine_ms: Date.now() - t0,
      refine_provider: res.provider || "doubao"
    }
  };
}

module.exports = {
  shouldRefineCopilot,
  refineCopilotPacketAsync,
  refineCounterInquiryAsync,
  extractJson
};
