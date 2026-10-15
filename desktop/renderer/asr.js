import { $, S, PHASE } from "./state.js";
import { setChip, renderDuplexStats } from "./ui/status.js";
import { slog } from "./ui/log.js";
import { renderTranscript } from "./ui/transcript.js";
import {
  displayCorrectAsr,
  looksLikeBargeInLocal,
  looksLikeHostEcho,
  shouldImmediatePatrol,
  extendHostMute
} from "./policy.js";
import { schedulePatrol } from "./patrol/schedule.js";
import { runPatrol } from "./patrol/runPatrol.js";

/** hold 结束后放行排队的唤醒/问句（最多保留 45s） */
export function flushPendingHoldAsr(why = "hold-end") {
  const text = String(S.pendingHoldAsr || "").trim();
  if (!text) return false;
  if (S.pendingHoldAsrAt && Date.now() - S.pendingHoldAsrAt > 45000) {
    S.pendingHoldAsr = "";
    S.pendingHoldAsrAt = 0;
    slog("DEBUG", "ASR", "排队问句已过期丢弃", { why });
    return false;
  }
  S.pendingHoldAsr = "";
  S.pendingHoldAsrAt = 0;
  slog("INFO", "ASR", "放行 hold 内排队问句", { why, text: text.slice(0, 80) });
  handleAsrEvent({ type: "asr", text, final: true, fromHoldQueue: true });
  return true;
}

function queueHoldWakeQuestion(text) {
  if (!text) return;
  if (S.pendingHoldAsr === text) return;
  S.pendingHoldAsr = text;
  S.pendingHoldAsrAt = Date.now();
  slog("INFO", "ASR", "hold 内暂存唤醒/问句，待 IDLE 放行", {
    text: text.slice(0, 80),
    holdLeft: Math.max(0, S.hostSpeakingUntil - Date.now())
  });
}

function acceptFinal(text, { bargeIn, hold }) {
  const last = S.transcriptLines[S.transcriptLines.length - 1];
  if (last && last.speaker === "会场") {
    if (last.text === text) {
      slog("DEBUG", "ASR", "忽略重复 final", { text });
      renderTranscript();
      return;
    }
    const within2s = S.lastAsrFinalAt && Date.now() - S.lastAsrFinalAt < 2000;
    if (
      within2s &&
      !bargeIn &&
      !looksLikeBargeInLocal(text) &&
      text.length < 48 &&
      last.text.length < 80 &&
      !/[？?]$/.test(last.text)
    ) {
      last.text = last.text.replace(/[。．]$/, "") + text;
      S.asrFinalCount += 1;
      S.asrAcceptedCount += 1;
      S.lastAsrFinalAt = Date.now();
      renderTranscript();
      S.lastSpeechRmsAt = Date.now();
      setChip("chipMeetingAudio", true, "good");
      slog("INFO", "ASR", "合并短句", { text: last.text, total: S.asrFinalCount, within2s });
      if (shouldImmediatePatrol(last.text) || looksLikeBargeInLocal(last.text)) {
        void runPatrol(looksLikeBargeInLocal(last.text) ? "barge-in" : "wake");
      } else if (S.agentHoldListening) {
        void runPatrol("hold");
      } else {
        schedulePatrol();
      }
      renderDuplexStats();
      return;
    }
  }
  S.asrFinalCount += 1;
  S.asrAcceptedCount += 1;
  S.lastAsrFinalAt = Date.now();
  S.transcriptLines.push({ speaker: "会场", text });
  try {
    window.bridge?.sessionAppend?.({ speaker: "会场", text });
  } catch (_) {}
  renderTranscript();
  S.lastSpeechRmsAt = Date.now();
  setChip("chipMeetingAudio", true, "good");
  slog("INFO", "ASR", "会场转写(final)", {
    text,
    total: S.asrFinalCount,
    bargeIn,
    hold: S.agentHoldListening
  });
  if (bargeIn || looksLikeBargeInLocal(text)) {
    slog("INFO", "Strategy", "检测到打断/续说口令，立即巡检", { text: text.slice(0, 80) });
    void runPatrol("barge-in");
  } else if (shouldImmediatePatrol(text)) {
    slog("INFO", "Strategy", "检测到大智口令/追问，立即巡检", { text: text.slice(0, 80) });
    void runPatrol("wake");
  } else if (S.agentHoldListening) {
    void runPatrol("hold");
  } else {
    schedulePatrol();
    if (S.transcriptLines.filter((l) => l.speaker === "会场").length - S.lastLineCountAtPatrol >= 4) {
      void runPatrol("lines");
    }
  }
  renderDuplexStats();
}

export function handleAsrEvent(msg) {
  if (msg.final) {
    let text = displayCorrectAsr(msg.text || S.partialAsr || "");
    S.partialAsr = "";
    if (!text) {
      renderTranscript();
      return;
    }
    const speaking = S.duplexPhase === PHASE.SPEAKING;
    const inMuteHold = Date.now() < S.hostSpeakingUntil;
    const bargeIn = msg.bargeIn === true || looksLikeBargeInLocal(text);
    const wakeAsk = shouldImmediatePatrol(text);
    const fromQueue = msg.fromHoldQueue === true;

    if (msg.likelyEcho && !bargeIn && !fromQueue) {
      S.echoDiscardCount += 1;
      slog("DEBUG", "ASR", "丢弃播报期疑似回灌", { text: text.slice(0, 60) });
      renderTranscript();
      renderDuplexStats();
      return;
    }

    // hold/播报中：打断口令立即放行；唤醒/问句排队，避免被 回灌窗压死
    if ((speaking || inMuteHold) && !S.agentHoldListening && !bargeIn && !fromQueue) {
      if (wakeAsk) {
        const echo = looksLikeHostEcho(text);
        if (!echo.echo) {
          queueHoldWakeQuestion(text);
          renderDuplexStats();
          return;
        }
      }
      S.echoDiscardCount += 1;
      if (S.echoDiscardCount <= 3 || S.echoDiscardCount % 40 === 0) {
        slog("DEBUG", "ASR", "丢弃 TTS/回灌窗口内转写", {
          text: text.slice(0, 60),
          phase: S.duplexPhase,
          holdLeft: Math.max(0, S.hostSpeakingUntil - Date.now()),
          discarded: S.echoDiscardCount
        });
      }
      renderTranscript();
      renderDuplexStats();
      return;
    }
    if (bargeIn && (speaking || inMuteHold)) {
      S.hostSpeakingUntil = Math.min(S.hostSpeakingUntil, Date.now() + 400);
      slog("INFO", "ASR", "barge-in 口令放行", { text: text.slice(0, 60), phase: S.duplexPhase });
    }
    const echo = looksLikeHostEcho(text);
    if (echo.echo && !bargeIn && !S.agentHoldListening && !fromQueue) {
      S.echoDiscardCount += 1;
      slog("WARN", "ASR", "丢弃疑似 Host 自语回灌", {
        text: text.slice(0, 80),
        score: echo.score,
        reason: echo.reason
      });
      extendHostMute(echo.reason.startsWith("post-hold") || echo.reason === "faq-theme" ? 3500 : 4000, "echo-final");
      renderTranscript();
      renderDuplexStats();
      return;
    }
    acceptFinal(text, { bargeIn, hold: S.agentHoldListening });
  } else {
    if (
      (Date.now() < S.hostSpeakingUntil || S.duplexPhase === PHASE.SPEAKING) &&
      !S.agentHoldListening
    ) {
      return;
    }
    const t = displayCorrectAsr(msg.text || "");
    if (!t) return;
    const echo = looksLikeHostEcho(t);
    if (echo.echo) {
      if (S.asrDeltaCount % 20 === 0) {
        slog("DEBUG", "ASR", "中间结果疑似回灌，已忽略", {
          text: t.slice(0, 60),
          reason: echo.reason
        });
      }
      return;
    }
    S.partialAsr = t;
    S.asrDeltaCount += 1;
    renderTranscript();
    S.lastSpeechRmsAt = Date.now();
    if (S.asrDeltaCount === 1 || S.asrDeltaCount % 8 === 0) {
      slog("DEBUG", "ASR", "中间结果", { text: t.slice(0, 80), n: S.asrDeltaCount });
    }
  }
}

export function setAudioTestEnabled(enabled) {
  const dis = !enabled;
  if ($("beep")) $("beep").disabled = dis;
  if ($("selfTest")) $("selfTest").disabled = dis;
  if ($("loop")) $("loop").disabled = dis || !$("loopStop").disabled;
}
