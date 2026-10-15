import { $, S } from "../state.js";
import { slog } from "../ui/log.js";
import { showAlert, setStatus } from "../ui/status.js";
import { selectedLabel, assertVirtualOrAllowed, deviceSnapshot } from "./devices.js";
import { openInput, closeInput, measureCapturePeak } from "./capture.js";
import { extendHostMute } from "../policy.js";

async function playWavToDevice(wavAb, sinkId, label) {
  const blob = new Blob([wavAb], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  let sinkOk = false;
  if (sinkId && audio.setSinkId) {
    try {
      await audio.setSinkId(sinkId);
      sinkOk = true;
    } catch (e) {
      slog("ERROR", "Play", "setSinkId 失败", {
        label,
        error: e.message || String(e)
      });
    }
  }
  try {
    await audio.play();
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
  await new Promise((resolve) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    setTimeout(resolve, 2500);
  });
  return sinkOk;
}

async function makeBeepWav(durationSec = 1.0, hz = 880, gain = 0.55) {
  const sampleRate = 48000;
  const ctx = new OfflineAudioContext(1, Math.floor(sampleRate * durationSec), sampleRate);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.value = hz;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  osc.stop(durationSec);
  const rendered = await ctx.startRendering();
  return audioBufferToWav(rendered);
}

async function playBeepToSink() {
  const sinkId = $("outputDevice").value;
  const outLabel = selectedLabel("outputDevice");
  assertVirtualOrAllowed("播放（应为 CABLE Input）", outLabel);
  const localMon = !!$("localMonitor")?.checked;
  slog("INFO", "Beep", "开始测虚拟麦", {
    outLabel,
    sinkId: (sinkId || "").slice(0, 40),
    localMonitor: localMon,
    snapshot: deviceSnapshot()
  });
  if (/default/i.test(outLabel)) {
    slog("WARN", "Beep", "播放设备名含 Default，setSinkId 常失败，请改选不带 Default 的 CABLE Input");
  }

  const wav = await makeBeepWav(1.0, 880, 0.55);
  slog("INFO", "Beep", "WAV 已生成", { bytes: wav.byteLength, durationSec: 1.0, hz: 880, gain: 0.55 });

  // 先开采集，便于环回检测电平
  const needTempCapture = !S.inputStream;
  if (needTempCapture) {
    try {
      await openInput();
    } catch (e) {
      slog("WARN", "Beep", "临时打开采集失败，跳过环回电平检测", { error: e.message || String(e) });
    }
  }

  const measurePromise = S.inputStream
    ? measureCapturePeak(1400)
    : Promise.resolve({ peak: 0, ok: false, skipped: true });

  const cableOk = await playWavToDevice(wav, sinkId, outLabel);
  slog("INFO", "Beep", "已播放到虚拟播放端", {
    sinkOk: cableOk,
    listenHint: "会议里听：AI 必须开麦且麦克风=CABLE Output；本机默认听不到"
  });

  if (localMon) {
    try {
      await playWavToDevice(wav, null, "本机默认输出");
      slog("INFO", "Beep", "本机监听已播放（真耳机/音箱应能直接听到哔声）");
    } catch (e) {
      slog("ERROR", "Beep", "本机监听播放失败", { error: e.message || String(e) });
    }
  }

  const peak = await measurePromise;
  slog("INFO", "Beep", "环回采集峰值", peak);
  if (peak.ok) {
    showAlert(
      `环路 OK：播放进 CABLE 后采集峰值 RMS=${peak.peak.toFixed(3)}。这只证明 EXE↔CABLE；会议转写还要 AI 扬声器=CABLE Input。`,
      "ok"
    );
  } else if (!peak.skipped) {
    showAlert(
      `环路异常：播放后采集几乎无电平 (RMS=${Number(peak.peak || 0).toFixed(4)})。请确认「播放=CABLE Input、采集=CABLE Output」且为同一条 Cable。`,
      "bad"
    );
  } else if (!localMon) {
    showAlert(
      "已送入虚拟麦链路。勾选「本机同时听」可先确认 EXE 出声；会议无声请开 AI 麦克风。",
      "warn"
    );
  }

  if (needTempCapture && !S.listening) {
    await closeInput();
  }
  return { cableOk, peak, localMon };
}

function audioBufferToWav(buffer) {
  const numChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.length;
  const dataLength = samples * numChan * 2;
  const ab = new ArrayBuffer(44 + dataLength);
  const view = new DataView(ab);
  const writeStr = (o, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChan, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChan * 2, true);
  view.setUint16(32, numChan * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataLength, true);
  let offset = 44;
  const ch0 = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) {
    const s = Math.max(-1, Math.min(1, ch0[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return ab;
}

async function ensureMonitorCtx() {
  if (!$("localMonitor")?.checked) return null;
  if (S.monitorCtx) {
    if (S.monitorCtx.state === "suspended") await S.monitorCtx.resume();
    return S.monitorCtx;
  }
  S.monitorCtx = new AudioContext({ sampleRate: 24000 });
  if (S.monitorCtx.state === "suspended") await S.monitorCtx.resume();
  S.monitorNext = 0;
  slog("INFO", "Monitor", "本机监听 AudioContext 已创建（不绑 CABLE，走系统默认输出）");
  return S.monitorCtx;
}

function playPcmToMonitor(audioBuf) {
  if (!S.monitorCtx || !$("localMonitor")?.checked) return;
  const src = S.monitorCtx.createBufferSource();
  src.buffer = audioBuf;
  src.connect(S.monitorCtx.destination);
  const now = S.monitorCtx.currentTime;
  if (S.monitorNext < now + 0.02) S.monitorNext = now + 0.05;
  src.start(S.monitorNext);
  S.monitorNext += audioBuf.duration;
}

async function ensurePlayCtx() {
  if (S.playCtx) {
    if (S.playCtx.state === "suspended") {
      await S.playCtx.resume();
      slog("INFO", "PlayCtx", "已 resume suspended context");
    }
    return S.playCtx;
  }
  S.playCtx = new AudioContext({ sampleRate: 24000 });
  const sink = $("outputDevice").value;
  const outLabel = selectedLabel("outputDevice");
  assertVirtualOrAllowed("播放（应为 CABLE Input）", outLabel);
  slog("INFO", "PlayCtx", "创建播放 AudioContext", {
    outLabel,
    sampleRate: S.playCtx.sampleRate,
    state: S.playCtx.state,
    hasSetSinkId: typeof S.playCtx.setSinkId === "function"
  });
  if (S.playCtx.state === "suspended") await S.playCtx.resume();
  if (sink && typeof S.playCtx.setSinkId === "function") {
    try {
      await S.playCtx.setSinkId(sink);
      slog("INFO", "PlayCtx", "setSinkId 成功", { sink: sink.slice(0, 40) });
    } catch (e) {
      slog("ERROR", "PlayCtx", "setSinkId 失败，Host TTS 可能进不了虚拟麦", {
        error: e.message || String(e)
      });
      showAlert("播放设备 setSinkId 失败：Host 声音可能进不了会议。请改选非 Default 的 CABLE Input。", "bad");
    }
  }
  S.nextPlay = 0;
  await ensureMonitorCtx();
  return S.playCtx;
}

function playPcm16Base64(b64, sampleRate) {
  if (!S.playCtx) {
    slog("WARN", "TTS", "收到音频但 S.playCtx 为空，丢弃");
    return;
  }
  if (S.playCtx.state === "suspended") {
    S.playCtx.resume().catch(() => {});
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const samples = Math.floor(bytes.length / 2);
  if (!samples) return;
  const view = new DataView(bytes.buffer);
  const audioBuf = S.playCtx.createBuffer(1, samples, sampleRate);
  const ch = audioBuf.getChannelData(0);
  for (let i = 0; i < samples; i++) ch[i] = view.getInt16(i * 2, true) / 32768;
  const src = S.playCtx.createBufferSource();
  src.buffer = audioBuf;
  src.connect(S.playCtx.destination);
  const now = S.playCtx.currentTime;
  if (S.nextPlay < now + 0.02) S.nextPlay = now + 0.05;
  src.start(S.nextPlay);
  S.nextPlay += audioBuf.duration;
  const remainMs = Math.ceil((S.nextPlay - S.playCtx.currentTime) * 1000) + 400;
  extendHostMute(remainMs, "tts-queue");

  // 本机监听：复制同一缓冲到默认音箱，方便确认 TTS 有声
  if ($("localMonitor")?.checked) {
    void ensureMonitorCtx().then(() => {
      if (!S.monitorCtx) return;
      const copy = S.monitorCtx.createBuffer(1, samples, sampleRate);
      copy.copyToChannel(ch, 0);
      playPcmToMonitor(copy);
    });
  }

  S.ttsPlayCount += 1;
  if (S.ttsPlayCount === 1 || S.ttsPlayCount % 15 === 0) {
    slog("INFO", "TTS", "本地播放 TTS 分片", {
      count: S.ttsPlayCount,
      samples,
      sampleRate,
      playLabel: selectedLabel("outputDevice"),
      localMonitor: !!$("localMonitor")?.checked,
      ctxState: S.playCtx.state
    });
  }
  if (S.ttsPlayCount === 1) {
    showAlert(
      "已向虚拟麦发送 Host 语音。若本机勾了监听应能听到；会议无声请确认 AI 账号已开麦。",
      "warn"
    );
  }
}


export { playWavToDevice, makeBeepWav, playBeepToSink, audioBufferToWav, ensureMonitorCtx, playPcmToMonitor, ensurePlayCtx, playPcm16Base64 };
