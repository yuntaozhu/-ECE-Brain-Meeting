const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("xiaoxing", {
  status: () => ipcRenderer.invoke("xiaoxing:status"),
  voiceTurn: (payload) => ipcRenderer.invoke("xiaoxing:voiceTurn", payload || {}),
  meetingStart: (payload) => ipcRenderer.invoke("xiaoxing:meetingStart", payload || {}),
  meetingStop: () => ipcRenderer.invoke("xiaoxing:meetingStop"),
  meetingTracks: (payload) => ipcRenderer.invoke("xiaoxing:meetingTracks", payload || {}),
  meetingSpeaking: (payload) => ipcRenderer.invoke("xiaoxing:meetingSpeaking", payload || {}),
  meetingIngest: (payload) => ipcRenderer.invoke("xiaoxing:meetingIngest", payload || {}),
  othersAsrStart: () => ipcRenderer.invoke("xiaoxing:othersAsrStart"),
  othersAsrStop: () => ipcRenderer.invoke("xiaoxing:othersAsrStop"),
  othersPcm: (payload) => ipcRenderer.invoke("xiaoxing:othersPcm", payload || {}),
  meAsrStart: (payload) => ipcRenderer.invoke("xiaoxing:meAsrStart", payload || {}),
  meAsrStop: () => ipcRenderer.invoke("xiaoxing:meAsrStop"),
  meAsrForceAsk: (on) => ipcRenderer.invoke("xiaoxing:meAsrForceAsk", on),
  mePcm: (payload) => ipcRenderer.invoke("xiaoxing:mePcm", payload || {}),
  board: () => ipcRenderer.invoke("xiaoxing:board"),
  boardSet: (payload) => ipcRenderer.invoke("xiaoxing:boardSet", payload || {}),
  followupBoard: () => ipcRenderer.invoke("xiaoxing:followupBoard"),
  followupSet: (payload) => ipcRenderer.invoke("xiaoxing:followupSet", payload || {}),
  followupCreate: (payload) => ipcRenderer.invoke("xiaoxing:followupCreate", payload || {}),
  marketQuotes: (payload) => ipcRenderer.invoke("xiaoxing:marketQuotes", payload || {}),
  marketDashboard: (payload) => ipcRenderer.invoke("xiaoxing:marketDashboard", payload || {}),
  marketIngestSeed: () => ipcRenderer.invoke("xiaoxing:marketIngestSeed"),
  briefingLatest: () => ipcRenderer.invoke("xiaoxing:briefingLatest"),
  briefingRefresh: (payload) => ipcRenderer.invoke("xiaoxing:briefingRefresh", payload || {}),
  markBad: (payload) => ipcRenderer.invoke("xiaoxing:markBad", payload || {}),
  openSessions: () => ipcRenderer.invoke("xiaoxing:openSessions"),
  logPath: () => ipcRenderer.invoke("xiaoxing:logPath"),
  logRecent: (n) => ipcRenderer.invoke("xiaoxing:logRecent", n),
  logOpenDir: () => ipcRenderer.invoke("xiaoxing:logOpenDir"),
  logUi: (level, tag, message, detail) =>
    ipcRenderer.send("xiaoxing:logUi", { level, tag, message, detail }),
  setAlwaysOnTop: (on) => ipcRenderer.invoke("xiaoxing:setAlwaysOnTop", on),
  capsuleToggle: () => ipcRenderer.invoke("xiaoxing:capsuleToggle"),
  capsuleSetCollapsed: (collapsed) =>
    ipcRenderer.invoke("xiaoxing:capsuleSetCollapsed", collapsed),
  showMain: () => ipcRenderer.invoke("xiaoxing:showMain"),
  broadcastStatus: (payload) => ipcRenderer.invoke("xiaoxing:broadcastStatus", payload || {}),
  adminHealth: () => ipcRenderer.invoke("xiaoxing:adminHealth"),
  adminExperts: () => ipcRenderer.invoke("xiaoxing:adminExperts"),
  adminUpsertExpert: (payload) => ipcRenderer.invoke("xiaoxing:adminUpsertExpert", payload || {}),
  adminSetExpertEnabled: (payload) =>
    ipcRenderer.invoke("xiaoxing:adminSetExpertEnabled", payload || {}),
  adminTopics: (payload) => ipcRenderer.invoke("xiaoxing:adminTopics", payload || {}),
  adminUpsertTopic: (payload) => ipcRenderer.invoke("xiaoxing:adminUpsertTopic", payload || {}),
  adminDeleteTopic: (payload) => ipcRenderer.invoke("xiaoxing:adminDeleteTopic", payload || {}),
  adminSessions: () => ipcRenderer.invoke("xiaoxing:adminSessions"),
  adminCreateSession: (payload) => ipcRenderer.invoke("xiaoxing:adminCreateSession", payload || {}),
  adminPatchSession: (payload) => ipcRenderer.invoke("xiaoxing:adminPatchSession", payload || {}),
  onEvent: (handler) => {
    const wrapped = (_e, msg) => handler(msg);
    ipcRenderer.on("xiaoxing:event", wrapped);
    return () => ipcRenderer.removeListener("xiaoxing:event", wrapped);
  }
});
