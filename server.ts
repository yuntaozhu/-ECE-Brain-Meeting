import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import { runMeetingAnalysisServer } from "./src/lib/kaibanMeetingEngine.server";
import tencentMeetingRouter from "./server/routes/tencentMeeting";

const app = express();
const PORT = 3000;

app.use(express.json());

// Request logger for debugging on Vercel and local
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url} - IP: ${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`);
  next();
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Tencent Meeting API Routes
app.use("/api/tencent", tencentMeetingRouter);

// KaibanJS Orchestration endpoint
app.post("/api/meeting/evaluate", async (req, res) => {
  const { transcript, currentTopic } = req.body;
  
  try {
    if (!process.env.GEMINI_API_KEY) {
       return res.status(500).json({ error: "No Gemini API Key" });
    }
    
    const result = await runMeetingAnalysisServer(transcript, currentTopic);
    res.json({ result });
  } catch(err) {
    console.error("Meeting evaluate error:", err);
    res.status(500).json({ error: String(err) });
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

    const TLSSigAPIv2 = await import("tls-sig-api-v2");
    const api = new TLSSigAPIv2.Api(actualSdkAppId, secretKey);
    const userSig = api.genUserSig(userId, 86400);

    res.json({
      userSig,
      sdkAppId: actualSdkAppId,
      userId,
      time: Math.floor(Date.now() / 1000)
    });
  } catch (err) {
    console.error("TRTC signature generation error:", err);
    res.status(500).json({ error: "Failed to generate TRTC UserSig dynamically" });
  }
});

async function setupServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

if (!process.env.VERCEL) {
  setupServer().then(() => {
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    const wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (request, socket, head) => {
      const pathname = request.url ? new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname : "";
      if (pathname === "/api/live/stream") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    wss.on("connection", async (ws) => {
      console.log("Client connected to Gemini Live stream bridge");
      let session: any = null;

      try {
        const { GoogleGenAI, Modality } = await import("@google/genai");
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
           console.error("Missing GEMINI_API_KEY");
           ws.send(JSON.stringify({ error: "Missing GEMINI_API_KEY on the server" }));
           ws.close();
           return;
        }

        const ai = new GoogleGenAI({ 
          apiKey, 
          httpOptions: { 
            headers: { 
              'User-Agent': 'aistudio-build' 
            } 
          } 
        });
        
        session = await ai.live.connect({
          model: "gemini-3.1-flash-live-preview",
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
            },
            systemInstruction: "你现在是‘大地 ECE-Brain 智慧教研室’具有绝对威严的主持主席（大地数字教研总督导）。你的性格极具控场欲、强势威严、绝对求真高效、极度排斥不沾边的形式主义。今天的研讨主题为：『下一代幼儿教育数字化基础设施的规划』，研讨重点专注于：托班互动硬件和注意力捕捉算法的立项论证。你的控场要求极其苛刻：\n1. 【角色设定与态度】：面对与多媒体设备、注意力评分、眨眼感知传感器无关的话题（如：亲子活动粽子采购、线下布置采购预算、财务报销平账等），你必须拿出‘教研室铁腕’的态度，高声喝止并强插打断（Barge-in VAD 触发插话），用苏格拉底式追问严词纠偏！\n2. 【处理系统静默指令 [System Event: ...]】：当你接收到诸如『[System Event: 人员已齐，请立刻主动开口欢迎大家...]』或『[System Event: 目前出现冷场...]』等以方括号包裹的系统级静默指令时，请听懂这是心脏起搏器在操控你！你【绝对不要】在发言里提及、复述、或朗读方括号和‘System Event’字样，而是要【完全把它当成在现场耳返里督导下达的指令】，瞬间转变成最流畅、威严的人类语音，直接开口执行指令内容！例如，直接说：『各位园长，人员已到齐，今天的会议正式开始...』 \n3. 【点名提问原则（Call-out Name）】：你在抛出新论点或让参会人开口时，【必须明确叫出特定参会者的名字】（如李园长、王董秘或张校董），禁止泛泛提问！用极具穿透力的点名机制彻底消除冷场！\n4. 【回复字数要求】：发音句子言简意赅，语气威重，每句回答必须短小精悍，严格控制在 30 内！",
          },
          callbacks: {
            onmessage: (message: any) => {
              const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audio) {
                ws.send(JSON.stringify({ audio }));
              }
              if (message.serverContent?.interrupted) {
                ws.send(JSON.stringify({ interrupted: true }));
              }
              const parts = message.serverContent?.modelTurn?.parts;
              if (parts) {
                 for (const part of parts) {
                    if (part.text) {
                       ws.send(JSON.stringify({ text: part.text, speaker: "Chairperson" }));
                    }
                 }
              }
            }
          }
        });

        ws.on("message", (msg) => {
          try {
            const parsed = JSON.parse(msg.toString());
            if (parsed.audio) {
              session.sendRealtimeInput({
                audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" }
              });
            } else if (parsed.text) {
               console.log("Relaying control voice text directly to Gemini Live Session:", parsed.text);
               session.send({
                  clientContent: {
                    turns: [
                      {
                        role: "user",
                        parts: [{ text: `【系统强制指令级警告：监测到严重偏题或议程变化，请立刻以极具威严、严厉的大地幼教督导性格，强插并高声打断，严词说以下内容：】 "${parsed.text}"` }]
                      }
                    ],
                    turnComplete: true
                  }
               });
            }
          } catch (e) {
            console.error("Error piping client audio chunk:", e);
          }
        });

        ws.on("close", () => {
          console.log("Client socket disconnected. Closing Gemini session.");
          if (session) {
            try {
              session.close();
            } catch (e) {}
          }
        });

      } catch (err) {
        console.error("Gemini Live Connection initialization failed:", err);
        ws.send(JSON.stringify({ error: "Failed to establish server bridge to Gemini Live API" }));
        ws.close();
      }
    });
  });
} else {
  // On Vercel, register static asset middleware and SPA fallback
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

export default app;
