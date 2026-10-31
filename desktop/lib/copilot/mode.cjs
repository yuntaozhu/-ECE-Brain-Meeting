/**
 * 副驾驶触发模式：auto（意图门控）/ manual（仅 Push-to-Ask）。
 */
const { copilotCfg } = require("./gate.cjs");

let runtimeMode = null; // null = 跟随 env / schema

function resolveTriggerMode() {
  if (runtimeMode === "auto" || runtimeMode === "manual") return runtimeMode;
  const env = String(process.env.COPILOT_TRIGGER_MODE || "")
    .trim()
    .toLowerCase();
  if (env === "auto" || env === "manual") return env;
  const cfg = copilotCfg().triggerMode;
  if (cfg === "auto" || cfg === "manual") return cfg;
  return "auto";
}

function setTriggerMode(mode) {
  const m = String(mode || "")
    .trim()
    .toLowerCase();
  if (m !== "auto" && m !== "manual") {
    return { ok: false, error: "invalid_mode", mode: resolveTriggerMode() };
  }
  runtimeMode = m;
  return { ok: true, mode: runtimeMode };
}

function getTriggerMode() {
  return { mode: resolveTriggerMode(), runtime: runtimeMode };
}

function resetTriggerMode() {
  runtimeMode = null;
  return getTriggerMode();
}

module.exports = {
  resolveTriggerMode,
  setTriggerMode,
  getTriggerMode,
  resetTriggerMode
};
