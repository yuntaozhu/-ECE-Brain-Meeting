import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { URL } from "url";

import { saveChatMessageToServerState } from "./lib/meetingStore";
import { DoubaoDuplexBridge, hasSpeechApiKey } from "./lib/doubaoDuplexBridge";

interface RoomClient {
  ws: WebSocket;
  roomId: string;
  userName: string;
}

const roomClients = new Map<string, Set<RoomClient>>();

export function setupMeetingWebSocket(server: http.Server) {
  const meetingWss = new WebSocketServer({ noServer: true });
  const doubaoWss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    try {
      const parsedUrl = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
      const pathname = parsedUrl.pathname;

      if (pathname === "/ws/meeting" || pathname === "/ws/meeting/") {
        meetingWss.handleUpgrade(request, socket, head, (ws) => {
          meetingWss.emit("connection", ws, request);
        });
      } else if (pathname === "/api/live/stream" || pathname === "/api/live/stream/") {
        doubaoWss.handleUpgrade(request, socket, head, (ws) => {
          doubaoWss.emit("connection", ws, request);
        });
      }
    } catch (e) {
      console.warn("[WS Upgrade Error]", e);
    }
  });

  meetingWss.on("connection", (ws, req) => {
    ws.on("error", (err) => {
      console.warn("[WS /ws/meeting Connection Error]", err?.message || err);
    });
    const parsedUrl = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
    const roomId = parsedUrl.searchParams.get("roomId") || "10086";
    const userName = parsedUrl.searchParams.get("userName") || "参会者";

    const client: RoomClient = { ws, roomId, userName };

    if (!roomClients.has(roomId)) {
      roomClients.set(roomId, new Set());
    }
    roomClients.get(roomId)!.add(client);

    console.log(`[WS /ws/meeting] Client ${userName} joined room ${roomId}`);

    broadcastToRoom(
      roomId,
      {
        type: "system",
        sender: "系统",
        text: `【广播总线】 ${userName} 已连接至会议室 ${roomId} 实时通道`,
        timestamp: Date.now()
      },
      ws
    );

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "chat") {
          const chatPayload = {
            type: "chat",
            sender: msg.sender || userName,
            text: msg.text,
            timestamp: Date.now()
          };
          await saveChatMessageToServerState(roomId, chatPayload.sender, chatPayload.text);
          broadcastToRoom(roomId, chatPayload);
        } else if (msg.type === "audio" || msg.type === "speech") {
          broadcastToRoom(
            roomId,
            {
              type: msg.type,
              sender: msg.sender || userName,
              audioData: msg.audioData,
              timestamp: Date.now()
            },
            ws
          );
        } else if (msg.type === "ai_query") {
          broadcastToRoom(roomId, {
            type: "chat",
            sender: "AI 主席 (大地督导)",
            text: `【督导即时回应】收到 ${userName} 发言：“${msg.text}”。请各单位专注托班互动硬件及注意力捕捉算法立项，严禁节假日采购扯皮！`,
            timestamp: Date.now()
          });
        }
      } catch (err) {
        console.error("[WS Message Error]", err);
      }
    });

    ws.on("close", () => {
      const clients = roomClients.get(roomId);
      if (clients) {
        clients.delete(client);
        if (clients.size === 0) {
          roomClients.delete(roomId);
        }
      }
      console.log(`[WS /ws/meeting] Client ${userName} left room ${roomId}`);
    });
  });

  doubaoWss.on("connection", async (ws) => {
    ws.on("error", (err) => {
      console.warn("[WS /api/live/stream Connection Error]", err?.message || err);
    });
    console.log("Client connected to live stream bridge (/api/live/stream)");

    const sendSafe = (payload: any) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    };

    let duplex: DoubaoDuplexBridge | null = null;
    let duplexReady = false;
    const arkKey = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "";

    const chatFallback = async (text: string) => {
      if (!arkKey) {
        sendSafe({
          text: `【督导插话】收到：“${text.slice(0, 40)}”。请聚焦托班互动硬件与注意力算法。`,
          speaker: "大地督导"
        });
        return;
      }
      try {
        const arkBase = (process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3").replace(
          /\/$/,
          ""
        );
        const chatModel = (
          process.env.DOUBAO_CHAT_MODEL ||
          process.env.DOUBAO_CHAT_FAST_MODEL ||
          process.env.DOUBAO_MODEL_ENDPOINT ||
          ""
        ).trim();
        if (!chatModel) throw new Error("missing DOUBAO_CHAT_MODEL endpoint");
        const response = await fetch(`${arkBase}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${arkKey}`
          },
          body: JSON.stringify({
            model: chatModel,
            messages: [
              {
                role: "system",
                content:
                  "你现在是‘大地 ECE-Brain 智慧教研室’具有绝对威严的主持主席（大地数字教研总督导），由豆包大模型驱动。请针对系统指令或参会发言进行强势、威严的教研纠偏，字数在35字以内："
              },
              { role: "user", content: text }
            ],
            temperature: 0.3
          })
        });
        if (response.ok) {
          const data = await response.json();
          const reply =
            data.choices?.[0]?.message?.content ||
            "请各位园长聚焦托班互动硬件立项，切勿讨论无关采购！";
          sendSafe({ text: reply, speaker: "大地督导 (豆包驱动)" });
        } else {
          sendSafe({
            text: `【督导插话】收到指令：“${text.slice(0, 40)}”。请专注托班互动硬件与注意力捕捉算法论证！`,
            speaker: "大地督导"
          });
        }
      } catch (e) {
        console.error("[live/stream] chat fallback error:", e);
      }
    };

    if (hasSpeechApiKey()) {
      duplex = new DoubaoDuplexBridge({
        onClientMessage: (msg) => {
          if (msg.type === "ready") {
            duplexReady = msg.mode === "duplex";
            sendSafe({
              text: duplexReady
                ? "【大地 ECE-Brain】已连接豆包实时语音模型 3.0（Seeduplex 全双工）。AI 主席语音通道就绪。"
                : `【大地 ECE-Brain】Seeduplex 未就绪（${msg.error || "unknown"}），已降级为文本控场。`,
              speaker: "系统",
              duplex: duplexReady,
              sessionId: msg.sessionId
            });
            return;
          }
          if (msg.type === "audio") {
            sendSafe({ audio: msg.audio });
            return;
          }
          if (msg.type === "text") {
            sendSafe({ text: msg.text, speaker: msg.speaker });
            return;
          }
          if (msg.type === "asr") {
            sendSafe({ asr: msg.text, final: msg.final, speaker: "我" });
            return;
          }
          if (msg.type === "interrupted") {
            sendSafe({ interrupted: true });
            return;
          }
          if (msg.type === "error") {
            sendSafe({ text: `【语音通道】${msg.message}`, speaker: "系统" });
          }
        }
      });
      duplexReady = await duplex.connect();
      if (!duplexReady) {
        duplex.close();
        duplex = null;
      }
    } else {
      sendSafe({
        text: "【大地 ECE-Brain】未配置 DOUBAO_SPEECH_API_KEY，语音全双工不可用；文本控场仍可用。",
        speaker: "系统",
        duplex: false
      });
    }

    ws.on("message", async (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());

        if (parsed.audio && duplex && duplexReady) {
          duplex.appendAudioBase64(parsed.audio);
          return;
        }

        if (parsed.cancel || parsed.interrupted) {
          duplex?.cancelResponse();
          return;
        }

        if (parsed.commitAudio) {
          duplex?.commitAudio();
          return;
        }

        if (parsed.text) {
          console.log("[live/stream] control text:", String(parsed.text).slice(0, 80));
          if (duplex && duplexReady) {
            duplex.speakText(String(parsed.text));
          } else {
            await chatFallback(String(parsed.text));
          }
        }
      } catch (e) {
        console.error("Error processing live stream WS message:", e);
      }
    });

    ws.on("close", () => {
      duplex?.close();
      duplex = null;
      console.log("Live stream client disconnected.");
    });
  });

  console.log("[WebSocket] /ws/meeting and /api/live/stream (Seeduplex bridge) initialized.");
}

function broadcastToRoom(roomId: string, payload: any, excludeWs?: WebSocket) {
  const clients = roomClients.get(roomId);
  if (!clients) return;
  const messageStr = JSON.stringify(payload);
  clients.forEach((client) => {
    if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}
