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

function enqueueHoldWakeQuestion(text) {
  if (!text) return;
  if (S.pendingHoldAsr === text) return;
  S.pendingHoldAsr = text;
  S.pendingHoldAsrAt = Date.now();
  slog("INFO", "ASR", "hold 内暂存唤醒/问句，待 IDLE 放行", {
    text: text.slice(0, 80),
    holdLeft: Math.max(0, S.hostSpeakingUntil - Date.now())
  });
}

function acceptFinal(text, { bargeIn, hold, role = "others" }) {
  const isMe = role === "me";
  const speaker = isMe ? "我" : "会场";
  const last = S.transcriptLines[S.transcriptLines.length - 1];
  if (last && last.speaker === speaker && last.role === role) {
    if (last.text === text) {
      slog("DEBUG", "ASR", "忽略重复 final", { text, role });
      renderTranscript();
      return;
    }
    const within2s = S.lastAsrFinalAt && Date.now() - S.lastAsrFinalAt < 2000;
    if (
      !isMe &&
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
      slog("INFO", "ASR", "合并短句", { text: last.text, total: S.asrFinalCount, role });
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
  if (!isMe) S.asrAcceptedCount += 1;
  S.lastAsrFinalAt = Date.now();
  S.transcriptLines.push({ speaker, text, role });
  try {
    window.bridge?.sessionAppend?.({ speaker, text, role });
  } catch (_) {}
  renderTranscript();
  S.lastSpeechRmsAt = Date.now();
  if (!isMe) setChip("chipMeetingAudio", true, "good");
  slog("INFO", "ASR", isMe ? "Me 转写(final)" : "会场转写(final)", {
    text,
    total: S.asrFinalCount,
    bargeIn,
    role,
    hold: S.agentHoldListening
  });

  // Me：仅口令触发巡检；普通发言只标定上屏，避免「自己回复自己」
  if (isMe) {
    if (bargeIn || looksLikeBargeInLocal(text)) {
      void runPatrol("barge-in");
    } else if (shouldImmediatePatrol(text)) {
      void runPatrol("wake");
    }
    renderDuplexStats();
    return;
  }

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
    if (S.transcriptLines.filter((l) => l.role !== "me" && l.speaker === "会场").length - S.lastLineCountAtPatrol >= 4) {
      void runPatrol("lines");
    }
  }
  renderDuplexStats();
}

export function handleAsrEvent(msg) {
  const role = String(msg.role || "others").toLowerCase() === "me" ? "me" : "others";
  if (msg.final) {
    const partialFallback = role === "me" ? S.partialAsrMe : S.partialAsr;
    let text = displayCorrectAsr(msg.text || partialFallback || "");
    if (role === "me") S.partialAsrMe = "";
    else S.partialAsr = "";
    if (!text) {
      renderTranscript();
      return;
    }
    const speaking = S.duplexPhase === PHASE.SPEAKING;
    const inMuteHold = Date.now() < S.hostSpeakingUntil;
    const bargeIn = msg.bargeIn === true || looksLikeBargeInLocal(text);
    const wakeInterrupt = msg.wakeInterrupt === true;
    const wakeAsk = shouldImmediatePatrol(text);
    const fromQueue = msg.fromHoldQueue === true;

    // Me 通道不做会场回灌过滤（本机麦）
    if (role !== "me" && msg.likelyEcho && !bargeIn && !wakeInterrupt && !fromQueue) {
      S.echoDiscardCount += 1;
      slog("DEBUG", "ASR", "丢弃播报期疑似回灌", { text: text.slice(0, 60) });
      renderTranscript();
      renderDuplexStats();
      return;
    }

    if (wakeInterrupt) {
      S.hostSpeakingUntil = Math.min(S.hostSpeakingUntil, Date.now() + 400);
      S.agentHoldListening = false;
      S.pendingHoldAsr = "";
      S.pendingHoldAsrAt = 0;
      slog("INFO", "ASR", "唤醒口令放行", { text: text.slice(0, 60), role });
      acceptFinal(text, { bargeIn: false, hold: false, role });
      return;
    }

    if (role !== "me" && (speaking || inMuteHold) && !S.agentHoldListening && !bargeIn && !fromQueue) {
      if (wakeAsk) {
        const echo = looksLikeHostEcho(text);
        if (!echo.echo) {
          enqueueHoldWakeQuestion(text);
          renderDuplexStats();
          return;
        }
      }
      S.echoDiscardCount += 1;
      if (S.echoDiscardCount <= 3 || S.echoDiscardCount % 40 === 0) {
        slog("DEBUG", "ASR", "丢弃 TTS/回灌窗口内转写", {
          text: text.slice(0, 60),
          discarded: S.echoDiscardCount
        });
      }
      renderTranscript();
      renderDuplexStats();
      return;
    }
    if (bargeIn && (speaking || inMuteHold)) {
      S.hostSpeakingUntil = Math.min(S.hostSpeakingUntil, Date.now() + 400);
      slog("INFO", "ASR", "barge-in 口令放行", { text: text.slice(0, 60), role });
    }
    if (role !== "me") {
      const echo = looksLikeHostEcho(text);
      if (echo.echo && !bargeIn && !wakeInterrupt && !S.agentHoldListening && !fromQueue) {
        S.echoDiscardCount += 1;
        slog("WARN", "ASR", "丢弃疑似 Host 自语回灌", {
          text: text.slice(0, 80),
          score: echo.score,
          reason: echo.reason
        });
        extendHostMute(
          echo.reason.startsWith("post-hold") || echo.reason === "faq-theme" ? 3500 : 4000,
          "echo-final"
        );
        renderTranscript();
        renderDuplexStats();
        return;
      }
    }
    acceptFinal(text, { bargeIn, hold: S.agentHoldListening, role });
  } else {
    if (
      role !== "me" &&
      (Date.now() < S.hostSpeakingUntil || S.duplexPhase === PHASE.SPEAKING) &&
      !S.agentHoldListening
    ) {
      return;
    }
    const t = displayCorrectAsr(msg.text || "");
    if (!t) return;
    if (role !== "me") {
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
    } else {
      S.partialAsrMe = t;
    }
    S.asrDeltaCount += 1;
    renderTranscript();
    S.lastSpeechRmsAt = Date.now();
  }
}

export function setAudioTestEnabled(enabled) {
  const dis = !enabled;
  if ($("beep")) $("beep").disabled = dis;
  if ($("selfTest")) $("selfTest").disabled = dis;
  if ($("loop")) $("loop").disabled = dis || !$("loopStop").disabled;
}
