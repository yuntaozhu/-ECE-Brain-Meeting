import { $, S } from "../state.js";
import { slog } from "../ui/log.js";
import { setChip, setStatus, showAlert } from "../ui/status.js";
import { selectedLabel, assertVirtualOrAllowed } from "./devices.js";

function stopMeter() {
  if (S.meterTimer) clearInterval(S.meterTimer);
  S.meterTimer = null;
  $("level").style.width = "0%";
}

async function openInput() {
  await closeInput();
  const deviceId = $("inputDevice").value;
  if (!deviceId) throw new Error("未选择虚拟采集设备");
  const label = selectedLabel("inputDevice");
  assertVirtualOrAllowed("采集（应为 CABLE Output）", label);
  slog("INFO", "Capture", "打开采集设备", { label, deviceId: deviceId.slice(0, 32) });

  S.inputStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: { exact: deviceId },
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1
    }
  });
  const tracks = S.inputStream.getAudioTracks().map((t) => ({
    label: t.label,
    enabled: t.enabled,
    muted: t.muted,
    readyState: t.readyState,
    settings: t.getSettings?.()
  }));
  slog("INFO", "Capture", "getUserMedia 成功", { tracks });
  S.inCtx = new AudioContext();
  if (S.inCtx.state === "suspended") await S.inCtx.resume();
  slog("INFO", "Capture", "AudioContext", { sampleRate: S.inCtx.sampleRate, state: S.inCtx.state });
  const src = S.inCtx.createMediaStreamSource(S.inputStream);
  S.analyser = S.inCtx.createAnalyser();
  S.analyser.fftSize = 1024;
  src.connect(S.analyser);
  const data = new Uint8Array(S.analyser.fftSize);
  let peakLogAt = 0;
  S.lastSpeechRmsAt = Date.now();
  S.lowLevelWarnAt = 0;
  S.meterTimer = setInterval(() => {
    S.analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    $("level").style.width = Math.min(100, Math.round(rms * 400)) + "%";
    const now = Date.now();
    const inCableInject = now < S.suppressCableInjectUntil;
    const inHostTts = now < S.hostSpeakingUntil;

    if (rms > 0.025) {
      S.lastSpeechRmsAt = now;
      if (S.listening && !inCableInject) {
        setChip("chipMeetingAudio", true, "good");
      }
      if (rms > 0.04 && now - peakLogAt > 2000) {
        peakLogAt = now;
        slog("DEBUG", "Capture", "检测到输入电平", {
          rms: Number(rms.toFixed(4)),
          listening: S.listening,
          hostTts: inHostTts,
          cableInject: inCableInject
        });
      }
    } else if (S.listening) {
      setChip("chipMeetingAudio", false);
      // 听会中持续近静音：仅在「长期无 ASR」时提示路由；句间停顿不算断 Cable
      const quietMs = now - S.lastSpeechRmsAt;
      const sinceAsr = S.lastAsrFinalAt ? now - S.lastAsrFinalAt : Infinity;
      const asrHealthy = S.asrAcceptedCount >= 2 && sinceAsr < 90000;
      if (
        quietMs > 20000 &&
        sinceAsr > 45000 &&
        !asrHealthy &&
        now - S.lowLevelWarnAt > 30000 &&
        !inHostTts
      ) {
        S.lowLevelWarnAt = now;
        showAlert(
          "会场声长时间过低：请确认腾讯会议「AI」账号扬声器=CABLE Input，且「测试」正在说话。自检哔声有电平≠会议声已进 Cable。",
          "bad"
        );
        slog("WARN", "Capture", "听会中采集近静音过久", {
          quietMs,
          sinceAsr,
          asrFinalCount: S.asrFinalCount,
          hint: "AI扬声器应=CABLE Input"
        });
        setStatus("会场声过低 — 检查 AI 扬声器是否接到 CABLE Input", "bad");
      } else if (quietMs > 20000 && asrHealthy && now - S.lowLevelWarnAt > 60000) {
        // 有近期转写：只记 debug，不弹红条吓用户
        S.lowLevelWarnAt = now;
        slog("DEBUG", "Capture", "句间静音（已有转写，忽略路由告警）", {
          quietMs,
          sinceAsr,
          asrFinalCount: S.asrFinalCount
        });
      }
    }
  }, 80);
}

async function closeInput() {
  stopMeter();
  S.captureNode?.disconnect();
  S.captureNode = null;
  S.inputStream?.getTracks().forEach((t) => t.stop());
  S.inputStream = null;
  if (S.inCtx) {
    await S.inCtx.close().catch(() => {});
    S.inCtx = null;
  }
}

/** 测量采集设备在 windowMs 内的峰值 RMS（不改变 S.listening 则恢复） */
async function measureCapturePeak(windowMs = 1200) {
  const wasListening = S.listening;
  let openedHere = false;
  try {
    if (!S.inputStream || !S.analyser) {
      await openInput();
      openedHere = true;
    }
    if (S.inCtx?.state === "suspended") await S.inCtx.resume();
    const data = new Uint8Array(S.analyser.fftSize);
    let peak = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < windowMs) {
      S.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      if (rms > peak) peak = rms;
      await new Promise((r) => setTimeout(r, 40));
    }
    return { peak, ok: peak > 0.015 };
  } finally {
    if (openedHere && !wasListening) {
      await closeInput();
    }
  }
}

export { stopMeter, openInput, closeInput, measureCapturePeak };
