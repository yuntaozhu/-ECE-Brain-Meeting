/**
 * Wave J/K 冒烟：DOM id 完整性 + Catch Me Up 结构化字段 + 建议卡渲染依赖。
 * （无 Electron 时可离线验 id 列表与 recap 结构）
 */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { buildCatchMeUp } = require("../lib/copilot/recap.cjs");
const { buildCopilotPacket, clearPrefetch, resetTriggerMode } = require("../lib/copilot/index.cjs");

const html = fs.readFileSync(path.join(__dirname, "..", "renderer", "index.html"), "utf8");

const REQUIRED_IDS = [
  "archBox", "keyStatus", "chipArk", "chipSpeech", "chipVirtual", "chipListen",
  "chipMeetingAudio", "chipPatrol", "chipAgentMode", "chipMeetingLife", "chipThinking",
  "chipReconnect", "alertBanner", "virtualOnly", "allowPhysical", "othersSource",
  "inputDevice", "dualTrackMe", "meDevice", "meLevel", "outputDevice", "routeHint",
  "localMonitor", "showCapsule", "level", "refresh", "beep", "selfTest", "loop",
  "loopStop", "chkHost", "chkAiSpk", "chkAiMic", "meetingGate", "status", "agenda",
  "kbStatus", "autoPatrol", "start", "stop", "patrol", "forceSpeak", "btnSessions",
  "manualText", "asrStats", "duplexStats", "transcript", "winAlwaysOnTop", "winOpacity",
  "winStealthProtect", "copilotModeBtn", "copilotPushAskBtn", "smartRepliesMeta",
  "smartReplies", "catchMeUpBtn", "screenCtxBtn", "expandJotsBtn", "quickJotInput",
  "quickJotBtn", "catchMeUpBox", "mermaidBox", "jotList", "a2a", "todos",
  "btnCopyLog", "btnClearLog", "btnOpenLogDir", "logPath", "log",
  "preflightDrawer", "togglePreflightBtn", "preflightSummaryBadge", "scrollBottomBtn"
];

const missing = REQUIRED_IDS.filter((id) => !html.includes(`id="${id}"`));
assert.strictEqual(missing.length, 0, `missing ids: ${missing.join(", ")}`);

assert.ok(html.includes("cockpit-main"), "cockpit grid");
assert.ok(html.includes("preflightDrawer"), "drawer");
assert.ok(html.includes("data-aid-tab"), "aid tabs");

clearPrefetch?.();
resetTriggerMode?.();

const recap = buildCatchMeUp(
  "会场: 双通道方案有分歧，我反对混轨\n会场: 下一步要不要拍板 VAD",
  { windowMs: 10 * 60 * 1000, agenda: "Wave JK" }
);
assert.ok(recap.current_topic, "topic");
assert.ok(Array.isArray(recap.disagreements), "disagreements arr");
assert.ok(Array.isArray(recap.pending_decisions), "decisions arr");
assert.ok(Array.isArray(recap.wiki_facts), "wiki_facts");
assert.ok(Array.isArray(recap.active_speakers), "speakers");

const pkt = buildCopilotPacket("双通道 ASR 和 VAD 怎么看？能不能混轨？", {
  agenda: "Wave JK",
  force: true
});
assert.ok(pkt.suggestions, "suggestions");
assert.ok(pkt.suggestions.push_forward || pkt.suggestions.push_back, "option text");

const uiFiles = [
  "renderer/ui/cockpit.js",
  "renderer/ui/transcript.js",
  "renderer/ui/smartReplies.js",
  "renderer/ui/meetingAid.js"
];
for (const f of uiFiles) {
  assert.ok(fs.existsSync(path.join(__dirname, "..", f)), f);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      ids: REQUIRED_IDS.length,
      topic: recap.current_topic,
      disagreements: recap.disagreements?.length,
      decisions: recap.pending_decisions?.length,
      should_trigger: pkt.should_trigger,
      facts: (pkt.key_facts || []).length
    },
    null,
    2
  )
);

resetTriggerMode?.();
