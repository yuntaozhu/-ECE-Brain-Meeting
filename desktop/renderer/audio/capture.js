import { $, S } from "../state.js";
import { slog } from "../ui/log.js";
import { setChip, setStatus, showAlert } from "../ui/status.js";
import { selectedLabel, assertVirtualOrAllowed, isVirtualLabel } from "./devices.js";
import { stopCaptureUplink } from "./uplink.js";

function stopMeter() {
  if (S.meterTimer) clearInterval(S.meterTimer);
  S.meterTimer = null;
  if ($("level")) $("level").style.width = "0%";
  if ($("meLevel")) $("meLevel").style.width = "0%";
}

async function openMediaInput(deviceId, label, { requireVirtual = true } = {}) {
  if (!deviceId) throw new Error(`未选择设备：${label || "input"}`);
  if (requireVirtual) assertVirtualOrAllowed(label || "采集", selectedLabel("inputDevice"));
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: { exact: deviceId },
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1
    }
  });
  const ctx = new AudioContext();
  if (ctx.state === "suspended") await ctx.resume();
  return { stream, ctx };
}

/**
 * 实验：系统内录（Electron getDisplayMedia 音频轨）。
 * Windows 上依赖用户选共享源并勾选「分享系统音频」；失败则回退 CABLE。
 */
async function openDisplayLoopback() {
  slog("INFO", "Capture", "尝试系统内录（displayMedia）…");
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { width: 16, height: 16, frameRate: 1 },
    audio: true
  });
  stream.getVideoTracks().forEach((t) => {
    try {
      t.stop();
    } catch (_) {}
  });
  const audioTracks = stream.getAudioTracks();
  if (!audioTracks.length) {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error("系统内录未拿到音频轨：请勾选「分享系统音频」或改用 CABLE Output");
  }
  const ctx = new AudioContext();
  if (ctx.state === "suspended") await ctx.resume();
  slog("INFO", "Capture", "系统内录就绪", {
    tracks: audioTracks.map((t) => t.label)
  });
  return { stream, ctx, source: "display-loopback" };
}

async function openOthersInput() {
  const mode = $("othersSource")?.value || "cable";
  if (mode === "display") {
    const opened = await openDisplayLoopback();
    S.inputStream = opened.stream;
    S.inCtx = opened.ctx;
    S.othersSourceMode = "display";
    return opened;
  }
  const deviceId = $("inputDevice").value;
  const label = selectedLabel("inputDevice");
  assertVirtualOrAllowed("采集（应为 CABLE Output / 环路）", label);
  slog("INFO", "Capture", "打开 Others 采集", { label, deviceId: deviceId.slice(0, 32) });
  const opened = await openMediaInput(deviceId, "Others", { requireVirtual: true });
  S.inputStream = opened.stream;
  S.inCtx = opened.ctx;
  S.othersSourceMode = "cable";
  const tracks = S.inputStream.getAudioTracks().map((t) => ({
    label: t.label,
    settings: t.getSettings?.()
  }));
  slog("INFO", "Capture", "Others getUserMedia 成功", { tracks, sampleRate: S.inCtx.sampleRate });
  return opened;
}

async function openMeInput() {
  const enabled = Boolean($("dualTrackMe")?.checked);
  S.dualTrackEnabled = enabled;
  if (!enabled) {
    await closeMeInput();
    return null;
  }
  const deviceId = $("meDevice")?.value;
  if (!deviceId) {
    slog("WARN", "Capture", "已勾选双通道但未选本机麦(Me)，仅 Others");
    S.dualTrackEnabled = false;
    return null;
  }
  const label =
    $("meDevice")?.selectedOptions?.[0]?.textContent?.replace(/\s*\[.*\]\s*$/, "") || "Me";
  // Me 允许物理麦；虚拟麦也可
  slog("INFO", "Capture", "打开 Me 采集", { label, deviceId: String(deviceId).slice(0, 32) });
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: { exact: deviceId },
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1
    }
  });
  const ctx = new AudioContext();
  if (ctx.state === "suspended") await ctx.resume();
  S.meStream = stream;
  S.meCtx = ctx;
  S.dualTrackEnabled = true;
  slog("INFO", "Capture", "Me getUserMedia 成功", {
    label,
    sampleRate: ctx.sampleRate,
    virtual: isVirtualLabel(label)
  });
  return { stream, ctx };
}

function startMeters() {
  stopMeter();
  if (!S.inCtx || !S.inputStream) return;
  const src = S.inCtx.createMediaStreamSource(S.inputStream);
  S.analyser = S.inCtx.createAnalyser();
  S.analyser.fftSize = 1024;
  src.connect(S.analyser);
  const data = new Uint8Array(S.analyser.fftSize);

  let meAnalyser = null;
  let meData = null;
  if (S.meCtx && S.meStream) {
    const meSrc = S.meCtx.createMediaStreamSource(S.meStream);
    meAnalyser = S.meCtx.createAnalyser();
    meAnalyser.fftSize = 1024;
    meSrc.connect(meAnalyser);
    meData = new Uint8Array(meAnalyser.fftSize);
    S.meAnalyser = meAnalyser;
  }

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
    if ($("level")) $("level").style.width = Math.min(100, Math.round(rms * 400)) + "%";

    if (meAnalyser && meData && $("meLevel")) {
      meAnalyser.getByteTimeDomainData(meData);
      let msum = 0;
      for (let i = 0; i < meData.length; i++) {
        const v = (meData[i] - 128) / 128;
        msum += v * v;
      }
      const mrms = Math.sqrt(msum / meData.length);
      $("meLevel").style.width = Math.min(100, Math.round(mrms * 400)) + "%";
    }

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
        slog("DEBUG", "Capture", "检测到 Others 电平", {
          rms: Number(rms.toFixed(4)),
          listening: S.listening,
          hostTts: inHostTts,
          cableInject: inCableInject,
          dual: S.dualTrackEnabled
        });
      }
    } else if (S.listening) {
      setChip("chipMeetingAudio", false);
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
          "Others 会场声长时间过低：请确认 AI 扬声器=CABLE Input，或系统内录已勾选共享音频。",
          "bad"
        );
        slog("WARN", "Capture", "Others 近静音过久", { quietMs, sinceAsr });
        setStatus("会场声过低 — 检查 Others 环路", "bad");
      } else if (quietMs > 20000 && asrHealthy && now - S.lowLevelWarnAt > 60000) {
        S.lowLevelWarnAt = now;
        slog("DEBUG", "Capture", "句间静音（已有转写）", { quietMs, sinceAsr });
      }
    }
  }, 80);
}

/** 打开 Others（必选）+ 可选 Me；兼容旧 openInput 名 */
async function openInput() {
  await closeInput();
  await openOthersInput();
  try {
    await openMeInput();
  } catch (err) {
    slog("WARN", "Capture", "Me 通道打开失败，继续仅 Others", {
      error: String(err?.message || err)
    });
    S.dualTrackEnabled = false;
    await closeMeInput();
  }
  startMeters();
}

async function closeMeInput() {
  try {
    S.meCaptureNode?.disconnect();
  } catch (_) {}
  S.meCaptureNode = null;
  S.meAnalyser = null;
  S.meStream?.getTracks().forEach((t) => t.stop());
  S.meStream = null;
  if (S.meCtx) {
    await S.meCtx.close().catch(() => {});
    S.meCtx = null;
  }
}

async function closeInput() {
  stopMeter();
  stopCaptureUplink();
  S.analyser = null;
  S.inputStream?.getTracks().forEach((t) => t.stop());
  S.inputStream = null;
  if (S.inCtx) {
    await S.inCtx.close().catch(() => {});
    S.inCtx = null;
  }
  await closeMeInput();
  S.othersSourceMode = "cable";
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

export {
  stopMeter,
  startMeters,
  openInput,
  closeInput,
  openMeInput,
  closeMeInput,
  measureCapturePeak
};
