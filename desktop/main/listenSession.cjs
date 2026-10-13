/**
 * Seeduplex 听会会话：连接、ASR、TTS、打断与重连。
 */
const WebSocket = require("ws");
const { debugLog } = require("../lib/platform");
const { PHASE, COOLDOWN_MS, estimateHoldMs } = require("../lib/duplex");
const { detectMeetingCommand, looksLikeBargeInCommand } = require("../lib/meetingSession");

const DUPLEX_URL = "wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue";
const RECONNECT_BASE_MS = 1500;
const RECONNECT_MAX_MS = 20000;
const RECONNECT_MAX_ATTEMPTS = 12;
/** 200ms 静音 PCM（16kHz s16le mono），SPEAKING/COOLDOWN 保活避免 52000033 */
const SILENCE_PCM_B64 = Buffer.alloc(16000 * 0.2 * 2).toString("base64");

const LISTEN_INSTRUCTIONS = `你是会议听写通道，不是闲聊助手。
规则：
1. 只听用户音频并做语音识别，不要主动回答、不要复述、不要寒暄。
2. 只有在收到 speech_text_buffer.commit / replacement 指令时才合成语音。
3. 禁止自由对话。`;

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
  家园共浴: "家园共育"
};

function speechApiKey() {
  return (process.env.DOUBAO_SPEECH_API_KEY || process.env.DOUBAO_REALTIME_API_KEY || "").trim();
}

function maskKey(k) {
  if (!k) return "(empty)";
  if (k.length < 10) return "***";
  return `${k.slice(0, 6)}…${k.slice(-4)} (len=${k.length})`;
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
    /** @type {{ fullText: string, interruptedAt: number, chunks: number, reason?: string } | null} */
    this.interruptBuffer = null;
    this.keepaliveTimer = null;
    this.queuedSpeakTimer = null;
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
      if (!this.isOpen() || this.intentionalClose) return;
      if (!this.isUplinkMuted()) return;
      this.send({ type: "input_audio_buffer.append", audio: SILENCE_PCM_B64 });
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
    return this.upstream && this.upstream.readyState === WebSocket.OPEN;
  }

  emit(msg) {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send("bridge:event", msg);
    }
  }

  send(payload) {
    if (this.isOpen()) {
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
  connect(opts = {}) {
    const apiKey = speechApiKey();
    if (!apiKey) {
      debugLog.error("Duplex", "缺少语音 API Key");
      this.emit({
        type: "listen-ready",
        ok: false,
        error: "缺少 DOUBAO_SPEECH_API_KEY（语音 ASR/TTS）。控场推理可用 Ark，但听会需要语音 Key。"
      });
      return Promise.resolve(false);
    }

    // 清掉旧 socket，避免双连接
    if (this.upstream) {
      try {
        this.upstream.removeAllListeners();
        if (this.upstream.readyState === WebSocket.OPEN) this.upstream.close();
      } catch (_) {}
      this.upstream = null;
    }

    const gen = ++this.socketGeneration;
    debugLog.info("Duplex", opts.isReconnect ? "重连 Seeduplex" : "开始连接 Seeduplex 听写通道", {
      url: DUPLEX_URL,
      key: maskKey(apiKey),
      model: (process.env.DOUBAO_DUPLEX_MODEL || "1.2.6.0").trim(),
      voice: (process.env.DOUBAO_DUPLEX_VOICE || "zh_female_vv_jupiter_bigtts").trim(),
      generation: gen,
      isReconnect: !!opts.isReconnect
    });

    return new Promise((resolve) => {
      const headers = { "X-Api-Key": apiKey };
      const appId = (process.env.DOUBAO_SPEECH_APP_ID || process.env.DOUBAO_APP_ID || "").trim();
      if (appId) headers["X-Api-App-Id"] = appId;

      const upstream = new WebSocket(DUPLEX_URL, { headers });
      this.upstream = upstream;
      let settled = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        debugLog.info("Duplex", ok ? "连接流程结束: OK" : "连接流程结束: FAIL", {
          generation: gen,
          sessionId: this.sessionId
        });
        resolve(ok);
      };

      upstream.on("unexpected-response", (_req, res) => {
        if (gen !== this.socketGeneration) return;
        const chunks = [];
        res.on("data", (c) => chunks.push(Buffer.from(c)));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8").slice(0, 400);
          debugLog.error("Duplex", "握手 unexpected-response", {
            status: res.statusCode,
            body
          });
          this.emit({
            type: "listen-ready",
            ok: false,
            error: `ASR 握手失败 HTTP ${res.statusCode} ${body}`
          });
          done(false);
        });
      });

      upstream.on("open", () => {
        if (gen !== this.socketGeneration) return;
        debugLog.info("Duplex", "WebSocket open，发送 session.create", { generation: gen });
        this.send({
          type: "session.create",
          session: {
            model: (process.env.DOUBAO_DUPLEX_MODEL || "1.2.6.0").trim(),
            instructions: LISTEN_INSTRUCTIONS,
            audio: {
              input: { format: { type: "pcm", sample_rate: 16000, channel: 1 } },
              output: {
                format: { type: "pcm_s16le", sample_rate: 24000, channel: 1 },
                voice: (process.env.DOUBAO_DUPLEX_VOICE || "zh_female_vv_jupiter_bigtts").trim()
              }
            }
          },
          extension: {
            asr: {
              extra: {
                enable_asr_twopass: true,
                context: {
                  hotwords: ASR_HOTWORDS,
                  correct_words: ASR_CORRECT_WORDS
                }
              }
            }
          }
        });
      });

      upstream.on("message", (data) => {
        if (gen !== this.socketGeneration) return;
        this.handle(data.toString());
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
        if (!this.intentionalClose) {
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
      debugLog.info("Duplex", "session.created", { sessionId: this.sessionId });
      this.startKeepalive();
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
        if (final) {
          this.asrFinalCount += 1;
          this.asrStartedAt = 0;
          if (this.asrStallTimer) {
            clearTimeout(this.asrStallTimer);
            this.asrStallTimer = null;
          }
          debugLog.info("ASR", "final", { text: String(text).slice(0, 200), total: this.asrFinalCount });
          // P1：播报中口令短路 — 先停嘴再交给 renderer 巡检
          const speaking = this.expectingSpeak || this.phase === PHASE.SPEAKING;
          const t = String(text);
          if (speaking && looksLikeBargeInCommand(t)) {
            const cmd = detectMeetingCommand(t);
            if (cmd.interrupt || cmd.command === "INTERRUPT" || cmd.stop || cmd.command === "STOP") {
              debugLog.info("ASR", "barge-in 短路打断", {
                command: cmd.command,
                text: t.slice(0, 40)
              });
              this.interruptSpeak(cmd.command === "STOP" || cmd.stop ? "barge-in-stop" : "barge-in-asr");
            }
            this.emit({
              type: "asr",
              text: t,
              final: true,
              duringSpeak: true,
              bargeIn: true
            });
            return;
          }
          if (speaking) {
            // TTS 回灌噪声：仍上报但标 likelyEcho，renderer 丢弃
            this.emit({
              type: "asr",
              text: t,
              final: true,
              duringSpeak: true,
              likelyEcho: true
            });
            return;
          }
        } else {
          if (this.asrStartedCount % 12 === 0) {
            debugLog.debug("ASR", "delta", { text: String(text).slice(0, 80) });
          }
        }
        this.emit({ type: "asr", text: String(text), final });
      }
      return;
    }

    if (type === "conversation.item.input_audio_transcription.started") {
      this.asrStartedCount += 1;
      this.asrStartedAt = Date.now();
      debugLog.debug("Duplex", "transcription.started", {
        started: this.asrStartedCount,
        finals: this.asrFinalCount
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
        const healthy = this.asrFinalCount > 0;
        debugLog.debug("ASR", "识别开始后未完成", {
          started: this.asrStartedCount,
          finals: this.asrFinalCount,
          ageMs: Date.now() - this.asrStartedAt,
          healthy
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
      // 未知事件名：标记致命，禁止用同一非法包重连死循环
      if (/unknown event name/i.test(msg) || /45000000/.test(msg)) {
        this.protocolFatal = true;
        this.clearTtsWatch();
        this.pendingSpeak = null;
        debugLog.error("HostSpeak", "检测到非法 Duplex 事件，停止自动重发 TTS", { message: msg });
        this.emit({ type: "tts-failed", reason: "unknown-event", text: this.currentSpeakText });
        this.expectingSpeak = false;
        this.pauseUplink = false;
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
    if (!this.isOpen()) {
      debugLog.debug(
        "AudioIn",
        "上行已暂停（socket 未开）",
        { chunksSoFar: this.audioChunksIn },
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
          chunks: this.ttsChunksOut
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
        sessionId: this.sessionId
      });
    }
    this.send({ type: "input_audio_buffer.append", audio: b64 });
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
      debugLog.info("HostSpeak", "回灌防护期结束，恢复上行", { holdMs, chunks });
    }, holdMs);
    // COOLDOWN 结束后再标 IDLE（若 hold 已结束）
    setTimeout(() => {
      if (this.phase === PHASE.COOLDOWN && Date.now() >= this.cooldownUntil && !this.expectingSpeak) {
        this.setPhase(PHASE.IDLE, { why: "cooldown-elapsed" });
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
    if (!this.isOpen()) {
      debugLog.error("HostSpeak", "无法 TTS：听会 socket 未连接", {
        text: t.slice(0, 80),
        reconnectAttempt: this.reconnectAttempt
      });
      this.emit({ type: "error", message: "听会通道未连接，无法合成 Host 语音（等待重连或重新启动听会）" });
      return { ok: false, error: "not_open" };
    }

    // 正在出声或上一段还在播：排队，避免 response.cancel 把没说完的句子掐掉
    const playbackLeft = Math.max(0, (this.holdUntil || 0) - Date.now());
    if (!opts.isRetry && !opts.fromQueue && (this.expectingSpeak || playbackLeft > 250)) {
      const elapsed = Date.now() - (this.speakSentAt || 0);
      if (this.expectingSpeak && this.ttsChunksOut === 0 && elapsed >= 5000) {
        // 首包超时，允许新话术覆盖
      } else {
        this.pendingSpeak = t;
        // expectingSpeak 时等 finishSpeak 冲刷；仅 hold 尾声时主动排程
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
    this.speakGeneration += 1;
    const gen = this.speakGeneration;

    // 先 cancel 自由对话（此时 expectingSpeak 仍为 false，canceled 不会误触发 TTS 重试）
    this.send({ type: "response.cancel" });

    this.expectingSpeak = true;
    // SPEAKING 期间不锁上行，便于「谢谢大智 / 听我说」打断；播完再由 finishSpeak 短暂静音防回灌
    this.pauseUplink = false;
    this.ttsChunksOut = 0;
    this.speakSentAt = Date.now();
    this.currentSpeakText = t;
    const predHold = estimateHoldMs(t);
    this.holdUntil = Date.now() + predHold;
    this.setPhase(PHASE.SPEAKING, { text: t.slice(0, 60), predHold });

    // 主路径：speech_text_buffer.commit = 直接 TTS / 问候（官方语义）
    // replacement.* 仅用于「覆盖模型已在生成的回复」，冷启动 alone 会静默无音频
    // 勿发 response.create / input_audio_buffer.clear（45000000 断线）
    let mode = "commit-only";
    let sentAppend = false;
    let sentCommit = false;
    let sentReplace = false;

    if (this.speakRetry >= 2) {
      mode = "replacement";
      sentReplace =
        this.send({ type: "speech_text_buffer.replacement.append", text: t }) &&
        this.send({ type: "speech_text_buffer.replacement.commit", text: t });
    } else if (this.speakRetry === 1) {
      mode = "append+commit";
      sentAppend = this.send({ type: "speech_text_buffer.append", text: t });
      sentCommit = this.send({ type: "speech_text_buffer.commit", text: t });
    } else {
      mode = "commit-only";
      sentCommit = this.send({ type: "speech_text_buffer.commit", text: t });
    }

    debugLog.info("HostSpeak", "请求 TTS 进虚拟麦", {
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

    // 8s 无首包 → 有限重试（切换 commit / commit-only / replacement）
    this.ttsWatchTimer = setTimeout(() => {
      if (gen !== this.speakGeneration) return;
      if (!this.expectingSpeak) return;
      if (this.ttsChunksOut > 0) return;
      if (this.protocolFatal) {
        debugLog.error("HostSpeak", "协议错误后放弃 TTS", { text: t.slice(0, 60) });
        this.emit({ type: "tts-failed", reason: "protocol-fatal", text: t });
        this.finishSpeak(false);
        return;
      }
      debugLog.warn("HostSpeak", "TTS 超时无首包", {
        waitMs: 8000,
        mode,
        text: t.slice(0, 60),
        sentAppend,
        sentCommit,
        sentReplace
      });
      this.scheduleSpeakRetry("timeout-no-audio");
    }, 8000);

    return { ok: true, queued: false };
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
    this.stopKeepalive();
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
      asrFinals: this.asrFinalCount
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
