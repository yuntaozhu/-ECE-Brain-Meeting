import { useEffect, useRef, useState, useCallback } from "react";
import { useMeetingStore } from "../store";
import { useGeminiLive } from "./useGeminiLive";
import { runMeetingAnalysis } from "../lib/kaibanMeetingEngine";
import { AgendaStageType } from "../types";

import { speakText } from "../lib/audioSpeech";

export function useMeetingOrchestrator() {
  const { 
    transcript, 
    currentTopic, 
    aiSummary,
    setAiSummary,
    aiIntervention,
    setAiIntervention,
    addTranscriptLine,
    agendaStage,
    setAgendaStage,
    latestToDos,
    setLatestToDos,
    joined
  } = useMeetingStore();

  const { sendControlText, isConnected } = useGeminiLive();
  const [analyzing, setAnalyzing] = useState(false);
  const [orchestratorStatus, setOrchestratorStatus] = useState<"Idle" | "Thinking" | "Intervening">("Idle");

  // Keep track of the last processed transcript index to avoid redundant processing
  const lastAnalyzedCountRef = useRef<number>(0);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronous web audio or speech synthesis utility to make the AI Chairperson talk aloud programmatically
  const speakTeacherIntervention = async (text: string) => {
    console.log("[Orchestration Audio] Instructing AI Chairperson to speak out loud:", text);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, speaker: "Puck" })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audioData) {
          console.log("[Orchestration Audio] Received neural TTS stream from Gemini. Playing...");
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

  // Trigger Kaiban Orchestration Core flow
  const triggerOrchestration = useCallback(async () => {
    if (analyzing || transcript.length === 0) return;
    
    // Check if there are newly added transcript lines to analyze
    if (transcript.length === lastAnalyzedCountRef.current) return;

    setAnalyzing(true);
    setOrchestratorStatus("Thinking");
    lastAnalyzedCountRef.current = transcript.length;

    try {
      console.log("KaibanJS Orchestrator started evaluating current meeting context...");
      const textLog = transcript.map(t => `${t.speaker}: ${t.text}`).join("\n");
      
      const result = await runMeetingAnalysis(textLog, `当前议程阶段: ${agendaStage}. 核心主题: ${currentTopic}`);
      
      if (result) {
        // 1. Process To-Dos
        if (result.latestToDos && result.latestToDos.length > 0) {
          setLatestToDos(result.latestToDos);
          // Sync SecretaryAgent TODOs to Tencent Meeting Docs API
          fetch("/api/tencent/doc/append", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ todos: result.latestToDos })
          }).catch(() => {});
        }

        // 2. Process Agenda Stage transition recommendation (Task 3)
        if (result.nextStageRecommendation && result.nextStageRecommendation !== agendaStage) {
          console.log(`Kaiban RECOMMENDED transitioning agenda from ${agendaStage} to ${result.nextStageRecommendation}`);
          setAgendaStage(result.nextStageRecommendation);
          addTranscriptLine(
            "系统提示", 
            `📊 会议进程智能流转：AI 督导评估上一阶段讨论已充分，当前已切换至【${
              result.nextStageRecommendation === 'IceBreaking' ? '阶段一：破冰与背景解读' : 
              result.nextStageRecommendation === 'MainDiscussion' ? '阶段二：核心议题研讨 (硬件与注意力)' : 
              '阶段三：共识梳理与行动计划'
            }】。`
          );
        }

        // 3. Control Injection (Task 2)
        if (result.shouldIntervene && result.interventionText) {
          setOrchestratorStatus("Intervening");
          setAiIntervention(result.interventionText);

          // Force voice barge-in by relaying the commanding text over the WS connection
          if (isConnected) {
            console.log("Control injection triggers! Force Gemini model to verbalize barge-in:", result.interventionText);
            sendControlText(result.interventionText);
          } else {
            console.warn("Direct WebSocket is not open, falling back to local chat text notification.");
          }
          
          // Log Chairperson intervention to transcript log
          addTranscriptLine("AI 主席 (大地教研督导)", result.interventionText);

          // Force the AI Chairperson to speak out loud via synthesized audio
          speakTeacherIntervention(result.interventionText);
        } else {
          setAiIntervention(null);
          setOrchestratorStatus("Idle");
        }
      }
    } catch (err: any) {
      console.warn("KaibanJS orchestration evaluating cycle notice:", err?.message || err);
      setOrchestratorStatus("Idle");
    } finally {
      setAnalyzing(false);
      // Automatically yield back to Idle state after speaking
      setTimeout(() => {
        setOrchestratorStatus((p) => p === "Intervening" ? "Idle" : p);
      }, 5000);
    }
  }, [transcript, agendaStage, currentTopic, analyzing, isConnected, setLatestToDos, setAgendaStage, addTranscriptLine, setAiIntervention, sendControlText]);


  // Timer-VAD and Silence Detection trigger
  useEffect(() => {
    if (!joined) return;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    // Set a silence threshold detector of 5 seconds or prompt after every 5 statements automatically
    const isAccumulatedNewText = (transcript.length - lastAnalyzedCountRef.current) >= 5;

    if (isAccumulatedNewText) {
      console.log("Accumulated conversation count exceeded threshold (+5). Running Kaiban Orchestration instantly.");
      triggerOrchestration();
    } else {
      // 5-seconds silence detection (No conversational updates for 5 seconds triggers analysis)
      silenceTimerRef.current = setTimeout(() => {
        console.log("5 Seconds of silence detected in ECE-Brain meeting space. Initiating Kaiban evaluation...");
        triggerOrchestration();
      }, 5000);
    }

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [transcript, joined, triggerOrchestration]);

  return {
    orchestratorStatus,
    analyzing,
    triggerOrchestration,
    agendaStage,
    latestToDos
  };
}
