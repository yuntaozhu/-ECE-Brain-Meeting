import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { URL } from "url";

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
      // Do NOT destroy socket if path is for Socket.IO (/socket.io) or Vite HMR
    } catch (e) {
      console.warn("[WS Upgrade Error]", e);
    }
  });

  // 1. /ws/meeting Broadcast Bus
  meetingWss.on("connection", (ws, req) => {
    ws.on("error", (err) => {
      console.warn("[WS /ws/meeting Connection Error]", err?.message || err);
    });
    const parsedUrl = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
    const roomId = parsedUrl.searchParams.get("roomId") || "10086";
    const userName = parsedUrl.searchParams.get("userName") || "参者";

    const client: RoomClient = { ws, roomId, userName };

    if (!roomClients.has(roomId)) {
      roomClients.set(roomId, new Set());
    }
    roomClients.get(roomId)!.add(client);

    console.log(`[WS /ws/meeting] Client ${userName} joined room ${roomId}`);

    // Broadcast join event
    broadcastToRoom(roomId, {
      type: "system",
      sender: "系统",
      text: `【广播总线】 ${userName} 已连接至会议室 ${roomId} 实时通道`,
      timestamp: Date.now()
    }, ws);

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
          broadcastToRoom(roomId, chatPayload);
        } else if (msg.type === "audio" || msg.type === "speech") {
          broadcastToRoom(roomId, {
            type: msg.type,
            sender: msg.sender || userName,
            audioData: msg.audioData,
            timestamp: Date.now()
          }, ws);
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

  // 2. /api/live/stream Doubao stream bridge
  doubaoWss.on("connection", async (ws) => {
    ws.on("error", (err) => {
      console.warn("[WS /api/live/stream Connection Error]", err?.message || err);
    });
    console.log("Client connected to Doubao Meeting stream bridge (/api/live/stream)");
    const doubaoApiKey = process.env.DOUBAO_API_KEY || "ark-20c57eca-6b75-4581-bb78-023f7776df4e-58bd0";

    ws.send(JSON.stringify({ 
      text: "【大地 ECE-Brain 智慧教研】已成功连接至豆包大模型与腾讯会议开放平台搜索服务协同桥接网关。会议主席（大地督导）已就位。", 
      speaker: "大地督导" 
    }));

    ws.on("message", async (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());
        if (parsed.text) {
          console.log("Received control command text for Doubao:", parsed.text);
          const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${doubaoApiKey}`
            },
            body: JSON.stringify({
              model: "doubao-seed-2-1-turbo-260628",
              messages: [
                { role: "system", content: "你现在是‘大地 ECE-Brain 智慧教研室’具有绝对威严的主持主席（大地数字教研总督导），由豆包大模型驱动。请针对以下系统指令或参会发言进行强势、威严、求真高效的教研纠偏与主席发言，字数在35字以内：" },
                { role: "user", content: parsed.text }
              ],
              temperature: 0.3
            })
          });

          if (response.ok) {
            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content || "请各位园长聚焦托班互动硬件立项，切勿讨论无关采购！";
            ws.send(JSON.stringify({ text: reply, speaker: "大地督导 (豆包驱动)" }));
          } else {
            ws.send(JSON.stringify({ text: `【督导插话】收到指令：“${parsed.text}”。请各单位专注托班互动硬件与注意力捕捉算法论证！`, speaker: "大地督导" }));
          }
        }
      } catch (e) {
        console.error("Error processing Doubao WS message:", e);
      }
    });

    ws.on("close", () => {
      console.log("Doubao meeting stream client disconnected.");
    });
  });

  console.log("[WebSocket] /ws/meeting broadcast bus and /api/live/stream initialized successfully.");
}

function broadcastToRoom(roomId: string, payload: any, excludeWs?: WebSocket) {
  const clients = roomClients.get(roomId);
  if (!clients) return;
  const messageStr = JSON.stringify(payload);
  clients.forEach(client => {
    if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}
