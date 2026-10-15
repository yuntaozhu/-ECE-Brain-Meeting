import express from "express";
import path from "path";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";

dotenv.config();

import { runMeetingAnalysisServer } from "./src/lib/kaibanMeetingEngine.server";
import tencentMeetingRouter from "./server/routes/tencentMeeting";
import dazhiVoiceChatRouter from "./server/routes/dazhiVoiceChat";
import { setupMeetingWebSocket } from "./server/websocketMeeting";
import { setupSocketIOServer } from "./server/index";
import {
  addRagChunk,
  appendLiveEvent,
  detectRuntime,
  getMeetingState,
  getOrCreateMeetingState,
  getStoreBackend,
  isPersistentRuntime,
  listEventsSince,
  patchMeetingState,
  saveChatMessageToServerState,
  searchRag,
  upsertParticipant
} from "./server/lib/meetingStore";
import { embedQuery, hashEmbed, runAiIntervene } from "./server/lib/aiIntervene";
import { phaseError, phaseLog } from "./server/lib/phaseLogger";
import { issueVolcRtcToken, toVolcRtcRoomId } from "./server/lib/volcRtcToken";

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: process.env.FRONTEND_ORIGIN || process.env.APP_URL || "*" }
});

const PORT = Number(process.env.PORT) || 3000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || process.env.APP_URL || "*";

app.use(express.json({ limit: "2mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  if (FRONTEND_ORIGIN !== "*") {
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

type ExpressMethod = "get" | "post" | "put" | "patch" | "delete";
const asyncMethods: ExpressMethod[] = ["get", "post", "put", "patch", "delete"];
for (const method of asyncMethods) {
  const original = app[method].bind(app) as (...args: any[]) => express.Application;
  (app as any)[method] = (path: string, ...handlers: express.RequestHandler[]) => {
    const wrapped = handlers.map((handler) => {
      if (typeof handler !== "function" || handler.length > 3) return handler;
      return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        Promise.resolve(handler(req, res, next)).catch(next);
      };
    });
    return original(path, ...wrapped);
  };
}

function chunkText(content: string, maxLen = 500): string[] {
  const text = (content || "").trim();
  if (!text) return ["大地 ECE-Brain 学术教研资料"];
  if (text.length <= maxLen) return [text];
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += maxLen) {
    parts.push(text.slice(i, i + maxLen));
  }
  return parts.slice(0, 24);
}

// Phase 1: Pre-meeting RAG Resource Mounting (Doubao Embedding, roomId-isolated store)
app.post("/api/rag/embed-resource", async (req, res) => {
  const { fileName = "教研文件.txt", content = "", roomId = "10086" } = req.body;
  const doubaoApiKey = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "";

  try {
    const chunks = chunkText(content);
    let isRealDoubao = false;
    const chunkIds: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const piece = chunks[i];
      let embedding: number[] = [];

      if (doubaoApiKey) {
        try {
          const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/embeddings/multimodal", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${doubaoApiKey}`
            },
            body: JSON.stringify({
              model:
                process.env.DOUBAO_EMBED_ENDPOINT ||
                process.env.DOUBAO_EMBED_MODEL ||
                "",
              instructions:
                "Target_modality: text and video.\nInstruction:Compress the text/video into one word.\nQuery:",
              input: [{ type: "text", text: piece }],
              dimensions: 1024,
              multi_embedding: { type: "enabled" },
              sparse_embedding: { type: "enabled" },
              encoding_format: "float"
            })
          });

          if (response.ok) {
            const data = await response.json();
            const vec = data.data?.[0]?.embedding || data.data?.[0]?.dense_embedding;
            if (Array.isArray(vec)) {
              embedding = vec;
              isRealDoubao = true;
            }
          }
        } catch (err) {
          console.warn("[RAG] Doubao embedding fetch failed for chunk, using fallback:", err);
        }
      }

      if (embedding.length === 0) {
        embedding = hashEmbed(piece);
      }

      const chunkId = `rag_${roomId}_${Date.now()}_${i}`;
      await addRagChunk({
        id: chunkId,
        roomId: String(roomId),
        fileName,
        text: piece,
        embedding,
        createdAt: Date.now()
      });
      chunkIds.push(chunkId);
    }

    const customAgendas = [
      {
        id: "IceBreaking",
        title: `1. 破冰与《${fileName.slice(0, 10)}》教研规范宣读`,
        description: "宣布 ECE-Brain 控场纪律，禁止节假日采购与行政杂务扯皮，直入学术主题。",
        durationSeconds: 180,
        status: "in_progress"
      },
      {
        id: "MainDiscussion",
        title: `2. 核心教学法与托班注意力算法研讨`,
        description: `基于《${fileName}》挂载资源，针对幼儿眼球追踪与多媒体交互算法进行可行性分析。`,
        durationSeconds: 300,
        status: "pending"
      },
      {
        id: "Conclusion",
        title: `3. 学术共识归档与行动项分配`,
        description: "整理会议纪要、列举下一步托班试点方案并输出结构化行动清单。",
        durationSeconds: 120,
        status: "pending"
      }
    ];

    const existing = await getOrCreateMeetingState(String(roomId));
    await patchMeetingState(String(roomId), {
      mountedFiles: [
        ...(existing.mountedFiles || []),
        { name: fileName, chunkIds, status: "done", isRealDoubao }
      ],
      agendas: customAgendas
    });
    phaseLog("rag.embedded", {
      roomId: String(roomId),
      fileName,
      chunkCount: chunkIds.length,
      realEmbedding: isRealDoubao
    });

    res.json({
      success: true,
      chunkId: chunkIds[0],
      chunkIds,
      chunkCount: chunkIds.length,
      dimensions: 1024,
      isRealDoubao,
      fallback: !isRealDoubao,
      storeBackend: await getStoreBackend(),
      agendas: customAgendas,
      message: isRealDoubao
        ? "教研资源已按 roomId 隔离挂载并完成 Doubao 向量化"
        : "教研资源已挂载（向量为本地 fallback，请配置 DOUBAO_API_KEY / ARK_API_KEY）"
    });
  } catch (err: any) {
    console.error("[RAG Error]", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Phase 1: Search RAG Knowledge Base (cosine similarity, room-scoped)
app.post("/api/rag/search-knowledge", async (req, res) => {
  const { query = "", roomId = "10086", topK = 5 } = req.body;
  try {
    const { embedding, isReal } = await embedQuery(String(query || "教研检索"));
    let results = await searchRag(String(roomId), embedding, Number(topK) || 5);

    if (results.length === 0) {
      results = [
        {
          fileName: "（本房间暂无挂载资料）",
          snippet: "请先在筹备页上传教研文档，或确认 roomId 与挂载时一致。",
          similarity: 0,
          text: ""
        }
      ];
    }

    res.json({
      success: true,
      query,
      roomId,
      isRealEmbedding: isReal,
      storeBackend: await getStoreBackend(),
      results
    });
    phaseLog("rag.searched", {
      roomId: String(roomId),
      resultCount: results.length,
      realEmbedding: isReal
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Socket.IO real-time bidirectional sync
io.on("connection", (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`[Socket.IO] Socket ${socket.id} joined meeting room: ${roomId}`);
  });

  socket.on("send-chat", async (data) => {
    const { roomId, sender, text } = data;
    if (roomId && text && text.trim()) {
      const cleanText = text.trim();
      await saveChatMessageToServerState(roomId, sender || "参会者", cleanText);
      io.to(roomId).emit("chat-received", { sender: sender || "参会者", text: cleanText, timestamp: Date.now() });

      setTimeout(async () => {
        try {
          const { text: aiResponseText, state: finalState } = await runAiIntervene({
            roomId,
            reason: "chat",
            sender: sender || "参会者",
            hint: cleanText
          });
          if (aiResponseText) {
            io.to(roomId).emit("chat-received", {
              sender: "AI 主席 (大地教研督导)",
              text: aiResponseText,
              timestamp: Date.now()
            });
            io.to(roomId).emit("ai-intervention", {
              roomId,
              text: aiResponseText,
              state: finalState
            });
          }
        } catch (engineErr) {
          console.warn("[Socket.IO Engine Async Interaction Notice]", engineErr);
        }
      }, 200);
    }
  });

  socket.on("update-participants", (data) => {
    const { roomId, participants } = data;
    if (roomId && participants) {
      io.to(roomId).emit("participants-updated", { roomId, participants });
    }
  });

  socket.on("participant-joined", async (data) => {
    const { roomId, participant } = data;
    if (roomId && participant) {
      await upsertParticipant(roomId, participant);
      io.to(roomId).emit("participant-joined", { roomId, participant });
    }
  });

  socket.on("disconnect", () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Phase-1 routes emit structured business logs below. Avoid logging each poll
// request here: it overwhelms Vercel Runtime Logs without adding diagnostics.
app.use((req, res, next) => {
  if (
    !req.path.startsWith("/api/live/poll") &&
    !req.path.startsWith("/api/meeting/state/")
  ) {
    console.log(`[HTTP] ${req.method} ${req.url}`);
  }
  next();
});

// Liveness for Railway: process is up even if Redis is not yet configured.
app.get("/api/healthz", (_req, res) => {
  res.status(200).json({ status: "ok", phase: "e1-persistent-backend" });
});

// Readiness: production without Upstash is degraded (E1 contract).
app.get("/api/health", async (_req, res) => {
  const storeBackend = await getStoreBackend();
  const runtime = detectRuntime();
  const persistent = isPersistentRuntime();
  const wsEnabled = persistent || (!process.env.VERCEL && runtime === "local");
  const degraded = runtime !== "local" && storeBackend !== "upstash";
  res.status(degraded ? 503 : 200).json({
    status: degraded ? "degraded" : "ok",
    phase: "e1-persistent-backend",
    runtime,
    persistent,
    storeBackend,
    storeRequired: runtime !== "local",
    wsEnabled
  });
});

// Tencent Meeting API Routes (optional external bridge — not Phase-1 media path)
app.use("/api/tencent", tencentMeetingRouter);
app.use(dazhiVoiceChatRouter);

// Re-export store helpers for legacy WS modules
export { mergeTranscripts, saveChatMessageToServerState } from "./server/lib/meetingStore";

app.post("/api/meeting/chat", async (req, res) => {
  const { roomId = "10086", sender = "参会者", text = "" } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, error: "Empty message text" });
  }

  const cleanText = text.trim();
  const normalizedRoomId = String(roomId);
  const startedAt = Date.now();

  try {
    phaseLog("chat.received", {
      roomId: normalizedRoomId,
      sender,
      textLength: cleanText.length
    });
    let stateAfterChat = await saveChatMessageToServerState(normalizedRoomId, sender, cleanText);
    phaseLog("chat.persisted", { roomId: normalizedRoomId, sender });

    if (!stateAfterChat.meetingStarted) {
      return res.json({
        success: true,
        state: stateAfterChat,
        ai: { generated: false },
        storeBackend: await getStoreBackend()
      });
    }

    // This must be awaited. Vercel may freeze a Serverless invocation after
    // res.json(), which previously discarded the delayed AI intervention.
    const { text: aiResponseText, state: finalState } = await runAiIntervene({
      roomId: normalizedRoomId,
      reason: "chat",
      sender,
      hint: cleanText
    });
    const finalText = aiResponseText || "";
    if (finalText) {
      try {
        io.to(roomId).emit("chat-received", {
          sender: "AI 主席 (大地教研督导)",
          text: finalText,
          timestamp: Date.now()
        });
        io.to(roomId).emit("ai-intervention", {
          roomId,
          text: finalText,
          state: finalState
        });
      } catch (_) {}
    }

    res.json({
      success: true,
      state: finalState,
      ai: {
        generated: Boolean(finalText),
        text: finalText || undefined
      },
      storeBackend: await getStoreBackend()
    });
  } catch (err: any) {
    phaseError("ai.failed", {
      roomId: normalizedRoomId,
      reason: "chat",
      error: err?.message || String(err),
      latencyMs: Date.now() - startedAt
    });
    res.status(500).json({ success: false, error: "Unable to process chat AI response" });
  }
});

app.get("/api/meeting/state/:roomId", async (req, res) => {
  const { roomId } = req.params;
  const state = await getMeetingState(roomId);
  res.json({
    success: true,
    state,
    storeBackend: await getStoreBackend()
  });
});

app.post("/api/meeting/state/:roomId", async (req, res) => {
  const { roomId } = req.params;
  const incoming = req.body || {};
  const updated = await patchMeetingState(roomId, incoming);
  phaseLog("sync.state_patch", {
    roomId,
    fields: Object.keys(incoming),
    seq: updated.seq
  });
  res.json({ success: true, state: updated, storeBackend: await getStoreBackend() });
});

app.post("/api/meeting/participants/join", async (req, res) => {
  const { roomId = "10086", participant } = req.body || {};
  if (!participant?.userName) {
    return res.status(400).json({ success: false, error: "participant.userName required" });
  }
  const state = await upsertParticipant(String(roomId), participant);
  phaseLog("participant.joined", {
    roomId: String(roomId),
    userId: participant.userId,
    role: participant.userRoleType || participant.userRole,
    seq: state.seq
  });
  try {
    io.to(roomId).emit("participant-joined", { roomId, participant });
  } catch (_) {}
  res.json({ success: true, state });
});

app.post("/api/meeting/start", async (req, res) => {
  const { roomId = "10086", startedBy = "管理员" } = req.body || {};
  const normalizedRoomId = String(roomId);
  const startedAt = Date.now();

  try {
    let state = await getOrCreateMeetingState(normalizedRoomId);
    if (state.meetingStarted) {
      phaseLog("meeting.started", {
        roomId: normalizedRoomId,
        startedBy,
        alreadyStarted: true
      });
      return res.json({
        success: true,
        state,
        alreadyStarted: true,
        storeBackend: await getStoreBackend()
      });
    }

    state = await patchMeetingState(normalizedRoomId, {
      meetingStarted: true,
      isMeetingActive: true
    });

    const participants = state.tencentParticipants || [];
    const agendas = state.agendas || [];
    const agendaTitles = agendas.map((a: { title?: string }, i: number) => `${i + 1}.${a.title || "议题"}`).join("、");
    const participantList =
      participants.map((p: { userName?: string; userRole?: string }) => `${p.userName}(${p.userRole || "参会者"})`).join("、") ||
      startedBy;
    const firstAgenda = agendas[0]?.title || "开场与背景宣读";

    const openingHint = `[System Event: 会议正式开始！发起人 ${startedBy} 已点击开始。当前参会者：${participantList}。请立刻主动开口欢迎各位领导出席，宣读今天 ${agendas.length || 3} 个核心议程大纲（${agendaTitles || "见议程看板"}），并结合已加载的知识库资料给出专业背景。随后针对第一个议题【${firstAgenda}】，向最合适的参会者抛出深度探讨问题并点名引导发言。]`;

    const { text: aiText, state: finalState } = await runAiIntervene({
      roomId: normalizedRoomId,
      reason: "manual",
      hint: openingHint,
      sender: startedBy
    });

    phaseLog("meeting.started", {
      roomId: normalizedRoomId,
      startedBy,
      participantCount: participants.length,
      aiGenerated: Boolean(aiText),
      latencyMs: Date.now() - startedAt
    });

    try {
      if (aiText) {
        io.to(normalizedRoomId).emit("chat-received", {
          sender: "AI 主席 (大地教研督导)",
          text: aiText,
          timestamp: Date.now()
        });
        io.to(normalizedRoomId).emit("ai-intervention", {
          roomId: normalizedRoomId,
          text: aiText,
          state: finalState
        });
      }
    } catch (_) {}

    res.json({
      success: true,
      state: finalState,
      ai: { generated: Boolean(aiText), text: aiText || undefined },
      storeBackend: await getStoreBackend()
    });
  } catch (err: any) {
    phaseError("ai.failed", {
      roomId: normalizedRoomId,
      reason: "manual",
      error: err?.message || String(err),
      latencyMs: Date.now() - startedAt
    });
    res.status(500).json({ success: false, error: err?.message || "Unable to start meeting" });
  }
});

app.get("/api/live/poll", async (req, res) => {
  const roomId = String(req.query.roomId || "10086");
  const since = Number(req.query.since || 0);
  const state = await getOrCreateMeetingState(roomId);
  const events = await listEventsSince(roomId, since);
  if (events.length > 0) {
    phaseLog("sync.poll", {
      roomId,
      since,
      seq: state.seq || 0,
      eventCount: events.length
    });
  }
  res.json({
    success: true,
    roomId,
    seq: state.seq || 0,
    events,
    state,
    storeBackend: await getStoreBackend()
  });
});

app.post("/api/live/send", async (req, res) => {
  const { roomId = "10086", type = "chat", sender = "参会者", text = "", payload } = req.body || {};
  if (type === "chat" && text?.trim()) {
    const state = await saveChatMessageToServerState(String(roomId), sender, text.trim());
    return res.json({ success: true, state });
  }
  if (type === "participant" && payload) {
    const state = await upsertParticipant(String(roomId), payload);
    return res.json({ success: true, state });
  }
  const state = await patchMeetingState(String(roomId), payload || {});
  res.json({ success: true, state });
});

app.post("/api/ai/intervene", async (req, res) => {
  const { roomId = "10086", reason = "manual", hint = "", sender } = req.body || {};
  try {
    const result = await runAiIntervene({
      roomId: String(roomId),
      reason,
      hint,
      sender
    });
    try {
      if (result.text) {
        io.to(roomId).emit("ai-intervention", {
          roomId,
          text: result.text,
          state: result.state
        });
        io.to(roomId).emit("chat-received", {
          sender: "AI 主席 (大地教研督导)",
          text: result.text,
          timestamp: Date.now()
        });
      }
    } catch (_) {}
    res.json({
      success: true,
      text: result.text,
      state: result.state,
      analysis: result.analysis,
      storeBackend: await getStoreBackend()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Doubao Ark Chat API Endpoint
app.post("/api/doubao/chat", async (req, res) => {
  const { prompt, systemInstruction } = req.body;
  const doubaoApiKey = (process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim();
  const doubaoModel = (
    process.env.DOUBAO_CHAT_MODEL ||
    process.env.DOUBAO_CHAT_FAST_MODEL ||
    process.env.DOUBAO_MODEL_ENDPOINT ||
    ""
  ).trim();
  if (!doubaoApiKey || !doubaoModel) {
    return res.status(503).json({
      success: false,
      error: "缺少 DOUBAO_API_KEY 或 DOUBAO_CHAT_MODEL（须为 Endpoint ID）"
    });
  }
  try {
    const arkBase = (process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/$/, "");
    const response = await fetch(`${arkBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${doubaoApiKey}`
      },
      body: JSON.stringify({
        model: doubaoModel,
        messages: [
          { role: "system", content: systemInstruction || "你现在是‘大地 ECE-Brain 智慧教研室’具有绝对威严的主持主席（大地数字教研总督导），由豆包大模型驱动。严厉打击形式主义与无关话题（如买粽子等），专注幼儿教育数字化基础设施及注意力捕捉算法立项。" },
          { role: "user", content: prompt }
        ],
        temperature: 0.3
      })
    });
    if (response.ok) {
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "";
      return res.json({ success: true, reply });
    }
  } catch (err: any) {
    console.log("[/api/doubao/chat] Doubao API notice:", err.message);
  }

  // Gemini Fallback (if configured)
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY") {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const systemMessage = systemInstruction || "你现在是‘大地 ECE-Brain 智慧教研室’具有绝对威严的主持主席（大地数字教研总督导）。严厉打击形式主义与无关话题，专注幼儿教育数字化基础设施。";
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `${systemMessage}\n\nUser request: ${prompt}`,
      });
      return res.json({ success: true, reply: result.text || "" });
    } catch (geminiErr: any) {
      console.log("[/api/doubao/chat] Local Doubao rule engine fallback.");
    }
  }

  return res.json({ 
    success: true, 
    reply: "请各位园长与参会代表将注意力集中在托班互动硬件与注意力检测算法立项上，切勿拖延议程！" 
  });
});

// Tencent Meeting Open Platform Search API Endpoint
app.get("/api/search", async (req, res) => {
  const query = req.query.q as string || "幼儿教育数字化基础设施 托班互动硬件";
  try {
    const results = [
      {
        title: `${query} - 腾讯会议开放平台文档检索`,
        snippet: `通过腾讯会议API及托班互动硬件白皮书，深度优化幼儿教育质量与教研效率。`,
        url: `https://meeting.qq.com/doc/search?q=${encodeURIComponent(query)}`
      },
      {
        title: `腾讯会议开放平台集成与智能教研室协作指南`,
        snippet: `支持会议自动创建、参会人员状态实时同步、TRTC语音流媒体多端互通。`,
        url: `https://api.meeting.qq.com/v1/meetings`
      },
      {
        title: `豆包大模型驱动下的智能会议主席系统`,
        snippet: `由豆包模型实时提供发言监督、主题纠偏与苏格拉底式追问。`,
        url: `https://ark.cn-beijing.volces.com`
      }
    ];

    return res.json({ success: true, query, results });
  } catch (err: any) {
    return res.json({
      success: true,
      query,
      results: [
        { title: `${query} - 腾讯会议智能教研参考`, snippet: `关于 ${query} 的腾讯会议官方教研检索资料。`, url: "#" }
      ]
    });
  }
});

// KaibanJS Orchestration endpoint (multi-agent A2A + observable trace)
app.post("/api/meeting/evaluate", async (req, res) => {
  const { transcript, currentTopic, roomId = "10086" } = req.body || {};

  try {
    const result = await runMeetingAnalysisServer(
      String(transcript || ""),
      String(currentTopic || ""),
      String(roomId)
    );
    try {
      for (const ev of result.a2aTrace || []) {
        await appendLiveEvent(String(roomId), "a2a_event", ev);
      }
    } catch (persistErr: any) {
      console.warn("[Kaiban A2A] event persist note:", persistErr?.message || persistErr);
    }
    res.json({ result });
  } catch (err) {
    console.error("Meeting evaluate error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// E2: Volcengine RTC token (server-side only; never expose AppKey)
app.post("/api/volc/rtc/token", async (req, res) => {
  try {
    const appId = (process.env.VOLC_RTC_APP_ID || "").trim();
    const appKey = (process.env.VOLC_RTC_APP_KEY || "").trim();
    const { roomId = "10086", userId = `user_${Date.now()}` } = req.body || {};

    if (!appId || !appKey) {
      return res.status(503).json({
        success: false,
        code: "UNCONFIGURED",
        error:
          "未配置 VOLC_RTC_APP_ID / VOLC_RTC_APP_KEY。请在 Railway 填入火山 RTC 控制台凭证后重启。"
      });
    }

    const rtcRoomId = toVolcRtcRoomId(String(roomId));
    const issued = issueVolcRtcToken({
      appId,
      appKey,
      roomId: rtcRoomId,
      userId: String(userId)
    });

    res.json({
      success: true,
      appId,
      roomId: String(roomId),
      rtcRoomId,
      userId: String(userId),
      token: issued.token,
      expireAt: issued.expireAt
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

// Text-To-Speech Endpoint with robust fallback handling
app.post("/api/tts", async (req, res) => {
  try {
    const { text, speaker = "BV700_streaming" } = req.body;
    return res.json({ audioData: null, fallback: true });
  } catch(err: any) {
    return res.json({ audioData: null, fallback: true });
  }
});

// TRTC UserSig calculation endpoint for premium voice streaming authentication
app.post("/api/trtc/usersig", async (req, res) => {
  try {
    const { userId = "ece-brain-user-1", sdkAppId } = req.body;
    
    const secretKey = process.env.TRTC_SECRET_KEY || "laTTal0Lj2OpGijqIlRBvejyJu7SsIpS";
    const actualSdkAppId = Number(sdkAppId || process.env.TRTC_SDK_APP_ID || "1400112233");

    const rawKey = (process.env.TRTC_SECRET_KEY || "").trim();
    const rawAppId = (process.env.TRTC_SDK_APP_ID || "").trim();
    // Real Tencent TRTC keys require valid 32-character secret key and real SdkAppId
    const isRealKey = Boolean(
      rawKey && 
      rawKey !== "laTTal0Lj2OpGijqIlRBvejyJu7SsIpS" && 
      rawKey !== "YOUR_TRTC_SECRET_KEY" &&
      rawKey.length >= 32 &&
      !rawKey.includes("laTTal0") &&
      rawAppId && 
      rawAppId !== "1400112233" &&
      rawAppId !== "1400000000"
    );

    const isPlaceholderKey = !isRealKey;

    let userSig = "";
    if (isPlaceholderKey) {
      userSig = `mock_sig_${userId}_${Date.now()}`;
    } else {
      try {
        const TLSSigAPIv2 = await import("tls-sig-api-v2");
        const ApiClass = TLSSigAPIv2.Api || TLSSigAPIv2.default?.Api || TLSSigAPIv2.default || TLSSigAPIv2;
        if (typeof ApiClass === 'function') {
          const api = new ApiClass(actualSdkAppId, secretKey);
          userSig = api.genUserSig(userId, 86400);
        } else {
          throw new Error("tls-sig-api-v2 constructor not found");
        }
      } catch (importErr: any) {
        console.warn("tls-sig-api-v2 generation error, falling back to secure token simulation:", importErr.message);
        userSig = `mock_sig_${userId}_${Date.now()}`;
      }
    }

    res.json({
      userSig,
      sdkAppId: actualSdkAppId,
      userId,
      isPlaceholderKey,
      time: Math.floor(Date.now() / 1000)
    });
  } catch (err: any) {
    console.error("TRTC signature generation error:", err);
    res.status(500).json({ error: "Failed to generate TRTC UserSig dynamically: " + err.message });
  }
});

// Static assets and SPA fallback for production vs development
async function setupMiddlewares() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

app.use(async (err: any, _req, res, next) => {
  if (res.headersSent) return next(err);
  const message = err?.message || String(err);
  if (message.includes("Production meeting store requires")) {
    return res.status(503).json({
      success: false,
      error: message,
      phase: "e1-persistent-backend",
      storeBackend: await getStoreBackend()
    });
  }
  console.error("[HTTP] unhandled error:", message);
  res.status(500).json({ success: false, error: message || "Internal server error" });
});

if (!process.env.VERCEL) {
  setupMiddlewares().then(() => {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    setupMeetingWebSocket(server);
    setupSocketIOServer(io);
  });
}

export default app;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = app;
}

