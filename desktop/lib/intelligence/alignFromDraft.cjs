/**
 * 副驾驶同源：用 SpeakDraft 覆盖/派生 A/B/C（stage=aligned）。
 * 不发明事实；Option C 可保留 instant 澄清模式。
 */
const { smartClip } = require("../copilot/suggestClip.cjs");
const { sanitizeSpeakText } = require("../copilot/sanitizeSpeakText.cjs");
const { fillTpl } = require("../copilot/counterPattern.cjs");
const { isUsableFact } = require("../copilot/topicQuality.cjs");
const { copilotCfg } = require("../copilot/gate.cjs");

function clipSpeak(text, maxChars) {
  return smartClip(sanitizeSpeakText(text), maxChars);
}

/**
 * @param {object} packet buildCopilotPacket 产物
 * @param {{ text?: string, draftFp?: string, title?: string, arkMode?: string }|null} draft
 * @param {{ maxChars?: number, templates?: object }} [opts]
 */
function alignCopilotFromDraft(packet, draft, opts = {}) {
  if (!packet || !packet.should_trigger || !packet.suggestions) return packet;
  const text = String(draft?.text || "").trim();
  if (!text || !isUsableFact(text)) return packet;

  const cfg = copilotCfg();
  const maxChars = Number(opts.maxChars) || Number(cfg.limits?.maxSuggestionChars) || 60;
  const templates = opts.templates || cfg.templates || {};
  const fact = clipSpeak(text, maxChars);
  const topic = String(packet.target_topic || "").trim() || "这一点";

  const pushForward = clipSpeak(
    fillTpl(templates.push_forward_with_fact || "可以，按现有口径先推进：{fact}", { fact }) ||
      `可以，按现有口径先推进：${fact}`,
    maxChars
  );
  const pushBack = clipSpeak(
    fillTpl(templates.push_back_with_topic || "关于{topic}，我建议先确认边界与代价，再拍板。", {
      topic
    }) || `关于${topic}，我建议先确认边界与代价，再拍板。`,
    maxChars
  );
  const counter =
    packet.suggestions.counter_inquiry ||
    clipSpeak(`您最关心的是${topic}里的哪一条边界？`, maxChars);

  return {
    ...packet,
    stage: "aligned",
    aligned: true,
    draftFp: draft.draftFp || packet.draftFp || "",
    faq_title: draft.title || packet.faq_title || null,
    key_facts: [fact, ...(packet.key_facts || [])].filter(isUsableFact).slice(0, 6),
    suggestions: {
      push_forward: pushForward,
      push_back: pushBack,
      counter_inquiry: clipSpeak(counter, maxChars)
    },
    align_source: draft.arkMode || "draft"
  };
}

/**
 * 判断 Draft 是否可用来填本轮建议（新鲜或与片段有字面交集）。
 */
function draftUsableForSegment(segment, draft, opts = {}) {
  const text = String(draft?.text || "").trim();
  if (!text) return false;
  const freshMs = Number(opts.draftAgeMs);
  if (Number.isFinite(freshMs) && freshMs >= 0 && freshMs <= 180000) return true;
  const seg = String(segment || "").replace(/\s+/g, "");
  if (seg.length < 4) return Boolean(opts.force);
  const body = text.replace(/\s+/g, "");
  const title = String(draft.title || "").replace(/\s+/g, "");
  for (let n = 4; n <= 6; n += 1) {
    for (let i = 0; i + n <= seg.length; i += 1) {
      const slice = seg.slice(i, i + n);
      if (body.includes(slice) || title.includes(slice)) return true;
    }
  }
  return Boolean(opts.force);
}

module.exports = {
  alignCopilotFromDraft,
  draftUsableForSegment
};
