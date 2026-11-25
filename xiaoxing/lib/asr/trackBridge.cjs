/**
 * Me / Others 云 ASR 会话桥（非本地 Whisper）
 */
"use strict";

const { CloudAsrSession, asrConfigured } = require("./cloudAsr.cjs");
const { loadHotwords } = require("./hotwords.cjs");

/** @type {Map<string, { session: CloudAsrSession, running: boolean, paused: boolean }>} */
const tracks = new Map();

function trackKey(track) {
  return track === "me" ? "me" : "others";
}

/**
 * @param {'me'|'others'} track
 * @param {{ onFinal?: Function, onPartial?: Function, onError?: Function, onStatus?: Function, hotwords?: string[] }} handlers
 */
async function startTrackAsr(track, handlers = {}) {
  const key = trackKey(track);
  if (!asrConfigured()) {
    handlers.onError?.({
      code: "missing_speech_key",
      message: "未配置豆包语音密钥，云转写不可用"
    });
    return { ok: false, reason: "missing_speech_key", track: key };
  }
  stopTrackAsr(key);

  const hotwords = handlers.hotwords || loadHotwords();
  const entry = { session: null, running: true, paused: false };
  tracks.set(key, entry);

  const session = new CloudAsrSession({
    uid: `xiaoxing-${key}`,
    hotwords,
    onResult: (r) => {
      if (!r?.text || entry.paused) return;
      if (r.final) handlers.onFinal?.(r.text, key);
      else handlers.onPartial?.(r.text, key);
    },
    onError: (e) => handlers.onError?.(e, key)
  });
  entry.session = session;

  const ok = await session.connect();
  handlers.onStatus?.({ track: key, running: ok, backend: "doubao-cloud" });
  if (!ok) {
    entry.running = false;
    tracks.delete(key);
    return { ok: false, reason: "connect_failed", track: key };
  }
  return { ok: true, backend: "doubao-cloud", track: key, hotwords: hotwords.length };
}

function pushTrackPcmBase64(track, b64) {
  const entry = tracks.get(trackKey(track));
  if (!entry?.running || entry.paused || !entry.session) return false;
  return entry.session.appendPcmBase64(b64);
}

function setTrackPaused(track, paused) {
  const entry = tracks.get(trackKey(track));
  if (!entry) return false;
  entry.paused = Boolean(paused);
  return true;
}

function stopTrackAsr(track) {
  const key = trackKey(track);
  const entry = tracks.get(key);
  if (!entry) return { ok: true, track: key };
  entry.running = false;
  try {
    entry.session?.close();
  } catch (_) {}
  tracks.delete(key);
  return { ok: true, track: key };
}

function stopAllTrackAsr() {
  for (const key of [...tracks.keys()]) stopTrackAsr(key);
  return { ok: true };
}

function trackAsrStatus(track) {
  const key = track ? trackKey(track) : null;
  if (key) {
    const entry = tracks.get(key);
    return {
      track: key,
      configured: asrConfigured(),
      running: Boolean(entry?.running),
      paused: Boolean(entry?.paused),
      open: Boolean(entry?.session?.isOpen()),
      circuit: entry?.session?.circuitSnapshot?.() || null
    };
  }
  return {
    configured: asrConfigured(),
    me: trackAsrStatus("me"),
    others: trackAsrStatus("others")
  };
}

module.exports = {
  startTrackAsr,
  stopTrackAsr,
  stopAllTrackAsr,
  pushTrackPcmBase64,
  setTrackPaused,
  trackAsrStatus,
  asrConfigured
};
