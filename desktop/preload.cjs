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
  setCapsuleVisible: (show) => ipcRenderer.invoke("capsule:setVisible", show),
  toggleCapsule: () => ipcRenderer.invoke("capsule:toggle"),
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
