import { useEffect, useRef, useState } from "react";
import { useMeetingStore } from "../store";
import { logger } from "../lib/logger";
import { telemetry } from "../lib/telemetry";
import { speakText } from "../lib/audioSpeech";
import { isServerlessRealtime, shouldUseNativeWebSocket } from "../lib/realtimeChannel";

export function useGeminiLive() {
  const { micOn, addTranscriptLine, setMicOn } = useMeetingStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderProcessorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Audio Queue States for Gapless playback
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  // Stop any active speaker sources (Barge-in VAD or User interrupting)
  const stopPlayback = () => {
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch (e) {}
    });
    activeSourcesRef.current = [];
    nextStartTimeRef.current = 0;
    setIsPlaying(false);
  };

  // Convert raw base64 PCM from Gemini back to Web Audio API Buffer and play
  const playAudioChunk = (base64Data: string) => {
    if (!audioCtxRef.current) return;
    const audioCtx = audioCtxRef.current;

    // Decode base64 to binary
    const binary = atob(base64Data);
    const arrayBuffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(arrayBuffer);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Convert raw 24kHz Int16 to Float32
    const int16Array = new Int16Array(arrayBuffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    // Create single-channel mono 24000Hz Buffer for Gemini TTS
    const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    // Audio Sync Queue
    let nextStart = nextStartTimeRef.current;
    if (nextStart < audioCtx.currentTime) {
      nextStart = audioCtx.currentTime + 0.05; // small buffer to avoid cracking
    }

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    
    // Track active sources so we can interrupt them
    activeSourcesRef.current.push(source);
    
    source.onended = () => {
      // Remove from active sources list when naturally finished
      activeSourcesRef.current = activeSourcesRef.current.filter((item) => item !== source);
      if (activeSourcesRef.current.length === 0) {
        setIsPlaying(false);
      }
    };

    setIsPlaying(true);
    source.start(nextStart);
    nextStartTimeRef.current = nextStart + audioBuffer.duration;
  };

  const duplexDisabledRef = useRef(false);

  // Connect to server proxy websocket stream (local Node only) or HTTP text control
  const connectStream = () => {
    if (duplexDisabledRef.current) {
      setIsConnected(true);
      return;
    }
    if (wsRef.current) return;

    if (isServerlessRealtime() || !shouldUseNativeWebSocket()) {
      duplexDisabledRef.current = true;
      setIsConnected(true);
      telemetry.recordConnectionState("wsAudioStream", "DISCONNECTED", {
        endpoint: "/api/doubao/chat",
        error: "Phase-1: duplex WS disabled on serverless; HTTP text control"
      });
      logger.log("INFO", "WebSocket", "Phase-1 使用 HTTP 文本控场，不连接 /api/live/stream");
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/live/stream`;
    
    logger.log("INFO", "WebSocket", "Connecting to Doubao duplex stream (local Node)", { wsUrl });
    telemetry.recordConnectionState('wsAudioStream', 'CONNECTING', { endpoint: wsUrl });
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        logger.log("INFO", "WebSocket", "Doubao duplex stream opened");
        setIsConnected(true);
        telemetry.recordConnectionState('wsAudioStream', 'CONNECTED', { endpoint: wsUrl });
        
        if (!audioCtxRef.current) {
           audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        if (msg.audio) {
          telemetry.recordAudioBuffer({ chunksReceivedDelta: 1 });
          playAudioChunk(msg.audio);
        }

        if (msg.interrupted) {
          console.warn("AI Chairperson got interrupted. Stopping local buffer playback.");
          telemetry.recordAudioBuffer({ isUnderrun: true });
          stopPlayback();
        }

        if (msg.asr) {
          // Partial/final user ASR from Seeduplex — final lines go to transcript
          if (msg.final) {
            addTranscriptLine(msg.speaker || "我", msg.asr);
          }
        }

        // Handle real-time text narration (avoid double TTS when Seeduplex already streams audio)
        if (msg.text && msg.speaker) {
          addTranscriptLine(msg.speaker, msg.text);
          if (!msg.duplexAudioExpected && !String(msg.speaker).includes("Seeduplex") && !String(msg.speaker).includes("系统")) {
            // Text-only fallback path still uses browser TTS
            if (!msg.audio) speakText(msg.text);
          }
        }
      };

      ws.onerror = () => {
        duplexDisabledRef.current = true;
        logger.log("WARN", "WebSocket", "Duplex WS failed once; using HTTP REST text control");
        telemetry.recordConnectionState("wsAudioStream", "ERROR", {
          endpoint: "/api/doubao/chat",
          error: "Native WS failed; HTTP fallback (no reconnect)"
        });
        setIsConnected(true);
        try {
          ws.close();
        } catch (_) {}
      };

      ws.onclose = () => {
        wsRef.current = null;
        duplexDisabledRef.current = true;
        setIsConnected(true);
        telemetry.recordConnectionState("wsAudioStream", "DISCONNECTED", {
          endpoint: "/api/doubao/chat",
          error: "Duplex WS closed; HTTP text control"
        });
        stopPlayback();
      };
    } catch (wsErr: any) {
      duplexDisabledRef.current = true;
      logger.log("WARN", "WebSocket", `WebSocket init failed: ${wsErr?.message || wsErr}`);
      setIsConnected(true);
    }
  };

  const disconnectStream = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopPlayback();
    stopRecording();
  };

  // Capture local client microphone sound using Web Audio API
  const startRecording = async () => {
    if (isServerlessRealtime()) {
      logger.log("INFO", "Mic", "Phase-1：跳过麦克风 PCM 采集（HTTP 文本研讨）");
      return;
    }
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        logger.log('INFO', 'Mic', '物理麦克风音轨捕获成功，音频采集采样率与声纹通道初始化完成');
      } catch (deviceErr: any) {
        logger.log('WARN', 'Mic', `麦克风获取受限或不存在 [${deviceErr?.message || 'Permission Denied'}]，启动虚拟静音全双工音频流 fallback`, deviceErr);
        addTranscriptLine("系统提示", "🎙️ 未检测到外部麦克风（或设备占用/权限不足），已开启 ECE-Brain 虚拟全双工静音音频流进行平滑对接...");
        
        // Create an audio destination node that acts as a MediaStream
        const dst = audioCtx.createMediaStreamDestination();
        // An oscillator connected through a 0-gain node is perfectly silent PCM
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        gain.gain.value = 0.0;
        osc.connect(gain);
        gain.connect(dst);
        try {
          osc.start();
        } catch (oscErr) {}
        stream = dst.stream;
      }
      mediaStreamRef.current = stream;

      const source = audioCtx.createMediaStreamSource(stream);
      
      // 4096 buffer size, 1 input channel, 1 output channel
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processor.connect(audioCtx.destination);
      source.connect(processor);
      
      recorderProcessorRef.current = processor;

      // Local PCM collector loop to output 16kHz to Gemini
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);

        // --- Core VAD Barge-in logic ---
        // If chairperson is currently playing, check energy levels to automatically barge-in
        if (activeSourcesRef.current.length > 0) {
           if (rms > 0.06) { // Voice energy threshold
              console.log("VAD Voice Detected (RMS: " + rms.toFixed(3) + ") during speech! Barging-in.");
              stopPlayback(); // stop immediately
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ cancel: true }));
              }
           }
        }

        // Downsample input from browser rate (e.g. 48kHz or 44.1kHz) to mono 16000Hz expected by Gemini Live
        const downsampled = downsampleBuffer(inputData, audioCtx.sampleRate, 16000);
        const base64Pcm = float32ToInt16Base64(downsampled);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ audio: base64Pcm }));
          telemetry.recordAudioBuffer({
            rms,
            sampleRate: audioCtx.sampleRate,
            chunksSentDelta: 1,
            queueLength: activeSourcesRef.current.length
          });
        }
      };

    } catch (err) {
      console.error("Local recording capture error:", err);
      setMicOn(false);
      addTranscriptLine("系统提示", "⚠️ 未检测到物理麦克风设备或权限不足 (Requested device not found)。您可以使用页面右下角控制台文本框输入内容进行发言模拟。");
    }
  };

  const stopRecording = () => {
    if (recorderProcessorRef.current) {
      recorderProcessorRef.current.disconnect();
      recorderProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // Helper: downsample raw audio array
  const downsampleBuffer = (buffer: Float32Array, inputSampleRate: number, outputSampleRate: number) => {
    if (inputSampleRate === outputSampleRate) {
      return buffer;
    }
    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  };

  // Helper: Convert Float32 Mono array back to Int16 PCM, then to Base64
  const float32ToInt16Base64 = (buffer: Float32Array) => {
    const l = buffer.length;
    const buf = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      let s = Math.max(-1, Math.min(1, buffer[i]));
      buf[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const binary = String.fromCharCode(...new Uint8Array(buf.buffer) as any);
    return btoa(binary);
  };

  // Keep WebSocket aligned with micOn store settings automatically
  useEffect(() => {
    if (isConnected && micOn) {
      startRecording();
    } else {
      stopRecording();
    }
  }, [micOn, isConnected]);

  // Clean on unmount
  useEffect(() => {
    return () => {
      disconnectStream();
    };
  }, []);

  const sendControlText = async (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log("Injecting control command into Gemini Live stream:", text);
      wsRef.current.send(JSON.stringify({ text }));
      return true;
    }

    // HTTP REST Fallback to Doubao AI Chairperson
    try {
      console.log("Sending control text via Doubao HTTP REST endpoint:", text);
      const res = await fetch("/api/doubao/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          addTranscriptLine("AI 主席 (大地教研督导)", data.reply);
          speakText(data.reply);
          return true;
        }
      }
    } catch (err: any) {
      console.warn("HTTP Fallback Doubao chat error:", err?.message);
    }
    return false;
  };

  return {
    isConnected,
    isPlaying,
    connectStream,
    disconnectStream,
    stopPlayback,
    sendControlText
  };
}
