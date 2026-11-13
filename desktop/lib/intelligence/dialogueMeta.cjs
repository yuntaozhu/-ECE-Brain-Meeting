/**
 * Wave R9a：Dialogue-Meta 第一闸（规则优先；可选 LLM JSON 仅 ambiguous）。
 * Meta 输出是会话控制结果，不是业务 Draft；只写 lastMetaSpeak。
 */
const { load, rx } = require("../knowledge/schemaStore.cjs");
const {
  readSlots,
  pickFresh,
  pickLatestFocus,
  commitMetaSpeak,
  commitFocusAsk,
  extractAskRepairBody,
  SLOT_TTL_MS_DEFAULT
} = require("./memory.cjs");

const META_TYPES = Object.freeze({
  NONE: "none",
  RECALL_ASK: "recall_ask",
  RECALL_ANSWER: "recall_answer",
  MEMORY_REPAIR: "memory_repair",
  ASK_REPAIR: "ask_repair",
  WHY_SILENT: "why_silent",
  TONE: "tone"
});

function metaBag() {
  try {
    return load().dialogueMeta || {};
  } catch (_) {
    return {};
  }
}

function metaRx(name) {
  try {
    return rx("dialogueMeta", name);
  } catch (_) {
    return /$a/;
  }
}

function metaLimits() {
  const lim = metaBag().limits || {};
  return {
    minConfidence: Number(lim.minConfidence) > 0 ? Number(lim.minConfidence) : 0.55,
    directSpeakMax: Number(lim.directSpeakMax) > 0 ? Number(lim.directSpeakMax) : 40,
    slotTtlMs: Number(lim.slotTtlMs) > 0 ? Number(lim.slotTtlMs) : SLOT_TTL_MS_DEFAULT,
    llmTimeoutMs: Number(lim.llmTimeoutMs) > 0 ? Number(lim.llmTimeoutMs) : 2500
  };
}

function metaLine(name, vars) {
  const lines = metaBag().lines || {};
  let s = typeof lines[name] === "string" ? lines[name] : "";
  if (!s) return "";
  return s.replace(/\{(\w+)\}/g, (_, key) =>
    vars && vars[key] != null ? String(vars[key]) : ""
  );
}

function emptyMeta(overrides = {}) {
  return {
    metaType: META_TYPES.NONE,
    confidence: 0,
    needsRepair: false,
    shouldSpeak: false,
    directSpeak: null,
    memoryRead: {},
    source: "schema",
    ...overrides
  };
}

function clipSpeak(text, max) {
  const t = String(text || "").trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

/**
 * 规则分类（无业务字面量进本文件）。
 * @param {string} text
 * @returns {ReturnType<typeof emptyMeta>}
 */
function classifyBySchema(text) {
  const t = String(text || "").trim();
  if (!t) {
    return emptyMeta({
      metaType: META_TYPES.MEMORY_REPAIR,
      confidence: 0.8,
      needsRepair: true,
      shouldSpeak: true,
      memoryRead: {}
    });
  }

  // 身份/业务问明确不是 meta
  if (metaRx("notMetaIdentity").test(t)) {
    return emptyMeta({ confidence: 0.95, source: "schema" });
  }
  if (metaRx("notMetaBusiness").test(t) && !metaRx("recallAnswer").test(t)) {
    return emptyMeta({ confidence: 0.9, source: "schema" });
  }

  // R10d：纠偏复述优先于纯 recall
  const repairBody = extractAskRepairBody(t);
  if (repairBody || metaRx("askRepair").test(t)) {
    return emptyMeta({
      metaType: META_TYPES.ASK_REPAIR,
      confidence: 0.92,
      needsRepair: Boolean(repairBody),
      shouldSpeak: true,
      directSpeak: null,
      memoryRead: { lastRealAsk: true },
      repairAsk: repairBody || ""
    });
  }
  if (metaRx("recallAnswer").test(t)) {
    return emptyMeta({
      metaType: META_TYPES.RECALL_ANSWER,
      confidence: 0.9,
      shouldSpeak: true,
      memoryRead: { lastContentSpeak: true }
    });
  }
  if (metaRx("recallAsk").test(t)) {
    return emptyMeta({
      metaType: META_TYPES.RECALL_ASK,
      confidence: 0.9,
      shouldSpeak: true,
      memoryRead: { lastRealAsk: true }
    });
  }
  if (metaRx("memoryRepair").test(t)) {
    return emptyMeta({
      metaType: META_TYPES.MEMORY_REPAIR,
      confidence: 0.85,
      needsRepair: true,
      shouldSpeak: true,
      memoryRead: {}
    });
  }
  if (metaRx("whySilent").test(t)) {
    return emptyMeta({
      metaType: META_TYPES.WHY_SILENT,
      confidence: 0.85,
      shouldSpeak: true,
      memoryRead: { lastMetaSpeak: true }
    });
  }
  if (metaRx("tone").test(t)) {
    return emptyMeta({
      metaType: META_TYPES.TONE,
      confidence: 0.8,
      shouldSpeak: true,
      memoryRead: { lastRealAsk: true }
    });
  }

  return emptyMeta({ confidence: 0.4, source: "schema" });
}

function validateMetaJson(raw) {
  const lim = metaLimits();
  const allowed = new Set(Object.values(META_TYPES));
  let obj = raw;
  if (typeof raw === "string") {
    const s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    try {
      obj = JSON.parse(s);
    } catch (_) {
      return { ok: false, value: null, error: "json_parse" };
    }
  }
  if (!obj || typeof obj !== "object") {
    return { ok: false, value: null, error: "not_object" };
  }
  const metaType = String(obj.metaType || META_TYPES.NONE);
  if (!allowed.has(metaType)) {
    return { ok: false, value: null, error: "bad_metaType" };
  }
  const confidence = Math.max(0, Math.min(1, Number(obj.confidence)));
  if (!Number.isFinite(confidence)) {
    return { ok: false, value: null, error: "bad_confidence" };
  }
  const memoryRead =
    obj.memoryRead && typeof obj.memoryRead === "object" ? obj.memoryRead : {};
  const directSpeak = clipSpeak(obj.directSpeak, lim.directSpeakMax);
  return {
    ok: true,
    value: {
      metaType,
      confidence,
      needsRepair: Boolean(obj.needsRepair),
      shouldSpeak: Boolean(obj.shouldSpeak),
      directSpeak,
      memoryRead: {
        lastRealAsk: Boolean(memoryRead.lastRealAsk),
        lastContentSpeak: Boolean(memoryRead.lastContentSpeak),
        lastMetaSpeak: Boolean(memoryRead.lastMetaSpeak)
      },
      source: "llm"
    },
    error: null
  };
}

function llmMetaEnabled() {
  const envName = String(metaBag().llmEnabledEnv || "DIALOGUE_META_LLM");
  const v = String(process.env[envName] || "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

/**
 * @param {string} text
 * @param {object} [state]
 * @param {{ signal?: AbortSignal, forceLlm?: boolean }} [opts]
 */
async function classifyDialogueMeta(text, state, opts = {}) {
  const schemaHit = classifyBySchema(text);
  if (schemaHit.metaType !== META_TYPES.NONE && schemaHit.confidence >= metaLimits().minConfidence) {
    return schemaHit;
  }

  const ambiguous =
    schemaHit.metaType === META_TYPES.NONE && schemaHit.confidence < metaLimits().minConfidence;
  if (!ambiguous && !opts.forceLlm) return schemaHit;
  if (!llmMetaEnabled() && !opts.forceLlm) return schemaHit;

  const slots = readSlots(state);
  const system = String(metaBag().metaSystem || "").trim();
  if (!system) return schemaHit;

  try {
    const { llmChatJson } = require("../meetingStrategy/llm/transport.cjs");
    const user = [
      `当前句：${String(text || "").slice(0, 120)}`,
      `槽摘要：lastRealAsk=${(slots.lastRealAsk || "空").slice(0, 40)}`,
      `lastContentSpeak=${(slots.lastContentSpeak || "空").slice(0, 40)}`,
      `lastMetaSpeak=${(slots.lastMetaSpeak || "空").slice(0, 40)}`
    ].join("\n");
    const res = await llmChatJson(system, user, {
      channel: "meta",
      fast: true,
      disableThinking: true,
      temperature: 0.1,
      timeoutMs: metaLimits().llmTimeoutMs,
      signal: opts.signal,
      maxTokens: 220,
      validate: validateMetaJson
    });
    if (!res.ok || !res.value) {
      return emptyMeta({
        metaType: META_TYPES.MEMORY_REPAIR,
        confidence: 0.6,
        needsRepair: true,
        shouldSpeak: true,
        source: "fallback",
        error: res.error || "llm_invalid"
      });
    }
    return res.value;
  } catch (_) {
    return emptyMeta({
      metaType: META_TYPES.MEMORY_REPAIR,
      confidence: 0.55,
      needsRepair: true,
      shouldSpeak: true,
      source: "fallback"
    });
  }
}

function resolveSlotText(state, memoryRead, ttlMs) {
  const slots = readSlots(state);
  if (memoryRead?.lastContentSpeak) {
    return pickFresh(slots.lastContentSpeak, slots.lastContentSpeakAt, ttlMs);
  }
  if (memoryRead?.lastMetaSpeak) {
    return pickFresh(slots.lastMetaSpeak, slots.lastMetaSpeakAt, ttlMs);
  }
  if (memoryRead?.lastRealAsk) {
    const focus = pickLatestFocus({ ...slots }, { ttlMs });
    return focus.text || "";
  }
  return "";
}

function buildMetaSpeak(decision, state) {
  const lim = metaLimits();
  const ttl = lim.slotTtlMs;
  if (decision.directSpeak) {
    return clipSpeak(decision.directSpeak, lim.directSpeakMax) || metaLine("repair");
  }
  const type = decision.metaType;
  if (type === META_TYPES.ASK_REPAIR) {
    const prev = String(decision.repairAsk || "").trim();
    return prev
      ? metaLine("askRepairAck", { prev: prev.slice(0, 80) }) || metaLine("repair")
      : metaLine("repair");
  }
  if (type === META_TYPES.RECALL_ASK) {
    const prev = resolveSlotText(state, { lastRealAsk: true }, ttl);
    return prev
      ? metaLine("recallAsk", { prev: prev.slice(0, 80) })
      : metaLine("recallAskEmpty");
  }
  if (type === META_TYPES.RECALL_ANSWER) {
    const prev = resolveSlotText(state, { lastContentSpeak: true }, ttl);
    return prev
      ? metaLine("recallAnswer", { prev: prev.slice(0, 80) })
      : metaLine("recallAnswerEmpty");
  }
  if (type === META_TYPES.MEMORY_REPAIR) return metaLine("repair");
  if (type === META_TYPES.WHY_SILENT) return metaLine("whySilent");
  if (type === META_TYPES.TONE) return metaLine("toneAck");
  return "";
}

function shouldSkipForCommand(cmd) {
  if (!cmd) return false;
  if (cmd.named) return true;
  const c = String(cmd.command || "").toUpperCase();
  if (!c || c === "NONE" || c === "WAKE_ASK" || c === "CONTINUE") return false;
  // 停播/大声/模式等口令归 duplex
  return true;
}

/**
 * @param {object} ctx consultPath 上下文
 * @returns {Promise<object|null>} 结果或 null（非 meta，继续主链）
 */
async function handleDialogueMeta(ctx) {
  const { state, a2aTrace, kbStatus, floors, cmd, qFp, opts } = ctx;
  const lastFloor = String(ctx.lastFloor || "").trim();
  if (!lastFloor) return null;
  if (shouldSkipForCommand(cmd)) return null;
  if (opts?.forceRule === false && opts?.skipDialogueMeta) return null;

  // 已由粘滞 gate 处理的经典 recall：仍允许本闸补 recall_answer 等漏网
  const decision = await classifyDialogueMeta(lastFloor, state, {
    signal: opts?.signal
  });

  if (!decision || decision.metaType === META_TYPES.NONE) return null;
  if (decision.confidence < metaLimits().minConfidence && !decision.needsRepair) {
    return null;
  }

  // tone：交给现有 gate 纠偏链路（已在 handleGate 更早处理）；若仍落到此则短 ack
  // recall_ask：若 handleGate 已处理则到不了这里；到了说明漏网，本闸兜底

  const S = require("../meetingStrategy/paths/consult/kit.cjs");

  if (!decision.shouldSpeak && !decision.needsRepair) {
    return S.baseResult({
      reason: "DIALOGUE_META_SILENT",
      a2aTrace,
      agentMode: state.mode,
      kbStatus,
      questionFp: qFp,
      debug: { dialogueMeta: decision }
    });
  }

  S.setMode(state, S.INTERACTION_MODE.HA_ASK);
  state.haLockedUntil = Date.now() + 90000;

  // R10d：ask_repair 写 Focus 后按更正问重答（gate 未拦下时的兜底）
  if (decision.metaType === META_TYPES.ASK_REPAIR) {
    const body =
      String(decision.repairAsk || "").trim() || extractAskRepairBody(lastFloor);
    if (body) {
      commitFocusAsk(state, body, { asPending: true });
      const corrected = S.answerCorrectionForPrev(body, "retry", state, a2aTrace, kbStatus, qFp);
      if (corrected) {
        corrected.debug = { ...(corrected.debug || {}), dialogueMeta: decision };
        return corrected;
      }
    }
  }

  let speech = buildMetaSpeak(decision, state);
  if (!speech) {
    speech = metaLine("repair");
  }

  const result = S.playAnswer(
    speech,
    "WAKE_ANSWER",
    state,
    a2aTrace,
    kbStatus,
    qFp,
    "dialogue-meta",
    {
      speakKind: "meta",
      speakReason: decision.metaType,
      oralize: false
    }
  );
  commitMetaSpeak(state, result.interventionText || speech, { draftState: "committed" });
  result.debug = { ...(result.debug || {}), dialogueMeta: decision };
  try {
    const { debugLog } = require("../platform/debugLog.cjs");
    debugLog.info("Strategy", "dialogueMeta hit", {
      metaType: decision.metaType,
      source: decision.source,
      confidence: decision.confidence,
      preview: String(speech).slice(0, 48)
    });
  } catch (_) {}
  return result;
}

module.exports = {
  META_TYPES,
  classifyBySchema,
  classifyDialogueMeta,
  validateMetaJson,
  handleDialogueMeta,
  buildMetaSpeak,
  metaLimits,
  metaBag
};
