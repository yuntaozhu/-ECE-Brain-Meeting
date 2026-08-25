import { useEffect, useRef, useState, useCallback } from "react";
import { useMeetingStore } from "../store";
import { useGeminiLive } from "./useGeminiLive";
import { runMeetingAnalysis } from "../lib/kaibanMeetingEngine";

import { speakText } from "../lib/audioSpeech";
import { shouldUseNativeWebSocket, getApiBase } from "../lib/realtimeChannel";
import { apiUrl } from "../lib/apiBase";

export function useMeetingOrchestrator() {
  const {
    transcript,
    currentTopic,
    setAiIntervention,
    addTranscriptLine,
    agendaStage,
    setAgendaStage,
    latestToDos,
    setLatestToDos,
    joined,
    meetingId
  } = useMeetingStore();

  const { sendControlText, isConnected } = useGeminiLive();
  const [analyzing, setAnalyzing] = useState(false);
  const [orchestratorStatus, setOrchestratorStatus] = useState<"Idle" | "Thinking" | "Intervening">("Idle");

  const lastAnalyzedCountRef = useRef<number>(0);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const speakTeacherIntervention = async (text: string) => {
    console.log("[Orchestration Audio] Instructing AI Chairperson to speak out loud:", text);
    try {
      const res = await fetch(apiUrl("/api/tts"), {
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
    } catch {
      speakText(text, { rate: 1.1, pitch: 0.95 });
    }
  };

  // force=true: UI「运行 A2A 巡检」可对同一批 transcript 重跑
  const triggerOrchestration = useCallback(
    async (opts?: { force?: boolean }) => {
      if (analyzing || transcript.length === 0) return;
      if (!opts?.force && transcript.length === lastAnalyzedCountRef.current) return;

      setAnalyzing(true);
      useMeetingStore.getState().setKaibanAnalyzing(true);
      setOrchestratorStatus("Thinking");
      useMeetingStore.getState().setKaibanStatus("Thinking");
      lastAnalyzedCountRef.current = transcript.length;

      try {
        console.log("KaibanJS Orchestrator started evaluating current meeting context...");
        const textLog = transcript.map((t) => `${t.speaker}: ${t.text}`).join("\n");

        const result = await runMeetingAnalysis(
          textLog,
          `当前议程阶段: ${agendaStage}. 核心主题: ${currentTopic}`,
          meetingId || "10086"
        );

        if (result?.a2aTrace?.length) {
          useMeetingStore.getState().appendA2aEvents(result.a2aTrace);
          console.log(
            "[Kaiban A2A Trace]",
            result.a2aTrace.map((e) => `${e.sender}→${e.target}:${e.action}`).join(" | ")
          );
        }

        if (result) {
          if (result.latestToDos && result.latestToDos.length > 0) {
            setLatestToDos(result.latestToDos);
            fetch(apiUrl("/api/tencent/doc/append"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ todos: result.latestToDos })
            }).catch(() => {});
          }

          if (result.nextStageRecommendation && result.nextStageRecommendation !== agendaStage) {
            console.log(
              `Kaiban RECOMMENDED transitioning agenda from ${agendaStage} to ${result.nextStageRecommendation}`
            );
            setAgendaStage(result.nextStageRecommendation);
            addTranscriptLine(
              "系统提示",
              `📊 会议进程智能流转：AI 督导评估上一阶段讨论已充分，当前已切换至【${
                result.nextStageRecommendation === "IceBreaking"
                  ? "阶段一：破冰与背景解读"
                  : result.nextStageRecommendation === "MainDiscussion"
                    ? "阶段二：核心议题研讨 (硬件与注意力)"
                    : "阶段三：共识梳理与行动计划"
              }】。`
            );
          }

          if (result.shouldIntervene && result.interventionText) {
            setOrchestratorStatus("Intervening");
            useMeetingStore.getState().setKaibanStatus("Intervening");
            setAiIntervention(result.interventionText);

            if (shouldUseNativeWebSocket()) {
              try {
                const { io } = await import("socket.io-client");
                const sock = io(getApiBase() || "/ws/meeting", {
                  query: { roomId: "10086", userName: "DirectorAgent", userRole: "agent" },
                  reconnectionAttempts: 0,
                  transports: ["websocket"]
                });
                sock.emit("a2a_event", {
                  sender: "DirectorAgent",
                  target: "AudioOrchestrator",
                  action: "ROUTE_AUDIO_TRTC",
                  payload: {
                    interventionText: result.interventionText,
                    reason: "OFF_TOPIC_DETECTED_BY_DIRECTOR"
                  }
                });
                setTimeout(() => sock.disconnect(), 1000);
              } catch (sockErr) {
                console.warn("Socket A2A emit note:", sockErr);
              }
            }

            if (isConnected) {
              console.log(
                "Control injection triggers! Force Gemini model to verbalize barge-in:",
                result.interventionText
              );
              sendControlText(result.interventionText);
            } else {
              console.warn("Direct WebSocket is not open, falling back to local chat text notification.");
            }

            addTranscriptLine("AI 主席 (大地教研督导)", result.interventionText);
            speakTeacherIntervention(result.interventionText);
          } else {
            setAiIntervention(null);
            setOrchestratorStatus("Idle");
            useMeetingStore.getState().setKaibanStatus("Idle");
          }
        }
      } catch (err: any) {
        console.warn("KaibanJS orchestration evaluating cycle notice:", err?.message || err);
        setOrchestratorStatus("Idle");
        useMeetingStore.getState().setKaibanStatus("Idle");
      } finally {
        setAnalyzing(false);
        useMeetingStore.getState().setKaibanAnalyzing(false);
        setTimeout(() => {
          setOrchestratorStatus((p) => {
            const next = p === "Intervening" ? "Idle" : p;
            if (next === "Idle") useMeetingStore.getState().setKaibanStatus("Idle");
            return next;
          });
        }, 5000);
      }
    },
    [
      transcript,
      agendaStage,
      currentTopic,
      analyzing,
      isConnected,
      meetingId,
      setLatestToDos,
      setAgendaStage,
      addTranscriptLine,
      setAiIntervention,
      sendControlText
    ]
  );

  useEffect(() => {
    if (!joined) return;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    const isAccumulatedNewText = transcript.length - lastAnalyzedCountRef.current >= 5;

    if (isAccumulatedNewText) {
      console.log("Accumulated conversation count exceeded threshold (+5). Running Kaiban Orchestration instantly.");
      void triggerOrchestration();
    } else {
      silenceTimerRef.current = setTimeout(() => {
        console.log("5 Seconds of silence detected in ECE-Brain meeting space. Initiating Kaiban evaluation...");
        void triggerOrchestration();
      }, 5000);
    }

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [transcript, joined, triggerOrchestration]);

  useEffect(() => {
    const onRun = () => {
      void triggerOrchestration({ force: true });
    };
    window.addEventListener("kaiban:run-a2a", onRun);
    return () => window.removeEventListener("kaiban:run-a2a", onRun);
  }, [triggerOrchestration]);

  return {
    orchestratorStatus,
    analyzing,
    triggerOrchestration: () => void triggerOrchestration({ force: true }),
    agendaStage,
    latestToDos
  };
}
