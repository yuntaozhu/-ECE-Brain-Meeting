import { KaibanAnalysisResult } from "../types";
import { GoogleGenAI } from "@google/genai";

export async function runMeetingAnalysisServer(recentTranscript: string, currentAgenda: string): Promise<KaibanAnalysisResult> {
  const doubaoApiKey = process.env.DOUBAO_API_KEY || "ark-20c57eca-6b75-4581-bb78-023f7776df4e-58bd0";

  // 1. Try Doubao Ark API first as requested ("大模型上，先使用豆包的key")
  if (doubaoApiKey) {
    try {
      console.log(`[Meeting Engine] Promoting evaluation request using Doubao Ark API (Model: doubao-seed-2-1-pro-260628)...`);
      const prompt = `
        You are resolving an interactive multiplayer classroom briefing session. 
        Analyze the current meeting logs and synthesize the joint work of your multi-agent team:
        1. KAgent [AI 主席 (大地教研督导)]: Strict supervisor on kindergarten children interactivity digital hardware. Reject holiday food budgets/purchases, prevent speech monopolization.
        2. KAgent [AI 秘书]: Real-time academic tracking of consensus on toddler multimedia and attention verification algorithms.
        
        Current Agenda Stage/Context: "${currentAgenda}"
        Recent Multi-User Speech Transcript:
        "${recentTranscript}"

        Evaluate the conversation based on the following rules:
        1. "shouldIntervene": set to true if someone is severely off-topic (e.g. talking about "端午粽子", "场地和礼品采购", "财务报销", "预算买粽子"), or if someone is monopolizing/dominating the speech and you want the Host to balance speech of other quieter participants (e.g., 李园长, 王董秘, 张校董).
        2. "interventionText": if shouldIntervene is true, generate a sharp, extremely dignified, high-energy interruption warning from the AI Chairman (大地教研督导) in less than 35 Chinese characters. Address the speaker directly and command him to return to topic, or explicitly call on other quieter attendees to state their views. (e.g. "王董秘，别谈采购了！李园长，请简述您的托班数字化验证立项！"). If shouldIntervene is false, set this to "".
        3. "latestToDos": Extract 3 high-quality academic digital agenda TODO actions relevant to children attention hardware, sensor platforms, or class design, formatted as: ["1. ...", "2. ...", "3. ..."]. Keep them short and professional.
        4. "nextStageRecommendation": If the discussion is very rich, recommend moving to the next stage ("IceBreaking", "MainDiscussion", "Conclusion"). Otherwise, set to null.

        Your response MUST be a pure, raw, mini JSON object. NO markdown formatting, NO \`\`\`json blocks.
        Schema:
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
          model: "doubao-seed-2-1-pro-260628",
          messages: [
            { role: "system", content: "You are a professional educational AI meeting coordinator." },
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
        console.log(`[Meeting Engine] Successfully retrieved LLM analysis from Doubao API`);
        return {
          shouldIntervene: Boolean(parsed.shouldIntervene),
          interventionText: parsed.interventionText || "",
          latestToDos: Array.isArray(parsed.latestToDos) ? parsed.latestToDos : [],
          nextStageRecommendation: parsed.nextStageRecommendation || null
        };
      } else {
        const errText = await response.text();
        if (errText.includes("ModelNotOpen") || response.status === 404) {
          console.log(`[Meeting Engine] Doubao model not activated in Ark Console. Seamlessly falling back to Gemini/Heuristics...`);
        } else {
          console.warn(`[Meeting Engine] Doubao API request failed (${response.status}): ${errText}. Falling back to Gemini...`);
        }
      }
    } catch (doubaoErr: any) {
      console.log(`[Meeting Engine] Doubao API skipped or unavailable. Falling back to Gemini/Heuristics...`);
    }
  }

  // Gemini key disabled per user request ("不使用 Gemini的key")
  console.log("[Meeting Engine] 🧠 Gemini API calls disabled per user preference. Running local heuristic analysis.");
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
