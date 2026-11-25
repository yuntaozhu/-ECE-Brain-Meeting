/**
 * 小星 · Electron 主进程（农服口径 + AI 会议）
 */
const path = require("path");
const { app, BrowserWindow, ipcMain, shell, globalShortcut, session } = require("electron");

const { loadXiaoxingEnv } = require("./lib/voice/loadEnv.cjs");
loadXiaoxingEnv();

const { debugLog } = require("./lib/platform/debugLog.cjs");
const { voiceTurn } = require("./lib/voice/turn.cjs");
const { ttsConfigured } = require("./lib/voice/tts.cjs");
const { boardColumns, setInboxStatus, writeInbox } = require("./lib/knowledge/inbox.cjs");
const followup = require("./lib/followup/board.cjs");
const market = require("./lib/market/index.cjs");
const { knowledgeRoot } = require("./lib/knowledge/paths.cjs");
const meeting = require("./lib/meeting/index.cjs");
const {
  startTrackAsr,
  stopTrackAsr,
  stopAllTrackAsr,
  pushTrackPcmBase64,
  setTrackPaused,
  trackAsrStatus,
  othersAsrStatus,
  asrConfigured
} = require("./lib/asr/index.cjs");

/** Push-to-Talk 期间强制走咨询（不依赖唤醒武装） */
let meForceAskFlag = false;

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {BrowserWindow | null} */
let capsuleWin = null;
let capsuleCollapsed = true;
let alwaysOnTop = false;

function broadcast(type, payload = {}) {
  const msg = { type, ...payload };
  for (const w of [mainWindow, capsuleWin]) {
    if (w && !w.isDestroyed()) w.webContents.send("xiaoxing:event", msg);
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 860,
    minHeight: 600,
    title: "小星 · 农业顾问",
    backgroundColor: "#0f1c14",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createCapsule() {
  if (capsuleWin && !capsuleWin.isDestroyed()) return capsuleWin;
  capsuleWin = new BrowserWindow({
    width: capsuleCollapsed ? 420 : 440,
    height: capsuleCollapsed ? 56 : 360,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    show: true,
    alwaysOnTop: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  capsuleWin.setAlwaysOnTop(true, "screen-saver");
  capsuleWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  capsuleWin.loadFile(path.join(__dirname, "renderer", "capsule.html"));
  capsuleWin.on("closed", () => {
    capsuleWin = null;
  });
  return capsuleWin;
}

function setCapsuleCollapsed(collapsed) {
  capsuleCollapsed = Boolean(collapsed);
  if (!capsuleWin || capsuleWin.isDestroyed()) {
    return { ok: false, collapsed: capsuleCollapsed };
  }
  try {
    capsuleWin.setContentSize(capsuleCollapsed ? 420 : 440, capsuleCollapsed ? 56 : 360);
  } catch (_) {}
  broadcast("capsule-collapsed", { collapsed: capsuleCollapsed });
  return { ok: true, collapsed: capsuleCollapsed };
}

app.whenReady().then(() => {
  // 允许麦/屏采；否则 getUserMedia 失败 → 设备下拉空白、按住说话失效
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    debugLog.info("Perm", "permission request", { permission }, { rateKey: `perm:${permission}`, rateMs: 30000 });
    callback(
      permission === "media" ||
        permission === "mediaKeySystem" ||
        permission === "display-capture" ||
        permission === "audioCapture" ||
        permission === "videoCapture" ||
        true
    );
  });
  session.defaultSession.setPermissionCheckHandler(() => true);

  createMainWindow();
  createCapsule();

  debugLog.setUiSink((entry) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("xiaoxing:event", { type: "system-log", entry });
    }
  });

  debugLog.info("App", "Electron ready", {
    logFile: debugLog.getFilePath(),
    logDir: debugLog.getDir(),
    mirror: debugLog.getMirrorPath(),
    tts: ttsConfigured(),
    asr: asrConfigured()
  });

  try {
    globalShortcut.register("Alt+Z", () => {
      debugLog.info("Hotkey", "Push-to-Ask Alt+Z");
      broadcast("hotkey-push-ask", {});
    });
  } catch (err) {
    debugLog.warn("Hotkey", "注册 Alt+Z 失败", { error: String(err?.message || err) });
  }
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      createCapsule();
    }
  });
});

app.on("will-quit", () => {
  try {
    globalShortcut.unregisterAll();
  } catch (_) {}
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("xiaoxing:status", async () => {
  const st = {
    ok: true,
    ttsConfigured: ttsConfigured(),
    asrConfigured: asrConfigured(),
    othersAsr: othersAsrStatus(),
    knowledgeRoot: knowledgeRoot(),
    product: "xiaoxing",
    version: "0.5.7",
    alwaysOnTop,
    capsuleCollapsed,
    meeting: meeting.getMeeting(),
    trackAsr: trackAsrStatus(),
    meForceAsk: meForceAskFlag,
    logFile: debugLog.getFilePath(),
    logDir: debugLog.getDir(),
    logMirror: debugLog.getMirrorPath(),
    briefing: (() => {
      try {
        return require("./lib/briefing/daily.cjs").readLatestBriefing();
      } catch (_) {
        return { ok: false, empty: true };
      }
    })()
  };
  debugLog.debug("Env", "status queried", {
    tts: st.ttsConfigured,
    asr: st.asrConfigured,
    logFile: st.logFile
  });
  return st;
});

ipcMain.handle("xiaoxing:logPath", async () => ({
  ok: true,
  file: debugLog.getFilePath(),
  dir: debugLog.getDir(),
  mirror: debugLog.getMirrorPath()
}));

ipcMain.handle("xiaoxing:logRecent", async (_e, n) => ({
  ok: true,
  entries: debugLog.recent(Number(n) || 200)
}));

ipcMain.handle("xiaoxing:logOpenDir", async () => {
  const dir = debugLog.getDir();
  await shell.openPath(dir);
  debugLog.info("Log", "打开日志目录", { dir });
  return { ok: true, dir };
});

ipcMain.on("xiaoxing:logUi", (_e, payload = {}) => {
  const level = String(payload.level || "INFO").toUpperCase();
  const fn = debugLog[level.toLowerCase()] || debugLog.info;
  fn(payload.tag || "UI", payload.message || "", payload.detail, { skipUi: true });
});

ipcMain.handle("xiaoxing:meAsrForceAsk", async (_e, on) => {
  meForceAskFlag = Boolean(on);
  return { ok: true, forceAsk: meForceAskFlag };
});

ipcMain.handle("xiaoxing:meetingStart", async (_e, payload = {}) => {
  const r = meeting.startMeeting(payload || {});
  let industryBriefing = null;
  try {
    const { readLatestBriefing } = require("./lib/briefing/daily.cjs");
    industryBriefing = readLatestBriefing();
  } catch (_) {}
  debugLog.info("Meeting", "开始听会", {
    id: r.meeting?.id,
    phase: r.meeting?.phase,
    briefing: r.briefing?.empty === false ? r.briefing.card?.previousMeetingId : "none",
    industryBriefing: industryBriefing?.day || null
  });
  broadcast("meeting", {
    event: "start",
    meeting: r.meeting,
    briefing: r.briefing || null,
    industryBriefing
  });
  return { ...r, industryBriefing };
});

ipcMain.handle("xiaoxing:meetingStop", async () => {
  stopAllTrackAsr();
  const r = meeting.stopMeeting();
  let summary = null;
  if (r.meeting?.file) {
    try {
      summary = meeting.summarizeMeeting(r.meeting, { writeInboxGaps: true });
      debugLog.info("Meeting", "散会摘要", {
        id: r.meeting?.id,
        followups: (summary.followups || []).length,
        summaryPath: summary.summaryPath || null
      });
    } catch (err) {
      debugLog.error("Meeting", "摘要失败", err);
      summary = { ok: false, error: String(err.message || err) };
    }
  }
  broadcast("meeting", { event: "stop", meeting: r.meeting, summary });
  return { ...r, summary };
});

ipcMain.handle("xiaoxing:meetingTracks", async (_e, payload = {}) => {
  const snap = meeting.setTracks(payload || {});
  broadcast("meeting", { event: "tracks", meeting: snap });
  return { ok: true, meeting: snap };
});

ipcMain.handle("xiaoxing:meetingSpeaking", async (_e, payload = {}) => {
  const on = Boolean(payload?.on);
  const snap = meeting.setSpeaking(on);
  // 半双工：播报中暂停 Me 云识别，避免自听回灌
  setTrackPaused("me", on);
  return { ok: true, meeting: snap };
});

function logConsultResult(source, handled, turn, query) {
  debugLog.info("Meeting", "consult", {
    source,
    query: String(query || handled.query || "").slice(0, 80),
    action: handled.action,
    layer: handled.ask?.layer || turn?.layer || null,
    score: handled.ask?.score ?? turn?.score ?? null,
    replyChars: String(handled.ask?.reply || turn?.reply || "").length,
    tts: Boolean(turn?.tts?.ok),
    source_label: handled.ask?.source_label || null
  });
}

function logAsrError(track, err) {
  const code = String(err?.code || "");
  if (code === "circuit_hold") {
    debugLog.warn(`ASR`, `${track} 熔断中`, err, {
      rateKey: `asr-${track}-hold`,
      rateMs: 60000
    });
    return;
  }
  if (code === "circuit_closed") {
    debugLog.info("ASR", `${track} 熔断解除`, err);
    return;
  }
  if (code === "circuit_open") {
    debugLog.error("ASR", `${track} 熔断开启`, err);
    return;
  }
  debugLog.error("ASR", `${track} error`, err, {
    rateKey: `asr-${track}-err`,
    rateMs: 8000
  });
}

async function maybeLiveUpgradeConsult(handled, text) {
  if (handled?.action !== "consult" || !handled.ask) return handled;
  const layer = handled.ask.layer;
  if (layer !== "market_miss" && layer !== "gap") return handled;
  const q = String(handled.query || text || "").trim();
  const { looksLikePriceQuery } = require("./lib/market/retrieve.cjs");
  const { askAsync } = require("./lib/ask/index.cjs");
  const price = looksLikePriceQuery(q);

  if (price) {
    broadcast("status", { text: "正在查行情…", cls: "thinking", phase: "listening" });
    debugLog.info("Market", "live on miss", { query: q.slice(0, 60), fromLayer: layer });
    const upgraded = await askAsync(q, {
      writeGap: true,
      session: false,
      live: true,
      llm: false,
      onLiveStart: () =>
        broadcast("status", { text: "正在查行情…", cls: "thinking", phase: "listening" })
    });
    debugLog.info("Market", "live 结果", {
      layer: upgraded.layer,
      live: Boolean(upgraded.live),
      appended: upgraded.liveMeta?.appended || 0
    });
    return { ...handled, ask: upgraded, query: q };
  }

  if (layer === "gap") {
    broadcast("status", { text: "正在组织参考答复…", cls: "thinking", phase: "listening" });
    debugLog.info("Ask", "llm on gap", { query: q.slice(0, 60) });
    const upgraded = await askAsync(q, {
      writeGap: true,
      session: false,
      live: false,
      llm: true,
      onLlmStart: () =>
        broadcast("status", { text: "正在组织参考答复…", cls: "thinking", phase: "listening" })
    });
    debugLog.info("Ask", "llm 结果", {
      layer: upgraded.layer,
      llm: Boolean(upgraded.llm),
      reason: upgraded.reason || null
    });
    if (upgraded.layer === "llm" || upgraded.layer !== layer) {
      return { ...handled, ask: upgraded, query: q };
    }
  }
  return handled;
}

async function runMeUtterance(text, opts = {}) {
  let handled = meeting.handleMeetingUtterance({
    track: "me",
    text,
    forceAsk: Boolean(opts.forceAsk)
  });
  broadcast("meeting", { event: "me-final", text, ...handled });

  if (handled.action === "consult" && handled.ask?.reply && opts.speak !== false) {
    handled = await maybeLiveUpgradeConsult(handled, text);
    meeting.setSpeaking(true);
    setTrackPaused("me", true);
    broadcast("status", { text: "播报中", cls: "speaking", phase: "speaking" });
    try {
      const turn = await voiceTurn({
        query: handled.query || text,
        speak: true,
        preAnswer: handled.ask,
        writeGap: false,
        session: false
      });
      meeting.setSpeaking(false);
      setTrackPaused("me", false);
      logConsultResult("me-asr", handled, turn, handled.query || text);
      broadcast("meeting", { event: "me-consult", text, ...handled, turn });
      return { ...handled, turn };
    } catch (err) {
      meeting.setSpeaking(false);
      setTrackPaused("me", false);
      debugLog.error("Meeting", "consult TTS 失败", err);
      return { ...handled, turnError: String(err.message || err) };
    }
  }
  if (
    (handled.action === "sleep" ||
      handled.action === "focus_recall" ||
      handled.action === "focus_gap") &&
    handled.reply &&
    opts.speak !== false
  ) {
    const turn = await voiceTurn({
      query: handled.action,
      speak: true,
      preAnswer: { ok: true, layer: "meta", reply: handled.reply },
      writeGap: false,
      session: false
    });
    return { ...handled, turn };
  }
  return handled;
}

ipcMain.handle("xiaoxing:meetingIngest", async (_e, payload = {}) => {
  let handled = meeting.handleMeetingUtterance({
    track: payload.track || "me",
    text: payload.text || "",
    forceAsk: Boolean(payload.forceAsk)
  });
  debugLog.info("Meeting", "ingest", {
    track: payload.track || "me",
    action: handled.action,
    text: String(payload.text || "").slice(0, 60),
    suggest: handled.suggest?.layer || null,
    layer: handled.ask?.layer || null
  });
  broadcast("meeting", { event: "ingest", ...handled });

  if (handled.action === "consult" && handled.ask?.reply && payload.speak !== false) {
    handled = await maybeLiveUpgradeConsult(handled, payload.text);
    meeting.setSpeaking(true);
    broadcast("status", { text: "播报中", cls: "speaking", phase: "speaking" });
    try {
      const turn = await voiceTurn({
        query: handled.query || payload.text,
        speak: true,
        preAnswer: handled.ask,
        writeGap: false,
        session: false
      });
      meeting.setSpeaking(false);
      logConsultResult("ingest", handled, turn, handled.query || payload.text);
      return { ...handled, turn };
    } catch (err) {
      meeting.setSpeaking(false);
      debugLog.error("Meeting", "consult TTS 失败", err);
      return { ...handled, turnError: String(err.message || err) };
    }
  }

  if (
    (handled.action === "sleep" ||
      handled.action === "focus_recall" ||
      handled.action === "focus_gap") &&
    handled.reply &&
    payload.speak !== false
  ) {
    const turn = await voiceTurn({
      query: handled.action,
      speak: true,
      preAnswer: { ok: true, layer: "meta", reply: handled.reply },
      writeGap: false,
      session: false
    });
    return { ...handled, turn };
  }

  return handled;
});

ipcMain.handle("xiaoxing:voiceTurn", async (_e, payload = {}) => {
  debugLog.info("Ask", "voiceTurn", {
    query: String(payload?.query || payload?.text || "").slice(0, 80),
    speak: payload?.speak !== false
  });
  const query = String(payload.query || payload.text || "").trim();
  const speak = payload.speak !== false;
  const result = await voiceTurn({
    query: query || "suggest",
    speak,
    preAnswer: payload.preAnswer || null,
    writeGap: payload.writeGap !== false && !payload.preAnswer,
    session: payload.session !== false && !payload.preAnswer,
    live: payload.live !== false,
    onLiveStart: () =>
      broadcast("status", { text: "正在查行情…", cls: "thinking", phase: "listening" })
  });
  debugLog.info("Ask", "voiceTurn 结果", {
    layer: result.layer,
    score: result.score,
    replyChars: String(result.reply || "").length,
    tts: Boolean(result.tts?.ok),
    live: Boolean(result.live)
  });
  broadcast("turn-done", {
    query: result.query,
    layer: result.layer,
    reply: result.reply,
    score: result.score
  });
  return result;
});

ipcMain.handle("xiaoxing:board", async () => boardColumns());

ipcMain.handle("xiaoxing:boardSet", async (_e, payload = {}) => {
  return setInboxStatus(payload.id, payload.status || "pending");
});

ipcMain.handle("xiaoxing:followupBoard", async () => followup.boardColumns());

ipcMain.handle("xiaoxing:followupSet", async (_e, payload = {}) => {
  return followup.setTaskStatus(payload.id, payload.status || "todo");
});

ipcMain.handle("xiaoxing:followupCreate", async (_e, payload = {}) => {
  const task = followup.createTask(payload || {});
  broadcast("followup-updated", { id: task.id });
  return task;
});

ipcMain.handle("xiaoxing:marketQuotes", async (_e, payload = {}) => {
  const limit = Number(payload?.limit) || 12;
  return { ok: true, quotes: market.listRecentQuotes(limit) };
});

ipcMain.handle("xiaoxing:marketDashboard", async (_e, payload = {}) => {
  return market.buildMarketDashboard(payload || {});
});

ipcMain.handle("xiaoxing:briefingLatest", async () => {
  const { readLatestBriefing } = require("./lib/briefing/daily.cjs");
  return readLatestBriefing();
});

ipcMain.handle("xiaoxing:briefingRefresh", async (_e, payload = {}) => {
  const { buildDailyBriefing } = require("./lib/briefing/daily.cjs");
  const live = Boolean(payload?.live);
  let scrapeFn = null;
  if (live) {
    try {
      const { scrapeUrl, hasApiKey } = require("./lib/firecrawl/client.cjs");
      if (hasApiKey()) scrapeFn = scrapeUrl;
    } catch (_) {}
  }
  const card = await buildDailyBriefing({ live: live && Boolean(scrapeFn), scrapeFn });
  broadcast("briefing", { event: "refresh", card });
  return card;
});

ipcMain.handle("xiaoxing:marketIngestSeed", async () => {
  const r = market.ingestSeedWithB2b
    ? market.ingestSeedWithB2b()
    : market.ingestSeed({ replace: true });
  debugLog.info("Market", "装载种子价", { count: r.count, file: r.file });
  return r;
});

ipcMain.handle("xiaoxing:markBad", async (_e, payload = {}) => {
  const file = writeInbox({
    query: payload.query || "",
    reason: payload.reason || "user_bad",
    reply: payload.reply || "",
    meta: { source: "desktop-mark-bad" }
  });
  broadcast("inbox-updated", {});
  return { ok: true, file };
});

ipcMain.handle("xiaoxing:openSessions", async () => {
  const dir = path.join(knowledgeRoot(), "sessions");
  await shell.openPath(dir);
  return { ok: true, dir };
});

ipcMain.handle("xiaoxing:setAlwaysOnTop", async (_e, on) => {
  alwaysOnTop = Boolean(on);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(alwaysOnTop);
  }
  return { ok: true, alwaysOnTop };
});

ipcMain.handle("xiaoxing:capsuleToggle", async () => {
  if (!capsuleWin || capsuleWin.isDestroyed()) createCapsule();
  else if (capsuleWin.isVisible()) capsuleWin.hide();
  else capsuleWin.show();
  return { ok: true, visible: capsuleWin?.isVisible() };
});

ipcMain.handle("xiaoxing:capsuleSetCollapsed", async (_e, collapsed) => {
  return setCapsuleCollapsed(collapsed);
});

ipcMain.handle("xiaoxing:showMain", async () => {
  if (!mainWindow || mainWindow.isDestroyed()) createMainWindow();
  mainWindow.show();
  mainWindow.focus();
  return { ok: true };
});

ipcMain.handle("xiaoxing:broadcastStatus", async (_e, payload = {}) => {
  broadcast("status", payload);
  return { ok: true };
});

ipcMain.handle("xiaoxing:othersAsrStart", async () => {
  debugLog.info("ASR", "Others 启动");
  const r = await startTrackAsr("others", {
    onFinal: (text) => {
      const handled = meeting.handleMeetingUtterance({ track: "others", text });
      debugLog.info("ASR", "Others final", {
        chars: String(text || "").length,
        text: String(text || "").slice(0, 60),
        action: handled.action,
        suggest: handled.suggest?.layer || null
      });
      broadcast("meeting", { event: "others-final", text, ...handled });
    },
    onPartial: (text) => {
      broadcast("meeting", { event: "others-partial", text });
    },
    onError: (err) => {
      logAsrError("Others", err);
      broadcast("meeting", { event: "others-asr-error", error: err });
    },
    onStatus: (st) => {
      broadcast("meeting", { event: "others-asr-status", ...st });
    }
  });
  if (r.ok) meeting.setTracks({ othersConnected: true });
  else debugLog.warn("ASR", "Others 启动失败", r);
  return r;
});

ipcMain.handle("xiaoxing:othersAsrStop", async () => {
  stopTrackAsr("others");
  meeting.setTracks({ othersConnected: false });
  broadcast("meeting", { event: "others-asr-status", running: false });
  return { ok: true };
});

ipcMain.handle("xiaoxing:othersPcm", async (_e, payload = {}) => {
  const b64 = String(payload.pcmBase64 || payload.b64 || "");
  if (!b64) return { ok: false };
  return { ok: pushTrackPcmBase64("others", b64) };
});

ipcMain.handle("xiaoxing:meAsrStart", async (_e, payload = {}) => {
  if (typeof payload?.forceAsk === "boolean") meForceAskFlag = payload.forceAsk;
  debugLog.info("ASR", "Me 启动", { forceAsk: meForceAskFlag });
  const r = await startTrackAsr("me", {
    onFinal: (text) => {
      debugLog.info("ASR", "Me final", {
        chars: String(text || "").length,
        text: String(text || "").slice(0, 60)
      });
      void runMeUtterance(text, {
        forceAsk: meForceAskFlag || Boolean(payload?.forceAsk),
        speak: true
      });
    },
    onPartial: (text) => {
      broadcast("meeting", { event: "me-partial", text });
    },
    onError: (err) => {
      logAsrError("Me", err);
      broadcast("meeting", { event: "me-asr-error", error: err });
    },
    onStatus: (st) => {
      broadcast("meeting", { event: "me-asr-status", ...st });
    }
  });
  if (r.ok) meeting.setTracks({ meConnected: true });
  else debugLog.warn("ASR", "Me 启动失败", r);
  return r;
});

ipcMain.handle("xiaoxing:meAsrStop", async () => {
  stopTrackAsr("me");
  meeting.setTracks({ meConnected: false });
  broadcast("meeting", { event: "me-asr-status", running: false });
  return { ok: true };
});

ipcMain.handle("xiaoxing:mePcm", async (_e, payload = {}) => {
  const b64 = String(payload.pcmBase64 || payload.b64 || "");
  if (!b64) return { ok: false };
  return { ok: pushTrackPcmBase64("me", b64) };
});
