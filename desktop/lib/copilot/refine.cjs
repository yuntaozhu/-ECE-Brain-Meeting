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
const {
  isSkeletonSuggestion,
  buildPushBackLine,
  detemplateSuggestions
} = require("./skeleton.cjs");
const { isUsableFact } = require("./topicQuality.cjs");

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
  return `你是会中副驾驶顾问（不是话术润色器）。必须针对会场原话重写三条建议，禁止同义改写 Instant 套话。
人称：自述用「我」，反问用「您」；禁止「对方/会场/控场/按现有口径」。
Evidence / SpeakDraft 只作证据；禁止新报价、包赚、绕规。
硬禁止：建议先确认边界与代价再拍板；关于…建议先确认边界；围绕…价格回报落地节奏。
- push_forward：直接回应用户目标（测算口径+不保证条件）
- push_back：具体风险，禁止空壳「边界与代价」
- counter_inquiry：贴合 pattern_id=${patternId}
- smart_replies：2～3 条≤24字
只输出 JSON：{"push_forward":"...","push_back":"...","counter_inquiry":"...","smart_replies":["..."],"deep_dive":{"thesis":"...","bullets":["..."],"speak_script":"..."}}
每条≤${maxChars}字。`;
}

function pickFactFromPacket(packet, speakDraft) {
  const draft = String(speakDraft?.text || "").trim();
  if (draft && isUsableFact(draft)) return draft;
  for (const f of packet?.key_facts || []) {
    const s = String(f || "").trim();
    if (s && isUsableFact(s) && !/历史已否决/.test(s)) return s;
  }
  return "";
}

function suggestionsStillSkeleton(suggestions, cfg) {
  if (!suggestions) return true;
  return (
    isSkeletonSuggestion(suggestions.push_back, cfg) ||
    isSkeletonSuggestion(suggestions.push_forward, cfg)
  );
}

/** Meta / repair / 回放句禁止当业务 Draft 精炼 */
function isMetaOrRepairDraft(speakDraft, packet) {
  const mode = String(speakDraft?.arkMode || packet?.ark_mode || "").toLowerCase();
  if (
    mode === "dialogue-meta" ||
    mode === "recall" ||
    mode === "recall-list" ||
    mode === "agent-card"
  ) {
    return true;
  }
  if (packet?.speakKind === "meta" || speakDraft?.speakKind === "meta") return true;
  const text = String(speakDraft?.text || packet?.speak_draft || "").trim();
  if (!text) return false;
  if (/^刚才您问的是[：:]/.test(text)) return true;
  if (/^刚才我答的是[：:]/.test(text)) return true;
  if (/这句我没听清|还没记下您上一句|还没记下上一句业务回答/.test(text)) return true;
  return false;
}

async function refineCopilotPacketAsync(packet, opts = {}) {
  if (!packet?.should_trigger || !packet.suggestions) {
    return { ok: false, error: "no_packet" };
  }
  if (opts.signal?.aborted) return { ok: false, error: "aborted" };

  if (opts.counterOnly) {
    return refineCounterInquiryAsync(packet, opts);
  }

  const speakDraft = opts.speakDraft || null;
  if (isMetaOrRepairDraft(speakDraft, packet)) {
    return { ok: false, error: "meta_draft_skip" };
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
  const draftText = String(speakDraft?.text || packet.speak_draft || "").trim();
  const topic = shortAskTopic(packet.target_topic || packet.segment || "", "这一点");
  const factLine = pickFactFromPacket(packet, speakDraft);
  const faqHint = packet.faq_title
    ? `FAQ 标题（可能错配，勿整段念邻卡）：${String(packet.faq_title).slice(0, 80)}`
    : "";

  function buildUser(extra = "") {
    return [
      `议程: ${opts.agenda || packet.agenda || ""}`,
      `会场原话（必须直接回应）: ${packet.segment || ""}`,
      `短主题: ${topic}`,
      `ask_lane: ${packet.ask_lane || "hard"}`,
      `意图分类: ${packet.category || ""} / ${packet.urgency || ""}`,
      `counter_pattern: ${patternId}`,
      draftText ? `[SpeakDraft 硬事实句·禁止 Meta/repair]\n${draftText.slice(0, 400)}` : "",
      facts ? `[Evidence]\n· ${facts}` : "[Evidence]\n· （暂无合格证据，请坦诚缺口并给澄清/邀约）",
      faqHint,
      packet.wiki_evidence?.preview
        ? `[Wiki Preview]\n${String(packet.wiki_evidence.preview).slice(0, 500)}`
        : "",
      packet.screen_context ? `[Screen]\n${packet.screen_context}` : "",
      `[禁止照抄的 Instant 骨架]\n${JSON.stringify(packet.suggestions)}\n必须整段重写 A/B/C，禁止保留「边界与代价再拍板」类套话。`,
      extra,
      opts.transcript ? `[Context]\n${String(opts.transcript).slice(-800)}` : ""
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  async function callAdvisor(user, temperature) {
    return llmChat(system, user, {
      signal: opts.signal,
      timeoutMs: Number(opts.timeoutMs) || Number(process.env.COPILOT_LLM_REFINE_TIMEOUT_MS) || 15000,
      temperature,
      maxTokens: 800,
      ...copilotLlmOpts()
    });
  }

  function parseSuggestions(content) {
    const parsed = extractJson(content);
    if (!parsed || typeof parsed !== "object") return null;
    let nextSuggestions = {
      push_forward: clipSpeak(parsed.push_forward || "", maxChars),
      push_back: clipSpeak(parsed.push_back || "", maxChars),
      counter_inquiry: clipSpeak(parsed.counter_inquiry || "", maxChars)
    };
    // 缺字段或骨架 → 本地去模板，禁止回落 Instant 空壳 B
    if (!nextSuggestions.push_forward) {
      nextSuggestions.push_forward = clipSpeak(factLine || packet.suggestions.push_forward, maxChars);
    }
    if (!nextSuggestions.push_back || isSkeletonSuggestion(nextSuggestions.push_back, gate)) {
      nextSuggestions.push_back = clipSpeak(
        buildPushBackLine({ fact: factLine, topic, templates: gate.templates }, gate),
        maxChars
      );
    }
    if (!nextSuggestions.counter_inquiry) {
      nextSuggestions.counter_inquiry = clipSpeak(packet.suggestions.counter_inquiry, maxChars);
    }
    nextSuggestions = detemplateSuggestions(
      nextSuggestions,
      { fact: factLine, topic },
      gate
    );
    nextSuggestions = {
      push_forward: clipSpeak(nextSuggestions.push_forward, maxChars),
      push_back: clipSpeak(nextSuggestions.push_back, maxChars),
      counter_inquiry: clipSpeak(nextSuggestions.counter_inquiry, maxChars)
    };
    const smartReplies = Array.isArray(parsed.smart_replies)
      ? parsed.smart_replies
          .map((s) => smartClip(sanitizeSpeakText(s), 24))
          .filter(Boolean)
          .slice(0, 3)
      : [];
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
    return { nextSuggestions, smartReplies, deepDive, parsed };
  }

  const t0 = Date.now();
  let res = await callAdvisor(buildUser(), 0.45);
  if (opts.signal?.aborted) return { ok: false, error: "aborted" };
  if (!res?.ok || !res.content) {
    const onlyC = await refineCounterInquiryAsync(packet, opts);
    if (onlyC.ok) {
      // 即使只修 C，也把 B 从骨架里救出来
      const fixedB = clipSpeak(
        buildPushBackLine({ fact: factLine, topic, templates: gate.templates }, gate),
        maxChars
      );
      return {
        ok: true,
        packet: {
          ...onlyC.packet,
          suggestions: {
            ...onlyC.packet.suggestions,
            push_back: isSkeletonSuggestion(onlyC.packet.suggestions?.push_back, gate)
              ? fixedB
              : onlyC.packet.suggestions.push_back
          },
          refine_mode: "counter_plus_detemplate"
        }
      };
    }
    return { ok: false, error: res?.error || "empty" };
  }

  let packed = parseSuggestions(res.content);
  if (!packed) {
    const onlyC = await refineCounterInquiryAsync(packet, opts);
    if (onlyC.ok) return onlyC;
    return { ok: false, error: "parse_failed", preview: String(res.content).slice(0, 120) };
  }

  // 仍骨架 → 再打一次（强提醒），再失败则本地 detemplate
  if (suggestionsStillSkeleton(packed.nextSuggestions, gate) && !opts.signal?.aborted) {
    const retry = await callAdvisor(
      buildUser("【重试】上轮 push_back/push_forward 仍是套话。请针对会场原话重写，禁止「边界与代价再拍板」。"),
      0.55
    );
    if (retry?.ok && retry.content) {
      const again = parseSuggestions(retry.content);
      if (again) packed = again;
    }
    packed.nextSuggestions = detemplateSuggestions(
      packed.nextSuggestions,
      { fact: factLine, topic },
      gate
    );
    packed.nextSuggestions = {
      push_forward: clipSpeak(packed.nextSuggestions.push_forward, maxChars),
      push_back: clipSpeak(packed.nextSuggestions.push_back, maxChars),
      counter_inquiry: clipSpeak(packed.nextSuggestions.counter_inquiry, maxChars)
    };
  }

  return {
    ok: true,
    packet: {
      ...packet,
      suggestions: packed.nextSuggestions,
      smart_replies: packed.smartReplies,
      deep_dive: packed.deepDive,
      stage: "refined",
      refined: true,
      refine_mode: "advisor",
      refine_ms: Date.now() - t0,
      refine_provider: res.provider || "doubao",
      refine_model: res.model || cfg.model || "",
      suggestion_sources: {
        ...(packet.suggestion_sources || {}),
        refined: true,
        detemplated: !suggestionsStillSkeleton(packed.nextSuggestions, gate)
      }
    }
  };
}

module.exports = {
  shouldRefineCopilot,
  refineCopilotPacketAsync,
  refineCounterInquiryAsync,
  extractJson,
  copilotLlmOpts,
  isMetaOrRepairDraft,
  isSkeletonSuggestion,
  pickFactFromPacket
};
