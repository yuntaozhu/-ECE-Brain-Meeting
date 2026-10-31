/**
 * ECE-Brain desktop — AI 专家 · 纯软件虚拟音频网桥
 * 无外接线：虚拟音频输出 + 虚拟麦克风 对接腾讯会议；策略引擎控场
 */
const {
  app,
  BrowserWindow,
  ipcMain,
  session,
  shell,
  globalShortcut,
  desktopCapturer
} = require("electron");
const path = require("path");
const {
  hasArkKey,
  llmProviderStatus,
  DEFAULT_AGENDA,
  knowledgeStatus
} = require("./lib/meetingStrategy");
const { whisperStatus } = require("./lib/asr/whisperLocal.cjs");
const { hostAsrMode } = require("./lib/asr/hostAsr.cjs");
const { warmIndexFromDisk, semanticStatus, listConceptPages } = require("./lib/knowledge");
const { debugLog, envFileCandidates } = require("./lib/platform");
const { PHASE } = require("./lib/duplex");
const { ListenSession, speechApiKey, maskKey } = require("./main/listenSession.cjs");
const { createStrategyEvaluate } = require("./main/strategyEvaluate.cjs");
const { registerPolicyIpc } = require("./main/policyIpc.cjs");
const {
  getTriggerMode,
  setTriggerMode,
  buildCatchMeUp,
  appendJot,
  listJots,
  expandJots,
  refreshBridge,
  saveScreenCapture,
  getLatestScreenContext,
  updateScreenOcr,
  tryOcrPng
} = require("./lib/copilot/index.cjs");

const {
  MODE_LABEL,
  LIFE_LABEL,
  createMeetingSession,
  deriveMeetingLife
} = require("./lib/meetingSession");
const {
  appendSession,
  openSessionsDir,
  readSession,
  writeSummary
} = require("./lib/runtime");

for (const envPath of envFileCandidates()) {
  if (require("fs").existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
    break;
  }
}

try {
  if (process.platform === "win32") {
    require("child_process").execSync("chcp 65001", { stdio: "ignore", windowsHide: true });
  }
} catch (_) {}


let win = null;
/** 扫视悬浮胶囊（阶段二） */
let capsuleWin = null;
let listen = null;
let lastHostSpeakAt = 0;
let lastHostSpeakText = "";
let lastQuestionFp = "";
let lastQuestionAt = 0;
let listenStartedAt = 0;
/** @type {AbortController|null} */
let strategyAbort = null;
/** @type {ReturnType<typeof createMeetingSession>|null} */
let meetingState = null;

function broadcastBridgeEvent(msg) {
  for (const w of [win, capsuleWin]) {
    if (w && !w.isDestroyed()) {
      try {
        w.webContents.send("bridge:event", msg);
      } catch (_) {}
    }
  }
}

function emitInteractionMode() {
  if (!meetingState) return;
  const life = deriveMeetingLife(meetingState, {
    holdListening: Boolean(meetingState.holdToEnd),
    listening: Boolean(listen?.isOpen())
  });
  meetingState.lifecycle = life;
  broadcastBridgeEvent({
    type: "interaction-mode",
    mode: meetingState.mode,
    label: MODE_LABEL[meetingState.mode] || meetingState.mode,
    lifecycle: life,
    lifeLabel: LIFE_LABEL[life] || life,
    segmentId: meetingState.segmentId,
    meetingId: meetingState.meetingId,
    meetingOpen: Boolean(meetingState.meetingOpen)
  });
}

function promoteMeetingSession(meetingId, { summary = true } = {}) {
  const mid = String(meetingId || "").trim();
  if (!mid) return { ok: false };
  try {
    const { spawn } = require("child_process");
    const script = path.join(__dirname, "scripts", "promote-session.cjs");
    const args = [script, `--id=${mid}`];
    if (summary) args.push("--summary");
    spawn(process.execPath, args, {
      cwd: __dirname,
      detached: true,
      stdio: "ignore"
    }).unref();
    debugLog.info("Session", "已后台启动会话沉淀", { meetingId: mid });
    return { ok: true, meetingId: mid };
  } catch (err) {
    debugLog.warn("Session", "自动沉淀失败", { error: String(err?.message || err) });
    return { ok: false, error: String(err?.message || err) };
  }
}

function clearMainSpeakContext() {
  lastQuestionFp = "";
  lastQuestionAt = 0;
  lastHostSpeakAt = 0;
  lastHostSpeakText = "";
}

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 860,
    title: "大智 AI 会议顾问 · 虚拟音频网桥",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
  debugLog.info("App", "窗口已创建", { logFile: debugLog.getFilePath() });
}

function createCapsuleWindow() {
  if (capsuleWin && !capsuleWin.isDestroyed()) return capsuleWin;
  capsuleWin = new BrowserWindow({
    width: 420,
    height: 360,
    x: 48,
    y: 72,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    hasShadow: true,
    show: false,
    title: "大智 · 副驾驶胶囊",
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
    if (listen) listen.extraWins = [];
  });
  debugLog.info("App", "悬浮胶囊已创建");
  return capsuleWin;
}

function syncListenExtraWins() {
  if (listen) {
    listen.extraWins = capsuleWin && !capsuleWin.isDestroyed() ? [capsuleWin] : [];
  }
}

function setCapsuleVisible(show) {
  if (show) {
    createCapsuleWindow();
    if (capsuleWin && !capsuleWin.isDestroyed()) {
      capsuleWin.showInactive();
      syncListenExtraWins();
    }
  } else if (capsuleWin && !capsuleWin.isDestroyed()) {
    capsuleWin.hide();
  }
  return { ok: true, visible: Boolean(show && capsuleWin && !capsuleWin.isDestroyed() && capsuleWin.isVisible()) };
}

function registerWindowChromeIpc() {
  ipcMain.handle("window:setAlwaysOnTop", async (_e, on) => {
    if (!win || win.isDestroyed()) return { ok: false };
    win.setAlwaysOnTop(Boolean(on), "screen-saver");
    return { ok: true, alwaysOnTop: win.isAlwaysOnTop() };
  });
  ipcMain.handle("window:setOpacity", async (_e, opacity) => {
    if (!win || win.isDestroyed()) return { ok: false };
    const n = Math.min(1, Math.max(0.4, Number(opacity) || 1));
    win.setOpacity(n);
    return { ok: true, opacity: n };
  });
  ipcMain.handle("window:toggleVisible", async () => {
    // 防窥：主控台 + 胶囊一并隐藏/显示
    const anyVisible =
      (win && !win.isDestroyed() && win.isVisible()) ||
      (capsuleWin && !capsuleWin.isDestroyed() && capsuleWin.isVisible());
    if (anyVisible) {
      if (win && !win.isDestroyed()) win.hide();
      if (capsuleWin && !capsuleWin.isDestroyed()) capsuleWin.hide();
      return { ok: true, visible: false };
    }
    if (win && !win.isDestroyed()) {
      win.show();
      win.focus();
    }
    return { ok: true, visible: true };
  });
  ipcMain.handle("capsule:setVisible", async (_e, show) => setCapsuleVisible(Boolean(show)));
  ipcMain.handle("capsule:toggle", async () => {
    const visible = capsuleWin && !capsuleWin.isDestroyed() && capsuleWin.isVisible();
    return setCapsuleVisible(!visible);
  });
}

function registerGlobalShortcuts() {
  try {
    globalShortcut.unregisterAll();
    const okHide = globalShortcut.register("CommandOrControl+Shift+H", () => {
      const anyVisible =
        (win && !win.isDestroyed() && win.isVisible()) ||
        (capsuleWin && !capsuleWin.isDestroyed() && capsuleWin.isVisible());
      if (anyVisible) {
        if (win && !win.isDestroyed()) win.hide();
        if (capsuleWin && !capsuleWin.isDestroyed()) capsuleWin.hide();
      } else if (win && !win.isDestroyed()) {
        win.show();
        win.focus();
      }
    });
    // Push-to-Ask：通知渲染进程用近 60s 转写强制出建议卡
    const okAsk = globalShortcut.register("Alt+Z", () => {
      broadcastBridgeEvent({ type: "copilot-push-ask", ts: Date.now() });
      debugLog.info("Copilot", "Push-to-Ask 快捷键 Alt+Z");
    });
    // Auto / Manual 切换
    const okMode = globalShortcut.register("Alt+Shift+Z", () => {
      const cur = getTriggerMode().mode;
      const next = cur === "manual" ? "auto" : "manual";
      const res = setTriggerMode(next);
      broadcastBridgeEvent({
        type: "copilot-mode",
        mode: res.mode,
        ts: Date.now()
      });
      debugLog.info("Copilot", "触发模式切换", res);
    });
    debugLog.info("App", "全局快捷键", {
      hide: okHide,
      pushAsk: okAsk,
      toggleMode: okMode
    });
  } catch (err) {
    debugLog.warn("App", "注册全局快捷键失败", { error: String(err?.message || err) });
  }
}

app.whenReady().then(() => {
  debugLog.info("App", "Electron ready", {
    logFile: debugLog.getFilePath(),
    logDir: debugLog.getDir(),
    ark: hasArkKey(),
    speech: Boolean(speechApiKey()),
    arkKey: maskKey(process.env.ARK_API_KEY || process.env.DOUBAO_API_KEY || ""),
    speechKey: maskKey(speechApiKey()),
    knowledge: knowledgeStatus(),
    platform: process.platform,
    node: process.version
  });

  let lastPermLogAt = 0;
  let permCount = 0;
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    permCount += 1;
    const now = Date.now();
    if (now - lastPermLogAt > 5000) {
      debugLog.info("Perm", "permission request", { permission, count: permCount });
      lastPermLogAt = now;
      permCount = 0;
    }
    callback(true);
  });
  session.defaultSession.setPermissionCheckHandler(() => true);
  registerPolicyIpc(ipcMain);
  registerWindowChromeIpc();
  createWindow();
  createCapsuleWindow();
  registerGlobalShortcuts();
  ipcMain.handle("copilot:getMode", async () => getTriggerMode());
  ipcMain.handle("copilot:setMode", async (_e, mode) => {
    const res = setTriggerMode(mode);
    broadcastBridgeEvent({ type: "copilot-mode", mode: res.mode, ts: Date.now() });
    return res;
  });
  ipcMain.handle("copilot:pushAsk", async (_e, payload) => {
    broadcastBridgeEvent({
      type: "copilot-push-ask",
      ts: Date.now(),
      fromIpc: true,
      ...(payload && typeof payload === "object" ? payload : {})
    });
    return { ok: true };
  });
  ipcMain.handle("copilot:catchMeUp", async (_e, payload) => {
    const packet = buildCatchMeUp(payload?.transcript || payload?.lines || "", {
      windowMs: payload?.windowMs,
      agenda: payload?.agenda || ""
    });
    refreshBridge({ lastRecap: { ts: packet.ts, topic: packet.current_topic } });
    broadcastBridgeEvent(packet);
    return { ok: true, ...packet };
  });
  ipcMain.handle("copilot:jot", async (_e, payload) => {
    const res = appendJot(payload?.text, {
      meetingId: payload?.meetingId || meetingState?.meetingId || "live"
    });
    if (res.ok) broadcastBridgeEvent({ type: "jot-added", entry: res.entry });
    return res;
  });
  ipcMain.handle("copilot:listJots", async (_e, payload) => ({
    ok: true,
    jots: listJots(payload?.meetingId || meetingState?.meetingId || "live", payload?.limit)
  }));
  ipcMain.handle("copilot:expandJots", async (_e, payload) =>
    expandJots(
      payload?.meetingId || meetingState?.meetingId || "live",
      payload?.transcript || ""
    )
  );
  ipcMain.handle("copilot:captureScreen", async (_e, payload) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1280, height: 720 }
      });
      const src = sources[0];
      if (!src?.thumbnail) return { ok: false, error: "no_screen_source" };
      const png = src.thumbnail.toPNG();
      const saved = saveScreenCapture(png, {
        note: payload?.note || "",
        sourceId: src.id
      });
      if (saved.ok) {
        let ocrText = null;
        try {
          ocrText = await tryOcrPng(saved.path);
          if (ocrText) updateScreenOcr(ocrText);
        } catch (_) {}
        broadcastBridgeEvent({
          type: "screen-context",
          path: saved.path,
          note: saved.note,
          ts: saved.ts,
          ocrChars: ocrText ? ocrText.length : 0
        });
        return { ...saved, ocrText: ocrText || null };
      }
      return saved;
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  });
  ipcMain.handle("copilot:latestScreen", async () => ({
    ok: true,
    screen: getLatestScreenContext()
  }));

  debugLog.setUiSink((entry) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send("bridge:log", entry);
    }
  });

  ipcMain.handle("env:status", async () => {
    const kb = knowledgeStatus();
    const st = {
      ark: hasArkKey(),
      speech: Boolean(speechApiKey()),
      llm: llmProviderStatus(),
      asrMode: hostAsrMode(),
      whisper: whisperStatus(),
      logFile: debugLog.getFilePath(),
      logDir: debugLog.getDir(),
      agendaDefault: DEFAULT_AGENDA,
      knowledge: kb
    };
    debugLog.info("Env", "status queried", st);
    return st;
  });

  ipcMain.handle("log:path", async () => ({
    file: debugLog.getFilePath(),
    dir: debugLog.getDir()
  }));

  ipcMain.handle("log:recent", async (_e, n) => debugLog.recent(n || 300));

  ipcMain.handle("log:open-dir", async () => {
    const dir = debugLog.getDir();
    await shell.openPath(dir);
    debugLog.info("Log", "打开日志目录", { dir });
    return { ok: true, dir };
  });

  ipcMain.on("log:ui", (_e, payload) => {
    const level = (payload?.level || "INFO").toUpperCase();
    const fn = debugLog[level.toLowerCase()] || debugLog.info;
    // 已在渲染端 appendLogLine，只写文件/控制台，禁止再推 bridge:log
    fn(payload?.tag || "UI", payload?.message || "", payload?.detail, { skipUi: true });
  });

  ipcMain.handle("listen:start", async () => {
    debugLog.info("Listen", "UI 请求启动听会");
    if (listen) listen.close();
    listen = new ListenSession(win);
    syncListenExtraWins();
    listenStartedAt = Date.now();
    listen.listenStartedAt = listenStartedAt;
    lastQuestionFp = "";
    lastQuestionAt = 0;
    meetingState = createMeetingSession(`mtg_${Date.now()}`);
    emitInteractionMode();
    const ragWarm = warmIndexFromDisk();
    const wikiCount = listConceptPages().length;
    if (!ragWarm.ok && wikiCount < 3) {
      debugLog.error("Listen", "知识库未就绪，拒绝听会", { rag: ragWarm, wikiCount });
      listen.close();
      listen = null;
      listenStartedAt = 0;
      return {
        ok: false,
        error: "knowledge_missing",
        message: "知识索引未打包。请用含 knowledge/.rag-index.json 的安装包，或先 npm run rag:index。",
        rag: ragWarm,
        wikiCount
      };
    }
    const ok = await listen.connect();
    if (ok && listen) {
      listen.setPhase(PHASE.IDLE, { why: "listen-ready" });
      listen.startKeepalive();
    }
    debugLog.info("Listen", "启动结果", {
      ok,
      sessionId: listen?.sessionId,
      meetingId: meetingState?.meetingId,
      mode: meetingState?.mode,
      rag: ragWarm,
      wikiCount,
      ragStatus: semanticStatus()
    });
    const kb = knowledgeStatus();
    if (ok && listen) {
      const greet = kb.kbOk
        ? "我是大智，正在旁听记录。需要时请呼叫大智；人与人讨论时我会轻量拉回议程。"
        : "我是大智，在线，但知识文档未加载完整，请检查 knowledge 目录。";
      setTimeout(() => {
        if (listen?.isOpen() && !listen.intentionalClose) {
          debugLog.info("HostSpeak", "启动问候", { text: greet });
          lastHostSpeakAt = Date.now();
          lastHostSpeakText = greet;
          listen.speakText(greet);
          appendSession(meetingState.meetingId, {
            speaker: "大智",
            text: greet,
            mode: meetingState.mode,
            segmentId: meetingState.segmentId
          });
        }
      }, 2000);
    }
    return {
      ok,
      speech: Boolean(speechApiKey()),
      ark: hasArkKey(),
      knowledge: kb,
      agendaDefault: DEFAULT_AGENDA,
      agentMode: meetingState?.mode,
      interactionMode: meetingState?.mode,
      meetingId: meetingState?.meetingId
    };
  });

  ipcMain.handle("listen:stop", async () => {
    debugLog.info("Listen", "UI 请求停止听会");
    if (strategyAbort) {
      try {
        strategyAbort.abort();
      } catch (_) {}
      strategyAbort = null;
      debugLog.info("Strategy", "停听会：已 abort 进行中的 Chat");
    }
    const mid = meetingState?.meetingId || "";
    const stats = listen
      ? {
          asrFinals: listen.asrFinalCount,
          audioChunks: listen.audioChunksIn,
          ttsChunks: listen.ttsChunksOut,
          reconnectAttempt: listen.reconnectAttempt
        }
      : {};
    if (mid) {
      try {
        const rows = readSession(mid, { limit: 80 });
        const lines = rows.map((r) => `- ${r.speaker}: ${String(r.text || "").slice(0, 80)}`);
        const md =
          `# 本场摘要 ${mid}\n\n` +
          `- ASR finals: ${stats.asrFinals || 0}\n` +
          `- 上行分片: ${stats.audioChunks || 0}\n` +
          `- TTS 分片: ${stats.ttsChunks || 0}\n\n` +
          (lines.length ? lines.join("\n") : "（无转写）") +
          "\n";
        writeSummary(mid, md);
        debugLog.info("Listen", "本场汇总", { meetingId: mid, ...stats, lines: rows.length });
      } catch (err) {
        debugLog.warn("Listen", "写本场汇总失败", { error: String(err?.message || err) });
      }
    }
    listen?.close();
    listen = null;
    listenStartedAt = 0;
    meetingState = null;
    // 可选：停听会后自动将会话问答沉淀（默认关，避免脏答进库）
    if (mid && process.env.SESSION_PROMOTE_ON_STOP === "1") {
      promoteMeetingSession(mid, { summary: true });
    }
    return { ok: true };
  });

  ipcMain.on("listen:audio", (_e, payload) => {
    if (typeof payload === "string") {
      listen?.appendAudio(payload, "others");
      return;
    }
    const audio = payload?.audio || payload?.b64 || "";
    const role = payload?.role === "me" ? "me" : "others";
    listen?.appendAudio(audio, role);
  });

  ipcMain.handle("listen:setDualTrackMe", async (_e, enable) => {
    if (!listen) return { ok: false, error: "not_listening" };
    if (enable) {
      const ok = await listen.ensureHostAsrMe({ enable: true });
      return { ok, meAsr: ok };
    }
    try {
      listen.hostAsrMe?.close?.();
    } catch (_) {}
    listen.hostAsrMe = null;
    return { ok: true, meAsr: false };
  });

  ipcMain.handle("session:append", async (_e, payload) => {
    if (!meetingState || meetingState.mode === "PAUSED") return { ok: false, paused: true };
    const text = String(payload?.text || "").trim();
    if (!text) return { ok: false };
    meetingState.floorLinesSinceSummary = (meetingState.floorLinesSinceSummary || 0) + 1;
    return appendSession(meetingState.meetingId, {
      speaker: payload?.speaker || "会场",
      text,
      mode: meetingState.mode,
      segmentId: meetingState.segmentId
    });
  });

  ipcMain.handle("session:open-dir", async () => {
    const dir = openSessionsDir();
    await shell.openPath(dir);
    return { ok: true, dir };
  });

  const handleSessionMode = async () => ({
    mode: meetingState?.mode || null,
    label: meetingState ? MODE_LABEL[meetingState.mode] : null,
    meetingId: meetingState?.meetingId || null,
    segmentId: meetingState?.segmentId || null
  });
  ipcMain.handle("session:mode", handleSessionMode);

  const rt = {
    get win() { return win; },
    set win(v) { win = v; },
    get listen() { return listen; },
    set listen(v) { listen = v; },
    get lastHostSpeakAt() { return lastHostSpeakAt; },
    set lastHostSpeakAt(v) { lastHostSpeakAt = v; },
    get lastHostSpeakText() { return lastHostSpeakText; },
    set lastHostSpeakText(v) { lastHostSpeakText = v; },
    get lastQuestionFp() { return lastQuestionFp; },
    set lastQuestionFp(v) { lastQuestionFp = v; },
    get lastQuestionAt() { return lastQuestionAt; },
    set lastQuestionAt(v) { lastQuestionAt = v; },
    get listenStartedAt() { return listenStartedAt; },
    set listenStartedAt(v) { listenStartedAt = v; },
    get strategyAbort() { return strategyAbort; },
    set strategyAbort(v) { strategyAbort = v; },
    get meetingState() { return meetingState; },
    set meetingState(v) { meetingState = v; },
    emitInteractionMode,
    promoteMeetingSession,
    clearMainSpeakContext,
    broadcast: broadcastBridgeEvent
  };
  ipcMain.handle("strategy:evaluate", createStrategyEvaluate(rt));

  ipcMain.handle("host:speak", async (_e, text) => {
    debugLog.info("HostSpeak", "手动试播", { text: String(text || "").slice(0, 120) });
    if (!listen) {
      debugLog.warn("HostSpeak", "未启动听会通道 — 测虚拟麦不走此路径；试播 Host 需要先启动听会");
      return { ok: false, error: "未启动听会通道（测虚拟麦用本地蜂鸣；Host 话术需先启动听会）" };
    }
    if (!listen.isOpen()) {
      debugLog.warn("HostSpeak", "听会通道断线中，无法试播", {
        reconnectAttempt: listen.reconnectAttempt
      });
      return { ok: false, error: "听会通道已断线，正在自动重连，请稍后再试" };
    }
    const speakRes = listen.speakText(String(text || ""), { force: true });
    if (speakRes?.ok) {
      lastHostSpeakAt = Date.now();
      lastHostSpeakText = String(text || "");
    }
    return { ok: true, ...speakRes };
  });
});

app.on("will-quit", () => {
  try {
    globalShortcut.unregisterAll();
  } catch (_) {}
});

app.on("window-all-closed", () => {
  debugLog.info("App", "window-all-closed");
  listen?.close();
  app.quit();
});
