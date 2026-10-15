import { $, S, PHASE } from "../state.js";
import { setStatus, setChip, setThinkingUi, renderDuplexStats, showAlert } from "../ui/status.js";
import { slog } from "../ui/log.js";
import { renderTranscript } from "../ui/transcript.js";
import { renderA2a, renderTodos } from "../ui/panels.js";
import { looksLikeHostEcho, rememberHostUtterance } from "../policy.js";

export async function runPatrol(reason) {
  if (!S.listening) return;
  const isBarge = reason === "barge-in" || reason === "hold";
  if (S.patrolInFlight) {
    if (reason === "wake" || reason === "manual" || isBarge) {
      S.pendingPatrolReason = reason;
      slog("INFO", "Strategy", "巡检忙，问答已排队", { reason, queue: 1 });
      renderDuplexStats();
    } else {
      slog("DEBUG", "Strategy", "巡检进行中，single-flight 跳过", { reason });
    }
    return;
  }
  // P1：barge-in / 打断占麦巡检不受 TTS hold 阻挡（主进程已 cancel）
  if (
    !isBarge &&
    (Date.now() < S.hostSpeakingUntil || S.duplexPhase === PHASE.SPEAKING)
  ) {
    slog("DEBUG", "Strategy", "Host 播报/回灌期，跳过巡检", { reason, phase: S.duplexPhase });
    if (reason === "wake" || reason === "manual") {
      S.pendingPatrolReason = reason;
      const delay = Math.max(800, S.hostSpeakingUntil - Date.now() + 400);
      setTimeout(() => {
        if (!S.patrolInFlight && S.pendingPatrolReason) {
          const r = S.pendingPatrolReason;
          S.pendingPatrolReason = null;
          void runPatrol(r);
        }
      }, delay);
      renderDuplexStats();
    }
    return;
  }
  const now = Date.now();
  const minGap = reason === "wake" || reason === "manual" || isBarge ? 800 : 5000;
  if (now - S.lastPatrolAt < minGap) {
    slog("DEBUG", "Strategy", "巡检节流跳过", { reason, msSince: now - S.lastPatrolAt, minGap });
    if (reason === "wake" || isBarge) {
      S.pendingPatrolReason = reason;
      setTimeout(() => {
        if (!S.patrolInFlight && S.pendingPatrolReason) {
          const r = S.pendingPatrolReason;
          S.pendingPatrolReason = null;
          void runPatrol(r);
        }
      }, minGap - (now - S.lastPatrolAt) + 50);
      renderDuplexStats();
    }
    return;
  }
  // 仅冷场/多句巡检受唤起冷却限制；明确问句立即答
  if (
    reason !== "manual" &&
    reason !== "wake" &&
    !isBarge &&
    now - S.lastWakeSpeakAt < 16000
  ) {
    slog("DEBUG", "Strategy", "唤起冷却中，跳过自动巡检", {
      reason,
      sinceMs: now - S.lastWakeSpeakAt
    });
    return;
  }

  S.patrolInFlight = true;
  S.lastPatrolAt = now;
  S.lastLineCountAtPatrol = S.transcriptLines.length;
  setStatus(reason === "wake" ? "对话思考中…" : "策略巡检中…", "warn");
  setChip("chipPatrol", true);
  if (reason === "wake") setThinkingUi(true, "思考中");
  renderDuplexStats();

  const floorLines = S.transcriptLines
    .filter((l) => l.speaker === "会场")
    .slice(-6)
    .filter((l) => !looksLikeHostEcho(l.text).echo);
  const hostLines = S.transcriptLines
    .filter((l) => l.speaker === "大智" || l.speaker === "李老师" || l.speaker === "AI 主席")
    .slice(-1);
  const forEval = [...hostLines, ...floorLines];
  const textLog = forEval.map((l) => `${l.speaker}: ${l.text}`).join("\n");
  const quietMs = S.lastSpeechRmsAt ? now - S.lastSpeechRmsAt : null;

  slog("INFO", "Strategy", "发起巡检", {
    reason,
    phase: S.duplexPhase,
    lines: forEval.length,
    floor: floorLines.length,
    chars: textLog.length,
    quietMs,
    echoDiscardCount: S.echoDiscardCount,
    asrAcceptedCount: S.asrAcceptedCount,
    pending: S.pendingPatrolReason
  });

  try {
    const evaluate = window.bridge.strategyEvaluate;
    const res = await evaluate({
      transcript: textLog || "（会场暂无转写，检测冷场）",
      agenda: $("agenda").value,
      quietMs,
      reason
    });
    setChip("chipPatrol", false);
    if (res.agent) {
      S.interactionModeUi = res.agent.mode || S.interactionModeUi;
      S.interactionModeLabel = res.agent.label || S.interactionModeLabel;
      if (res.agent.lifecycle) {
        S.meetingLifeUi = res.agent.lifecycle;
        S.meetingLifeLabel = res.agent.lifeLabel || S.meetingLifeUi;
      }
      if (res.agent.meetingId) S.meetingIdUi = res.agent.meetingId;
      renderDuplexStats();
    }
    if (res.duplex) {
      S.duplexPhase = res.duplex.phase || S.duplexPhase;
      if (res.duplex.holdUntil) S.holdUntil = res.duplex.holdUntil;
      if (res.duplex.cooldownUntil) S.cooldownUntil = res.duplex.cooldownUntil;
      renderDuplexStats();
    }
    if (!res.ok) {
      setStatus("巡检失败", "bad");
      slog("ERROR", "Strategy", res.error || "evaluate failed");
      return;
    }
    const r = res.result;
    renderA2a(r.a2aTrace);
    renderTodos(r.latestToDos);
    if (r.arkBillingOverdue) {
      showAlert(
        "Ark 账号欠费/过期（AccountOverdueError）：控场已改用启发式模板。请到火山方舟充值或更换 ARK_API_KEY。",
        "bad"
      );
      setChip("chipArk", true, "bad");
      slog("ERROR", "Strategy", "Ark 欠费，启发式控场", { error: r.arkError, mode: r.arkMode });
    } else if (r.arkMode === "heuristic") {
      slog("WARN", "Strategy", "本轮走启发式（非 LLM）", { mode: r.arkMode });
    } else {
      setChip("chipArk", true, "good");
    }
    if (r.wake?.echoSkipped || r.reason === "ECHO_SKIP" || r.reason === "DEDUP_SKIP") {
      slog("INFO", "Strategy", "策略跳过", { reason: r.reason, wake: r.wake });
    }
    // P1：打断占麦 / 续说状态
    if (r.holdToEnd || r.reason === "INTERRUPT" || r.reason === "HOLDING") {
      S.agentHoldListening = true;
      S.meetingLifeUi = "HOLD";
      S.meetingLifeLabel = "占麦中";
      S.hostSpeakingUntil = Math.min(S.hostSpeakingUntil, Date.now() + 400);
      setStatus("已打断 · 请说，说完「请继续」", "ok");
    } else if (r.reason === "MEETING_START") {
      S.agentHoldListening = false;
      S.meetingLifeUi = "OPENING";
      S.meetingLifeLabel = "开场中";
      if (r.meetingId) S.meetingIdUi = r.meetingId;
      setStatus(`会议开始 ${S.meetingIdUi || ""} · 开场白后静默`, "ok");
    } else if (r.reason === "MEETING_END") {
      S.agentHoldListening = false;
      S.meetingLifeUi = "CLOSING";
      S.meetingLifeLabel = "收尾中";
      setStatus("会末总结播报中，随后将停止听会并沉淀", "warn");
      if (r.closing) {
        const c = r.closing;
        showAlert(
          ["会末纪要草稿：", `结论：${c.conclusions || ""}`, `分歧：${c.disputes || ""}`, `待办：${c.todos || ""}`, `下一步：${c.nextStep || ""}`]
            .filter(Boolean)
            .join("\n"),
          "ok"
        );
      }
    } else if (
      r.reason === "CONTINUE" ||
      r.reason === "STOP" ||
      (r.shouldIntervene && r.interventionText)
    ) {
      S.agentHoldListening = false;
      if (r.reason === "STOP") {
        S.meetingLifeUi = "SILENT";
        S.meetingLifeLabel = "静默";
      }
    }
    if (r.silenceGate && !r.silenceGate.ok) {
      slog("INFO", "Strategy", "冷场门控", r.silenceGate);
    }

    if (r.shouldIntervene) {
      const label = "大智";
      const speakOk =
        res.speakResult?.ok === true ||
        res.speakResult?.queued ||
        res.speakResult?.earlyOnly;
      const speakBlocked =
        res.speakResult?.error === "listen_not_started" ||
        res.speakResult?.error === "not_open";
      const speakSuppressed = res.speakResult?.suppressed || r.suppressed;
      const showText = r.displayText || r.fullAnswer || r.interventionText || "";
      if (speakSuppressed) {
        S.suppressSpeakCount += 1;
        setStatus("已抑制播报（听写 COOLDOWN/回灌防护）", "warn");
        slog("WARN", "Strategy", "主进程已抑制播报", {
          reason: r.reason,
          error: res.speakResult?.error
        });
        renderDuplexStats();
        return;
      }
      if (!speakOk && !speakBlocked && showText) {
        const echoOfPending = looksLikeHostEcho(showText);
        if (echoOfPending.echo && Date.now() - S.lastWakeSpeakAt < 60000) {
          S.suppressSpeakCount += 1;
          slog("WARN", "Strategy", "跳过与近期 Host 话术重复的播报", {
            reason: r.reason,
            echo: echoOfPending,
            text: String(showText || "").slice(0, 60)
          });
          setStatus("已抑制重复自语（疑似回灌）", "warn");
          renderDuplexStats();
          return;
        }
      }
      if (speakBlocked) {
        setStatus(`${label} 话术已定，但听会通道未就绪，未合成语音`, "warn");
        showAlert("控场话术已生成，请先「启动听会」后再发言/试播。", "warn");
        S.transcriptLines.push({
          speaker: label,
          text: showText + "（未播报：通道未就绪）"
        });
        renderTranscript();
      } else if (showText) {
        if (
          r.reason === "WAKE_ANSWER" ||
          r.reason === "SUMMARY" ||
          r.reason === "WAKE_ACK" ||
          r.reason === "STEER" ||
          r.reason === "SUMMARY_ASK"
        ) {
          S.lastWakeSpeakAt = Date.now();
        }
        rememberHostUtterance(showText);
        setStatus(`${label} 发言：` + showText, "ok");
        const last = S.transcriptLines[S.transcriptLines.length - 1];
        if (
          !(
            last &&
            last.speaker === label &&
            last.text.replace(/（合成中…）$/, "").replace(/（首句已播）$/, "") === showText
          )
        ) {
          S.transcriptLines.push({
            speaker: label,
            text: showText + (speakOk ? "（合成中…）" : "")
          });
          renderTranscript();
        }
        if (!$("localMonitor")?.checked) {
          $("localMonitor").checked = true;
          slog("INFO", "Host", "发言时自动勾选本机同时听");
        }
      }
      slog("INFO", "Strategy", "需要发言", {
        reason: r.reason,
        text: showText,
        speakResult: res.speakResult,
        arkMode: r.arkMode,
        wake: r.wake,
        questionFp: r.questionFp,
        earlyCovered: r.earlyCovered
      });
    } else {
      setStatus(
        "巡检完成 · 无需干预" + (r.arkMode === "heuristic" ? "（启发式）" : ""),
        "ok"
      );
      slog("INFO", "Strategy", "无需干预", {
        trigger: reason,
        arkMode: r.arkMode,
        reason: r.reason
      });
    }
  } finally {
    S.patrolInFlight = false;
    setThinkingUi(false);
    setChip("chipPatrol", false);
    renderDuplexStats();
    if (S.pendingPatrolReason && S.listening) {
      const r = S.pendingPatrolReason;
      S.pendingPatrolReason = null;
      setTimeout(() => void runPatrol(r), 450);
    }
  }
}
