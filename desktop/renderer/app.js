/**
 * ECE-Brain desktop — 渲染入口（组装 + DOM 事件）
 */
import { $, S, PHASE } from "./state.js";
import { slog, appendLogLine } from "./ui/log.js";
import {
  showAlert,
  setStatus,
  setChip,
  setThinkingUi,
  renderDuplexStats
} from "./ui/status.js";
import { renderTranscript } from "./ui/transcript.js";
import { renderArch } from "./ui/panels.js";
import {
  deviceSnapshot,
  refreshDevices,
  applyDeviceFilter,
  updateRouteHint,
  updateMeetingGate,
  selectedLabel,
  isBannedCableLabel,
  assertVirtualOrAllowed
} from "./audio/devices.js";
import { openInput, closeInput } from "./audio/capture.js";
import {
  playBeepToSink,
  ensurePlayCtx,
  ensureMonitorCtx
} from "./audio/playback.js";
import { setAudioTestEnabled } from "./asr.js";
import { schedulePatrol } from "./patrol/schedule.js";
import { runPatrol } from "./patrol/runPatrol.js";
import { startCaptureToListen } from "./audio/uplink.js";
import { setHoldChangeHandler } from "./policy.js";
import { handleBridgeEvent } from "./bridge/events.js";
import { bindCopilotControls } from "./ui/smartReplies.js";
import { bindMeetingAidControls } from "./ui/meetingAid.js";

setHoldChangeHandler(({ why, prev, until }) => {
  if (until - prev > 800) {
    slog("DEBUG", "DuplexPhase", "同步 holdUntil", {
      why,
      holdLeftSec: Math.max(0, Math.round((until - Date.now()) / 1000)),
      phase: S.duplexPhase
    });
  }
  renderDuplexStats();
});

$("refresh").onclick = () => refreshDevices().catch((e) => slog("ERROR", "Device", e.message || String(e)));
$("virtualOnly").onchange = () => {
  slog("INFO", "Device", "切换仅虚拟列表", { virtualOnly: $("virtualOnly").checked });
  applyDeviceFilter();
};
$("allowPhysical").onchange = () => {
  slog("WARN", "Device", "允许物理设备", { allowPhysical: $("allowPhysical").checked });
  updateRouteHint();
};
$("inputDevice").onchange = () => {
  updateRouteHint();
  slog("INFO", "Device", "用户更改采集设备", deviceSnapshot());
  try {
    localStorage.setItem(
      "ece_bridge_devices",
      JSON.stringify({ input: $("inputDevice").value, output: $("outputDevice").value })
    );
  } catch (_) {}
};
$("outputDevice").onchange = () => $("inputDevice").onchange();
["chkHost", "chkAiSpk", "chkAiMic"].forEach((id) => {
  $(id).onchange = () => {
    slog("INFO", "Checklist", "双账号核对变更", {
      host: $("chkHost").checked,
      aiSpk: $("chkAiSpk").checked,
      aiMic: $("chkAiMic").checked
    });
    updateMeetingGate();
  };
});

$("beep").onclick = async () => {
  if (S.listening) {
    showAlert("听会进行中禁止测虚拟麦（会干扰 ASR）。请先点「停止」。", "warn");
    slog("WARN", "Beep", "听会中拒绝测麦");
    return;
  }
  try {
    if (!$("loopStop").disabled) {
      slog("WARN", "Beep", "环路仍在运行，建议先停环路再测");
    }
    S.suppressCableInjectUntil = Date.now() + 4000;
    const r = await playBeepToSink();
    if (r?.peak?.ok) {
      setStatus("测试音 OK：环路有电平；请确认会议 AI 已开麦", "ok");
    } else if (r?.localMon) {
      setStatus("本机应已听到哔声；会议无声=AI 未开麦或麦不是 CABLE Output", "warn");
    } else {
      setStatus("测试音已送入虚拟麦；建议勾选「本机同时听」再测", "warn");
    }
    slog("INFO", "Beep", "流程结束", r);
  } catch (e) {
    setStatus("测试音失败", "bad");
    slog("ERROR", "Beep", e.message || String(e), { stack: e.stack });
  }
};

$("selfTest").onclick = async () => {
  if (S.listening) {
    showAlert("听会进行中禁止一键自检（哔声会污染转写）。请先点「停止」。", "warn");
    slog("WARN", "SelfTest", "听会中拒绝自检");
    return;
  }
  try {
    setStatus("一键自检中…", "warn");
    slog("INFO", "SelfTest", "开始", deviceSnapshot());
    if (!$("localMonitor").checked) {
      $("localMonitor").checked = true;
      slog("INFO", "SelfTest", "已自动勾选本机同时听");
    }
    S.suppressCableInjectUntil = Date.now() + 5000;
    const r = await playBeepToSink();
    if (r.peak?.ok) {
      try {
        localStorage.setItem("ece_selftest_ok", "1");
      } catch (_) {}
      setStatus(`自检通过：环回 RMS=${r.peak.peak.toFixed(3)}。下一步核对 AI 扬声器=CABLE Input`, "ok");
      showAlert(
        "EXE↔CABLE 环路正常。转写还需：腾讯会议 AI 扬声器=CABLE Input，「测试」说话时输入电平应跳动。AI 出声还需取消静音。",
        "ok"
      );
    } else {
      try {
        localStorage.setItem("ece_selftest_ok", "0");
      } catch (_) {}
      setStatus("自检失败：CABLE 环回无电平", "bad");
      showAlert(
        "播放后采集无信号。请确认：播放选 CABLE Input、采集选 CABLE Output（同一条 Cable），不要选 Default。",
        "bad"
      );
    }
  } catch (e) {
    setStatus("自检失败", "bad");
    slog("ERROR", "SelfTest", e.message || String(e));
  }
};

$("loop").onclick = async () => {
  if (S.listening) {
    slog("WARN", "Loop", "请先停止控场再测环路");
    showAlert("听会中禁止环路测试，请先停止听会。", "warn");
    return;
  }
  try {
    slog("INFO", "Loop", "开始环路测试", deviceSnapshot());
    await openInput();
    S.loopCtx = new AudioContext();
    const sink = $("outputDevice").value;
    assertVirtualOrAllowed("播放", selectedLabel("outputDevice"));
    if (sink && S.loopCtx.setSinkId) {
      try {
        await S.loopCtx.setSinkId(sink);
        slog("INFO", "Loop", "环路 setSinkId 成功");
      } catch (e) {
        slog("ERROR", "Loop", "环路 setSinkId 失败", { error: e.message || String(e) });
      }
    }
    S.loopCtx.createMediaStreamSource(S.inputStream).connect(S.loopCtx.destination);
    $("loop").disabled = true;
    $("loopStop").disabled = false;
    setStatus("环路测试中（测完请停，避免回授）", "warn");
  } catch (e) {
    setStatus("环路失败", "bad");
    slog("ERROR", "Loop", e.message || String(e));
  }
};

$("loopStop").onclick = async () => {
  slog("INFO", "Loop", "停止环路");
  if (S.loopCtx) await S.loopCtx.close().catch(() => {});
  S.loopCtx = null;
  await closeInput();
  $("loop").disabled = false;
  $("loopStop").disabled = true;
  setStatus("环路已停", "ok");
  updateMeetingGate();
};

$("start").onclick = async () => {
  if (!$("loopStop").disabled) {
    slog("WARN", "Listen", "请先停止环路测试");
    return;
  }
  updateMeetingGate();
  if ($("start").disabled) {
    slog("WARN", "Listen", "核对未通过，拒绝启动", deviceSnapshot());
    return;
  }
  const capL = selectedLabel("inputDevice");
  const playL = selectedLabel("outputDevice");
  if (isBannedCableLabel(capL) || isBannedCableLabel(playL)) {
    showAlert("采集请选 CABLE Output、播放请选 CABLE Input，不要选 Default 或 16ch。", "bad");
    slog("WARN", "Listen", "拒绝禁用设备", deviceSnapshot());
    return;
  }
  if (!$("allowPhysical").checked && localStorage.getItem("ece_selftest_ok") !== "1") {
    showAlert("请先点「一键自检」并通过环回，再启动听会。", "warn");
    slog("WARN", "Listen", "自检未通过，拒绝启动");
    return;
  }
  try {
    setStatus("启动虚拟环路听会…", "warn");
    slog("INFO", "Listen", "启动听会+控场", deviceSnapshot());
    S.ttsPlayCount = 0;
    S.asrFinalCount = 0;
    S.asrDeltaCount = 0;
    S.lastAsrFinalAt = 0;
    S.echoDiscardCount = 0;
    S.asrAcceptedCount = 0;
    S.suppressSpeakCount = 0;
    S.duplexPhase = PHASE.IDLE;
    S.holdUntil = 0;
    S.cooldownUntil = 0;
    S.hostSpeakingUntil = 0;
    S.agentHoldListening = false;
    S.meetingLifeUi = "OFF";
    S.meetingLifeLabel = "未开会";
    S.meetingIdUi = "";
    S.recentHostUtterances = [];
    S.lastWakeSpeakAt = 0;
    S.listenStartedAtUi = Date.now();
    S.patrolInFlight = false;
    S.pendingPatrolReason = null;
    S.thinkingUi = false;
    setThinkingUi(false);
    S.partialAsr = "";
    S.transcriptLines = [];
    S.lastSpeechRmsAt = Date.now();
    S.lowLevelWarnAt = 0;
    renderTranscript();
    renderDuplexStats();
    setAudioTestEnabled(false);
    await openInput();
    await ensurePlayCtx();
    S.unlisten?.();
    S.unlisten = window.bridge.onEvent(handleBridgeEvent);

    const res = await window.bridge.listenStart();
    if (!res.ok) {
      const why = res.message || res.error || "启动失败";
      setStatus(why, "bad");
      showAlert(why, "bad");
      slog("ERROR", "Listen", "listenStart 失败", res);
      await closeInput();
      setAudioTestEnabled(true);
      return;
    }
    setChip("chipArk", res.ark);
    setChip("chipSpeech", res.speech);
    S.listening = true;
    startCaptureToListen();
    slog("INFO", "Listen", "已开始向 Duplex 推送 PCM");
    $("start").disabled = true;
    $("stop").disabled = false;
    $("patrol").disabled = false;
    $("forceSpeak").disabled = false;
    $("loop").disabled = true;
    schedulePatrol();
    if (!res.ark) slog("WARN", "Strategy", "未检测到 Ark Key，巡检将走启发式");
  } catch (e) {
    setStatus("启动失败", "bad");
    setAudioTestEnabled(true);
    slog("ERROR", "Listen", e.message || String(e), { stack: e.stack });
  }
};

$("stop").onclick = async () => {
  slog("INFO", "Listen", "用户停止");
  S.listening = false;
  if (S.silenceTimer) clearTimeout(S.silenceTimer);
  await window.bridge.listenStop();
  S.unlisten?.();
  S.unlisten = null;
  await closeInput();
  if (S.playCtx) await S.playCtx.close().catch(() => {});
  S.playCtx = null;
  if (S.monitorCtx) await S.monitorCtx.close().catch(() => {});
  S.monitorCtx = null;
  S.monitorNext = 0;
  S.partialAsr = "";
  renderTranscript();
  $("stop").disabled = true;
  $("patrol").disabled = true;
  $("forceSpeak").disabled = true;
  $("loop").disabled = false;
  setAudioTestEnabled(true);
  setChip("chipListen", false);
  setChip("chipPatrol", false);
  setChip("chipReconnect", false);
  setChip("chipMeetingAudio", false);
  setStatus("已停止", "ok");
  updateMeetingGate();
};

$("patrol").onclick = () => void runPatrol("manual");

$("winAlwaysOnTop")?.addEventListener("change", async (e) => {
  const on = Boolean(e.target?.checked);
  try {
    const res = await window.bridge.setAlwaysOnTop(on);
    slog("INFO", "Window", "置顶", res);
  } catch (err) {
    slog("ERROR", "Window", err.message || String(err));
  }
});

$("winOpacity")?.addEventListener("input", async (e) => {
  const pct = Number(e.target?.value || 100);
  try {
    await window.bridge.setOpacity(pct / 100);
  } catch (err) {
    slog("ERROR", "Window", err.message || String(err));
  }
});

$("showCapsule")?.addEventListener("change", async (e) => {
  const on = Boolean(e.target?.checked);
  try {
    await window.bridge.setCapsuleVisible(on);
    slog("INFO", "Capsule", on ? "显示悬浮胶囊" : "隐藏悬浮胶囊");
  } catch (err) {
    slog("ERROR", "Capsule", err.message || String(err));
  }
});

$("dualTrackMe")?.addEventListener("change", async () => {
  updateRouteHint();
  try {
    localStorage.setItem(
      "ece_bridge_devices",
      JSON.stringify({
        input: $("inputDevice").value,
        output: $("outputDevice").value,
        me: $("meDevice")?.value || "",
        dualTrackMe: Boolean($("dualTrackMe")?.checked),
        othersSource: $("othersSource")?.value || "cable"
      })
    );
  } catch (_) {}
  if (S.listening) {
    const enable = Boolean($("dualTrackMe")?.checked);
    S.dualTrackEnabled = enable;
    try {
      if (enable) {
        const { openMeInput, startMeters } = await import("./audio/capture.js");
        await openMeInput();
        startMeters();
        const { startCaptureToListen } = await import("./audio/uplink.js");
        startCaptureToListen();
        await window.bridge.setDualTrackMe(true);
      } else {
        const { closeMeInput, startMeters } = await import("./audio/capture.js");
        await closeMeInput();
        startMeters();
        await window.bridge.setDualTrackMe(false);
        const { startCaptureToListen } = await import("./audio/uplink.js");
        startCaptureToListen();
      }
    } catch (err) {
      slog("ERROR", "DualTrack", err.message || String(err));
    }
  }
});

$("othersSource")?.addEventListener("change", () => updateRouteHint());

$("btnSessions")?.addEventListener("click", async () => {
  try {
    const res = await window.bridge.sessionOpenDir();
    slog("INFO", "Session", "打开本场记录目录", res);
  } catch (e) {
    slog("ERROR", "Session", e.message || String(e));
  }
});

$("forceSpeak").onclick = async () => {
  const text = $("manualText").value.trim() || "请各位围绕当前教研议程发言。";
  if (!$("localMonitor").checked) {
    $("localMonitor").checked = true;
    slog("INFO", "Host", "试播时自动勾选本机同时听");
  }
  await ensureMonitorCtx();
  slog("INFO", "Host", "手动试播", { text });
  const res = await window.bridge.hostSpeak(text);
  if (!res?.ok) {
    slog("ERROR", "Host", res?.error || "试播失败");
    showAlert(res?.error || "试播失败", "bad");
    return;
  }
  if (res.queued) {
    showAlert("上一条 Host 还在播，本句已排队。", "warn");
  }
  const last = S.transcriptLines[S.transcriptLines.length - 1];
  if (!(last && last.speaker === "AI 主席" && last.text.replace(/（合成中…）$/, "") === text)) {
    S.transcriptLines.push({ speaker: "AI 主席", text: text + "（合成中…）" });
    renderTranscript();
  }
};

$("btnClearLog")?.addEventListener("click", () => {
  $("log").innerHTML = "";
  slog("INFO", "Log", "界面日志已清空（文件日志保留）");
});

$("btnCopyLog")?.addEventListener("click", async () => {
  const text = Array.from($("log").childNodes)
    .map((n) => n.textContent)
    .join("\n");
  try {
    await navigator.clipboard.writeText(text);
    slog("INFO", "Log", "已复制界面日志到剪贴板", { chars: text.length });
  } catch (e) {
    slog("ERROR", "Log", "复制失败", { error: e.message || String(e) });
  }
});

$("btnOpenLogDir")?.addEventListener("click", async () => {
  const res = await window.bridge.logOpenDir();
  slog("INFO", "Log", "打开日志目录", res);
});

async function bootApp() {
  try {
    if (!window.bridge) {
      console.error("[App] window.bridge 缺失：preload 未注入");
      if ($("kbStatus")) {
        $("kbStatus").textContent = "桥接未注入（preload 失败）。请完全退出后重启桌面端。";
        $("kbStatus").className = "status bad";
      }
      setStatus("桥接未就绪", "bad");
      return;
    }
    renderArch();
    bindCopilotControls();
    bindMeetingAidControls();
    S.unsubMainLog = window.bridge.onLog((entry) => {
      appendLogLine(entry.level || "INFO", entry.tag || "Main", entry.message, entry.detail);
    });
    const st = await window.bridge.envStatus();
    setChip("chipArk", st.ark);
    setChip("chipSpeech", st.speech);
    if (st.agendaDefault && $("agenda") && !$("agenda").dataset.userEdited) {
      $("agenda").value = st.agendaDefault;
    }
    const kb = st.knowledge || {};
    $("keyStatus").textContent = `Ark: ${st.ark ? "已配置" : "缺失"} · 语音: ${st.speech ? "已配置" : "缺失"} · 大智知识库: ${
      kb.kbOk ? `已加载(${kb.kbChars || 0}字/${kb.sections || 0}节)` : "缺失"
    }`;
    $("keyStatus").className = "status " + (st.ark && kb.kbOk ? "ok" : "bad");
    if ($("kbStatus")) {
      $("kbStatus").textContent = kb.kbOk
        ? `知识库就绪：FAQ ${kb.faqSections || 0} 条优先 · 详版 ${kb.sections || 0} 节 · 议程「${st.agendaDefault || ""}」`
        : "知识库未加载：请确认 desktop/knowledge/quan-yuan-meiyu.txt";
      $("kbStatus").className = "status " + (kb.kbOk ? "ok" : "bad");
    }
    if (st.logFile) {
      $("logPath").textContent = "日志文件: " + st.logFile;
    }
    slog("INFO", "App", "渲染进程启动", { env: st });
    await refreshDevices().catch((e) => slog("ERROR", "Device", e.message || String(e)));
    renderTranscript();
    renderDuplexStats();
    updateMeetingGate();
  } catch (e) {
    console.error("[App] 初始化失败", e);
    if ($("kbStatus")) {
      $("kbStatus").textContent = "初始化失败: " + (e.message || String(e));
      $("kbStatus").className = "status bad";
    }
    setStatus("初始化失败", "bad");
  }
}

$("agenda")?.addEventListener("input", () => {
  if ($("agenda")) $("agenda").dataset.userEdited = "1";
});


bootApp()
  .then(async () => {
    if ($("showCapsule")?.checked) {
      try {
        await window.bridge.setCapsuleVisible(true);
      } catch (_) {}
    }
  })
  .catch((e) => {
    console.error("[App] 启动失败", e);
  });
