/**
 * Doubao Seeduplex (Realtime Duplex 3.0) WebSocket bridge.
 * Docs: wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue
 * Auth: X-Api-Key (Speech console API Key — not Ark chat key)
 */

import WebSocket from "ws";

const DUPLEX_URL = "wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue";

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
  // Official duplex docs cite 1.2.6.1; some SDK mirrors use 1.2.6.0 — override via env.
  return (process.env.DOUBAO_DUPLEX_MODEL || "1.2.6.1").trim();
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
      const headers: Record<string, string> = {
        "X-Api-Key": apiKey
      };
      const appId = (process.env.DOUBAO_SPEECH_APP_ID || process.env.DOUBAO_APP_ID || "").trim();
      if (appId) headers["X-Api-App-Id"] = appId;

      let settled = false;
      const upstream = new WebSocket(DUPLEX_URL, { headers });
      this.upstream = upstream;

      upstream.on("unexpected-response", (_req, res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(Buffer.from(c)));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8").slice(0, 400);
          console.warn(`[Duplex] handshake HTTP ${res.statusCode}: ${body}`);
          this.opts.onClientMessage({
            type: "ready",
            mode: "chat-fallback",
            error: `Seeduplex 握手失败 HTTP ${res.statusCode}`
          });
          if (!settled) {
            settled = true;
            resolve(false);
          }
        });
      });

      upstream.on("open", () => {
        const logId = (upstream as any)._req?.res?.headers?.["x-tt-logid"];
        console.log(`[Duplex] upstream open, logId=${logId || "n/a"}`);
        this.sendUpstream({
          type: "session.create",
          session: {
            model: duplexModel(),
            instructions: this.opts.instructions || CHAIR_INSTRUCTIONS,
            audio: {
              input: {
                format: { type: "pcm", sample_rate: 16000, channel: 1 }
              },
              output: {
                format: { type: "pcm_s16le", sample_rate: 24000, channel: 1 },
                voice: this.opts.voice || defaultVoice()
              }
            }
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
      // Optional greeting so host hears the chair immediately
      this.sendUpstream({
        type: "speech_text_buffer.commit",
        text: "各位园长好，我是大地 ECE-Brain AI 主席。请围绕当前教研议程发言，我会实时控场。"
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

  /** Force-speak chair text (intervention / agenda prompt) via replacement TTS */
  speakText(text: string) {
    if (!text?.trim()) return;
    this.sendUpstream({ type: "response.cancel" });
    this.sendUpstream({
      type: "speech_text_buffer.replacement.append",
      text: text.trim()
    });
    this.sendUpstream({
      type: "speech_text_buffer.replacement.commit",
      text: text.trim()
    });
  }

  /** Soft greeting / commit speech text (model may still chat) */
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
