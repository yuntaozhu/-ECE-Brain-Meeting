/**
 * Doubao Seeduplex (Realtime Duplex 3.0) WebSocket bridge.
 * Docs: wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue
 * Auth: Access-Key + Resource-Id + 固定 App-Key（缺一易 403 / 45000030）
 */

import { randomUUID } from "crypto";
import WebSocket from "ws";

const DUPLEX_URL_DEFAULT = "wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue";
const DUPLEX_APP_KEY = "PlgvMymc7f3tQnJ6";
const DUPLEX_RESOURCE_ID = "volc.speech.dialog";
const DUPLEX_MODEL_DEFAULT = "1.2.6.1";

function duplexUrl(): string {
  return (process.env.DOUBAO_DUPLEX_WS_URL || DUPLEX_URL_DEFAULT).trim() || DUPLEX_URL_DEFAULT;
}

export type DuplexClientMessage =
  | { type: "ready"; mode: "duplex" | "chat-fallback"; sessionId?: string; logId?: string; error?: string }
  | { type: "audio"; audio: string }
  | { type: "text"; text: string; speaker: string }
  | { type: "asr"; text: string; final?: boolean }
  | { type: "interrupted" }
  | { type: "error"; message: string }
  | { type: "usage"; payload: any };

export interface DuplexBridgeOptions {
  instructions?: string;
  voice?: string;
  onClientMessage: (msg: DuplexClientMessage) => void;
}

function speechApiKey(): string {
  return (
    process.env.DOUBAO_SPEECH_API_KEY ||
    process.env.DOUBAO_REALTIME_API_KEY ||
    ""
  ).trim();
}

function duplexModel(): string {
  const raw = (process.env.DOUBAO_DUPLEX_MODEL || DUPLEX_MODEL_DEFAULT).trim();
  // 仅拦截失效别名；1.2.6.x 留给 E2 全双工探测
  if (/^(phone-omni-chat2|omni-chat|doubao-omni)$/i.test(raw)) {
    return DUPLEX_MODEL_DEFAULT;
  }
  return raw || DUPLEX_MODEL_DEFAULT;
}

function speechAppId(): string {
  // 须为语音控制台数字 AppID；项目名 default 易 45000030
  return (process.env.DOUBAO_SPEECH_APP_ID || process.env.DOUBAO_APP_ID || "default").trim();
}

function defaultVoice(): string {
  return (process.env.DOUBAO_DUPLEX_VOICE || "zh_female_vv_jupiter_bigtts").trim();
}

const CHAIR_INSTRUCTIONS = `你现在是「大地 ECE-Brain 智慧教研室」AI 会议主席（大地数字教研总督导）。
风格：威严、简洁、专业，口语适合语音播报。
职责：主持教研会议、纠偏偏题（如粽子/采购/报销）、点名请园长发言、推进议程。
发言控制在 1-3 句，不要长篇大论。`;

export class DoubaoDuplexBridge {
  private upstream: WebSocket | null = null;
  private sessionId: string | null = null;
  private closed = false;
  private textBuffer = "";

  constructor(private opts: DuplexBridgeOptions) {}

  async connect(): Promise<boolean> {
    const apiKey = speechApiKey();
    if (!apiKey) {
      this.opts.onClientMessage({
        type: "ready",
        mode: "chat-fallback",
        error: "缺少 DOUBAO_SPEECH_API_KEY（语音控制台 API Key）"
      });
      return false;
    }

    return new Promise((resolve) => {
      const appId = speechAppId();
      const connectId = randomUUID();
      // Seeduplex 3.0：X-Api-Key 为主；App-ID / Resource / 固定 App-Key 作兼容
      const headers: Record<string, string> = {
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

      let settled = false;
      const upstream = new WebSocket(duplexUrl(), { headers });
      this.upstream = upstream;

      upstream.on("unexpected-response", (_req, res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(Buffer.from(c)));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8").slice(0, 400);
          const logId = res.headers?.["x-tt-logid"] || "";
          console.warn(
            `[Duplex] handshake HTTP ${res.statusCode}: ${body} logId=${logId} connectId=${connectId}`
          );
          this.opts.onClientMessage({
            type: "ready",
            mode: "chat-fallback",
            error: `Seeduplex 握手失败 HTTP ${res.statusCode}${logId ? ` logid=${logId}` : ""}`
          });
          if (!settled) {
            settled = true;
            resolve(false);
          }
        });
      });

      upstream.on("open", () => {
        const logId = (upstream as any)._req?.res?.headers?.["x-tt-logid"];
        const model = duplexModel();
        console.log(`[Duplex] upstream open, logId=${logId || "n/a"} connectId=${connectId} model=${model}`);
        const voice = this.opts.voice || defaultVoice();
        this.sendUpstream({
          type: "session.create",
          session: {
            model,
            instructions: this.opts.instructions || CHAIR_INSTRUCTIONS,
            audio: {
              input: {
                format: { type: "pcm", sample_rate: 16000, channel: 1 }
              },
              output: {
                format: { type: "pcm_s16le", sample_rate: 24000, channel: 1 },
                voice
              }
            }
          },
          extension: {
            tts: {
              speaker: voice,
              audio_config: { format: "pcm_s16le", sample_rate: 24000, channel: 1 }
            },
            dialog: { bot_name: "大智", extra: { model } }
          }
        });
      });

      upstream.on("message", (data) => {
        this.handleUpstream(data.toString());
        if (!settled && this.sessionId) {
          settled = true;
          resolve(true);
        }
      });

      upstream.on("error", (err) => {
        console.warn("[Duplex] upstream error:", err?.message || err);
        this.opts.onClientMessage({
          type: "error",
          message: String(err?.message || err)
        });
        if (!settled) {
          settled = true;
          resolve(false);
        }
      });

      upstream.on("close", () => {
        console.log("[Duplex] upstream closed");
        this.upstream = null;
        if (!settled) {
          settled = true;
          resolve(false);
        }
      });

      setTimeout(() => {
        if (!settled) {
          // session.created may be slow; still mark connected if socket open
          if (upstream.readyState === WebSocket.OPEN) {
            settled = true;
            this.opts.onClientMessage({
              type: "ready",
              mode: "duplex",
              sessionId: this.sessionId || undefined
            });
            resolve(true);
          } else {
            settled = true;
            resolve(false);
          }
        }
      }, 4000);
    });
  }

  private sendUpstream(payload: Record<string, any>) {
    if (!this.upstream || this.upstream.readyState !== WebSocket.OPEN) return;
    this.upstream.send(JSON.stringify(payload));
  }

  private handleUpstream(raw: string) {
    let evt: any;
    try {
      evt = JSON.parse(raw);
    } catch {
      return;
    }
    const type = evt.type || "";

    if (type === "session.created") {
      this.sessionId = evt.session?.id || evt.id || null;
      this.opts.onClientMessage({
        type: "ready",
        mode: "duplex",
        sessionId: this.sessionId || undefined
      });
      // ChatTTSText：直接指定文本合成（冷启动不先 cancel，避免冲掉问候）
      const hello =
        "各位园长好，我是大地 ECE-Brain AI 主席。请围绕当前教研议程发言，我会实时控场。";
      this.sendUpstream({
        type: "speech_text_buffer.replacement.append",
        text: hello
      });
      this.sendUpstream({
        type: "speech_text_buffer.replacement.commit",
        text: hello
      });
      return;
    }

    if (type === "session.updated" || type === "session.closed") {
      return;
    }

    if (type === "conversation.item.input_audio_transcription.started") {
      this.opts.onClientMessage({ type: "interrupted" });
      return;
    }

    if (
      type === "conversation.item.input_audio_transcription.delta" ||
      type === "conversation.item.input_audio_transcription.completed"
    ) {
      const text = evt.delta || evt.transcript || evt.text || "";
      if (text) {
        this.opts.onClientMessage({
          type: "asr",
          text: String(text),
          final: type.endsWith("completed")
        });
      }
      return;
    }

    if (type === "response.output_text.delta") {
      const delta = evt.delta || evt.text || "";
      if (delta) this.textBuffer += delta;
      return;
    }

    if (type === "response.output_text.done") {
      const text = (evt.text || this.textBuffer || "").trim();
      this.textBuffer = "";
      if (text) {
        this.opts.onClientMessage({
          type: "text",
          text,
          speaker: "AI 主席 (Seeduplex)"
        });
      }
      return;
    }

    if (type === "response.output_audio.delta") {
      const audio = evt.delta || evt.audio || "";
      if (audio) this.opts.onClientMessage({ type: "audio", audio: String(audio) });
      return;
    }

    if (type === "response.canceled") {
      this.opts.onClientMessage({ type: "interrupted" });
      return;
    }

    if (type === "response.done") {
      this.opts.onClientMessage({ type: "usage", payload: evt });
      return;
    }

    if (type === "error") {
      this.opts.onClientMessage({
        type: "error",
        message: evt.message || evt.error || JSON.stringify(evt)
      });
    }
  }

  /** Browser sends raw PCM16 16kHz base64 — forward as duplex append */
  appendAudioBase64(audioB64: string) {
    if (!audioB64) return;
    this.sendUpstream({
      type: "input_audio_buffer.append",
      audio: audioB64
    });
  }

  commitAudio() {
    this.sendUpstream({ type: "input_audio_buffer.commit" });
  }

  /** Force-speak chair text (intervention / agenda prompt) via ChatTTSText */
  speakText(text: string, opts: { cancel?: boolean } = {}) {
    if (!text?.trim()) return;
    if (opts.cancel !== false) this.sendUpstream({ type: "response.cancel" });
    const t = text.trim();
    this.sendUpstream({
      type: "speech_text_buffer.replacement.append",
      text: t
    });
    this.sendUpstream({
      type: "speech_text_buffer.replacement.commit",
      text: t
    });
  }

  /** Soft greeting / SayHello（不 cancel） */
  commitSpeechText(text: string) {
    if (!text?.trim()) return;
    this.sendUpstream({
      type: "speech_text_buffer.commit",
      text: text.trim()
    });
  }

  cancelResponse() {
    this.sendUpstream({ type: "response.cancel" });
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    try {
      this.sendUpstream({ type: "session.close" });
    } catch (_) {}
    try {
      this.upstream?.close();
    } catch (_) {}
    this.upstream = null;
  }
}

export function hasSpeechApiKey(): boolean {
  return Boolean(speechApiKey());
}
