/**
 * 分级建议卡（旁路）：Option A/B/C，不改口播流水线。
 * 文案模板来自 schema；事实句可来自 FAQ 召回 / Speculative prefetch。
 */
const { matchFaqInstant } = require("../knowledge");
const { classifyCopilotIntent, lastTranscriptSegment, copilotCfg } = require("./gate.cjs");
const { noteOthersForPrefetch, takePrefetch, runPrefetch } = require("./prefetch.cjs");
const { resolveTriggerMode } = require("./mode.cjs");
const { formatScreenForPrompt } = require("./screenContext.cjs");
const { detectMermaidHint } = require("./mermaidHint.cjs");
const { buildDeepDive } = require("./deepDive.cjs");

function clip(s, n) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return t.slice(0, Math.max(0, n - 1)) + "…";
}

function fillTpl(tpl, vars) {
  return String(tpl || "").replace(/\{(\w+)\}/g, (_, k) =>
    vars && vars[k] != null ? String(vars[k]) : ""
  );
}

function isCopilotEnabled(cfg) {
  if (process.env.COPILOT_ENABLED === "0") return false;
  if (process.env.COPILOT_ENABLED === "1") return true;
  return cfg.enabledDefault !== false;
}

/**
 * @param {string} transcript
 * @param {{ agenda?: string, force?: boolean, skipPrefetch?: boolean }} [opts]
 */
function buildCopilotPacket(transcript, opts = {}) {
  const cfg = copilotCfg();
  if (!isCopilotEnabled(cfg)) {
    return { enabled: false, should_trigger: false };
  }

  const mode = resolveTriggerMode();
  const force = Boolean(opts.force);
  const segment = lastTranscriptSegment(transcript);
  const gate = classifyCopilotIntent(segment);
  const maxChars = Number(cfg.limits?.maxSuggestionChars) || 60;
  const labels = cfg.labels || {};
  const templates = cfg.templates || {};

  let prefetchMeta = null;
  if (!opts.skipPrefetch) {
    try {
      prefetchMeta = noteOthersForPrefetch(transcript);
    } catch (_) {}
  }

  const packet = {
    enabled: true,
    ts: Date.now(),
    trigger_mode: mode,
    force: force || undefined,
    detected_intent: gate.target_topic || gate.category,
    category: gate.category,
    urgency: gate.urgency,
    should_trigger: gate.should_trigger,
    target_topic: gate.target_topic,
    segment: gate.segment,
    agenda: opts.agenda || "",
    speaker_role: "Others",
    labels: {
      push_forward: labels.push_forward || "Option A",
      push_back: labels.push_back || "Option B",
      counter_inquiry: labels.counter_inquiry || "Option C"
    },
    suggestions: null,
    key_facts: [],
    faq_title: null,
    prefetch: prefetchMeta
      ? {
          used: false,
          faq: prefetchMeta.faq || null,
          speakingMs: prefetchMeta.speakingMs
        }
      : null
  };

  // manual：仅 Push-to-Ask（force）可弹出建议卡；仍做预检索
  if (mode === "manual" && !force) {
    packet.should_trigger = false;
    packet.held_for_manual = gate.should_trigger;
    return packet;
  }

  // force：有有效片段即出卡（手动要建议）
  if (force && segment && segment.length >= (Number(cfg.limits?.minChars) || 4)) {
    packet.should_trigger = true;
    if (!packet.urgency || packet.urgency === "Ignore") packet.urgency = "High";
  }

  if (!packet.should_trigger) return packet;

  const topic = gate.target_topic || "当前议题";
  let fact = "";
  const pre = takePrefetch(segment);
  if (pre?.faq?.answer) {
    packet.faq_title = pre.faq.title || null;
    fact = clip(pre.faq.answer || pre.faq.title || "", maxChars);
    packet.key_facts = Array.isArray(pre.keyFacts) ? pre.keyFacts.slice(0, 4) : [];
    if (packet.prefetch) packet.prefetch.used = true;
  } else {
    try {
      const faq = matchFaqInstant(segment) || (force ? runPrefetch(segment)?.faq : null);
      if (faq) {
        packet.faq_title = faq.title || null;
        const body = String(faq.answer || "").trim();
        fact = clip(body || faq.title || "", maxChars);
        if (faq.title) packet.key_facts.push(clip(faq.title, 40));
        if (body) packet.key_facts.push(clip(body, 48));
      }
    } catch (_) {}
    if (pre?.keyFacts?.length && !packet.key_facts.length) {
      packet.key_facts = pre.keyFacts.slice(0, 4);
      if (packet.prefetch) packet.prefetch.used = true;
    }
  }

  // Wiki superseded → 权衡口径
  let supersededHint = "";
  try {
    const preEv = takePrefetch(segment);
    const sup = preEv?.superseded?.[0] || preEv?.wiki2?.superseded?.[0];
    if (sup?.statement) {
      supersededHint = clip(
        `历史已否决：${sup.statement}${
          sup.reason_for_rejection ? `（${sup.reason_for_rejection}）` : ""
        }`,
        maxChars
      );
      if (supersededHint && !packet.key_facts.includes(supersededHint)) {
        packet.key_facts.unshift(supersededHint);
      }
    }
  } catch (_) {}

  const pushForward = fact
    ? fillTpl(templates.push_forward_with_fact || templates.push_forward_generic, { fact })
    : templates.push_forward_generic || "";
  const pushBack = supersededHint
    ? clip(`关于${topic}，${supersededHint}，建议先对齐现状再拍板。`, maxChars)
    : fillTpl(templates.push_back_with_topic || templates.push_back_generic, {
        topic
      });
  const counter = fillTpl(
    templates.counter_inquiry_with_topic || templates.counter_inquiry_generic,
    { topic }
  );

  packet.suggestions = {
    push_forward: clip(pushForward, maxChars),
    push_back: clip(pushBack, maxChars),
    counter_inquiry: clip(counter, maxChars)
  };

  try {
    const screenLine = formatScreenForPrompt();
    if (screenLine) {
      packet.screen_context = screenLine;
      packet.key_facts.push(clip(screenLine, 80));
    }
  } catch (_) {}
  try {
    packet.mermaid_diagram = detectMermaidHint(segment) || null;
  } catch (_) {
    packet.mermaid_diagram = null;
  }
  try {
    const preEv = takePrefetch(segment);
    if (preEv?.wiki2) {
      packet.wiki_evidence = {
        ms: preEv.wiki2.ms,
        hit_count: (preEv.wiki2.hits || []).length,
        preview: String(preEv.wiki2.preview || "").slice(0, 400)
      };
    }
  } catch (_) {}
  try {
    packet.deep_dive = buildDeepDive(packet);
  } catch (_) {
    packet.deep_dive = null;
  }
  packet.key_facts = (packet.key_facts || []).slice(0, 6);

  return packet;
}

/** 节流状态（进程内） */
const throttle = { lastFp: "", lastAt: 0 };

function buildCopilotPacketThrottled(transcript, opts = {}) {
  const cfg = copilotCfg();
  const ms = Number(cfg.limits?.throttleMs) || 2500;
  const packet = buildCopilotPacket(transcript, opts);
  if (!packet?.should_trigger) return packet;
  if (opts.force) return packet; // 手动不节流吞掉
  const fp = `${packet.category}|${packet.segment}`.slice(0, 120);
  const now = Date.now();
  if (fp === throttle.lastFp && now - throttle.lastAt < ms) {
    return { ...packet, throttled: true, should_trigger: false };
  }
  throttle.lastFp = fp;
  throttle.lastAt = now;
  return packet;
}

/**
 * 近 N 秒转写窗口（行级，供 Push-to-Ask）。
 * @param {Array<{text?: string, speaker?: string, at?: number}>|string} linesOrText
 * @param {number} [windowMs]
 */
function windowTranscript(linesOrText, windowMs = 60000) {
  if (typeof linesOrText === "string") return linesOrText;
  const now = Date.now();
  const ms = Number(windowMs) || 60000;
  const lines = Array.isArray(linesOrText) ? linesOrText : [];
  const recent = lines.filter((l) => !l.at || now - l.at <= ms);
  const use = recent.length ? recent : lines.slice(-12);
  return use
    .map((l) => {
      const sp = l.speaker || l.role || "会场";
      return `${sp}: ${String(l.text || "").trim()}`;
    })
    .filter((s) => s.length > 3)
    .join("\n");
}

module.exports = {
  buildCopilotPacket,
  buildCopilotPacketThrottled,
  windowTranscript
};
