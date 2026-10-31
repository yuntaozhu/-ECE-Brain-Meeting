import { S } from "../state.js";
import { downsampleTo16k, pcm16ToBase64, lowpassBiquad, floatTo16 } from "./pcmUtil.js";

/**
 * 双通道上送：
 * - Others：会场环路（CABLE / 系统内录）→ 策略 ASR
 * - Me：本机麦 → 第二路 ASR（口令/标定；普通发言不触发业务巡检）
 */
function bindTrackUplink(ctx, stream, role) {
  if (!ctx || !stream) return null;
  const src = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const mute = ctx.createGain();
  mute.gain.value = 0;
  proc.onaudioprocess = (ev) => {
    if (!S.listening) return;
    const f32 = ev.inputBuffer.getChannelData(0);
    const pcm = downsampleTo16k(f32, ctx.sampleRate);
    const b64 = pcm16ToBase64(pcm);
    if (!b64) return;
    window.bridge.listenAudio({ audio: b64, role });
  };
  src.connect(proc);
  proc.connect(mute);
  mute.connect(ctx.destination);
  return proc;
}

function startCaptureToListen() {
  stopCaptureUplink();
  S.captureNode = bindTrackUplink(S.inCtx, S.inputStream, "others");
  if (S.dualTrackEnabled && S.meStream && S.meCtx) {
    S.meCaptureNode = bindTrackUplink(S.meCtx, S.meStream, "me");
  }
}

function stopCaptureUplink() {
  try {
    S.captureNode?.disconnect();
  } catch (_) {}
  S.captureNode = null;
  try {
    S.meCaptureNode?.disconnect();
  } catch (_) {}
  S.meCaptureNode = null;
}

export {
  startCaptureToListen,
  stopCaptureUplink,
  lowpassBiquad,
  downsampleTo16k,
  floatTo16,
  pcm16ToBase64
};
