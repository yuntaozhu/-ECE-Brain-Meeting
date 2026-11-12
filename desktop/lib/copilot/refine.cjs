/**
 * 两阶段建议卡精炼：instant/aligned 之后豆包顾问刷新（旁路，不改 decideSpeak）。
 * Wave R8c：默认开启；FAQ/Draft 作证据；三角顾问分析（非话术同义改写）。
 */
const { llmChat } = require("../meetingStrategy/llm/transport.cjs");
const { resolveLlmConfig } = require("../meetingStrategy/llm/providers/resolve.cjs");
const { smartClip } = require("./suggestClip.cjs");
const { copilotCfg } = require("./gate.cjs");
const { sanitizeSpeakText } = require("./sanitizeSpeakText.cjs");
const { shortAskTopic } = require("../intelligence/askLane.cjs");

function shouldRefineCopilot(opts = {}) {
  // Wave R8c：默认开精炼；显式 0/off/false 可关
  const v = String(process.env.COPILOT_LLM_REFINE || "1").trim().toLowerCase();
  if (opts.force) return true;
  if (v === "0" || v === "false" || v === "off") return false;
  if (v === "1" || v === "true" || v === "on" || v === "auto") return true;
  return true;
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

function copilotLlmOpts(extra = {}) {
  return {
    channel: "copilot",
    fast: true,
    ...extra
  };
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
    cfg = resolveLlmConfig(copilotLlmOpts());
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

  const draftText = String(opts.speakDraft?.text || packet.speak_draft || "").trim();
  const user = [
    `pattern_id: ${patternId}`,
    `会场片段: ${packet.segment || ""}`,
    `topic: ${packet.target_topic || ""}`,
    draftText ? `SpeakDraft: ${draftText.slice(0, 200)}` : "",
    `instant_C: ${packet.suggestions.counter_inquiry}`,
    opts.transcript ? `Context:\n${String(opts.transcript).slice(-500)}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  const t0 = Date.now();
  const res = await llmChat(system, user, {
    signal: opts.signal,
    timeoutMs: Number(opts.timeoutMs) || Number(process.env.COPILOT_LLM_REFINE_TIMEOUT_MS) || 8000,
    temperature: 0.35,
    maxTokens: 220,
    ...copilotLlmOpts()
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
      refine_provider: res.provider || "doubao",
      refine_model: res.model || cfg.model || ""
    }
  };
}

/**
 * @param {object} packet buildCopilotPacket 产物
 * @param {{ transcript?: string, agenda?: string, signal?: AbortSignal, timeoutMs?: number, maxChars?: number, counterOnly?: boolean, speakDraft?: object }} [opts]
 */
function fillAdvisorSystem(tpl, vars) {
  return String(tpl || "").replace(/\{(\w+)\}/g, (_, key) =>
    vars && vars[key] != null ? String(vars[key]) : ""
  );
}

function defaultAdvisorSystem(maxChars, patternId) {
  return `你是会中副驾驶顾问（不是话术润色器）。根据用户原话与【Evidence】产出三条可脱口的不同立场建议。
人称：自述用「我」，反问用「您」；禁止「对方/会场/控场/按现有口径」。
Evidence / SpeakDraft 只作证据；禁止新报价、包赚、绕规、伪造好评率/家长原话/NPS。
三条必须角度不同：
- push_forward：推进路径（下一步动作 + 为何可行）
- push_back：边界/代价/风险（勿念「历史已否决」原文）
- counter_inquiry：澄清缺口；贴合 pattern_id=${patternId}；禁止复读用户整句原话
deep_dive.speak_script 只含可口述正文（约100字），禁止「历史已否决/可参考FAQ/可反问」。
若 Evidence 与用户目标明显错配，先点明局限再给过渡建议，禁止硬套邻卡流水账。
只输出 JSON（不要 markdown 围栏）：
{"push_forward":"...","push_back":"...","counter_inquiry":"...","deep_dive":{"thesis":"...","bullets":["..."],"speak_script":"..."}}
每条建议≤${maxChars}字。`;
}

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
    cfg = resolveLlmConfig(copilotLlmOpts());
  } catch (_) {
    return { ok: false, error: "resolve_failed" };
  }
  if (!cfg?.ok || !cfg.apiKey) return { ok: false, error: "no_api_key" };

  const maxChars = Number(opts.maxChars) || 80;
  const patternId = packet.counter_pattern || "generic";
  const gate = copilotCfg();
  const system = fillAdvisorSystem(gate.refine?.advisorSystem, { maxChars, patternId }) ||
    defaultAdvisorSystem(maxChars, patternId);

  const facts = (packet.key_facts || []).slice(0, 6).join("\n· ");
  const draftText = String(opts.speakDraft?.text || packet.speak_draft || "").trim();
  const topic = shortAskTopic(packet.target_topic || packet.segment || "", "这一点");
  const faqHint = packet.faq_title
    ? `FAQ 标题（可能错配，仅供参考）：${String(packet.faq_title).slice(0, 80)}`
    : "";
  const user = [
    `议程: ${opts.agenda || packet.agenda || ""}`,
    `会场片段: ${packet.segment || ""}`,
    `短主题: ${topic}`,
    `ask_lane: ${packet.ask_lane || "hard"}`,
    `意图分类: ${packet.category || ""} / ${packet.urgency || ""}`,
    `counter_pattern: ${patternId}`,
    draftText ? `[SpeakDraft 硬事实句]\n${draftText.slice(0, 400)}` : "",
    facts ? `[Evidence]\n· ${facts}` : "[Evidence]\n· （暂无合格证据，请坦诚缺口并给澄清/邀约）",
    faqHint,
    packet.wiki_evidence?.preview
      ? `[Wiki Preview]\n${String(packet.wiki_evidence.preview).slice(0, 500)}`
      : "",
    packet.screen_context ? `[Screen]\n${packet.screen_context}` : "",
    `[Instant 占位·禁止同义复读]\n${JSON.stringify(packet.suggestions)}`,
    opts.transcript ? `[Context]\n${String(opts.transcript).slice(-800)}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");

  const t0 = Date.now();
  const res = await llmChat(system, user, {
    signal: opts.signal,
    timeoutMs: Number(opts.timeoutMs) || Number(process.env.COPILOT_LLM_REFINE_TIMEOUT_MS) || 15000,
    temperature: 0.45,
    maxTokens: 800,
    ...copilotLlmOpts()
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
      refine_mode: "advisor",
      refine_ms: Date.now() - t0,
      refine_provider: res.provider || "doubao",
      refine_model: res.model || cfg.model || ""
    }
  };
}

module.exports = {
  shouldRefineCopilot,
  refineCopilotPacketAsync,
  refineCounterInquiryAsync,
  extractJson,
  copilotLlmOpts
};
