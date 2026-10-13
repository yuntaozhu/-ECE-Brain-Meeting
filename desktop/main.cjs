/**
 * ECE-Brain desktop — AI 专家 · 纯软件虚拟音频网桥
 * 无外接线：虚拟音频输出 + 虚拟麦克风 对接腾讯会议；策略引擎控场
 */
const { app, BrowserWindow, ipcMain, session, shell } = require("electron");
const path = require("path");
const {
  runMeetingAnalysis,
  hasArkKey,
  DEFAULT_AGENDA,
  knowledgeStatus
} = require("./lib/meetingStrategy");
const { warmIndexFromDisk, semanticStatus, listConceptPages } = require("./lib/knowledge");
const { debugLog, envFileCandidates } = require("./lib/platform");
const {
  PHASE,
  looksLikeHostEcho,
  isIntroSelfTalk,
  stripIntroBoilerplate,
  WAKE_COOLDOWN_MS
} = require("./lib/duplex");
const { ListenSession, speechApiKey, maskKey } = require("./main/listenSession.cjs");

const {
  MODE_LABEL,
  MEETING_LIFE,
  LIFE_LABEL,
  createMeetingSession,
  deriveMeetingLife,
  setLifecycle
} = require("./lib/meetingSession");
const {
  appendSession,
  openSessionsDir,
  readSession,
  writeSummary,
  clearMeetingCache
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
    fn(payload?.tag || "UI", payload?.message || "", payload?.detail);
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

  const handleStrategyEvaluate = async (_e, payload) => {
    const transcript = payload?.transcript || "";
    const agenda = payload?.agenda || DEFAULT_AGENDA;
    const phase = listen?.phase || PHASE.IDLE;
    const emitUi = (msg) => {
      if (win && !win.isDestroyed()) win.webContents.send("bridge:event", msg);
    };
    const speakSoft = (text, tag) => {
      const t = stripIntroBoilerplate(String(text || "").trim());
      if (!t || !listen?.isOpen()) return { ok: false };
      debugLog.info("Strategy", tag || "软播报", { text: t.slice(0, 80) });
      const res = listen.speakText(t);
      if (res?.ok || res?.queued) {
        lastHostSpeakAt = Date.now();
        lastHostSpeakText = t;
      }
      return res;
    };
    if (!meetingState) {
      meetingState = createMeetingSession(`mtg_${Date.now()}`);
    }
    // P1：主进程打断缓冲同步进 meetingState，供 CONTINUE 续播
    if (listen?.interruptBuffer?.fullText) {
      meetingState.interruptBuffer = { ...listen.interruptBuffer };
      if (!meetingState.lastInterruptedText) {
        meetingState.lastInterruptedText = listen.interruptBuffer.fullText.slice(0, 800);
      }
    }
    // 新一轮巡检取消上一轮未完成的 Chat（减停听后仍出答 / cancel 风暴）
    if (strategyAbort) {
      try {
        strategyAbort.abort();
      } catch (_) {}
    }
    strategyAbort = new AbortController();
    const thisAbort = strategyAbort;
    const policyOpts = {
      phase,
      listenStartedAt: listen?.listenStartedAt || listenStartedAt || 0,
      lastHostSpeakAt,
      lastHostSpeakText,
      quietMs: payload?.quietMs,
      lastQuestionFp,
      lastQuestionAt,
      meetingState,
      trigger: payload?.reason || payload?.trigger || "manual",
      signal: thisAbort.signal,
      interruptChunks: listen?.interruptBuffer?.chunks || 0,
      onStatus: (st) => emitUi({ type: "strategy-status", ...st }),
      // P0：思考占位仅 UI，不走 TTS（避免双次触发 / cancel 风暴 / 拆段播报）
      onThinking: (text) => {
        emitUi({ type: "strategy-thinking", text });
      },
      // 听清后立刻播短句；后文在这句播放时生成，说完由排队接上
      onEarlySpeak: (text) => {
        const res = speakSoft(text, "先开口播");
        if ((res?.ok || res?.queued) && meetingState) {
          appendSession(meetingState.meetingId, {
            speaker: "大智",
            text: String(text || "").slice(0, 200),
            mode: meetingState.mode,
            segmentId: meetingState.segmentId
          });
        }
        return res;
      }
    };
    debugLog.info("Strategy", "开始巡检", {
      agenda,
      phase,
      agentMode: meetingState.mode,
      trigger: policyOpts.trigger,
      transcriptChars: transcript.length,
      transcriptPreview: transcript.slice(-240),
      policyOpts: {
        phase: policyOpts.phase,
        listenStartedAt: policyOpts.listenStartedAt,
        lastHostSpeakAt: policyOpts.lastHostSpeakAt,
        quietMs: policyOpts.quietMs,
        lastQuestionFp: policyOpts.lastQuestionFp,
        lastQuestionAt: policyOpts.lastQuestionAt,
        sinceHostMs: lastHostSpeakAt ? Date.now() - lastHostSpeakAt : null,
        lastHostPreview: lastHostSpeakText.slice(0, 60)
      }
    });
    try {
      const result = await runMeetingAnalysis(transcript, agenda, policyOpts);
      emitUi({ type: "strategy-status", phase: "idle" });
      emitInteractionMode();
      debugLog.info("Strategy", "巡检完成", {
        shouldIntervene: result.shouldIntervene,
        reason: result.reason,
        agentMode: result.agentMode || meetingState.mode,
        interventionText: result.interventionText,
        fullAnswer: result.fullAnswer?.slice?.(0, 80),
        spokenPrefix: result.spokenPrefix?.slice?.(0, 40),
        earlyCovered: result.earlyCovered,
        arkMode: result.arkMode,
        arkBillingOverdue: result.arkBillingOverdue,
        questionFp: result.questionFp,
        silenceGate: result.silenceGate,
        wake: result.wake,
        todos: result.latestToDos?.length,
        a2a: result.a2aTrace?.map((e) => `${e.sender}->${e.target}:${e.action}`)
      });

      if (result.reason === "ABORTED" || thisAbort.signal.aborted) {
        debugLog.info("Strategy", "巡检已取消（停听会或新巡检）", { reason: result.reason });
        return {
          ok: true,
          result,
          speakResult: { ok: false, aborted: true },
          duplex: {
            phase: listen?.phase || PHASE.IDLE,
            holdUntil: listen?.holdUntil || 0,
            cooldownUntil: listen?.cooldownUntil || 0
          },
          agent: {
            mode: meetingState?.mode || null,
            label: meetingState ? MODE_LABEL[meetingState.mode] : null,
            meetingId: meetingState?.meetingId || null,
            segmentId: meetingState?.segmentId || null
          }
        };
      }

      if (result.arkBillingOverdue) {
        debugLog.error("Strategy", "Ark 账号欠费/过期，已走启发式控场", {
          hint: "请到火山方舟控制台充值或换可用 Key（ARK_API_KEY / DOUBAO_API_KEY）"
        });
        emitUi({
          type: "ark-billing",
          overdue: true,
          message: result.arkError || "AccountOverdueError"
        });
      }

      // 仅首句已播完且无尾巴：更新指纹，不再二次 TTS
      if (result.earlyCovered && !result.interventionText && result.questionFp) {
        lastQuestionFp = result.questionFp;
        lastQuestionAt = Date.now();
        if (result.fullAnswer) lastHostSpeakText = result.fullAnswer;
      }

      let speakResult = null;
      if (result.interruptTts && listen) {
        speakResult = listen.interruptSpeak(result.reason || "INTERRUPT");
        if (meetingState && listen.interruptBuffer?.fullText) {
          meetingState.lastInterruptedText = listen.interruptBuffer.fullText.slice(0, 800);
          meetingState.interruptBuffer = { ...listen.interruptBuffer };
        }
        debugLog.info("Strategy", "已打断当前播报", { reason: result.reason });
      }
      if (result.reason === "CONTINUE" && listen) {
        listen.interruptBuffer = null;
      }
      if (result.shouldIntervene && result.interventionText && listen) {
        let text = stripIntroBoilerplate(result.interventionText);
        result.interventionText = text;
        // 展示用全文（含已提前播的首句）
        if (result.fullAnswer) result.displayText = result.fullAnswer;
        const since = Date.now() - lastHostSpeakAt;
        const echoHit = looksLikeHostEcho(text, [lastHostSpeakText].filter(Boolean), {
          sinceHostMs: since
        });

        if (listen.phase === PHASE.SPEAKING || listen.expectingSpeak) {
          const canQueue = [
            "WAKE_ANSWER",
            "BIZ_ANSWER",
            "SUMMARY",
            "WAKE_ACK",
            "STEER",
            "SUMMARY_ASK",
            "STOP",
            "CONTINUE_HH",
            "CONTINUE",
            "MEETING_START",
            "MEETING_END",
            "MODE_PAUSE",
            "MODE_RESUME"
          ].includes(result.reason);
          if (canQueue) {
            debugLog.info("Strategy", "播报中，话术排队", {
              reason: result.reason,
              text: text.slice(0, 60)
            });
            speakResult = listen.speakText(text);
            if (speakResult?.ok || speakResult?.queued) {
              lastHostSpeakAt = Date.now();
              lastHostSpeakText = result.fullAnswer || text;
              if (result.questionFp) {
                lastQuestionFp = result.questionFp;
                lastQuestionAt = Date.now();
              }
              if (meetingState && !(result.earlySpoken && text === (result.fullAnswer || text))) {
                appendSession(meetingState.meetingId, {
                  speaker: "大智",
                  text: result.earlySpoken ? text : result.fullAnswer || text,
                  mode: meetingState.mode,
                  segmentId: meetingState.segmentId
                });
              }
            }
          } else {
            debugLog.warn("Strategy", "半双工 SPEAKING 跳过非唤起播报", {
              phase: listen.phase,
              reason: result.reason,
              text: text.slice(0, 60)
            });
            speakResult = { ok: false, error: "half_duplex_hold", suppressed: true };
            result.suppressed = true;
          }
        } else if (listen.isInHold() && result.reason === "SILENCE") {
          debugLog.warn("Strategy", "回灌 hold 内跳过冷场", {
            reason: result.reason,
            text: text.slice(0, 60)
          });
          speakResult = { ok: false, error: "half_duplex_hold", suppressed: true };
          result.suppressed = true;
        } else if (listen.isInCooldown() && result.reason === "SILENCE") {
          debugLog.warn("Strategy", "COOLDOWN 内跳过冷场插话", {
            reason: result.reason,
            text: text.slice(0, 60)
          });
          speakResult = { ok: false, error: "cooldown", suppressed: true };
          result.suppressed = true;
        } else if (
          (result.reason === "WAKE_ANSWER" ||
            result.reason === "BIZ_ANSWER" ||
            result.reason === "SUMMARY") &&
          since < WAKE_COOLDOWN_MS &&
          (echoHit.echo || isIntroSelfTalk(text)) &&
          !result.earlyCovered &&
          // FAQ/缓存新答常含「四端/全园美语」，faq-theme 会误杀；lcs/复读仍抑制
          !(
            result.reason === "WAKE_ANSWER" &&
            (result.arkMode === "faq" || result.arkMode === "cache") &&
            echoHit?.reason === "faq-theme"
          )
        ) {
          debugLog.warn("Strategy", "抑制重复自语/回灌唤起", {
            reason: result.reason,
            sinceMs: since,
            echo: echoHit,
            text: text.slice(0, 80)
          });
          speakResult = { ok: false, error: "echo_suppressed", suppressed: true };
          result.suppressed = true;
        } else if (!listen.isOpen()) {
          debugLog.warn("Strategy", "需要发言但 Duplex 未连接，跳过 TTS", {
            text: text.slice(0, 80)
          });
          speakResult = { ok: false, error: "not_open" };
        } else {
          if (listen.expectingSpeak) {
            debugLog.info("Strategy", "Host 正在播报，干预话术排队", {
              text: text.slice(0, 80)
            });
          }
          speakResult = listen.speakText(text);
          if (speakResult?.ok || speakResult?.queued) {
            lastHostSpeakAt = Date.now();
            lastHostSpeakText = result.fullAnswer || text;
            if (result.questionFp) {
              lastQuestionFp = result.questionFp;
              lastQuestionAt = Date.now();
            }
            if (meetingState && !(result.earlySpoken && !text)) {
              appendSession(meetingState.meetingId, {
                speaker: "大智",
                text: result.earlySpoken ? text : result.fullAnswer || text,
                mode: meetingState.mode,
                segmentId: meetingState.segmentId
              });
            }
          }
          debugLog.info("Strategy", "触发 Host 语音进虚拟麦", {
            text,
            listenOpen: true,
            speakRes: speakResult,
            phase: listen.phase
          });
        }
      } else if (result.shouldIntervene && result.earlyCovered && !result.interventionText) {
        speakResult = { ok: true, earlyOnly: true };
        if (meetingState && result.fullAnswer && !result.earlySpoken) {
          appendSession(meetingState.meetingId, {
            speaker: "大智",
            text: result.fullAnswer,
            mode: meetingState.mode,
            segmentId: meetingState.segmentId
          });
        }
      } else if (result.shouldIntervene && !listen) {
        debugLog.warn("Strategy", "需要干预但听会通道未启动，无法 TTS（请先点启动听会）");
        speakResult = { ok: false, error: "listen_not_started" };
      } else if (result.shouldIntervene && listen && !listen.isOpen()) {
        debugLog.warn("Strategy", "需要干预但 Duplex 未连接，等待重连后再试播");
        speakResult = { ok: false, error: "not_open" };
      }

      if (result.bizPlan?.steps?.length) {
        emitUi({
          type: "biz-plan",
          tts: result.bizPlan.tts,
          analysis: result.bizPlan.analysis || "",
          steps: result.bizPlan.steps,
          risks: result.bizPlan.risks || [],
          cite: result.bizPlan.cite || [],
          tier: result.bizTier || null,
          arkMode: result.arkMode || null,
          reason: result.reason
        });
      }

      // P2：会议开始 — 清主上下文 + warm 知识库；开场白后生命周期 → SILENT
      if (result.clearMainContext || result.reason === "MEETING_START") {
        clearMainSpeakContext();
        if (listen?.interruptBuffer) listen.interruptBuffer = null;
        try {
          if (meetingState?.meetingId) clearMeetingCache(meetingState.meetingId);
        } catch (_) {}
      }
      if (result.warmKnowledge) {
        try {
          warmIndexFromDisk();
          debugLog.info("Strategy", "会议开始：已 warm 知识索引");
        } catch (err) {
          debugLog.warn("Strategy", "warm 知识索引失败", { error: String(err?.message || err) });
        }
      }
      if (result.reason === "MEETING_START" && meetingState) {
        // 开场白播完后标静默（短延迟，避免 UI 闪「未开会」）
        setTimeout(() => {
          if (meetingState && meetingState.lifecycle === MEETING_LIFE.OPENING) {
            setLifecycle(meetingState, MEETING_LIFE.SILENT);
            emitInteractionMode();
          }
        }, Math.min(12000, Math.max(3500, String(result.interventionText || "").length * 180)));
      }

      // P2：会议结束 — 沉淀 + 收尾后关 Duplex
      if (result.requestSessionPromote && result.meetingId) {
        const promoteDelay = result.requestListenStop ? 2500 : 400;
        setTimeout(() => promoteMeetingSession(result.meetingId, { summary: true }), promoteDelay);
      }
      if (result.requestListenStop) {
        const closeMs = Math.min(
          22000,
          Math.max(6000, String(result.interventionText || result.fullAnswer || "").length * 200 + 2500)
        );
        const closingId = result.meetingId || meetingState?.meetingId;
        debugLog.info("Strategy", "会末收尾后将停止听会", { closeMs, meetingId: closingId });
        emitUi({
          type: "meeting-closing",
          meetingId: closingId,
          closeInMs: closeMs,
          summaryMarkdown: result.summaryMarkdown || null,
          closing: result.closing || null
        });
        setTimeout(() => {
          debugLog.info("Listen", "会末自动停止听会", { meetingId: closingId });
          if (strategyAbort) {
            try {
              strategyAbort.abort();
            } catch (_) {}
            strategyAbort = null;
          }
          listen?.close();
          listen = null;
          listenStartedAt = 0;
          if (meetingState) {
            setLifecycle(meetingState, MEETING_LIFE.OFF);
            meetingState.meetingOpen = false;
          }
          emitUi({ type: "meeting-ended", meetingId: closingId });
          emitInteractionMode();
          meetingState = null;
        }, closeMs);
      }

      emitInteractionMode();

      const life = deriveMeetingLife(meetingState, {
        holdListening: Boolean(result.holdToEnd || meetingState?.holdToEnd)
      });
      return {
        ok: true,
        result,
        speakResult,
        duplex: {
          phase: listen?.phase || PHASE.IDLE,
          holdUntil: listen?.holdUntil || 0,
          cooldownUntil: listen?.cooldownUntil || 0
        },
        agent: {
          mode: meetingState?.mode || null,
          label: meetingState ? MODE_LABEL[meetingState.mode] : null,
          lifecycle: result.meetingLifecycle || life,
          lifeLabel: LIFE_LABEL[result.meetingLifecycle || life] || life,
          meetingId: meetingState?.meetingId || result.meetingId || null,
          segmentId: meetingState?.segmentId || null,
          meetingOpen: Boolean(meetingState?.meetingOpen)
        }
      };
    } catch (err) {
      emitUi({ type: "strategy-status", phase: "idle" });
      debugLog.error("Strategy", "巡检异常", debugLog.normalizeError(err));
      return { ok: false, error: String(err?.message || err) };
    } finally {
      if (strategyAbort === thisAbort) strategyAbort = null;
    }
  };
  ipcMain.handle("strategy:evaluate", handleStrategyEvaluate);

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
