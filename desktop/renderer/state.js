/**
 * 渲染端可变状态（单例）
 */
export const $ = (id) => document.getElementById(id);

export const PHASE = { IDLE: "IDLE", SPEAKING: "SPEAKING", COOLDOWN: "COOLDOWN" };
export const SILENCE_PATROL_MS = 22000;
export const VIRTUAL_RE =
  /cable|vb-?audio|voice\s*meeter|virtual|sysvad|vac |vbcable|steam streaming|obs.?virtual|droidcam|nvidia broadcast/i;
export const PHYSICAL_WARN_RE =
  /ugreen|realtek|nvidia high definition|high definition audio|hdmi|display|headphones|耳机|扬声器 \(|麦克风 \(|usb audio|webcam|camera/i;

export const S = {
  allInputs: [],
  allOutputs: [],
  inputStream: null,
  inCtx: null,
  analyser: null,
  /** Me 本机麦双通道 */
  meStream: null,
  meCtx: null,
  meAnalyser: null,
  meCaptureNode: null,
  dualTrackEnabled: false,
  othersSourceMode: "cable",
  meterTimer: null,
  loopCtx: null,
  listening: false,
  playCtx: null,
  nextPlay: 0,
  captureNode: null,
  unlisten: null,
  transcriptLines: [],
  lastPatrolAt: 0,
  lastLineCountAtPatrol: 0,
  silenceTimer: null,
  partialAsr: "",
  partialAsrMe: "",
  ttsPlayCount: 0,
  unsubMainLog: null,
  lastSpeechRmsAt: 0,
  lowLevelWarnAt: 0,
  asrFinalCount: 0,
  asrDeltaCount: 0,
  lastAsrFinalAt: 0,
  hostSpeakingUntil: 0,
  suppressCableInjectUntil: 0,
  lastAsrStallAlertAt: 0,
  recentHostUtterances: [],
  lastWakeSpeakAt: 0,
  duplexPhase: "IDLE",
  holdUntil: 0,
  cooldownUntil: 0,
  patrolInFlight: false,
  pendingPatrolReason: null,
  thinkingUi: false,
  interactionModeUi: "HH",
  interactionModeLabel: "人—人旁听",
  meetingLifeUi: "OFF",
  meetingLifeLabel: "未开会",
  copilotMode: "auto",
  meetingIdUi: "",
  agentHoldListening: false,
  echoDiscardCount: 0,
  asrAcceptedCount: 0,
  suppressSpeakCount: 0,
  /** hold/COOLDOWN 内暂存的唤醒/问句，IDLE 后放行 */
  pendingHoldAsr: "",
  pendingHoldAsrAt: 0,
  listenStartedAtUi: 0,
  monitorCtx: null,
  monitorNext: 0
};
