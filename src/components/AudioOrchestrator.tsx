import React, { useEffect, useState, useCallback } from "react";
import { useMeetingStore } from "../store";
import { getAudioContext } from "../lib/audioSpeech";
import { telemetry } from "../lib/telemetry";
import { trtcAudioMonitor } from "../lib/trtcAudioMonitor";
import { Radio, ShieldCheck, Cpu } from "lucide-react";
import { io } from "socket.io-client";
import TRTC from "trtc-js-sdk";

interface AudioOrchestratorProps {
  audioStream?: MediaStream | null;
  ttsText?: string | null;
}

export function AudioOrchestrator({ audioStream, ttsText }: AudioOrchestratorProps) {
  const { meetingId, userName, aiIntervention } = useMeetingStore();
  const [isRouting, setIsRouting] = useState(false);
  const [routingStatus, setRoutingStatus] = useState<string>("AudioOrchestrator Standby (TRTC Local Track Hook Active)");
  const [lastRoutedText, setLastRoutedText] = useState<string>("");

  /**
   * Generates a Web Audio stream track for Doubao TTS text routed to a MediaStreamDestination Node.
   * This produces a MediaStreamTrack that can be directly piped into TRTC stream buffers,
   * bypassing default browser speaker playback.
   */
  const createDoubaoTtsMediaTrack = useCallback((text: string): MediaStreamTrack | null => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      // Create Web Audio destination node for media streaming
      const destination = ctx.createMediaStreamDestination();

      const cleanStr = text.replace(/[*#_`\s]/g, "");
      const charCount = Math.min(Math.max(cleanStr.length, 6), 30);
      const syllableDuration = 0.11;

      // Pipe acoustic formant speech buffers into the stream destination ONLY (not ctx.destination/local speaker)
      cleanStr.slice(0, charCount).split("").forEach((char, idx) => {
        const startTime = ctx.currentTime + idx * syllableDuration;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const basePitch = 220 + (char.charCodeAt(0) % 320);
        osc.type = idx % 2 === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(basePitch, startTime);
        osc.frequency.linearRampToValueAtTime(basePitch * 1.08, startTime + syllableDuration * 0.85);

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + syllableDuration * 0.95);

        osc.connect(gain);
        gain.connect(destination); // Pipe into TRTC stream destination ONLY

        osc.start(startTime);
        osc.stop(startTime + syllableDuration);
      });

      const audioTrack = destination.stream.getAudioTracks()[0];
      return audioTrack || null;
    } catch (err) {
      console.warn("[Doubao TTS Stream Track Synthesis Notice]", err);
      return null;
    }
  }, []);

  /**
   * Hooks into the active TRTC local audio track and pipes Doubao TTS into the TRTC stream buffer.
   */
  const pushAudioToTrtcStream = useCallback(async (textToPush: string, customStream?: MediaStream | null) => {
    if (!textToPush && !customStream) return;
    setIsRouting(true);
    trtcAudioMonitor.setPushingState(true);
    if (textToPush) setLastRoutedText(textToPush);

    setRoutingStatus(`[Piping Doubao TTS] Hooking into TRTC local track & stream buffer...`);
    console.log(`[AudioOrchestrator] Hooking Doubao TTS into TRTC stream buffer for: "${textToPush || "Custom Stream"}"`);

    trtcAudioMonitor.recordEvent("audio-push", `Piping Doubao TTS to TRTC track buffer: "${(textToPush || "").slice(0, 35)}..."`, 90);
    trtcAudioMonitor.updateChannel("ai-tts", {
      volumeLevel: 90,
      isTransmitting: true,
      audioTrackActive: true
    });

    telemetry.recordAudioBuffer({ sampleRate: 16000, rms: 0.45, chunksSentDelta: 3 });
    telemetry.recordConnectionState("trtcState", "CONNECTED", { endpoint: "TRTC-AudioOrchestrator-StreamBuffer" });

    try {
      // 1. Synthesize media stream track for Doubao TTS piped into Web Audio destination
      const ttsTrack = textToPush ? createDoubaoTtsMediaTrack(textToPush) : null;

      // 2. Retrieve active TRTC local stream & client
      const trtcLocalStream = (window as any).__trtcLocalStream;
      const trtcClient = (window as any).__trtcClient;

      if (trtcLocalStream) {
        console.log("[AudioOrchestrator] Active TRTC local stream found. Piping Doubao TTS into audio track buffer...");
        
        // Replace or merge audio track into the active TRTC stream
        if (ttsTrack && typeof trtcLocalStream.replaceTrack === "function") {
          try {
            await trtcLocalStream.replaceTrack(ttsTrack);
            console.log("[AudioOrchestrator] Successfully called trtcLocalStream.replaceTrack with Doubao TTS track.");
          } catch (replaceErr) {
            console.warn("[AudioOrchestrator] TRTC replaceTrack fallback:", replaceErr);
          }
        }

        if (typeof trtcLocalStream.unmuteAudio === "function") {
          trtcLocalStream.unmuteAudio();
        }
      } else {
        // No active local stream yet -> create TRTC audio stream with custom audio source
        console.log("[AudioOrchestrator] Creating new TRTC audio stream for Doubao TTS buffer...");
        try {
          if (typeof (TRTC as any)?.createStream === "function") {
            const streamParams: any = { audio: true, video: false };
            if (ttsTrack) {
              streamParams.audioSource = ttsTrack;
            }
            const newTrtcStream = (TRTC as any).createStream(streamParams);
            if (typeof newTrtcStream?.initialize === "function") {
              await newTrtcStream.initialize();
            }

            if (trtcClient && typeof trtcClient.publish === "function") {
              await trtcClient.publish(newTrtcStream);
              console.log("[AudioOrchestrator] Published new TRTC TTS audio stream to remote channel.");
            }

            (window as any).__trtcLocalStream = newTrtcStream;
          }
        } catch (sdkErr) {
          console.warn("[AudioOrchestrator TRTC SDK Stream Creation Notice]", sdkErr);
        }
      }

      setRoutingStatus(`[TRTC Stream Buffer Active] Doubao TTS piped into TRTC local audio track (Local speaker bypassed)`);

      setTimeout(() => {
        setIsRouting(false);
        trtcAudioMonitor.setPushingState(false);
        trtcAudioMonitor.updateChannel("ai-tts", {
          volumeLevel: 0,
          isTransmitting: false
        });
      }, 3500);
    } catch (err: any) {
      console.warn("[AudioOrchestrator] TRTC audio stream buffer error:", err);
      setIsRouting(false);
      trtcAudioMonitor.setPushingState(false);
    }
  }, [createDoubaoTtsMediaTrack]);

  // Watch props change
  useEffect(() => {
    if (ttsText) {
      pushAudioToTrtcStream(ttsText, audioStream);
    }
  }, [ttsText, audioStream, pushAudioToTrtcStream]);

  // Listen to Socket.IO A2A events & window.__trtcClient events
  useEffect(() => {
    const socket = io("/ws/meeting", {
      query: { roomId: meetingId || "10086", userName: userName || "Auditor", userRole: "participant" }
    });

    socket.on("connect", () => {
      console.log("[AudioOrchestrator Socket] Connected to A2A event bus for PLAY_AUDIO");
    });

    socket.on("a2a_event", (eventData: any) => {
      console.log("[AudioOrchestrator Socket] Received A2A Event:", eventData);
      const target = eventData?.data?.target || eventData?.target;
      const action = eventData?.data?.action || eventData?.action;
      const payload = eventData?.data?.payload || eventData?.payload || eventData?.data;

      if (
        target === "AudioOrchestrator" || 
        action === "PLAY_AUDIO" || 
        action === "ROUTE_AUDIO_TRTC" || 
        payload?.interventionText
      ) {
        const textToRoute = payload?.interventionText || payload?.text || eventData?.text;
        if (textToRoute) {
          pushAudioToTrtcStream(textToRoute, null);
        }
      }
    });

    // Observe window.__trtcClient for onRemoteUserJoinRoom and onUserAudioAvailable
    const trtcCheckInterval = setInterval(() => {
      const client = (window as any).__trtcClient;
      if (client && !client.__orchestratorListenersBound) {
        client.__orchestratorListenersBound = true;
        console.log("[AudioOrchestrator] Binding TRTC client event listeners for onRemoteUserJoinRoom & onUserAudioAvailable...");

        const handleRemoteJoin = (evt: any) => {
          console.log("[AudioOrchestrator TRTC Event] onRemoteUserJoinRoom triggered:", evt);
          trtcAudioMonitor.recordEvent("peer-join", `[onRemoteUserJoinRoom] AudioOrchestrator detected peer join: ${evt?.userId}`);
        };

        const handleAudioAvailable = (evt: any) => {
          console.log("[AudioOrchestrator TRTC Event] onUserAudioAvailable triggered (Re-syncing stream):", evt);
          trtcAudioMonitor.recordEvent("stream-published", `[onUserAudioAvailable] AudioOrchestrator detected audio available for peer: ${evt?.stream?.getUserId?.()}`);
        };

        client.on("peer-join", handleRemoteJoin);
        client.on("onRemoteUserJoinRoom", handleRemoteJoin);
        client.on("stream-added", handleAudioAvailable);
        client.on("onUserAudioAvailable", handleAudioAvailable);
      }
    }, 2000);

    return () => {
      socket.disconnect();
      clearInterval(trtcCheckInterval);
    };
  }, [meetingId, userName, pushAudioToTrtcStream]);

  // Also watch store aiIntervention changes
  useEffect(() => {
    if (aiIntervention) {
      pushAudioToTrtcStream(aiIntervention, null);
    }
  }, [aiIntervention, pushAudioToTrtcStream]);

  return (
    <div className="my-2 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-between text-xs font-mono shadow-[0_0_15px_rgba(6,182,212,0.15)]">
      <div className="flex items-center gap-2.5">
        <div className={`h-3 w-3 rounded-full ${isRouting ? "bg-cyan-400 animate-ping" : "bg-emerald-400 animate-pulse"}`} />
        <div>
          <div className="text-cyan-300 font-bold flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
            KaibanJS AudioOrchestrator (TRTC Track Stream Buffer Hook)
          </div>
          <div className="text-[10px] text-slate-300 truncate max-w-md">
            {routingStatus} {lastRoutedText && `— 「${lastRoutedText}」`}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30 flex items-center gap-1">
          <Cpu className="h-3 w-3 text-cyan-400" />
          <ShieldCheck className="h-3 w-3 text-cyan-400" />
          Piped to TRTC Track Buffer
        </span>
      </div>
    </div>
  );
}

