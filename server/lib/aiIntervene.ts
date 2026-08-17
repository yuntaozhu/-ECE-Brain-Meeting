/**
 * Shared helpers for Phase-1 AI host intervention (Kaiban + RAG context).
 */
import { runMeetingAnalysisServer } from "../../src/lib/kaibanMeetingEngine.server";
import {
  getOrCreateMeetingState,
  listRagChunks,
  saveChatMessageToServerState,
  searchRag,
  patchMeetingState,
  type MeetingState
} from "./meetingStore";
import { phaseLog } from "./phaseLogger";

function hashEmbed(text: string, dim = 1024): number[] {
  return Array.from({ length: dim }, (_, i) => Math.sin(i + text.length * 0.17 + (text.charCodeAt(i % Math.max(text.length, 1)) || 1)));
}

async function embedQuery(query: string): Promise<{ embedding: number[]; isReal: boolean }> {
  const doubaoApiKey = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "";
  if (doubaoApiKey) {
    try {
      const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/embeddings/multimodal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${doubaoApiKey}`
        },
        body: JSON.stringify({
          model: process.env.DOUBAO_EMBED_MODEL || "doubao-embedding-vision-251215",
          instructions:
            "Target_modality: text and video.\nInstruction:Compress the text/video into one word.\nQuery:",
          input: [{ type: "text", text: query || "教研检索" }],
          dimensions: 1024,
          multi_embedding: { type: "enabled" },
          sparse_embedding: { type: "enabled" },
          encoding_format: "float"
        })
      });
      if (response.ok) {
        const data = await response.json();
        const vec = data.data?.[0]?.embedding || data.data?.[0]?.dense_embedding;
        if (Array.isArray(vec)) return { embedding: vec, isReal: true };
      }
    } catch (err) {
      console.warn("[aiIntervene] query embed failed:", err);
    }
  }
  return { embedding: hashEmbed(query), isReal: false };
}

export async function buildRagContext(roomId: string, query: string, topK = 4): Promise<string> {
  const { embedding } = await embedQuery(query);
  let hits = await searchRag(roomId, embedding, topK);
  if (!hits.length) {
    const chunks = await listRagChunks(roomId);
    hits = chunks.slice(0, topK).map((c) => ({
      fileName: c.fileName,
      snippet: c.text.slice(0, 200),
      text: c.text,
      similarity: 0.5
    }));
  }
  if (!hits.length) return "";
  return hits
    .map((h, i) => `[RAG${i + 1} ${h.fileName} sim=${h.similarity.toFixed(3)}] ${h.snippet}`)
    .join("\n");
}

export type InterveneReason = "silence" | "timeout" | "offtopic" | "manual" | "chat";

export async function runAiIntervene(options: {
  roomId: string;
  reason: InterveneReason;
  sender?: string;
  hint?: string;
}): Promise<{ text: string; state: MeetingState; analysis: any }> {
  const { roomId, reason, sender, hint } = options;
  const startedAt = Date.now();
  const state = await getOrCreateMeetingState(roomId);

  if (!state.meetingStarted && reason !== "manual") {
    phaseLog("ai.skipped", {
      roomId,
      reason,
      skipReason: "meeting_not_started",
      latencyMs: Date.now() - startedAt
    });
    return { text: "", state, analysis: { shouldIntervene: false } };
  }

  const recentTranscript = (state.transcript || [])
    .slice(-10)
    .map((t: any) => `${t.speaker}: ${t.text}`)
    .join("\n");
  const currentAgenda = `议程阶段: ${state.agendaStage || "IceBreaking"}. 主题: ${state.currentTopic || "教研研讨"}`;
  const ragQuery = hint || recentTranscript.slice(-200) || state.currentTopic || "托班数字化";
  const ragContext = await buildRagContext(roomId, ragQuery);
  phaseLog("ai.start", {
    roomId,
    reason,
    transcriptLines: state.transcript?.length || 0,
    ragContext: Boolean(ragContext)
  });

  const analysis = await runMeetingAnalysisServer(
    `${recentTranscript}\n[干预原因:${reason}] ${hint || ""}\n[知识库]\n${ragContext}`,
    currentAgenda
  );

  let aiResponseText = "";
  if (analysis.shouldIntervene && analysis.interventionText) {
    aiResponseText = analysis.interventionText;
  } else if (reason === "silence") {
    aiResponseText =
      "【AI主席】会场已静默超过阈值。请下一位园长就当前议程中的托班注意力与硬件指标发言。";
  } else if (reason === "timeout") {
    aiResponseText = `【AI主席】本环节时间到。请收束观点，准备进入下一议程。${analysis.nextStageRecommendation ? `建议流转至 ${analysis.nextStageRecommendation}。` : ""} [ACTION: AGENDA_NEXT]`;
  } else if (reason === "manual") {
    aiResponseText =
      analysis.interventionText ||
      "【AI主席】请各位聚焦当前教研议程，围绕资料中的核心指标展开讨论。";
  } else if (reason === "chat") {
    if (analysis.shouldIntervene && analysis.interventionText) {
      aiResponseText = analysis.interventionText;
    } else if (
      hint &&
      (hint.includes("你好") || hint.includes("在吗") || hint.includes("收到") || hint.includes("测试"))
    ) {
      aiResponseText = `【AI主席导流】欢迎 ${sender || "参会者"} 介入研讨！请针对托班数字化硬件及注意力指标发表考评意见。`;
    }
  } else if (analysis.interventionText) {
    aiResponseText = analysis.interventionText;
  }

  if (!aiResponseText && reason !== "chat") {
    aiResponseText =
      analysis.interventionText ||
      "【AI主席】请围绕当前议程继续发言，避免行政杂谈，保持学术讨论节奏。";
  }

  let finalState = state;
  if (aiResponseText) {
    finalState = await saveChatMessageToServerState(roomId, "AI 主席 (大地教研督导)", aiResponseText);
    if (Array.isArray(analysis.latestToDos) && analysis.latestToDos.length) {
      finalState = await patchMeetingState(roomId, { latestToDos: analysis.latestToDos });
    }
    if (analysis.nextStageRecommendation && (reason === "timeout" || String(aiResponseText).includes("AGENDA_NEXT"))) {
      finalState = await patchMeetingState(roomId, {
        agendaStage: analysis.nextStageRecommendation
      });
    }
    phaseLog("ai.completed", {
      roomId,
      reason,
      shouldIntervene: Boolean(analysis.shouldIntervene),
      replyLength: aiResponseText.length,
      seq: finalState.seq,
      latencyMs: Date.now() - startedAt
    });
  } else {
    phaseLog("ai.skipped", {
      roomId,
      reason,
      shouldIntervene: Boolean(analysis.shouldIntervene),
      latencyMs: Date.now() - startedAt
    });
  }

  return { text: aiResponseText, state: finalState, analysis };
}

export { embedQuery, hashEmbed };
