import { KaibanAnalysisResult } from "../types";
import { GoogleGenAI } from "@google/genai";

let genAIClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAIClient;
}

export async function runMeetingAnalysisServer(recentTranscript: string, currentAgenda: string): Promise<KaibanAnalysisResult> {
  const doubaoApiKey = process.env.DOUBAO_API_KEY || "ark-20c57eca-6b75-4581-bb78-023f7776df4e-58bd0";

  // KaibanJS A2A (Agent-to-Agent) Multi-Agent Orchestration Engine
  if (doubaoApiKey) {
    try {
      console.log(`[KaibanJS A2A Engine] Executing 4-Agent Orchestration (Director, Host, Secretary, Researcher)...`);
      const prompt = `
        You are the KaibanJS A2A Multi-Agent Orchestrator for the Dadi ECE-Brain Intelligent Meeting System.
        
        The Agent Team consists of:
        1. Director Agent (director_agent - 会议总控与议程裁决): Evaluates if the discussion stays strictly on topic or strays into off-topic chatter (e.g. "端午粽子", "采购", "报销", "礼包", "采购预算", "福利礼品"). Determines if an intervention is required or if agenda transition is ready.
        2. Host Agent (host_agent - AI 虚拟主席 / 大地教研总督导): Executes speech interventions with supreme dignity. Sharp interruption warning to correct off-topic speech or balance participant speaking time.
        3. Secretary Agent (secretary_agent - 会议纪要与共识整理员): Synthesizes 3 high-impact actionable items for early childhood education (ECE) digital hardware and attention verification algorithms.
        4. Researcher Agent (researcher_agent - 学术专家代表): References RAG knowledge base for toddler multimedia and classroom pedagogical frameworks.

        Current Agenda Stage/Context: "${currentAgenda}"
        Recent Multi-User Speech Transcript:
        "${recentTranscript}"

        Evaluate and respond strictly following these rules:
        1. "shouldIntervene": set to true if someone talks about off-topic items ("粽子", "采购", "报销", "礼品", "礼盒", "采购预算", "场地与活动") or if someone monopolizes speech.
        2. "interventionText": if shouldIntervene is true, generate a dignified, high-energy interruption warning from AI Host (大地教研督导) under 35 Chinese characters. E.g. "王董秘，别谈采购了！李园长，请简述您的托班数字化验证立项！".
        3. "latestToDos": Extract 3 academic TODO items relevant to ECE digital hardware, formatted as ["1. ...", "2. ...", "3. ..."].
        4. "nextStageRecommendation": If discussion on current topic is complete, suggest next stage ("IceBreaking", "MainDiscussion", "Conclusion"), otherwise null.

        Output strictly raw JSON without markdown codeblocks:
        {
          "shouldIntervene": boolean,
          "interventionText": "string",
          "latestToDos": ["string"],
          "nextStageRecommendation": "IceBreaking" | "MainDiscussion" | "Conclusion" | null
        }
      `;

      const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${doubaoApiKey}`
        },
        body: JSON.stringify({
          model: "doubao-seed-2-1-turbo-260628",
          messages: [
            { role: "system", content: "You are the KaibanJS A2A Engine executing multi-agent meeting supervision." },
            { role: "user", content: prompt }
          ],
          temperature: 0.2
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "{}";
        const cleanJson = content.replace(/```json/gi, "").replace(/```/gi, "").trim();
        const parsed = JSON.parse(cleanJson);
        console.log(`[KaibanJS A2A Engine] Successfully received A2A evaluation from Doubao Ark API`);
        return {
          shouldIntervene: Boolean(parsed.shouldIntervene),
          interventionText: parsed.interventionText || "",
          latestToDos: Array.isArray(parsed.latestToDos) ? parsed.latestToDos : [],
          nextStageRecommendation: parsed.nextStageRecommendation || null
        };
      } else {
        console.log(`[KaibanJS A2A Engine] Doubao model endpoint notice (${response.status}). Switching to Gemini/Heuristic engine.`);
      }
    } catch (err: any) {
      console.log(`[KaibanJS A2A Engine] Doubao request notice: ${err.message}`);
    }
  }

  // Gemini AI Orchestration Fallback
  const ai = getGeminiClient();
  if (ai) {
    try {
      console.log(`[KaibanJS A2A Engine] Executing Gemini A2A Orchestration Fallback...`);
      const prompt = `
        You are the KaibanJS A2A Multi-Agent Orchestrator for the Dadi ECE-Brain Intelligent Meeting System.
        Current Agenda Stage/Context: "${currentAgenda}"
        Recent Speech Transcript: "${recentTranscript}"

        Evaluate if someone talks off-topic ("粽子", "采购", "报销", "礼品", "预算").
        Return raw JSON only:
        {
          "shouldIntervene": boolean,
          "interventionText": string,
          "latestToDos": string[],
          "nextStageRecommendation": string | null
        }
      `;
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      const text = result.text || "{}";
      const cleanJson = text.replace(/```json/gi, "").replace(/```/gi, "").trim();
      const parsed = JSON.parse(cleanJson);
      return {
        shouldIntervene: Boolean(parsed.shouldIntervene),
        interventionText: parsed.interventionText || "",
        latestToDos: Array.isArray(parsed.latestToDos) ? parsed.latestToDos : [],
        nextStageRecommendation: parsed.nextStageRecommendation || null
      };
    } catch (geminiErr: any) {
      console.log(`[KaibanJS A2A Engine] Gemini fallback notice: ${geminiErr.message}`);
    }
  }

  // Local A2A Heuristic Fallback Engine
  return runLocalHeuristicFallback(recentTranscript, currentAgenda);
}

function runLocalHeuristicFallback(recentTranscript: string, currentAgenda: string): KaibanAnalysisResult {
  console.log("Safe Local Heuristic Engine evaluating transcript...");
  
  // Heuristic rule 1: detect off-topic topics (端午粽子, 预算, 采购, 报销, 礼盒)
  const containsOffTopic = 
    recentTranscript.includes("粽子") || 
    recentTranscript.includes("预算") || 
    recentTranscript.includes("采购") || 
    recentTranscript.includes("报销") || 
    recentTranscript.includes("场地") || 
    recentTranscript.includes("礼品") ||
    recentTranscript.includes("礼盒");
    
  let shouldIntervene = false;
  let interventionText = "";
  let nextStageRecommendation: any = null;

  if (containsOffTopic) {
    shouldIntervene = true;
    if (recentTranscript.includes("王董秘") || recentTranscript.includes("李") || recentTranscript.includes("张")) {
       interventionText = "王董秘，别谈采购预算了！李园长，请讲一下注意力抓取算法硬件规划！";
    } else {
       interventionText = "张总，请我们拉回正题，今天重在讨论托班多媒体和注意力检测，不要闲扯端午节采购预算！";
    }
  }

  // Heuristic rule 2: stage migration simulation based on accumulated statements
  const linesCount = (recentTranscript.match(/\n/g) || []).length;
  if (linesCount > 10 && currentAgenda.includes("IceBreaking")) {
    nextStageRecommendation = "MainDiscussion";
  } else if (linesCount > 18 && currentAgenda.includes("MainDiscussion")) {
    nextStageRecommendation = "Conclusion";
  }

  // High-fidelity child education academic TODO lists
  const defaultToDos = [
    "1. 李园长收集试点托班儿童的平均视力防护与眼球停留指标",
    "2. 张校董开始筹备第二代护眼防眩光多媒体显示平板的选型论证",
    "3. 王董秘全面核减无关行政性礼品费用，转向数字化课堂教改基金"
  ];

  if (recentTranscript.includes("李") && recentTranscript.includes("粽子")) {
    shouldIntervene = true;
    interventionText = "李园长，请注意！探讨偏离至粽子采购，大地教研严查非学术寒暄，请陈述多媒体硬件配置！";
  }

  return {
    shouldIntervene,
    interventionText,
    latestToDos: defaultToDos,
    nextStageRecommendation
  };
}
