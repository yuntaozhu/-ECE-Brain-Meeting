"use strict";

/**
 * 语段门控：auto → 尝试 Silero，否则能量 VAD。
 * 用法：createVadGate().push(Int16Array) → { speech:boolean, flush?:'silence'|'max_len' }
 */

const SAMPLE_RATE = 16000;

function envFloat(name, fallback) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) ? v : fallback;
}

function envInt(name, fallback) {
  const v = parseInt(process.env[name] || "", 10);
  return Number.isFinite(v) ? v : fallback;
}

function frameRms(int16) {
  if (!int16?.length) return 0;
  let s = 0;
  for (let i = 0; i < int16.length; i++) {
    const x = int16[i] / 32768;
    s += x * x;
  }
  return Math.sqrt(s / int16.length);
}

function resolveBackend() {
  const raw = String(process.env.VAD_BACKEND || "auto").trim().toLowerCase();
  if (raw === "energy" || raw === "silero") return raw;
  return "auto";
}

function tryCreateSilero() {
  // 可选依赖：未安装则返回 null，由调用方降级
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies, global-require
    require.resolve("onnxruntime-node");
  } catch (_) {
    return null;
  }
  const modelPath = process.env.SILERO_VAD_MODEL || "";
  if (!modelPath) return null;
  try {
    // 轻量适配器：若模型路径存在则标记 silero 可用；
    // 完整 ONNX 推理可后续替换；当前仍用能量判据但记录 backend=silero_pending。
    const fs = require("fs");
    if (!fs.existsSync(modelPath)) return null;
    return { kind: "silero_energy_bridge", modelPath };
  } catch (_) {
    return null;
  }
}

/**
 * @param {object} [opts]
 * @returns {{ backend: string, push: Function, reset: Function, snapshot: Function }}
 */
function createVadGate(opts = {}) {
  const want = resolveBackend();
  let backend = "energy";
  let silero = null;
  if (want === "silero" || want === "auto") {
    silero = tryCreateSilero();
    if (silero) backend = silero.kind === "silero_energy_bridge" ? "silero_bridge" : "silero";
    else if (want === "silero") backend = "energy"; // 强制 silero 失败则降级
  }

  const rmsSpeech = opts.rmsSpeech ?? envFloat("VAD_RMS_SPEECH", 0.012);
  const silenceMs = opts.silenceMs ?? envInt("VAD_SILENCE_MS", 480);
  const minSpeechMs = opts.minSpeechMs ?? envInt("VAD_MIN_SPEECH_MS", 320);
  const maxUtterMs = opts.maxUtterMs ?? envInt("VAD_MAX_UTTER_MS", 12000);

  let chunks = [];
  let speechMs = 0;
  let silenceMsAcc = 0;
  let inSpeech = false;

  function reset() {
    chunks = [];
    speechMs = 0;
    silenceMsAcc = 0;
    inSpeech = false;
  }

  function snapshot() {
    return {
      backend,
      inSpeech,
      speechMs,
      silenceMs: silenceMsAcc,
      chunkFrames: chunks.length
    };
  }

  /**
   * @param {Int16Array} samples
   * @returns {{ hold: boolean, flush: null|'silence'|'max_len', pcm: Int16Array|null, why: string|null }}
   */
  function push(samples) {
    if (!samples?.length) {
      return { hold: inSpeech, flush: null, pcm: null, why: null };
    }
    const rms = frameRms(samples);
    const frameMs = (samples.length / SAMPLE_RATE) * 1000;
    // silero_bridge：暂与能量共用阈值；后续可换成 ONNX 概率
    const isSpeech = rms >= rmsSpeech;

    if (isSpeech) {
      inSpeech = true;
      silenceMsAcc = 0;
      speechMs += frameMs;
      chunks.push(samples);
    } else if (inSpeech) {
      chunks.push(samples);
      silenceMsAcc += frameMs;
      speechMs += frameMs;
      if (silenceMsAcc >= silenceMs && speechMs >= minSpeechMs) {
        const pcm = mergeChunks(chunks);
        reset();
        return { hold: false, flush: "silence", pcm, why: "silence" };
      }
    }

    if (inSpeech && speechMs >= maxUtterMs) {
      const pcm = mergeChunks(chunks);
      reset();
      return { hold: false, flush: "max_len", pcm, why: "max_len" };
    }

    return { hold: inSpeech, flush: null, pcm: null, why: null };
  }

  /**
   * 外部静音推进（与 HostAsr appendSilence 对齐）
   */
  function pushSilence(ms = 200) {
    if (!inSpeech) return { hold: false, flush: null, pcm: null, why: null };
    silenceMsAcc += ms;
    if (silenceMsAcc >= silenceMs && speechMs >= minSpeechMs) {
      const pcm = mergeChunks(chunks);
      reset();
      return { hold: false, flush: "forced_silence", pcm, why: "forced_silence" };
    }
    return { hold: true, flush: null, pcm: null, why: null };
  }

  return {
    backend,
    push,
    pushSilence,
    reset,
    snapshot,
    frameRms,
    SAMPLE_RATE
  };
}

function mergeChunks(chunks) {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Int16Array(total);
  let o = 0;
  for (const c of chunks) {
    merged.set(c, o);
    o += c.length;
  }
  return merged;
}

module.exports = {
  createVadGate,
  frameRms,
  resolveBackend,
  SAMPLE_RATE
};
