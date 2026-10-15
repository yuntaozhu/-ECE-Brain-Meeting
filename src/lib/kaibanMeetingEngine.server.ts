import { KaibanAnalysisResult, AgendaStageType } from "../types";
import { searchRag } from "../../server/lib/meetingStore";
import { hashEmbed } from "../../server/lib/aiIntervene";

export interface A2AEvent {
  eventId: string;
  timestamp: number;
  sender: string;
  target: string;
  action: string;
  payload: Record<string, unknown>;
}

export type KaibanAnalysisWithTrace = KaibanAnalysisResult & {
  a2aTrace: A2AEvent[];
};

function newEvent(
  sender: string,
  target: string,
  action: string,
  payload: Record<string, unknown> = {}
): A2AEvent {
  return {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    sender,
    target,
    action,
    payload
  };
}

async function doubaoChat(system: string, user: string): Promise<string | null> {
  const doubaoApiKey = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "";
  const doubaoModel = (
    process.env.DOUBAO_CHAT_MODEL ||
    process.env.DOUBAO_CHAT_FAST_MODEL ||
    process.env.DOUBAO_MODEL_ENDPOINT ||
    ""
  ).trim();
  if (!doubaoApiKey || !doubaoModel) return null;

  const arkBase = (process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/$/, "");
  const response = await fetch(`${arkBase}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${doubaoApiKey}`
    },
    body: JSON.stringify({
      model: doubaoModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.2
    })
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
}

function parseJsonLoose(raw: string): any {
  const clean = raw.replace(/```json/gi, "").replace(/```/gi, "").trim();
  return JSON.parse(clean);
}

function offTopicHeuristic(transcript: string) {
  return /粽子|预算|采购|报销|场地|礼品|礼盒|福利/.test(transcript);
}

/**
 * Real multi-step A2A pipeline (Director → Host → Secretary → Researcher).
 * Uses separate Doubao calls per agent role; falls back to heuristics.
 * Exposes a2aTrace so the UI can show Agent collaboration.
 */
export async function runMeetingAnalysisServer(
  recentTranscript: string,
  currentAgenda: string,
  roomId = "10086"
): Promise<KaibanAnalysisWithTrace> {
  const a2aTrace: A2AEvent[] = [];
  console.log("[KaibanJS A2A] DirectorAgent starting patrol...");

  // ── 1. DirectorAgent ──────────────────────────────────────────
  let director = {
    shouldIntervene: false,
    reason: "OK",
    nextStageRecommendation: null as AgendaStageType | null
  };

  try {
    const directorRaw = await doubaoChat(
      "You are DirectorAgent in a KaibanJS A2A team. Output raw JSON only.",
      `Agenda: ${currentAgenda}\nTranscript:\n${recentTranscript}\n\nDecide if intervention is needed (off-topic: 粽子/采购/报销/礼品; silence monopoly). JSON: {"shouldIntervene":boolean,"reason":"OFF_TOPIC"|"SILENCE"|"OK","nextStageRecommendation":"IceBreaking"|"MainDiscussion"|"Conclusion"|null}`
    );
    if (directorRaw) {
      const parsed = parseJsonLoose(directorRaw);
      director = {
        shouldIntervene: Boolean(parsed.shouldIntervene),
        reason: String(parsed.reason || "OK"),
        nextStageRecommendation: parsed.nextStageRecommendation || null
      };
    } else {
      throw new Error("no doubao");
    }
  } catch {
    const off = offTopicHeuristic(recentTranscript);
    const lines = (recentTranscript.match(/\n/g) || []).length;
    director = {
      shouldIntervene: off,
      reason: off ? "OFF_TOPIC" : "OK",
      nextStageRecommendation:
        lines > 10 && currentAgenda.includes("IceBreaking")
          ? "MainDiscussion"
          : lines > 18 && currentAgenda.includes("MainDiscussion")
            ? "Conclusion"
            : null
    };
  }

  a2aTrace.push(
    newEvent("DirectorAgent", "HostAgent", director.shouldIntervene ? "INTERVENTION_REQUIRED" : "STATUS_OK", {
      reason: director.reason,
      nextStageRecommendation: director.nextStageRecommendation
    })
  );

  // ── 2. HostAgent (only if Director flags) ─────────────────────
  let interventionText = "";
  if (director.shouldIntervene) {
    try {
      const hostRaw = await doubaoChat(
        "You are HostAgent (大地教研总督导). Output ONE Chinese intervention under 35 chars. No quotes.",
        `Reason: ${director.reason}\nTranscript:\n${recentTranscript}\nIssue a sharp academic redirect.`
      );
      interventionText = (hostRaw || "").trim().replace(/^["「]|["」]$/g, "").slice(0, 40);
    } catch {
      /* fallback below */
    }
    if (!interventionText) {
      interventionText =
        director.reason === "OFF_TOPIC"
          ? "请停止非学术闲聊，立刻回到托班数字化议题！"
          : "请相关园长继续汇报注意力检测硬件方案！";
    }
    a2aTrace.push(
      newEvent("HostAgent", "AudioOrchestrator", "PLAY_INTERVENTION", {
        ttsText: interventionText,
        reason: director.reason
      })
    );
  }

  // ── 3. SecretaryAgent ─────────────────────────────────────────
  let latestToDos = [
    "1. 汇总试点托班注意力检测硬件选型指标",
    "2. 核验护眼显示设备与课堂网络部署清单",
    "3. 将非学术行政议题移出会中研讨范围"
  ];
  try {
    const secretRaw = await doubaoChat(
      "You are SecretaryAgent. Output raw JSON only.",
      `Transcript:\n${recentTranscript}\nExtract 3 ECE academic TODOs. JSON: {"latestToDos":["1. ...","2. ...","3. ..."]}`
    );
    if (secretRaw) {
      const parsed = parseJsonLoose(secretRaw);
      if (Array.isArray(parsed.latestToDos) && parsed.latestToDos.length) {
        latestToDos = parsed.latestToDos.slice(0, 3);
      }
    }
  } catch {
    /* keep defaults */
  }
  a2aTrace.push(
    newEvent("SecretaryAgent", "TencentDocs", "UPDATE_TODOS", {
      latestToDos
    })
  );

  // ── 4. ResearcherAgent (RAG hint) ─────────────────────────────
  let researchSnippet = "";
  try {
    const emb = hashEmbed(recentTranscript.slice(-200) || currentAgenda);
    const hits = await searchRag(roomId, emb, 2);
    if (hits.length) {
      researchSnippet = hits.map((h) => h.snippet).join(" | ").slice(0, 240);
      a2aTrace.push(
        newEvent("ResearcherAgent", "HostAgent", "RAG_CONTEXT", {
          hits: hits.length,
          snippet: researchSnippet
        })
      );
    } else {
      a2aTrace.push(newEvent("ResearcherAgent", "HostAgent", "RAG_EMPTY", { roomId }));
    }
  } catch {
    a2aTrace.push(newEvent("ResearcherAgent", "HostAgent", "RAG_SKIP", {}));
  }

  return {
    shouldIntervene: director.shouldIntervene,
    interventionText,
    latestToDos,
    nextStageRecommendation: director.nextStageRecommendation,
    pushAudioStream: director.shouldIntervene,
    hostAgentPayload: {
      targetAgent: "HostAgent",
      audioOrchestratorNotify: director.shouldIntervene,
      ttsText: interventionText
    },
    a2aCommand: director.shouldIntervene
      ? {
          sender: "DirectorAgent",
          target: "HostAgent",
          action: "INTERVENTION_REQUIRED",
          payload: { interventionText, reason: director.reason, researchSnippet }
        }
      : undefined,
    a2aTrace
  };
}
