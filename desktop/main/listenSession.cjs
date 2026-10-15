/**
 * Seeduplex 听会会话：连接、ASR、TTS、打断与重连。
 * - HOST_ASR_MODE=independent + HOST_TTS_MODE=independent：只开独立 ASR/TTS，不依赖 Dialog。
 * - 否则走 Seeduplex 3.0 全双工（JSON）：X-Api-Key + Connect-Id，model=1.2.6.1。
 * 鉴权失败（4xx / 45000030）禁止自动重连。
 */
const { randomUUID } = require("crypto");
const WebSocket = require("ws");
const { debugLog } = require("../lib/platform");
const { PHASE, COOLDOWN_MS, estimateHoldMs } = require("../lib/duplex");
const { detectMeetingCommand, looksLikeBargeInCommand } = require("../lib/meetingSession");
const { synthesizeHostTts, hostTtsMode, ttsSampleRate } = require("../lib/tts/hostTts.cjs");
const { HostAsrSession, hostAsrMode, asrResourceId } = require("../lib/asr/hostAsr.cjs");

const DUPLEX_URL_DEFAULT = "wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue";
/** 文档规定的公共 App-Key（不是个人 API Key） */
const DUPLEX_APP_KEY = "PlgvMymc7f3tQnJ6";
const DUPLEX_RESOURCE_ID = "volc.speech.dialog";
/** Seeduplex 3.0 全双工默认；可用 DOUBAO_DUPLEX_MODEL 覆盖 */
const DUPLEX_MODEL_DEFAULT = "1.2.6.1";

function duplexUrl() {
  return (process.env.DOUBAO_DUPLEX_WS_URL || DUPLEX_URL_DEFAULT).trim() || DUPLEX_URL_DEFAULT;
}
const RECONNECT_BASE_MS = 1500;
const RECONNECT_MAX_MS = 20000;
const RECONNECT_MAX_ATTEMPTS = 12;
/** 200ms 静音 PCM（16kHz s16le mono），SPEAKING/COOLDOWN 保活避免 52000033 */
const SILENCE_PCM_B64 = Buffer.alloc(16000 * 0.2 * 2).toString("base64");

const LISTEN_INSTRUCTIONS = `你是会议听写与控场播报通道。
规则：
1. 默认只听写用户音频，不要主动闲聊、复述或寒暄。
2. 收到 speech_text_buffer.commit / replacement 时必须立刻按原文合成并播放，不得拒绝、改写为空或改口。
3. 未收到上述指令时禁止自由对话。`;

/** Seeduplex ASR 热词 + 替换词（需 enable_asr_twopass） */
const ASR_HOTWORDS = [
  { word: "大智" },
  { word: "全园美语" },
  { word: "四端联动" },
  { word: "一园两制" },
  { word: "三笔账" },
  { word: "菲教" },
  { word: "非教" },
  { word: "ABCmouse" },
  { word: "Teacher说" },
  { word: "Family说" },
  { word: "AI测评" },
  { word: "样板班" },
  { word: "收益保障" },
  { word: "家园共育" }
];

const ASR_CORRECT_WORDS = {
  大致: "大智",
  大志: "大智",
  大制: "大智",
  达智: "大智",
  梅雨: "美语",
  美蚁: "美语",
  全员美语: "全园美语",
  全员美育: "全园美语",
  签约美语: "全园美语",
  田园美语: "全园美语",
  一元两制: "一园两制",
  一圆两制: "一园两制",
  样板单: "样板班",
  非叫: "非教",
  家园共浴: "家园共育",
  椭圆: "我园",
  圆开设: "园开设",
  营收以成本: "营收与成本"
};

function speechApiKey() {
  return (process.env.DOUBAO_SPEECH_API_KEY || process.env.DOUBAO_REALTIME_API_KEY || "").trim();
}

function speechAppId() {
  const id = (process.env.DOUBAO_SPEECH_APP_ID || process.env.DOUBAO_APP_ID || "").trim();
  // 填项目名 default 易触发 45000030；须用控制台数字 AppID
  return id || "default";
}

function duplexModel() {
  const raw = (process.env.DOUBAO_DUPLEX_MODEL || DUPLEX_MODEL_DEFAULT).trim();
  // 仅拦截明显失效别名；1.2.6.x 留给 E2 探测（社区全双工默认）
  if (/^(phone-omni-chat2|omni-chat|doubao-omni)$/i.test(raw)) {
    debugLog.warn("Duplex", "DOUBAO_DUPLEX_MODEL 别名已失效，改用 O2.0", {
      from: raw,
      to: DUPLEX_MODEL_DEFAULT
    });
    return DUPLEX_MODEL_DEFAULT;
  }
  if (/^1\.2\.6\./.test(raw)) {
    debugLog.info("Duplex", "E2 使用全双工社区 model", { model: raw });
  }
  return raw || DUPLEX_MODEL_DEFAULT;
}

function duplexVoice() {
  return (process.env.DOUBAO_DUPLEX_VOICE || "zh_female_vv_jupiter_bigtts").trim();
}

/** 独立听写 + 独立播报：不需要 Dialog / Seeduplex */
function useIndependentListenOnly() {
  return hostAsrMode() === "independent" && hostTtsMode() === "independent";
}

/**
 * Seeduplex 3.0 全双工：新版控制台以 X-Api-Key 为主。
 * App-ID 仅作兼容；旧版 Access-Key + Resource + 固定 App-Key 在网关要求时一并带上。
 */
function duplexHandshakeHeaders(apiKey) {
  const connectId = randomUUID();
  const appId = speechAppId();
  if (!/^\d{6,}$/.test(appId)) {
    debugLog.warn("Duplex", "X-Api-App-ID 建议为数字 AppID", { appId });
  }
  const headers = {
    "X-Api-Key": apiKey,
    "X-Api-Connect-Id": connectId,
    "X-Api-Access-Key": apiKey,
    "X-Api-Resource-Id": DUPLEX_RESOURCE_ID,
    "X-Api-App-Key": DUPLEX_APP_KEY
  };
  if (/^\d{6,}$/.test(appId)) {
    headers["X-Api-App-ID"] = appId;
    headers["X-Api-App-Id"] = appId;
  }
  return { headers, connectId };
}

function maskKey(k) {
  if (!k) return "(empty)";
  if (k.length < 8) return "***";
  return `****${k.slice(-4)} (len=${k.length})`;
}

function isAuthForbidden(status, body) {
  const code = Number(status) || 0;
  if (code === 401 || code === 403) return true;
  return /45000030|Forbidden|not granted|requested resource/i.test(String(body || ""));
}

/** 启动听会时打印配置自检（Key 只留末 4 位） */
function logSpeechConfigSelfCheck(tag = "Listen") {
  const apiKey = speechApiKey();
  debugLog.info(tag, "语音通道配置自检", {
    appId: speechAppId() || "(empty)",
    apiKeyTail: maskKey(apiKey),
    duplexUrl: duplexUrl(),
    duplexModel: duplexModel(),
    asrMode: hostAsrMode(),
    ttsMode: hostTtsMode(),
    independentOnly: useIndependentListenOnly()
  });
}

function extractErrMsg(payload) {
  if (payload == null) return "";
  if (typeof payload === "string") return payload;
  if (payload instanceof Error) return payload.message;
  if (typeof payload === "object") {
    const parts = [
      payload.message,
      payload.error,
      payload.code,
      payload.error_code,
      payload.BigASRFailedCode,
      payload.msg,
      payload.reason
    ]
      .filter((x) => x != null && x !== "")
      .map(String);
    if (parts.length) return parts.join(" | ");
    try {
      return JSON.stringify(payload).slice(0, 500);
    } catch {
      return String(payload);
    }
  }
  return String(payload);
}

class ListenSession {
  constructor(win) {
    this.win = win;
    this.upstream = null;
    this.sessionId = null;
    this.expectingSpeak = false;
    this.audioChunksIn = 0;
    this.ttsChunksOut = 0;
    this.lastAudioLogAt = 0;
    this.intentionalClose = false;
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
    this.connectedOnce = false;
    this.socketGeneration = 0;
    this.asrStartedAt = 0;
    this.asrStartedCount = 0;
    this.asrFinalCount = 0;
    this.asrStallTimer = null;
    this.pauseUplink = false;
    this.speakSentAt = 0;
    this.currentSpeakText = "";
    this.pendingSpeak = null;
    this.speakRetry = 0;
    this.ttsWatchTimer = null;
    this.speakGeneration = 0;
    this.protocolFatal = false;
    this.uplinkHoldTimer = null;
    this.phase = PHASE.IDLE;
    this.holdUntil = 0;
    this.cooldownUntil = 0;
    this.listenStartedAt = 0;
    /** Phase 0：下行观测 */
    this.downlinkTotal = 0;
    this.speakDownlinkCount = 0;
    this.speakDownlinkTypes = [];
    /** @type {AbortController | null} */
    this.hostTtsAbort = null;
    /** @type {HostAsrSession | null} */
    this.hostAsr = null;
    this.asrHealthTimer = null;
    this.lastDialogAsrAt = 0;
    /** independent | dialog；握手失败可降级为 dialog */
    this.asrModeEffective = hostAsrMode();
    this.asrDegraded = false;
    /** @type {{ fullText: string, interruptedAt: number, chunks: number, reason?: string } | null} */
    this.interruptBuffer = null;
    this.keepaliveTimer = null;
    this.queuedSpeakTimer = null;
    /** 独立听会已就绪（无 Dialog socket） */
    this.listenActive = false;
    /** 鉴权/参数类错误：禁止自动重连 */
    this.authFatal = false;
  }

  scheduleQueuedSpeak(waitMs) {
    if (this.queuedSpeakTimer) clearTimeout(this.queuedSpeakTimer);
    const wait = Math.max(200, waitMs || 200);
    this.queuedSpeakTimer = setTimeout(() => {
      this.queuedSpeakTimer = null;
      const next = this.pendingSpeak;
      this.pendingSpeak = null;
      if (!next || !this.isOpen() || this.intentionalClose) return;
      debugLog.info("HostSpeak", "排队话术开始播放", { wait, text: next.slice(0, 80) });
      this.speakText(next, { fromQueue: true });
    }, wait);
  }

  /** SPEAKING 保留真实麦；仅 COOLDOWN / 回灌 hold 用静音帧保活 */
  isUplinkMuted() {
    const speaking = this.expectingSpeak || this.phase === PHASE.SPEAKING;
    if (speaking) return false;
    return (
      this.phase === PHASE.COOLDOWN ||
      this.pauseUplink ||
      Date.now() < (this.holdUntil || 0)
    );
  }

  startKeepalive() {
    if (this.keepaliveTimer) return;
    this.keepaliveTimer = setInterval(() => {
      if (this.intentionalClose) return;
      const muted = this.isUplinkMuted();
      // Duplex：COOLDOWN/hold 挡真实麦时用静音保活，避免 52000033（须真有 upstream）
      if (this.upstream?.readyState === WebSocket.OPEN && muted) {
        this.send({ type: "input_audio_buffer.append", audio: SILENCE_PCM_B64 });
      }
      // HostAsr：同上窗口必须持续有包，停喂会刷 45000081
      if (
        muted &&
        this.hostAsr?.isOpen?.() &&
        this.getAsrMode() === "independent"
      ) {
        this.hostAsr.appendPcmBase64(SILENCE_PCM_B64);
      }
    }, 200);
  }

  stopKeepalive() {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  setPhase(phase, meta = {}) {
    const prev = this.phase;
    this.phase = phase;
    debugLog.info("DuplexPhase", `${prev} → ${phase}`, {
      holdUntilIn: this.holdUntil ? Math.max(0, this.holdUntil - Date.now()) : 0,
      cooldownUntilIn: this.cooldownUntil ? Math.max(0, this.cooldownUntil - Date.now()) : 0,
      ...meta
    });
    this.emit({
      type: "duplex-phase",
      phase,
      prev,
      holdUntil: this.holdUntil,
      cooldownUntil: this.cooldownUntil,
      ...meta
    });
  }

  isInHold() {
    return Date.now() < (this.holdUntil || 0) || this.phase === PHASE.SPEAKING;
  }

  isInCooldown() {
    return Date.now() < (this.cooldownUntil || 0) || this.phase === PHASE.COOLDOWN;
  }

  isOpen() {
    if (this.upstream && this.upstream.readyState === WebSocket.OPEN) return true;
    // 独立 ASR+TTS：听会不依赖 Dialog socket
    return Boolean(this.listenActive && useIndependentListenOnly());
  }

  /** 运行时听写模式（可因 HostAsr 握手失败降级为 dialog） */
  getAsrMode() {
    return this.asrModeEffective || hostAsrMode();
  }

  degradeAsrToDialog(reason, detail = {}) {
    if (this.asrModeEffective === "dialog" && this.asrDegraded) return;
    this.asrModeEffective = "dialog";
    this.asrDegraded = true;
    if (this.hostAsr) {
      try {
        this.hostAsr.close();
      } catch (_) {}
      this.hostAsr = null;
    }
    debugLog.error("HostAsr", "独立听写不可用，已降级 dialog", {
      reason,
      ...detail
    });
    this.emit({
      type: "asr-degraded",
      reason,
      mode: "dialog",
      ...detail
    });
  }

  emit(msg) {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send("bridge:event", msg);
    }
  }

  /** Phase 0：TTS 等待窗内抬高下行可见性 */
  noteDownlink(kind, raw, extra = {}) {
    let type = extra.type || "";
    if (!type && raw) {
      try {
        type = JSON.parse(raw)?.type || "";
      } catch (_) {
        type = "(parse-fail)";
      }
    }
    if (this.expectingSpeak) {
      this.speakDownlinkCount += 1;
      if (type) this.speakDownlinkTypes.push(type);
      debugLog.info("Duplex", "TTS窗下行", {
        n: this.speakDownlinkCount,
        kind,
        type: type || "(none)",
        preview: raw ? String(raw).slice(0, 200) : undefined,
        ...extra
      });
    } else if (type && type !== "session.created") {
      debugLog.debug("Duplex", "下行", {
        kind,
        type,
        total: this.downlinkTotal,
        preview: raw ? String(raw).slice(0, 120) : undefined,
        ...extra
      });
    }
  }

  send(payload) {
    // 独立听会 isOpen() 可为 true，但 Duplex socket 不存在，禁止对 null 调 send
    const duplexOpen = this.upstream && this.upstream.readyState === WebSocket.OPEN;
    if (duplexOpen) {
      this.upstream.send(JSON.stringify(payload));
      if (payload?.type && payload.type !== "input_audio_buffer.append") {
        debugLog.debug("Duplex", "upstream send", { type: payload.type });
      }
      return true;
    }
    // PCM 上行在断线时很吵，限流；其它类型每次都记
    const isAppend = payload?.type === "input_audio_buffer.append";
    debugLog.warn(
      "Duplex",
      "send skipped — socket not open",
      {
        type: payload?.type,
        readyState: this.upstream?.readyState ?? null,
        reconnectAttempt: this.reconnectAttempt
      },
      isAppend ? { rateKey: "send-skip-append", rateMs: 8000 } : undefined
    );
    return false;
  }

  scheduleReconnect(reason) {
    if (this.intentionalClose) return;
    if (this.authFatal) {
      debugLog.error("Duplex", "鉴权/参数错误，跳过自动重连", {
        reason: String(reason || ""),
        hint: "核对 DOUBAO_SPEECH_APP_ID 与 API Key 是否同一应用，且已开通 volc.speech.dialog"
      });
      return;
    }
    if (this.reconnectTimer) return;
    if (this.reconnectAttempt >= RECONNECT_MAX_ATTEMPTS) {
      debugLog.error("Duplex", "重连次数用尽，请手动重新启动听会", {
        attempts: this.reconnectAttempt,
        reason
      });
      this.emit({
        type: "reconnect-failed",
        attempts: this.reconnectAttempt,
        reason: String(reason || "")
      });
      return;
    }

    const attempt = this.reconnectAttempt + 1;
    const delay = Math.min(RECONNECT_BASE_MS * Math.pow(1.6, attempt - 1), RECONNECT_MAX_MS);
    this.reconnectAttempt = attempt;
    debugLog.warn("Duplex", "计划自动重连", { attempt, delayMs: Math.round(delay), reason });
    this.emit({
      type: "reconnecting",
      attempt,
      delayMs: Math.round(delay),
      reason: String(reason || "")
    });

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.intentionalClose) return;
      debugLog.info("Duplex", "开始自动重连", { attempt: this.reconnectAttempt });
      const ok = await this.connect({ isReconnect: true });
      if (ok) {
        debugLog.info("Duplex", "自动重连成功", { attempt: this.reconnectAttempt, sessionId: this.sessionId });
        this.reconnectAttempt = 0;
        this.emit({ type: "reconnected", sessionId: this.sessionId || "" });
        // 重连后：仅在无协议致命错误时恢复话术
        if (this.protocolFatal) {
          debugLog.warn("HostSpeak", "协议曾报未知事件，跳过自动恢复 TTS（请确认未再发送非法 event）");
          this.pendingSpeak = null;
          this.currentSpeakText = "";
          this.expectingSpeak = false;
          this.pauseUplink = false;
          this.protocolFatal = false;
        } else {
          const resume = this.pendingSpeak || (this.expectingSpeak ? this.currentSpeakText : null);
          if (resume) {
            this.expectingSpeak = false;
            this.pendingSpeak = null;
            setTimeout(() => {
              if (!this.isOpen() || this.intentionalClose) return;
              debugLog.info("HostSpeak", "重连后恢复 TTS", { text: resume.slice(0, 80) });
              this.speakText(resume, { isRetry: true, retry: Math.min(this.speakRetry + 1, 2) });
            }, 800);
          }
        }
      } else if (!this.intentionalClose) {
        this.scheduleReconnect("reconnect-failed");
      }
    }, delay);
  }

  /**
   * @param {{ isReconnect?: boolean }} [opts]
   */
  async connect(opts = {}) {
    logSpeechConfigSelfCheck("Listen");
    const apiKey = speechApiKey();
    if (!apiKey) {
      debugLog.error("Duplex", "缺少语音 API Key");
      this.emit({
        type: "listen-ready",
        ok: false,
        error: "缺少 DOUBAO_SPEECH_API_KEY（语音 ASR/TTS）。控场推理可用 Ark，但听会需要语音 Key。"
      });
      return false;
    }

    // 独立听写 + 独立播报：不建 Dialog，避免 volc.speech.dialog 未开通向整条链路
    if (useIndependentListenOnly() && !opts.isReconnect) {
      return this.connectIndependentOnly();
    }

    return this.connectDuplex(opts);
  }

  /** 仅独立 ASR（SAUC）+ 独立 TTS（HTTP），听会不依赖 Seeduplex */
  async connectIndependentOnly() {
    this.authFatal = false;
    this.listenActive = false;
    this.asrModeEffective = "independent";
    this.asrDegraded = false;
    this.sessionId = `ind_${Date.now().toString(36)}`;
    debugLog.info("Listen", "独立听会模式（跳过 Dialog / Seeduplex）", {
      asrMode: hostAsrMode(),
      ttsMode: hostTtsMode(),
      sessionId: this.sessionId
    });
    await this.ensureHostAsr();
    const asrOk = Boolean(this.hostAsr?.isOpen?.());
    if (!asrOk) {
      this.listenActive = false;
      this.sessionId = null;
      this.emit({
        type: "listen-ready",
        ok: false,
        error: "独立 ASR 握手失败。请核对 DOUBAO_ASR_API_KEY / DOUBAO_SPEECH_API_KEY 与 AppID。"
      });
      return false;
    }
    this.listenActive = true;
    this.connectedOnce = true;
    this.startKeepalive();
    this.startAsrHealthLog();
    this.emit({ type: "listen-ready", ok: true, sessionId: this.sessionId, mode: "independent" });
    debugLog.info("Listen", "独立听会就绪", { sessionId: this.sessionId });
    return true;
  }

  /**
   * @param {{ isReconnect?: boolean }} [opts]
   */
  connectDuplex(opts = {}) {
    const apiKey = speechApiKey();
    this.authFatal = false;
    this.listenActive = false;

    // 清掉旧 socket，避免双连接
    if (this.upstream) {
      try {
        this.upstream.removeAllListeners();
        if (this.upstream.readyState === WebSocket.OPEN) this.upstream.close();
      } catch (_) {}
      this.upstream = null;
    }

    const gen = ++this.socketGeneration;
    const model = duplexModel();
    const voice = duplexVoice();
    const { headers, connectId } = duplexHandshakeHeaders(apiKey);
    debugLog.info("Duplex", opts.isReconnect ? "重连 Seeduplex" : "开始连接 Seeduplex 听写通道", {
      url: duplexUrl(),
      key: maskKey(apiKey),
      appId: speechAppId(),
      resourceId: DUPLEX_RESOURCE_ID,
      connectId,
      model,
      voice,
      generation: gen,
      isReconnect: !!opts.isReconnect
    });

    return new Promise((resolve) => {
      const upstream = new WebSocket(duplexUrl(), { headers });
      this.upstream = upstream;
      let settled = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        debugLog.info("Duplex", ok ? "连接流程结束: OK" : "连接流程结束: FAIL", {
          generation: gen,
          sessionId: this.sessionId,
          connectId
        });
        resolve(ok);
      };

      upstream.on("unexpected-response", (_req, res) => {
        if (gen !== this.socketGeneration) return;
        const chunks = [];
        res.on("data", (c) => chunks.push(Buffer.from(c)));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8").slice(0, 400);
          const logId =
            res.headers?.["x-tt-logid"] ||
            res.headers?.["X-Tt-Logid"] ||
            res.headers?.["x-tt-logId"] ||
            "";
          const authFail = isAuthForbidden(res.statusCode, body);
          if (authFail) this.authFatal = true;
          debugLog.error("Duplex", "握手 unexpected-response", {
            status: res.statusCode,
            body,
            logId,
            connectId,
            appId: speechAppId(),
            resourceId: DUPLEX_RESOURCE_ID,
            authFatal: authFail,
            hint: authFail
              ? "核对 AppID 与 API Key 是否同一应用，且已开通端到端实时语音（volc.speech.dialog）；刚开通请等 2~3 分钟"
              : undefined
          });
          this.emit({
            type: "listen-ready",
            ok: false,
            error: `Dialog 握手失败 HTTP ${res.statusCode} ${body}${logId ? ` logid=${logId}` : ""}`
          });
          done(false);
        });
      });

      upstream.on("open", () => {
        if (gen !== this.socketGeneration) return;
        const eventId = randomUUID();
        debugLog.info("Duplex", "WebSocket open，发送 session.create", {
          generation: gen,
          connectId,
          model,
          eventId
        });
        this.send({
          type: "session.create",
          event_id: eventId,
          session: {
            model,
            instructions: LISTEN_INSTRUCTIONS,
            audio: {
              input: { format: { type: "pcm", rate: 16000 } },
              output: {
                format: { type: "pcm_s16le", rate: 24000 },
                voice
              }
            }
          },
          extension: {
            asr: {
              audio_info: { format: "pcm", sample_rate: 16000, channel: 1 },
              extra: {
                enable_asr_twopass: true,
                context: {
                  hotwords: ASR_HOTWORDS,
                  correct_words: ASR_CORRECT_WORDS
                }
              }
            },
            tts: {
              speaker: voice,
              audio_config: { format: "pcm_s16le", sample_rate: 24000, channel: 1 }
            },
            dialog: {
              bot_name: "大智",
              extra: { model }
            }
          }
        });
      });

      upstream.on("message", (data) => {
        if (gen !== this.socketGeneration) return;
        this.downlinkTotal += 1;
        if (Buffer.isBuffer(data)) {
          const asText = data.toString("utf8");
          if (asText.startsWith("{") || asText.startsWith("[")) {
            this.noteDownlink("json-buffer", asText);
            this.handle(asText);
          } else {
            const msgType = data.length > 1 ? (data[1] >> 4) & 0x0f : -1;
            this.noteDownlink("binary", null, { bytes: data.length, msgType });
            debugLog.warn("Duplex", "收到非 JSON 二进制下行", {
              bytes: data.length,
              msgType,
              expectingSpeak: this.expectingSpeak
            });
          }
        } else {
          const s = String(data);
          this.noteDownlink("text", s);
          this.handle(s);
        }
        if (this.sessionId) {
          this.connectedOnce = true;
          done(true);
        }
      });

      upstream.on("error", (err) => {
        if (gen !== this.socketGeneration) return;
        debugLog.error("Duplex", "socket error", debugLog.normalizeError(err));
        this.emit({ type: "error", message: extractErrMsg(err) });
        done(false);
      });

      upstream.on("close", (code, reasonBuf) => {
        if (gen !== this.socketGeneration) return;
        const reason = Buffer.isBuffer(reasonBuf)
          ? reasonBuf.toString("utf8")
          : String(reasonBuf || "");
        debugLog.warn("Duplex", "socket closed", {
          code,
          reason,
          intentional: this.intentionalClose,
          connectedOnce: this.connectedOnce,
          audioChunksIn: this.audioChunksIn
        });
        this.upstream = null;
        this.sessionId = null;
        this.emit({ type: "closed", code, reason });
        done(false);
        if (!this.intentionalClose && !this.authFatal) {
          this.scheduleReconnect(`close code=${code} ${reason}`.trim());
        }
      });

      setTimeout(() => {
        if (gen !== this.socketGeneration) return;
        if (!settled && upstream.readyState === WebSocket.OPEN) {
          debugLog.warn("Duplex", "5s 超时但 socket 仍 open，按半就绪处理", {
            sessionId: this.sessionId
          });
          this.emit({ type: "listen-ready", ok: true, sessionId: this.sessionId || "" });
          done(true);
        } else if (!settled) {
          debugLog.error("Duplex", "5s 内未建立会话");
          done(false);
        }
      }, 5000);
    });
  }

  handle(raw) {
    let evt;
    try {
      evt = JSON.parse(raw);
    } catch {
      debugLog.warn("Duplex", "非 JSON 上行消息", { preview: String(raw).slice(0, 120) });
      return;
    }
    const type = evt.type || "";

    if (type === "session.created") {
      this.sessionId = evt.session?.id || evt.id || null;
      this.asrModeEffective = hostAsrMode();
      this.asrDegraded = false;
      debugLog.info("Duplex", "session.created", {
        sessionId: this.sessionId,
        asrMode: this.getAsrMode(),
        ttsMode: hostTtsMode(),
        duplexModel: duplexModel()
      });
      this.startKeepalive();
      this.startAsrHealthLog();
      void this.ensureHostAsr();
      this.emit({ type: "listen-ready", ok: true, sessionId: this.sessionId || "" });
      return;
    }

    if (
      type === "conversation.item.input_audio_transcription.delta" ||
      type === "conversation.item.input_audio_transcription.completed"
    ) {
      const text = evt.delta || evt.transcript || evt.text || "";
      if (text) {
        const final = type.endsWith("completed");
        this.lastDialogAsrAt = Date.now();
        if (final) {
          this.asrFinalCount += 1;
          this.asrStartedAt = 0;
          if (this.asrStallTimer) {
            clearTimeout(this.asrStallTimer);
            this.asrStallTimer = null;
          }
          debugLog.info("ASR", "dialog final", {
            text: String(text).slice(0, 200),
            total: this.asrFinalCount,
            mode: this.getAsrMode()
          });
        } else if (this.asrStartedCount % 12 === 0) {
          debugLog.debug("ASR", "dialog delta", { text: String(text).slice(0, 80) });
        }
        // independent 模式：会场转写走 HostAsr，dialog 仅观测；播报中 barge-in 仍可短路
        if (this.getAsrMode() === "independent") {
          if (final) {
            const speaking = this.expectingSpeak || this.phase === PHASE.SPEAKING;
            const t = String(text);
            if (speaking && looksLikeBargeInCommand(t)) {
              this.handleBargeInAsr(t, "dialog");
            }
          }
          return;
        }
        this.emitDialogAsr(String(text), final);
      }
      return;
    }

    if (type === "conversation.item.input_audio_transcription.started") {
      this.asrStartedCount += 1;
      this.asrStartedAt = Date.now();
      this.lastDialogAsrAt = Date.now();
      debugLog.info("DuplexASR", "transcription.started", {
        started: this.asrStartedCount,
        finals: this.asrFinalCount,
        mode: this.getAsrMode()
      });
      if (this.asrStallTimer) {
        clearTimeout(this.asrStallTimer);
        this.asrStallTimer = null;
      }
      // Host 播报 / 回灌窗内的 started 多为自语或噪声，不启动 stall 告警
      if (this.expectingSpeak || this.isInHold() || this.phase === PHASE.SPEAKING) {
        debugLog.debug("ASR", "播报/hold 内忽略 stall 计时", {
          phase: this.phase,
          expectingSpeak: this.expectingSpeak
        });
        return;
      }
      this.asrStallTimer = setTimeout(() => {
        if (!this.asrStartedAt) return;
        if (Date.now() - this.asrStartedAt < 11000) return;
        // 仍在播报/hold：不告警
        if (this.expectingSpeak || this.isInHold() || this.phase === PHASE.SPEAKING) {
          this.asrStartedAt = 0;
          return;
        }
        const healthy = this.asrFinalCount > 0 || (this.hostAsr && this.hostAsr.finals > 0);
        debugLog.info("ASR", "识别开始后未完成", {
          started: this.asrStartedCount,
          finals: this.asrFinalCount,
          hostAsrFinals: this.hostAsr?.finals || 0,
          ageMs: Date.now() - this.asrStartedAt,
          healthy,
          mode: this.getAsrMode()
        });
        this.emit({
          type: "asr-stalled",
          started: this.asrStartedCount,
          finals: this.asrFinalCount,
          healthy
        });
        this.asrStartedAt = 0;
      }, 12000);
      return;
    }

    if (
      type === "response.created" ||
      type === "response.output_text.delta" ||
      type === "response.output_audio.delta" ||
      type === "response.output_text.done" ||
      type === "response.output_audio.done" ||
      type === "response.output_audio.started"
    ) {
      if (!this.expectingSpeak) {
        // P1：只对 response.created 取消一次，避免每个 audio.delta 反复 cancel 风暴
        if (type === "response.created") {
          debugLog.debug("Duplex", "取消自由对话响应", { type });
          this.send({ type: "response.cancel" });
        }
        return;
      }
      if (type === "response.output_audio.delta") {
        const audio = evt.delta || evt.audio || "";
        if (audio) {
          this.ttsChunksOut += 1;
          if (this.ttsChunksOut === 1) {
            this.clearTtsWatch();
            debugLog.info("TTS", "首包语音已到，开始进虚拟麦", {
              b64len: String(audio).length,
              text: (this.currentSpeakText || "").slice(0, 60)
            });
            this.emit({ type: "tts-started", text: this.currentSpeakText });
          } else if (this.ttsChunksOut % 20 === 0) {
            debugLog.info("TTS", "收到语音分片", {
              chunks: this.ttsChunksOut,
              b64len: String(audio).length
            });
          }
          this.emit({ type: "tts-audio", audio: String(audio) });
        }
      }
      if (type === "response.output_text.delta" && evt.delta) {
        debugLog.debug("TTS", "text delta", { text: String(evt.delta).slice(0, 80) });
        this.emit({ type: "tts-text", text: String(evt.delta) });
      }
      return;
    }

    if (type === "response.done" || type === "response.canceled") {
      debugLog.info("Duplex", type, {
        expectingSpeak: this.expectingSpeak,
        ttsChunksOut: this.ttsChunksOut,
        speakText: (this.currentSpeakText || "").slice(0, 60)
      });
      if (this.expectingSpeak) {
        if (this.ttsChunksOut > 0) {
          this.finishSpeak(true);
        } else if (type === "response.canceled") {
          // 开播前主动 cancel 的回执，勿当成 TTS 失败
          const age = Date.now() - (this.speakSentAt || 0);
          if (age < 1000) {
            debugLog.debug("HostSpeak", "忽略开播前 cancel 回执", { ageMs: age });
            return;
          }
          debugLog.warn("HostSpeak", "TTS 被 canceled 且无音频，将重试");
          this.scheduleSpeakRetry("canceled-empty");
        } else {
          debugLog.warn("HostSpeak", "response.done 但无 TTS 音频");
          this.scheduleSpeakRetry("done-empty");
        }
      }
      return;
    }

    if (type === "error") {
      const msg = extractErrMsg(evt.message || evt.error || evt);
      debugLog.error("Duplex", "服务端 error 事件", {
        message: msg,
        code: evt.code || evt.error_code || evt.BigASRFailedCode,
        raw: evt
      });
      this.emit({ type: "error", message: msg, code: evt.code || evt.error_code });
      if (/52000033|NoAudioInputTooLong|AudioServerNoAudioInput/i.test(msg) || String(evt.code || "") === "52000033") {
        debugLog.warn("Duplex", "上行过久无声，将重连保活", { message: msg });
        if (this.expectingSpeak && this.ttsChunksOut === 0) {
          this.pendingSpeak = this.pendingSpeak || this.currentSpeakText;
        } else {
          this.expectingSpeak = false;
        }
        this.scheduleReconnect("no-audio-input");
        return;
      }
      // 真正的协议非法事件才致命；45000000 常为空音频/内部错误，应重连不宜锁死
      if (/unknown event name/i.test(msg)) {
        this.protocolFatal = true;
        this.clearTtsWatch();
        this.pendingSpeak = null;
        debugLog.error("HostSpeak", "检测到非法 Duplex 事件，停止自动重发 TTS", { message: msg });
        this.emit({ type: "tts-failed", reason: "unknown-event", text: this.currentSpeakText });
        this.expectingSpeak = false;
        this.pauseUplink = false;
      } else if (/45000000/.test(msg) || String(evt.code || "") === "45000000") {
        debugLog.warn("Duplex", "45000000 非协议致命，将重连保活", { message: msg });
        if (this.expectingSpeak && this.ttsChunksOut === 0) {
          this.pendingSpeak = this.pendingSpeak || this.currentSpeakText;
        } else {
          this.expectingSpeak = false;
        }
        this.pauseUplink = false;
        this.scheduleReconnect("error-45000000");
      } else if (this.expectingSpeak && this.currentSpeakText) {
        this.pendingSpeak = this.pendingSpeak || this.currentSpeakText;
        debugLog.warn("HostSpeak", "TTS 中遇错误，话术已保留待重连", {
          text: this.currentSpeakText.slice(0, 80)
        });
      }
      return;
    }

    // TTS 窗口内抬高未知下行日志，便于确认服务端是否回包
    if (type) {
      const level = this.expectingSpeak ? "info" : "debug";
      debugLog[level]("Duplex", "其它下行事件", {
        type,
        keys: Object.keys(evt).slice(0, 12),
        expectingSpeak: this.expectingSpeak
      });
    }
  }

  appendAudio(b64) {
    if (!b64) return;
    // 独立 ASR：IDLE/SPEAKING 吃真实麦；COOLDOWN/hold 改喂静音保活（停包会 45000081）
    if (this.hostAsr && this.getAsrMode() === "independent") {
      const speaking = this.expectingSpeak || this.phase === PHASE.SPEAKING;
      const inHoldCooldown =
        this.phase === PHASE.COOLDOWN ||
        this.pauseUplink ||
        Date.now() < (this.holdUntil || 0);
      if (speaking || !inHoldCooldown) {
        this.hostAsr.appendPcmBase64(b64);
      } else {
        this.hostAsr.appendPcmBase64(SILENCE_PCM_B64);
      }
    }
    const duplexOpen = this.upstream && this.upstream.readyState === WebSocket.OPEN;
    // 独立听会只喂 HostAsr，不要求 Duplex
    if (!duplexOpen && this.getAsrMode() === "independent") {
      return;
    }
    if (!duplexOpen) {
      debugLog.debug(
        "AudioIn",
        "上行已暂停（socket 未开）",
        { chunksSoFar: this.audioChunksIn, asrMode: this.getAsrMode() },
        { rateKey: "audio-paused", rateMs: 10000 }
      );
      return;
    }
    // SPEAKING 保留上行（barge-in）；仅 COOLDOWN / 回灌 hold 挡真实麦，改由 keepalive 送静音
    if (this.isUplinkMuted()) {
      debugLog.debug(
        "AudioIn",
        "上行已静音（cooldown/回灌），keepalive 送静音帧",
        {
          expectingSpeak: this.expectingSpeak,
          phase: this.phase,
          holdLeft: Math.max(0, (this.holdUntil || 0) - Date.now()),
          chunks: this.ttsChunksOut,
          hostAsrOpen: Boolean(this.hostAsr?.isOpen?.())
        },
        { rateKey: "audio-paused-tts", rateMs: 15000 }
      );
      return;
    }
    this.audioChunksIn += 1;
    const now = Date.now();
    if (now - this.lastAudioLogAt > 15000) {
      this.lastAudioLogAt = now;
      debugLog.debug("AudioIn", "上行 PCM 分片统计", {
        chunks: this.audioChunksIn,
        lastB64len: b64.length,
        sessionId: this.sessionId,
        asrMode: this.getAsrMode()
      });
    }
    this.send({ type: "input_audio_buffer.append", audio: b64 });
  }

  /** dialog 路径 ASR → renderer（含 barge-in 短路） */
  emitDialogAsr(text, final) {
    if (!text) return;
    if (final) {
      const speaking = this.expectingSpeak || this.phase === PHASE.SPEAKING;
      const t = String(text);
      if (speaking && looksLikeBargeInCommand(t)) {
        this.handleBargeInAsr(t, "dialog");
        return;
      }
      if (speaking) {
        this.emit({
          type: "asr",
          text: t,
          final: true,
          duringSpeak: true,
          likelyEcho: true,
          source: "dialog"
        });
        return;
      }
    }
    this.emit({ type: "asr", text: String(text), final, source: "dialog" });
  }

  handleBargeInAsr(text, source) {
    const t = String(text || "");
    const cmd = detectMeetingCommand(t);
    if (cmd.interrupt || cmd.command === "INTERRUPT" || cmd.stop || cmd.command === "STOP") {
      debugLog.info("ASR", "barge-in 短路打断", {
        command: cmd.command,
        text: t.slice(0, 40),
        source
      });
      this.interruptSpeak(cmd.command === "STOP" || cmd.stop ? "barge-in-stop" : "barge-in-asr");
    }
    this.emit({
      type: "asr",
      text: t,
      final: true,
      duringSpeak: true,
      bargeIn: true,
      source
    });
  }

  async ensureHostAsr() {
    if (hostAsrMode() !== "independent") {
      this.asrModeEffective = "dialog";
      if (this.hostAsr) {
        try {
          this.hostAsr.close();
        } catch (_) {}
        this.hostAsr = null;
      }
      return;
    }
    if (this.asrDegraded && this.getAsrMode() === "dialog") return;
    if (this.hostAsr && (this.hostAsr.isOpen() || this.hostAsr.ws)) return;
    const hotwords = ASR_HOTWORDS.map((h) => h.word).filter(Boolean);
    const session = new HostAsrSession({
      hotwords,
      onResult: ({ text, final }) => {
        if (!text || this.getAsrMode() !== "independent") return;
        if (final) {
          this.asrFinalCount += 1;
          this.asrStartedAt = 0;
          const speaking = this.expectingSpeak || this.phase === PHASE.SPEAKING;
          if (speaking && looksLikeBargeInCommand(text)) {
            this.handleBargeInAsr(text, "host-asr");
            return;
          }
          if (speaking) {
            this.emit({
              type: "asr",
              text,
              final: true,
              duringSpeak: true,
              likelyEcho: true,
              source: "host-asr"
            });
            return;
          }
        }
        this.emit({ type: "asr", text, final, source: "host-asr" });
      },
      onError: (err) => {
        const detail = typeof err === "object" && err ? err : { message: String(err) };
        // 可恢复超时：已限流，勿刷 UI error
        if (detail.code === "asr_packet_timeout" || detail.recoverable) {
          debugLog.warn("HostAsr", "可恢复错误（将重连）", {
            err: String(detail.message || err).slice(0, 120),
            asrCode: detail.asrCode
          });
          return;
        }
        debugLog.warn("HostAsr", "会话错误回调", {
          err: String(detail.message || err).slice(0, 160),
          status: detail.status,
          logId: detail.logId
        });
        this.emit({
          type: "error",
          message: `HostAsr: ${detail.message || err}`,
          code: detail.code || "host-asr",
          logId: detail.logId,
          status: detail.status
        });
      }
    });
    this.hostAsr = session;
    const ok = await session.connect();
    if (!ok) {
      const hs = session.lastHandshake || {};
      // 独立听会模式没有 Dialog 可降级：保持失败，由 connectIndependentOnly 收口
      if (!useIndependentListenOnly()) {
        this.degradeAsrToDialog("handshake-failed", {
          status: hs.status,
          body: hs.body,
          logId: hs.logId || session.logId,
          resourceId: asrResourceId()
        });
        this.emit({
          type: "error",
          message: `独立 ASR 握手失败已降级 dialog（status=${hs.status || "?"} logId=${hs.logId || session.logId || ""}）`,
          code: "host-asr-connect",
          logId: hs.logId || session.logId
        });
      } else {
        debugLog.error("HostAsr", "独立听会 ASR 握手失败", {
          status: hs.status,
          body: String(hs.body || "").slice(0, 200),
          logId: hs.logId || session.logId
        });
        this.emit({
          type: "error",
          message: `独立 ASR 握手失败 status=${hs.status || "?"} logId=${hs.logId || session.logId || ""}`,
          code: "host-asr-connect",
          logId: hs.logId || session.logId
        });
      }
    } else {
      this.asrModeEffective = "independent";
      this.asrDegraded = false;
      this.emit({
        type: "asr-ready",
        mode: "independent",
        logId: session.logId,
        hostAsrReady: true
      });
    }
  }

  startAsrHealthLog() {
    if (this.asrHealthTimer) return;
    this.asrHealthTimer = setInterval(() => {
      if (this.intentionalClose) return;
      debugLog.info("AsrHealth", "听写健康快照", {
        mode: this.getAsrMode(),
        configuredMode: hostAsrMode(),
        asrDegraded: this.asrDegraded,
        hostAsrReady: Boolean(this.hostAsr?.isOpen?.()),
        duplexOpen: this.isOpen(),
        audioChunksIn: this.audioChunksIn,
        dialogAsrStarted: this.asrStartedCount,
        dialogAsrFinals: this.asrFinalCount,
        lastDialogAsrAgeMs: this.lastDialogAsrAt ? Date.now() - this.lastDialogAsrAt : null,
        hostAsrOpen: Boolean(this.hostAsr?.isOpen?.()),
        hostAsrPackets: this.hostAsr?.audioPackets || 0,
        hostAsrFinals: this.hostAsr?.finals || 0,
        phase: this.phase,
        pauseUplink: this.pauseUplink,
        uplinkMuted: this.isUplinkMuted()
      });
    }, 20000);
  }

  stopAsrHealthLog() {
    if (this.asrHealthTimer) {
      clearInterval(this.asrHealthTimer);
      this.asrHealthTimer = null;
    }
  }

  /** Phase A：回灌结束后 commit，促使 dialog ASR 冲刷 */
  commitDialogAudio(why) {
    if (!this.isOpen() || this.intentionalClose) return;
    try {
      this.send({ type: "input_audio_buffer.commit" });
      debugLog.debug("DuplexASR", "input_audio_buffer.commit", { why });
    } catch (e) {
      debugLog.warn("DuplexASR", "commit 失败", { why, message: e?.message });
    }
  }

  clearTtsWatch() {
    if (this.ttsWatchTimer) {
      clearTimeout(this.ttsWatchTimer);
      this.ttsWatchTimer = null;
    }
  }

  finishSpeak(ok) {
    this.clearTtsWatch();
    const text = this.currentSpeakText;
    const chunks = this.ttsChunksOut;
    this.expectingSpeak = false;
    this.speakRetry = 0;
    const holdMs = estimateHoldMs(text, { chunks });
    const now = Date.now();
    this.holdUntil = now + holdMs;
    this.cooldownUntil = this.holdUntil + COOLDOWN_MS;
    this.pauseUplink = true;
    this.setPhase(PHASE.COOLDOWN, { ok, chunks, holdMs, text: (text || "").slice(0, 60) });
    if (this.uplinkHoldTimer) clearTimeout(this.uplinkHoldTimer);
    this.uplinkHoldTimer = setTimeout(() => {
      this.uplinkHoldTimer = null;
      if (!this.expectingSpeak) this.pauseUplink = false;
      if (this.phase === PHASE.COOLDOWN) this.setPhase(PHASE.IDLE, { why: "hold-elapsed" });
      this.commitDialogAudio("hold-elapsed");
      debugLog.info("HostSpeak", "回灌防护期结束，恢复上行", { holdMs, chunks });
    }, holdMs);
    // COOLDOWN 结束后再标 IDLE（若 hold 已结束）
    setTimeout(() => {
      if (this.phase === PHASE.COOLDOWN && Date.now() >= this.cooldownUntil && !this.expectingSpeak) {
        this.setPhase(PHASE.IDLE, { why: "cooldown-elapsed" });
        this.commitDialogAudio("cooldown-elapsed");
      }
    }, holdMs + COOLDOWN_MS + 50);
    debugLog.info("HostSpeak", ok ? "TTS 播报结束" : "TTS 结束(失败)", {
      ok,
      chunks,
      holdMs,
      cooldownMs: COOLDOWN_MS,
      text: (text || "").slice(0, 80)
    });
    this.emit({
      type: "host-speak-done",
      ok,
      chunks,
      text,
      holdMs,
      holdUntil: this.holdUntil,
      cooldownUntil: this.cooldownUntil,
      phase: this.phase
    });
    // 续句尽快接上，不要再等一整段 hold（否则听感像说到半截就断了）
    if (this.pendingSpeak && this.isOpen()) {
      this.scheduleQueuedSpeak(250);
    }
  }

  scheduleSpeakRetry(reason) {
    if (this.speakRetry >= 2) {
      debugLog.error("HostSpeak", "TTS 重试耗尽仍无音频", {
        reason,
        text: (this.currentSpeakText || "").slice(0, 80)
      });
      this.emit({
        type: "tts-failed",
        reason,
        text: this.currentSpeakText
      });
      this.finishSpeak(false);
      return;
    }
    this.speakRetry += 1;
    const text = this.currentSpeakText;
    debugLog.warn("HostSpeak", "将重试 TTS", { reason, retry: this.speakRetry, text: text.slice(0, 60) });
    this.expectingSpeak = false;
    this.clearTtsWatch();
    setTimeout(() => {
      if (!this.isOpen() || !text) return;
      this.speakText(text, { isRetry: true, retry: this.speakRetry });
    }, 600);
  }

  /**
   * @param {string} text
   * @param {{ force?: boolean, fromQueue?: boolean, isRetry?: boolean, retry?: number }} [opts]
   */
  speakText(text, opts = {}) {
    const t = String(text || "").trim();
    if (!t) {
      debugLog.warn("HostSpeak", "空文本，跳过");
      return { ok: false, error: "empty" };
    }
    const ttsMode = hostTtsMode();
    // 独立 TTS：听会存活即可；dialog TTS 必须 Duplex socket open
    if (!this.isOpen()) {
      debugLog.error("HostSpeak", "无法 TTS：听会未就绪", {
        text: t.slice(0, 80),
        reconnectAttempt: this.reconnectAttempt,
        ttsMode,
        listenActive: this.listenActive,
        duplexOpen: Boolean(this.upstream && this.upstream.readyState === WebSocket.OPEN)
      });
      this.emit({ type: "error", message: "听会通道未连接，无法合成 Host 语音（等待重连或重新启动听会）" });
      return { ok: false, error: "not_open" };
    }

    const playbackLeft = Math.max(0, (this.holdUntil || 0) - Date.now());
    if (!opts.isRetry && !opts.fromQueue && (this.expectingSpeak || playbackLeft > 250)) {
      const elapsed = Date.now() - (this.speakSentAt || 0);
      if (this.expectingSpeak && this.ttsChunksOut === 0 && elapsed >= 5000) {
        // 首包超时，允许新话术覆盖
      } else {
        this.pendingSpeak = t;
        if (!this.expectingSpeak) this.scheduleQueuedSpeak(Math.min(playbackLeft, 800) + 200);
        debugLog.warn("HostSpeak", "TTS 播放未结束，话术已排队", {
          text: t.slice(0, 80),
          expectingSpeak: this.expectingSpeak,
          playbackLeft
        });
        return { ok: true, queued: true };
      }
    }

    if (opts.retry != null) this.speakRetry = opts.retry;
    else if (!opts.isRetry) this.speakRetry = 0;

    this.clearTtsWatch();
    if (this.hostTtsAbort) {
      try {
        this.hostTtsAbort.abort();
      } catch (_) {}
      this.hostTtsAbort = null;
    }
    this.speakGeneration += 1;
    const gen = this.speakGeneration;

    this.expectingSpeak = true;
    this.pauseUplink = false;
    this.ttsChunksOut = 0;
    this.speakSentAt = Date.now();
    this.currentSpeakText = t;
    this.speakDownlinkCount = 0;
    this.speakDownlinkTypes = [];
    const predHold = estimateHoldMs(t);
    this.holdUntil = Date.now() + predHold;
    this.setPhase(PHASE.SPEAKING, { text: t.slice(0, 60), predHold, ttsMode });

    if (ttsMode === "independent") {
      return this.speakTextIndependent(t, gen, opts);
    }
    return this.speakTextDialog(t, gen, opts);
  }

  /** P2：独立 HTTP TTS → 虚拟麦（默认） */
  speakTextIndependent(t, gen, opts) {
    const mode = "independent-http";
    debugLog.info("HostSpeak", "请求独立 TTS 进虚拟麦", {
      text: t.slice(0, 120),
      retry: this.speakRetry,
      mode,
      fromQueue: !!opts.fromQueue,
      generation: gen
    });
    this.emit({ type: "host-speaking", text: t, retry: this.speakRetry, mode });

    const ac = new AbortController();
    this.hostTtsAbort = ac;
    let first = false;

    void synthesizeHostTts(t, {
      signal: ac.signal,
      onChunk: (b64) => {
        if (gen !== this.speakGeneration || ac.signal.aborted) return;
        this.ttsChunksOut += 1;
        if (!first) {
          first = true;
          this.clearTtsWatch();
          debugLog.info("TTS", "首包语音已到（独立通道）", {
            b64len: b64.length,
            text: t.slice(0, 60)
          });
          this.emit({ type: "tts-started", text: t });
        }
        this.emit({ type: "tts-audio", audio: b64, sampleRate: ttsSampleRate() });
      }
    }).then((r) => {
      if (gen !== this.speakGeneration) return;
      this.hostTtsAbort = null;
      if (r.ok && this.ttsChunksOut > 0) {
        this.finishSpeak(true);
      } else {
        const reason = r.error || "timeout-no-audio";
        debugLog.error("HostSpeak", "独立 TTS 失败", {
          reason,
          chunks: this.ttsChunksOut,
          logId: r.logId
        });
        if (this.speakRetry < 1) {
          this.scheduleSpeakRetry(reason);
        } else {
          this.emit({ type: "tts-failed", reason, text: t, logId: r.logId, channel: "independent" });
          this.finishSpeak(false);
        }
      }
    });

    this.ttsWatchTimer = setTimeout(() => {
      if (gen !== this.speakGeneration) return;
      if (!this.expectingSpeak) return;
      if (this.ttsChunksOut > 0) return;
      debugLog.warn("HostSpeak", "独立 TTS 超时无首包", { waitMs: 12000, text: t.slice(0, 60) });
      try {
        ac.abort();
      } catch (_) {}
      this.scheduleSpeakRetry("timeout-no-audio");
    }, 12000);

    return { ok: true, queued: false, mode };
  }

  /**
   * E1：dialog 通道主动播报。
   * retry0=SayHello(commit)；retry1=ChatTTSText(replacement)；retry2=append+commit
   */
  speakTextDialog(t, gen, opts) {
    if (this.speakRetry > 0 || this.ttsChunksOut > 0) {
      this.send({ type: "response.cancel" });
    }

    let mode = "commit-only";
    let sentAppend = false;
    let sentCommit = false;
    let sentReplace = false;

    if (this.speakRetry === 0) {
      mode = "commit-only";
      sentCommit = this.send({ type: "speech_text_buffer.commit", text: t });
    } else if (this.speakRetry === 1) {
      mode = "replacement";
      sentReplace =
        this.send({ type: "speech_text_buffer.replacement.append", text: t }) &&
        this.send({ type: "speech_text_buffer.replacement.commit", text: t });
    } else {
      mode = "append+commit";
      sentAppend = this.send({ type: "speech_text_buffer.append", text: t });
      sentCommit = this.send({ type: "speech_text_buffer.commit", text: t });
    }

    debugLog.info("HostSpeak", "请求 dialog TTS 进虚拟麦", {
      text: t.slice(0, 120),
      retry: this.speakRetry,
      mode,
      fromQueue: !!opts.fromQueue,
      generation: gen,
      sentAppend,
      sentCommit,
      sentReplace
    });

    this.emit({ type: "host-speaking", text: t, retry: this.speakRetry, mode });

    this.ttsWatchTimer = setTimeout(() => {
      if (gen !== this.speakGeneration) return;
      if (!this.expectingSpeak) return;
      if (this.ttsChunksOut > 0) return;
      if (this.protocolFatal) {
        debugLog.error("HostSpeak", "协议错误后放弃 TTS", { text: t.slice(0, 60) });
        this.emit({ type: "tts-failed", reason: "protocol-fatal", text: t, channel: "dialog" });
        this.finishSpeak(false);
        return;
      }
      debugLog.warn("HostSpeak", "TTS 超时无首包", {
        waitMs: 8000,
        mode,
        text: t.slice(0, 60),
        sentAppend,
        sentCommit,
        sentReplace,
        speakDownlinkCount: this.speakDownlinkCount,
        speakDownlinkTypes: this.speakDownlinkTypes.slice(0, 20)
      });
      this.scheduleSpeakRetry("timeout-no-audio");
    }, 8000);

    return { ok: true, queued: false, mode };
  }

  /** 口令打断：取消当前 TTS，不重试；保留 interruptBuffer 供 CONTINUE 续播 */
  interruptSpeak(reason = "interrupt") {
    const fullText = String(this.currentSpeakText || this.pendingSpeak || "");
    const chunks = this.ttsChunksOut || 0;
    this.interruptBuffer = {
      fullText,
      interruptedAt: Date.now(),
      chunks,
      reason
    };
    this.pendingSpeak = "";
    if (this.queuedSpeakTimer) {
      clearTimeout(this.queuedSpeakTimer);
      this.queuedSpeakTimer = null;
    }
    this.speakGeneration += 1;
    this.clearTtsWatch?.();
    if (this.hostTtsAbort) {
      try {
        this.hostTtsAbort.abort();
      } catch (_) {}
      this.hostTtsAbort = null;
    }
    try {
      this.send({ type: "response.cancel" });
    } catch (_) {}
    this.expectingSpeak = false;
    this.ttsChunksOut = 0;
    this.pauseUplink = false;
    // 短声学沉降，勿用长 TTS hold — 用户马上要补充说明
    this.holdUntil = Date.now() + 500;
    this.cooldownUntil = 0;
    if (this.uplinkHoldTimer) {
      clearTimeout(this.uplinkHoldTimer);
      this.uplinkHoldTimer = null;
    }
    this.setPhase(PHASE.IDLE, { why: reason });
    debugLog.info("HostSpeak", "口令打断 TTS", {
      reason,
      text: fullText.slice(0, 40),
      chunks
    });
    this.emit({
      type: "host-interrupted",
      reason,
      interruptBuffer: this.interruptBuffer
    });
    return { ok: true, interrupted: true, interruptBuffer: this.interruptBuffer };
  }

  close() {
    this.intentionalClose = true;
    this.listenActive = false;
    this.authFatal = false;
    this.stopKeepalive();
    this.stopAsrHealthLog();
    if (this.hostAsr) {
      try {
        this.hostAsr.close();
      } catch (_) {}
      this.hostAsr = null;
    }
    if (this.queuedSpeakTimer) {
      clearTimeout(this.queuedSpeakTimer);
      this.queuedSpeakTimer = null;
    }
    this.pendingSpeak = null;
    this.currentSpeakText = "";
    this.protocolFatal = false;
    this.clearTtsWatch();
    if (this.uplinkHoldTimer) {
      clearTimeout(this.uplinkHoldTimer);
      this.uplinkHoldTimer = null;
    }
    this.expectingSpeak = false;
    this.pauseUplink = false;
    this.phase = PHASE.IDLE;
    this.holdUntil = 0;
    this.cooldownUntil = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.asrStallTimer) {
      clearTimeout(this.asrStallTimer);
      this.asrStallTimer = null;
    }
    debugLog.info("Duplex", "关闭会话", {
      sessionId: this.sessionId,
      audioChunksIn: this.audioChunksIn,
      ttsChunksOut: this.ttsChunksOut,
      reconnectAttempt: this.reconnectAttempt,
      asrStarted: this.asrStartedCount,
      asrFinals: this.asrFinalCount,
      asrMode: this.getAsrMode(),
      asrDegraded: this.asrDegraded
    });
    try {
      this.send({ type: "session.close" });
    } catch (_) {}
    try {
      this.upstream?.close();
    } catch (_) {}
    this.upstream = null;
    this.sessionId = null;
  }
}

module.exports = { ListenSession, speechApiKey, maskKey };
