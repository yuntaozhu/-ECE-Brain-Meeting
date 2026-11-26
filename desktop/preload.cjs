const { contextBridge, ipcRenderer } = require("electron");

/**
 * 注意：preload 在 Electron sandbox 下勿 require 本地业务模块，
 * 否则整段 preload 失败 → window.bridge 为空 → UI 卡死。
 * 策略函数走 main / 渲染端各自实现。
 */
contextBridge.exposeInMainWorld("bridge", {
  envStatus: () => ipcRenderer.invoke("env:status"),
  listenStart: () => ipcRenderer.invoke("listen:start"),
  listenStop: () => ipcRenderer.invoke("listen:stop"),
  listenAudio: (payload) => ipcRenderer.send("listen:audio", payload),
  setDualTrackMe: (enable) => ipcRenderer.invoke("listen:setDualTrackMe", enable),
  strategyEvaluate: (payload) => ipcRenderer.invoke("strategy:evaluate", payload),
  hostSpeak: (text) => ipcRenderer.invoke("host:speak", text),
  /** 火山 RTC AI 成员（经业务后端，不持 AK/SK） */
  rtcVoiceChatStatus: () => ipcRenderer.invoke("rtc:voicechat:status"),
  rtcVoiceChatJoin: (payload) => ipcRenderer.invoke("rtc:voicechat:join", payload || {}),
  rtcVoiceChatKick: (payload) => ipcRenderer.invoke("rtc:voicechat:kick", payload || {}),
  rtcVoiceChatInterrupt: (payload) =>
    ipcRenderer.invoke("rtc:voicechat:interrupt", payload || {}),
  rtcVoiceChatEvents: (payload) => ipcRenderer.invoke("rtc:voicechat:events", payload || {}),
  /** 外部会议 Bot（转写 only；speakInMeeting=false） */
  meetingBotStatus: () => ipcRenderer.invoke("meeting-bot:status"),
  meetingBotCreate: (payload) => ipcRenderer.invoke("meeting-bot:create", payload || {}),
  meetingBotStop: (payload) => ipcRenderer.invoke("meeting-bot:stop", payload || {}),
  meetingBotTranscripts: (payload) =>
    ipcRenderer.invoke("meeting-bot:transcripts", payload || {}),
  meetingOpsHealth: () => ipcRenderer.invoke("meeting-ops:health"),
  meetingOpsAudit: (payload) => ipcRenderer.invoke("meeting-ops:audit", payload || {}),
  meetingOpsCost: () => ipcRenderer.invoke("meeting-ops:cost"),
  meetingOpsDelete: (payload) => ipcRenderer.invoke("meeting-ops:delete", payload || {}),
  meetingAdminHealth: () => ipcRenderer.invoke("meeting-admin:health"),
  meetingAdminExperts: () => ipcRenderer.invoke("meeting-admin:experts"),
  meetingAdminUpsertExpert: (payload) =>
    ipcRenderer.invoke("meeting-admin:upsertExpert", payload || {}),
  meetingAdminSetExpertEnabled: (payload) =>
    ipcRenderer.invoke("meeting-admin:setExpertEnabled", payload || {}),
  meetingAdminTopics: (payload) => ipcRenderer.invoke("meeting-admin:topics", payload || {}),
  meetingAdminUpsertTopic: (payload) =>
    ipcRenderer.invoke("meeting-admin:upsertTopic", payload || {}),
  meetingAdminDeleteTopic: (payload) =>
    ipcRenderer.invoke("meeting-admin:deleteTopic", payload || {}),
  meetingAdminSessions: () => ipcRenderer.invoke("meeting-admin:sessions"),
  meetingAdminCreateSession: (payload) =>
    ipcRenderer.invoke("meeting-admin:createSession", payload || {}),
  meetingAdminGetSession: (payload) =>
    ipcRenderer.invoke("meeting-admin:getSession", payload || {}),
  meetingAdminPatchSession: (payload) =>
    ipcRenderer.invoke("meeting-admin:patchSession", payload || {}),
  sessionAppend: (payload) => ipcRenderer.invoke("session:append", payload),
  sessionOpenDir: () => ipcRenderer.invoke("session:open-dir"),
  interactionMode: () => ipcRenderer.invoke("session:mode"),
  logPath: () => ipcRenderer.invoke("log:path"),
  logRecent: (n) => ipcRenderer.invoke("log:recent", n),
  logOpenDir: () => ipcRenderer.invoke("log:open-dir"),
  logUi: (level, tag, message, detail) =>
    ipcRenderer.send("log:ui", { level, tag, message, detail }),
  /** 同步策略（主进程 lib），渲染端勿再复制别名/回声/巡检门控 */
  policySync: (op, args) => {
    const r = ipcRenderer.sendSync("policy:sync", { op, args: args || {} });
    if (!r?.ok) return null;
    return r.value;
  },
  onEvent: (handler) => {
    const wrapped = (_e, msg) => handler(msg);
    ipcRenderer.on("bridge:event", wrapped);
    return () => ipcRenderer.removeListener("bridge:event", wrapped);
  },
  onLog: (handler) => {
    const wrapped = (_e, entry) => handler(entry);
    ipcRenderer.on("bridge:log", wrapped);
    return () => ipcRenderer.removeListener("bridge:log", wrapped);
  },
  setAlwaysOnTop: (on) => ipcRenderer.invoke("window:setAlwaysOnTop", on),
  setOpacity: (opacity) => ipcRenderer.invoke("window:setOpacity", opacity),
  toggleWindowVisible: () => ipcRenderer.invoke("window:toggleVisible"),
  setStealthProtect: (on) => ipcRenderer.invoke("window:setStealthProtect", on),
  getStealthProtect: () => ipcRenderer.invoke("window:getStealthProtect"),
  setCapsuleVisible: (show) => ipcRenderer.invoke("capsule:setVisible", show),
  toggleCapsule: () => ipcRenderer.invoke("capsule:toggle"),
  setCapsuleCollapsed: (collapsed) =>
    ipcRenderer.invoke("capsule:setCollapsed", collapsed),
  getCapsuleCollapsed: () => ipcRenderer.invoke("capsule:getCollapsed"),
  copilotGetMode: () => ipcRenderer.invoke("copilot:getMode"),
  copilotSetMode: (mode) => ipcRenderer.invoke("copilot:setMode", mode),
  copilotPushAsk: (payload) => ipcRenderer.invoke("copilot:pushAsk", payload || {}),
  copilotCatchMeUp: (payload) => ipcRenderer.invoke("copilot:catchMeUp", payload || {}),
  copilotJot: (payload) => ipcRenderer.invoke("copilot:jot", payload || {}),
  copilotListJots: (payload) => ipcRenderer.invoke("copilot:listJots", payload || {}),
  copilotExpandJots: (payload) => ipcRenderer.invoke("copilot:expandJots", payload || {}),
  copilotCaptureScreen: (payload) =>
    ipcRenderer.invoke("copilot:captureScreen", payload || {}),
  copilotLatestScreen: () => ipcRenderer.invoke("copilot:latestScreen")
});
