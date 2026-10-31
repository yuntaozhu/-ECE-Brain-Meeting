/**
 * ASR 会话工厂：cloud(HostAsr) | local(Whisper)
 */
const { HostAsrSession, hostAsrMode } = require("./hostAsr.cjs");
const { LocalWhisperSession } = require("./whisperLocal.cjs");

/**
 * @param {object} opts HostAsrSession / LocalWhisperSession 共用回调
 */
function createAsrSession(opts = {}) {
  const mode = hostAsrMode();
  if (mode === "local") {
    return { mode: "local", session: new LocalWhisperSession(opts) };
  }
  return { mode: mode === "dialog" ? "dialog" : "independent", session: new HostAsrSession(opts) };
}

module.exports = { createAsrSession };
