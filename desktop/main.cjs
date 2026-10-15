/**
 * ECE-Brain desktop — AI 专家 · 纯软件虚拟音频网桥
 * 无外接线：虚拟音频输出 + 虚拟麦克风 对接腾讯会议；策略引擎控场
 */
const { app, BrowserWindow, ipcMain, session, shell } = require("electron");
const path = require("path");
const { hasArkKey, DEFAULT_AGENDA, knowledgeStatus } = require("./lib/meetingStrategy");
const { warmIndexFromDisk, semanticStatus, listConceptPages } = require("./lib/knowledge");
const { debugLog, envFileCandidates } = require("./lib/platform");
const { PHASE } = require("./lib/duplex");
const { ListenSession, speechApiKey, maskKey } = require("./main/listenSession.cjs");
const { createStrategyEvaluate } = require("./main/strategyEvaluate.cjs");
const { registerPolicyIpc } = require("./main/policyIpc.cjs");

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

function emitInteractionMode() {
  if (!meetingState) return;
  if (win && !win.isDestroyed()) {
    const life = deriveMeetingLife(meetingState, {
      holdListening: Boolean(meetingState.holdToEnd),
      listening: Boolean(listen?.isOpen())
    });
    meetingState.lifecycle = life;
    win.webContents.send("bridge:event", {
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
  createWindow();

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

  ipcMain.on("listen:audio", (_e, b64) => {
    listen?.appendAudio(b64);
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
    clearMainSpeakContext
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

app.on("window-all-closed", () => {
  debugLog.info("App", "window-all-closed");
  listen?.close();
  app.quit();
});
