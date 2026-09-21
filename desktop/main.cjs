/**
 * ECE-Brain desktop — AI 会议控制台
 * P0: VB-Cable 设备 / 回环
 * P1: 听会 ASR + Kaiban(Ark) 控场 + 仅干预时 TTS（禁止纯闲聊）
 */
const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("path");
const WebSocket = require("ws");
const { runMeetingAnalysis, hasArkKey } = require("./lib/kaiban.cjs");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const DUPLEX_URL = "wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue";

/** Listen-only: ASR yes, free chat no. Speak only via Host speakText. */
const LISTEN_INSTRUCTIONS = `你是会议听写通道，不是闲聊助手。
规则：
1. 只听用户音频并做语音识别，不要主动回答、不要复述、不要寒暄。
2. 只有在收到明确的 speech_text_buffer 指令时才合成语音。
3. 禁止自由对话。`;

function speechApiKey() {
  return (process.env.DOUBAO_SPEECH_API_KEY || process.env.DOUBAO_REALTIME_API_KEY || "").trim();
}

class ListenSession {
  constructor(win) {
    this.win = win;
    this.upstream = null;
    this.sessionId = null;
  }

  emit(msg) {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send("bridge:event", msg);
    }
  }

  send(payload) {
    if (this.upstream && this.upstream.readyState === WebSocket.OPEN) {
      this.upstream.send(JSON.stringify(payload));
    }
  }

  connect() {
    const apiKey = speechApiKey();
    if (!apiKey) {
      this.emit({
        type: "listen-ready",
        ok: false,
        error: "缺少 DOUBAO_SPEECH_API_KEY（语音 ASR/TTS）。控场推理可用 Ark，但听会需要语音 Key。"
      });
      return Promise.resolve(false);
    }

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
        resolve(ok);
      };

      upstream.on("unexpected-response", (_req, res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(Buffer.from(c)));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8").slice(0, 300);
          this.emit({ type: "listen-ready", ok: false, error: `ASR 握手失败 HTTP ${res.statusCode} ${body}` });
          done(false);
        });
      });

      upstream.on("open", () => {
        this.send({
          type: "session.create",
          session: {
            model: (process.env.DOUBAO_DUPLEX_MODEL || "1.2.6.1").trim(),
            instructions: LISTEN_INSTRUCTIONS,
            audio: {
              input: { format: { type: "pcm", sample_rate: 16000, channel: 1 } },
              output: {
                format: { type: "pcm_s16le", sample_rate: 24000, channel: 1 },
                voice: (process.env.DOUBAO_DUPLEX_VOICE || "zh_female_vv_jupiter_bigtts").trim()
              }
            }
          }
        });
      });

      upstream.on("message", (data) => {
        this.handle(data.toString());
        if (this.sessionId) done(true);
      });

      upstream.on("error", (err) => {
        this.emit({ type: "error", message: String(err?.message || err) });
        done(false);
      });

      upstream.on("close", () => {
        this.upstream = null;
        this.emit({ type: "closed" });
        done(false);
      });

      setTimeout(() => {
        if (!settled && upstream.readyState === WebSocket.OPEN) {
          this.emit({ type: "listen-ready", ok: true, sessionId: this.sessionId || "" });
          done(true);
        } else if (!settled) done(false);
      }, 5000);
    });
  }

  handle(raw) {
    let evt;
    try {
      evt = JSON.parse(raw);
    } catch {
      return;
    }
    const type = evt.type || "";

    if (type === "session.created") {
      this.sessionId = evt.session?.id || evt.id || null;
      this.emit({ type: "listen-ready", ok: true, sessionId: this.sessionId || "" });
      return;
    }

    if (
      type === "conversation.item.input_audio_transcription.delta" ||
      type === "conversation.item.input_audio_transcription.completed"
    ) {
      const text = evt.delta || evt.transcript || evt.text || "";
      if (text) {
        this.emit({
          type: "asr",
          text: String(text),
          final: type.endsWith("completed")
        });
      }
      return;
    }

    // Suppress free-chat: cancel any model-initiated speech unless Host speakText
    if (
      type === "response.created" ||
      type === "response.output_text.delta" ||
      type === "response.output_audio.delta" ||
      type === "response.output_text.done"
    ) {
      if (!this.expectingSpeak) {
        this.send({ type: "response.cancel" });
        return;
      }
      if (type === "response.output_audio.delta") {
        const audio = evt.delta || evt.audio || "";
        if (audio) this.emit({ type: "tts-audio", audio: String(audio) });
      }
      if (type === "response.output_text.delta" && evt.delta) {
        this.emit({ type: "tts-text", text: String(evt.delta) });
      }
      return;
    }

    if (type === "response.done" || type === "response.canceled") {
      this.expectingSpeak = false;
      return;
    }

    if (type === "error") {
      this.emit({ type: "error", message: evt.message || evt.error || JSON.stringify(evt) });
    }
  }

  appendAudio(b64) {
    if (!b64) return;
    this.send({ type: "input_audio_buffer.append", audio: b64 });
  }

  /** Host intervention only */
  speakText(text) {
    if (!text?.trim()) return;
    this.expectingSpeak = true;
    this.send({ type: "response.cancel" });
    this.send({
      type: "speech_text_buffer.replacement.append",
      text: text.trim()
    });
    this.send({
      type: "speech_text_buffer.replacement.commit",
      text: text.trim()
    });
    this.emit({ type: "host-speaking", text: text.trim() });
  }

  close() {
    try {
      this.send({ type: "session.close" });
    } catch (_) {}
    try {
      this.upstream?.close();
    } catch (_) {}
    this.upstream = null;
  }
}

let win = null;
let listen = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 800,
    title: "ECE-Brain AI 会议控制台",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(true));
  session.defaultSession.setPermissionCheckHandler(() => true);
  createWindow();

  ipcMain.handle("env:status", async () => ({
    ark: hasArkKey(),
    speech: Boolean(speechApiKey())
  }));

  ipcMain.handle("listen:start", async () => {
    if (listen) listen.close();
    listen = new ListenSession(win);
    const ok = await listen.connect();
    return { ok, speech: Boolean(speechApiKey()), ark: hasArkKey() };
  });

  ipcMain.handle("listen:stop", async () => {
    listen?.close();
    listen = null;
    return { ok: true };
  });

  ipcMain.on("listen:audio", (_e, b64) => {
    listen?.appendAudio(b64);
  });

  ipcMain.handle("kaiban:evaluate", async (_e, payload) => {
    try {
      const result = await runMeetingAnalysis(
        payload?.transcript || "",
        payload?.agenda || "幼教数字化教研：托班硬件与注意力算法"
      );
      // Auto-speak Host intervention into meeting via virtual mic path
      if (result.shouldIntervene && result.interventionText && listen) {
        listen.speakText(result.interventionText);
      }
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  });

  ipcMain.handle("host:speak", async (_e, text) => {
    if (!listen) return { ok: false, error: "未启动听会通道" };
    listen.speakText(String(text || ""));
    return { ok: true };
  });
});

app.on("window-all-closed", () => {
  listen?.close();
  app.quit();
});
