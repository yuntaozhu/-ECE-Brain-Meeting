/** 采音公用：低通 + 降采样到 16k PCM16 */

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

function floatTo16(f32) {
  const pcm = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm;
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

function pcm16ToBase64(pcm) {
  if (!pcm?.length) return "";
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export { lowpassBiquad, floatTo16, downsampleTo16k, pcm16ToBase64 };
