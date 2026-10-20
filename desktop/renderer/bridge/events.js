import { $, S, PHASE } from "../state.js";
import { formatDetail, slog } from "../ui/log.js";
import {
  showAlert,
  setStatus,
  setChip,
  setThinkingUi,
  renderDuplexStats
} from "../ui/status.js";
import { renderTranscript } from "../ui/transcript.js";
import { renderTodos } from "../ui/panels.js";
import { handleAsrEvent, setAudioTestEnabled, flushPendingHoldAsr } from "../asr.js";
import { closeInput } from "../audio/capture.js";
import { playPcm16Base64, stopQueuedSpeech } from "../audio/playback.js";
import {
  rememberHostUtterance,
  estimateHoldMsLocal,
  applyHoldUntil,
  extendHostMute
} from "../policy.js";

export function handleBridgeEvent(msg) {
      if (msg.type === "listen-ready") {
        if (msg.ok) {
          setStatus("虚拟环路听会中 · 请让「测试」说话并观察「会场声」灯", "ok");
          setChip("chipListen", true, "good");
          setChip("chipReconnect", true, "good");
          slog("INFO", "Listen", "听会通道就绪", { sessionId: msg.sessionId });
          slog(
            "WARN",
            "Meeting",
            "听写条件：AI 扬声器=CABLE Input → EXE 采 CABLE Output；出声：AI 麦开麦且=CABLE Output。默认独立 ASR（HOST_ASR_MODE=independent）"
          );
          showAlert(
            "听写已启动。请用「测试」账号说话：电平/「会场声」应跳动。不跳=会议 AI 扬声器未选 CABLE Input；跳动无字=查 HostAsr 日志。",
            "warn"
          );
        } else {
          setStatus("听会失败", "bad");
          setChip("chipReconnect", false, "bad");
          slog("ERROR", "Listen", msg.error || "listen failed");
        }
      } else if (msg.type === "asr") {
        handleAsrEvent(msg);
      } else if (msg.type === "host-interrupted") {
        stopQueuedSpeech();
        S.agentHoldListening = true;
        S.duplexPhase = PHASE.IDLE;
        S.hostSpeakingUntil = Date.now() + 400;
        S.holdUntil = Date.now() + 400;
        setStatus("已打断播报 · 请讲，说完请说「请继续」", "ok");
        slog("INFO", "Host", "口令打断", {
          reason: msg.reason,
          preview: String(msg.interruptBuffer?.fullText || "").slice(0, 40)
        });
        renderDuplexStats();
      } else if (msg.type === "duplex-phase") {
        const prevPhase = S.duplexPhase;
        S.duplexPhase = msg.phase || S.duplexPhase;
        if (msg.holdUntil) S.holdUntil = msg.holdUntil;
        if (msg.cooldownUntil) S.cooldownUntil = msg.cooldownUntil;
        // 打断回 IDLE：不要用长 hold 盖住 barge-in 后的会场句
        if (msg.why && /barge-in|interrupt|INTERRUPT/i.test(String(msg.why))) {
          S.hostSpeakingUntil = Math.min(S.hostSpeakingUntil, msg.holdUntil || Date.now() + 400);
          S.agentHoldListening = true;
        } else if (msg.holdUntil) {
          S.hostSpeakingUntil = Math.max(S.hostSpeakingUntil, msg.holdUntil);
        }
        slog("INFO", "DuplexPhase", `${msg.prev || prevPhase || "?"} → ${msg.phase}`, {
          holdLeft: msg.holdUntil ? Math.max(0, msg.holdUntil - Date.now()) : 0,
          coolLeft: msg.cooldownUntil ? Math.max(0, msg.cooldownUntil - Date.now()) : 0,
          why: msg.why || msg.ok
        });
        // hold/COOLDOWN → IDLE：放行排队的唤醒问句
        if (
          msg.phase === PHASE.IDLE &&
          prevPhase !== PHASE.IDLE &&
          Date.now() >= S.hostSpeakingUntil
        ) {
          flushPendingHoldAsr(msg.why || "phase-idle");
        }
        renderDuplexStats();
      } else if (msg.type === "tts-audio") {
        extendHostMute(8000, "tts-audio");
        playPcm16Base64(msg.audio, msg.sampleRate || 24000);
      } else if (msg.type === "tts-started") {
        rememberHostUtterance(msg.text);
        const pred = estimateHoldMsLocal(msg.text || "", 0);
        extendHostMute(pred, "tts-started");
        S.duplexPhase = PHASE.SPEAKING;
        setStatus("Host TTS 首包已到 → CABLE / 本机监听", "ok");
        slog("INFO", "TTS", "首包到达", { text: msg.text, predHold: pred });
        const last = S.transcriptLines[S.transcriptLines.length - 1];
        if (last && last.speaker && /合成中/.test(last.text) && msg.text) {
          last.text = msg.text;
          renderTranscript();
        }
        renderDuplexStats();
      } else if (msg.type === "host-speaking") {
        rememberHostUtterance(msg.text);
        S.lastWakeSpeakAt = Date.now();
        S.duplexPhase = PHASE.SPEAKING;
        const pred = estimateHoldMsLocal(msg.text || "", 0);
        extendHostMute(pred, "host-speaking");
        setStatus(
          `李老师发言中，转写暂缓约 ${Math.ceil(pred / 1000)}s…`,
          "warn"
        );
        slog("INFO", "Host", "Host→虚拟麦播报请求", {
          text: msg.text,
          retry: msg.retry,
          mode: msg.mode
        });
        showAlert(
          "正在合成 Host 语音… 请确认「本机同时听」；会议里听需 AI 开麦且麦=CABLE Output。",
          "warn"
        );
        renderDuplexStats();
      } else if (msg.type === "asr-degraded") {
        setStatus("独立听写通道不可用，已降级 dialog", "warn");
        showAlert(
          `独立 ASR 握手失败，已降级 Seeduplex 听写（${msg.reason || "handshake-failed"}）。请核对 DOUBAO_ASR_RESOURCE_ID=volc.seedasr.sauc.duration 与控制台开通；logId=${msg.logId || "—"}`,
          "bad"
        );
        slog("ERROR", "HostAsr", "已降级 dialog", msg);
      } else if (msg.type === "asr-ready") {
        setStatus("独立听写通道就绪", "ok");
        slog("INFO", "HostAsr", "独立 ASR 就绪", { logId: msg.logId, mode: msg.mode });
      } else if (msg.type === "tts-failed") {
        S.hostSpeakingUntil = Math.min(S.hostSpeakingUntil, Date.now() + 1500);
        S.duplexPhase = PHASE.IDLE;
        const reason = msg.reason || "unknown";
        const channel = msg.channel || "";
        setStatus(`TTS 失败：${reason}`, "bad");
        showAlert(
          `Host TTS 失败（${reason}${channel ? ` / ${channel}` : ""}）。请确认 HOST_TTS_MODE=independent；若仍失败核对 DOUBAO_TTS_*。45000000 多为会话异常，桥接会自动重连，不一定是协议非法。`,
          "bad"
        );
        slog("ERROR", "TTS", "合成失败", msg);
        const last = S.transcriptLines[S.transcriptLines.length - 1];
        if (last && /（合成中…）$/.test(last.text)) {
          last.text = last.text.replace(/（合成中…）$/, "（合成失败）");
          renderTranscript();
        }
        renderDuplexStats();
      } else if (msg.type === "host-speak-done") {
        if (msg.holdUntil) {
          applyHoldUntil(msg.holdUntil, "host-speak-done");
        } else {
          const hold = msg.holdMs || estimateHoldMsLocal(msg.text || "", msg.chunks || 0);
          extendHostMute(hold, "host-speak-done");
        }
        if (msg.cooldownUntil) S.cooldownUntil = msg.cooldownUntil;
        S.duplexPhase = msg.phase || PHASE.COOLDOWN;
        // hold 到点后若未再收到 duplex-phase，定时放行排队问句
        const holdLeftMs = Math.max(0, (msg.holdUntil || S.hostSpeakingUntil) - Date.now());
        if (S.pendingHoldAsr && holdLeftMs > 0) {
          setTimeout(() => {
            if (Date.now() >= S.hostSpeakingUntil && S.duplexPhase !== PHASE.SPEAKING) {
              flushPendingHoldAsr("hold-timer");
            }
          }, holdLeftMs + 80);
        }
        if (msg.ok) {
          rememberHostUtterance(msg.text);
          const holdLeft = Math.max(0, (msg.holdUntil || S.hostSpeakingUntil) - Date.now());
          setStatus(
            `播报完成 · 转写约 ${Math.max(1, Math.round(holdLeft / 1000))}s 后恢复（防回灌）`,
            "ok"
          );
          slog("INFO", "Host", "播报完成", {
            chunks: msg.chunks,
            holdMs: msg.holdMs,
            holdUntil: msg.holdUntil,
            phase: S.duplexPhase,
            text: msg.text
          });
          showAlert(
            `Host 已播完。听写 COOLDOWN 中不把 AI 自语当会场；请用「测试」账号提问或呼叫「大智」。`,
            "ok"
          );
          const last = S.transcriptLines[S.transcriptLines.length - 1];
          if (last && /（合成中…）$/.test(last.text) && msg.text) {
            last.text = msg.text;
            renderTranscript();
          } else if (last && /（合成中…）$/.test(last.text)) {
            last.text = last.text.replace(/（合成中…）$/, "");
            renderTranscript();
          }
        } else {
          setStatus("Host 播报失败（无 TTS 音频）", "bad");
          slog("ERROR", "Host", "播报失败", msg);
          const last = S.transcriptLines[S.transcriptLines.length - 1];
          if (last && /（合成中…）$/.test(last.text)) {
            last.text = last.text.replace(/（合成中…）$/, "（合成失败）");
            renderTranscript();
          }
        }
        renderDuplexStats();
      } else if (msg.type === "error") {
        const em =
          typeof msg.message === "string"
            ? msg.message
            : formatDetail(msg.message || msg);
        slog("ERROR", "Bridge", em, msg.code ? { code: msg.code } : undefined);
      } else if (msg.type === "closed") {
        setChip("chipListen", false);
        setChip("chipReconnect", false, "bad");
        setStatus(`听会通道断开 (code=${msg.code ?? "?"})，尝试自动重连…`, "warn");
        slog("WARN", "Listen", "听会通道关闭", { code: msg.code, reason: msg.reason });
      } else if (msg.type === "reconnecting") {
        setChip("chipReconnect", true);
        setStatus(`Duplex 自动重连中 (#${msg.attempt}，${msg.delayMs}ms)…`, "warn");
        slog("WARN", "Duplex", "自动重连中", msg);
      } else if (msg.type === "reconnected") {
        setChip("chipListen", true, "good");
        setChip("chipReconnect", true, "good");
        setStatus("听会通道已重连 · 继续控场", "ok");
        slog("INFO", "Duplex", "自动重连成功", { sessionId: msg.sessionId });
      } else if (msg.type === "reconnect-failed") {
        setChip("chipReconnect", false, "bad");
        setStatus("自动重连失败，请点「停止」后重新「启动听会」", "bad");
        showAlert("Seeduplex 多次重连失败。请停止听会后重试，并检查语音 Key / 网络。", "bad");
        slog("ERROR", "Duplex", "重连失败", msg);
      } else if (msg.type === "interaction-mode" || msg.type === "agent-mode") {
        S.interactionModeUi = msg.mode || S.interactionModeUi;
        S.interactionModeLabel = msg.label || S.interactionModeLabel;
        if (msg.lifecycle) {
          S.meetingLifeUi = msg.lifecycle;
          S.meetingLifeLabel = msg.lifeLabel || S.meetingLifeUi;
        }
        if (msg.meetingId) S.meetingIdUi = msg.meetingId;
        renderDuplexStats();
        slog("INFO", "大智", "模式切换", {
          mode: msg.mode,
          label: msg.label,
          lifecycle: msg.lifecycle,
          meetingId: msg.meetingId
        });
      } else if (msg.type === "meeting-closing") {
        S.meetingLifeUi = "CLOSING";
        S.meetingLifeLabel = "收尾中";
        if (msg.meetingId) S.meetingIdUi = msg.meetingId;
        setStatus(`会末收尾中，约 ${Math.ceil((msg.closeInMs || 0) / 1000)}s 后停止听会`, "warn");
        renderDuplexStats();
        slog("INFO", "Meeting", "会末收尾", msg);
      } else if (msg.type === "meeting-ended") {
        S.meetingLifeUi = "OFF";
        S.meetingLifeLabel = "未开会";
        S.agentHoldListening = false;
        S.listening = false;
        if (S.silenceTimer) clearTimeout(S.silenceTimer);
        S.unlisten?.();
        S.unlisten = null;
        void closeInput();
        setChip("chipListen", false);
        setChip("chipPatrol", false);
        setChip("chipReconnect", false);
        setChip("chipMeetingAudio", false);
        if ($("stop")) $("stop").disabled = true;
        if ($("patrol")) $("patrol").disabled = true;
        if ($("forceSpeak")) $("forceSpeak").disabled = true;
        if ($("loop")) $("loop").disabled = false;
        setAudioTestEnabled(true);
        setStatus(`会议已结束 ${msg.meetingId || S.meetingIdUi || ""} · 纪要已写入 sessions`, "ok");
        showAlert("会议已结束：听会已停，纪要与转写在「打开本场记录」。可重新「启动听会」。", "ok");
        renderDuplexStats();
        slog("INFO", "Meeting", "会议结束", msg);
      } else if (msg.type === "ark-billing") {
        showAlert(
          "Ark 账号欠费/过期：LLM 控场不可用，已用启发式模板。请充值或更换 Key。",
          "bad"
        );
        setChip("chipArk", true, "bad");
        slog("ERROR", "Strategy", "收到 ark-billing 事件", msg);
      } else if (msg.type === "biz-plan") {
        const steps = Array.isArray(msg.steps) ? msg.steps : [];
        const tier = msg.tier || "";
        const label =
          tier === "L3" ? "深度分析" : tier === "L2" ? "标准方案" : "经营顾问";
        renderTodos(steps.map((s, i) => `${i + 1}. ${s}`));
        setStatus(`${label}已生成（口播短抓手，步骤见待办）`, "ok");
        slog("INFO", "BusinessAdvisor", "经营方案", {
          tier,
          arkMode: msg.arkMode,
          tts: msg.tts,
          steps: steps.length,
          risks: msg.risks,
          hasAnalysis: Boolean(msg.analysis)
        });
        const parts = [`${label}步骤：`];
        if (msg.analysis) parts.push(`分析：${String(msg.analysis).slice(0, 200)}`, "");
        parts.push(...steps.map((s, i) => `${i + 1}. ${s}`));
        if (steps.length || msg.analysis) {
          showAlert(parts.join("\n"), "ok");
        }
      } else if (msg.type === "strategy-thinking") {
        setThinkingUi(true, "思考中");
        setStatus("大智思考中：" + (msg.text || "嗯，我想一下。"), "warn");
        slog("INFO", "Strategy", "思考占位", { text: msg.text });
      } else if (msg.type === "strategy-early") {
        setThinkingUi(true, "首句中");
        setStatus("大智首句：" + String(msg.text || "").slice(0, 60), "ok");
        if (msg.text) rememberHostUtterance(msg.text);
        slog("INFO", "Strategy", "首句提前", { text: msg.text });
      } else if (msg.type === "strategy-status") {
        if (msg.phase === "thinking") {
          const deep = msg.reason === "HA_BIZ_DEEP" || msg.tier === "L3";
          setThinkingUi(true, deep ? "深度分析中" : "思考中");
        } else if (msg.phase === "early") setThinkingUi(true, "首句中");
        else if (msg.phase === "idle") setThinkingUi(false);
        renderDuplexStats();
      } else if (msg.type === "asr-stalled") {
        const healthy =
          msg.healthy === true || S.asrFinalCount > 0 || S.asrAcceptedCount > 0 || (msg.finals || 0) > 0;
        const inHost =
          S.duplexPhase === PHASE.SPEAKING ||
          Date.now() < S.hostSpeakingUntil ||
          Date.now() < S.holdUntil;
        slog(healthy || inHost ? "DEBUG" : "WARN", "ASR", "识别开始后长时间无 final", {
          ...msg,
          healthy,
          inHost
        });
        // P0：已有转写 / 播报期 → 不弹「会场声太弱」误导告警
        if (healthy || inHost) return;
        const now = Date.now();
        if (now - S.lastAsrStallAlertAt > 45000) {
          S.lastAsrStallAlertAt = now;
          showAlert(
            "ASR 长时间无完整句且尚无成功转写：请确认腾讯会议 AI 扬声器=CABLE Input，并提高会议音量。",
            "warn"
          );
          setStatus("等待首句转写 — 检查 AI 扬声器路由", "warn");
        }
      }
}
