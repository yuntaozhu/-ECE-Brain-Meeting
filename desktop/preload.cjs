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
  listenAudio: (b64) => ipcRenderer.send("listen:audio", b64),
  kaibanEvaluate: (payload) => ipcRenderer.invoke("kaiban:evaluate", payload),
  hostSpeak: (text) => ipcRenderer.invoke("host:speak", text),
  sessionAppend: (payload) => ipcRenderer.invoke("session:append", payload),
  sessionOpenDir: () => ipcRenderer.invoke("session:open-dir"),
  agentMode: () => ipcRenderer.invoke("agent:mode"),
  logPath: () => ipcRenderer.invoke("log:path"),
  logRecent: (n) => ipcRenderer.invoke("log:recent", n),
  logOpenDir: () => ipcRenderer.invoke("log:open-dir"),
  logUi: (level, tag, message, detail) =>
    ipcRenderer.send("log:ui", { level, tag, message, detail }),
  onEvent: (handler) => {
    const wrapped = (_e, msg) => handler(msg);
    ipcRenderer.on("bridge:event", wrapped);
    return () => ipcRenderer.removeListener("bridge:event", wrapped);
  },
  onLog: (handler) => {
    const wrapped = (_e, entry) => handler(entry);
    ipcRenderer.on("bridge:log", wrapped);
    return () => ipcRenderer.removeListener("bridge:log", wrapped);
  }
});
