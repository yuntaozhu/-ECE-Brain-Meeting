import { S, PHASE } from "../state.js";

function startCaptureToListen() {
  const src = S.inCtx.createMediaStreamSource(S.inputStream);
  const proc = S.inCtx.createScriptProcessor(4096, 1, 1);
  const mute = S.inCtx.createGain();
  mute.gain.value = 0;
  proc.onaudioprocess = (ev) => {
    if (!S.listening) return;
    // SPEAKING 保留真麦，才能听到「谢谢大智 / 大智听我说」并停口播；非口令仍由 ASR 当回灌丢掉
    // COOLDOWN / 播完回灌窗静音，HostAsr 由 main 喂静音保活
    const muteReal =
      S.duplexPhase === PHASE.SPEAKING
        ? false
        : S.agentHoldListening
          ? S.duplexPhase === PHASE.COOLDOWN
          : Date.now() < S.hostSpeakingUntil || S.duplexPhase === PHASE.COOLDOWN;
    const f32 = muteReal
      ? new Float32Array(ev.inputBuffer.length)
      : ev.inputBuffer.getChannelData(0);
    const pcm = downsampleTo16k(f32, S.inCtx.sampleRate);
    if (!pcm.length) return;
    const bytes = new Uint8Array(pcm.buffer);
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    window.bridge.listenAudio(btoa(bin));
  };
  src.connect(proc);
  proc.connect(mute);
  mute.connect(S.inCtx.destination);
  S.captureNode = proc;
}

/** 二阶低通，去掉 8 kHz 以上后再抽取，避免 zh/z 混叠 */
function lowpassBiquad(f32, sampleRate, cutoffHz) {
  const w0 = (2 * Math.PI * cutoffHz) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * 0.707);
  const b0 = (1 - cos) / 2;
  const b1 = 1 - cos;
  const b2 = (1 - cos) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  const nb0 = b0 / a0;
  const nb1 = b1 / a0;
  const nb2 = b2 / a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;
  const out = new Float32Array(f32.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < f32.length; i++) {
    const x0 = f32[i];
    const y0 = nb0 * x0 + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
    out[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return out;
}

function downsampleTo16k(f32, rateIn) {
  if (rateIn === 16000) return floatTo16(f32);
  let filtered = f32;
  for (let stage = 0; stage < 3; stage++) filtered = lowpassBiquad(filtered, rateIn, 6800);
  const ratio = rateIn / 16000;
  const outLen = Math.floor(filtered.length / ratio);
  const out = new Float32Array(outLen);
  const last = filtered.length - 1;
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const frac = pos - i0;
    const s0 = filtered[i0] || 0;
    const s1 = filtered[Math.min(i0 + 1, last)] || 0;
    out[i] = s0 + (s1 - s0) * frac;
  }
  return floatTo16(out);
}

function floatTo16(f32) {
  const pcm = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm;
}


export { startCaptureToListen, lowpassBiquad, downsampleTo16k, floatTo16 };
