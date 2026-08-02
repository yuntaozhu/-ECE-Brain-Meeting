import { useState, useCallback } from "react";
import { useMeetingStore } from "../store";

export type AgentStatusType = "Idle" | "Thinking" | "Intervening";

import { speakText } from "../lib/audioSpeech";

export function useKaibanMeeting() {
  const { 
    transcript, 
    currentTopic, 
    aiIntervention, 
    aiSummary, 
    setAiIntervention, 
    setAiSummary,
    addTranscriptLine 
  } = useMeetingStore();

  const [agentStatus, setAgentStatus] = useState<AgentStatusType>("Idle");
  const [loading, setLoading] = useState(false);

  // Trigger KaibanJS evaluation (Chairperson & Secretary workflow)
  const evaluateMeeting = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setAgentStatus("Thinking");

    try {
      // Build flattened transcript block from meeting store
      const textLog = transcript.map(t => `${t.speaker}: ${t.text}`).join("\n");
      
      const res = await fetch("/api/meeting/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: textLog, currentTopic })
      });
      
      if (!res.ok) {
         throw new Error("HTTP connection failed evaluating KaibanJS team");
      }

      const data = await res.json();
      
      if (data.result) {
        const { intervention, summary } = data.result;
        
        setAiSummary(summary || "");
        
        if (intervention && intervention !== "PROCEED") {
          setAgentStatus("Intervening");
          setAiIntervention(intervention);
          
          // AI Chairperson inserts a disciplinary line dynamically in the transcript log
          addTranscriptLine("AI 主席 (大地教研督导)", intervention);
          
          // Optionally speak the intervention using browser TTS or express API
          playInterventionTTS(intervention);
        } else {
          setAiIntervention(null);
          setAgentStatus("Idle");
        }
      }
    } catch (err) {
      console.error("Failed to run KaibanJS team orchestration:", err);
      setAgentStatus("Idle");
    } finally {
      setLoading(false);
      // Fallback transition from intervening state back to idle
      setTimeout(() => {
         setAgentStatus((prev) => prev === "Intervening" ? "Idle" : prev);
      }, 5000);
    }
  }, [transcript, currentTopic, loading, setAiIntervention, setAiSummary, addTranscriptLine]);

  // Utility to synthesize chair intervention text via Gemini TTS endpoint
  const playInterventionTTS = async (text: string) => {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, speaker: "Puck" })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audioData) {
          const binary = atob(data.audioData);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: "audio/wav" });
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          await audio.play();
          return;
        }
      }
      throw new Error("Neural TTS fallback requested");
    } catch (err: any) {
      speakText(text, { rate: 1.1, pitch: 0.95 });
    }
  };

  return {
    agentStatus,
    secretaryNotes: aiSummary || "暂无最新纪要。点击‘运行 KaibanJS 评估’可实时由 AI 秘书归纳提取共识。",
    isHostSpeaking: agentStatus === "Intervening",
    evaluateMeeting,
    loading
  };
}
