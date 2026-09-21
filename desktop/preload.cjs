const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bridge", {
  envStatus: () => ipcRenderer.invoke("env:status"),
  listenStart: () => ipcRenderer.invoke("listen:start"),
  listenStop: () => ipcRenderer.invoke("listen:stop"),
  listenAudio: (b64) => ipcRenderer.send("listen:audio", b64),
  kaibanEvaluate: (payload) => ipcRenderer.invoke("kaiban:evaluate", payload),
  hostSpeak: (text) => ipcRenderer.invoke("host:speak", text),
  onEvent: (handler) => {
    const wrapped = (_e, msg) => handler(msg);
    ipcRenderer.on("bridge:event", wrapped);
    return () => ipcRenderer.removeListener("bridge:event", wrapped);
  }
});
