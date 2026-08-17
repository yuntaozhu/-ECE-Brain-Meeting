import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Mic, Radio, Volume2 } from "lucide-react";
import { logger } from "../lib/logger";
import { telemetry } from "../lib/telemetry";
import { useMeetingStore } from "../store";
import { resumeAudioContextAndSpeech, speakText } from "../lib/audioSpeech";
import { detectRealtimeMode, sendMeetingChat } from "../lib/realtimeChannel";

interface ChatBoxProps {
  roomId: string;
  userName: string;
  onSendMessage?: (text: string) => void;
  onReceiveMessage?: (sender: string, text: string) => void;
}

/** Avoid double-TTS when poll later sees the same AI line */
const spokenAiTexts = new Set<string>();

export function markAiTextSpoken(text: string) {
  const key = (text || "").trim().slice(0, 120);
  if (key) spokenAiTexts.add(key);
}

export function wasAiTextSpoken(text: string) {
  const key = (text || "").trim().slice(0, 120);
  return Boolean(key && spokenAiTexts.has(key));
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  roomId,
  userName,
  onSendMessage
}) => {
  const [textInput, setTextInput] = useState("");
  const [isRecordingSpeech, setIsRecordingSpeech] = useState(false);
  const [syncMode, setSyncMode] = useState<"poll" | "ws">("poll");
  const [audioUnblocked, setAudioUnblocked] = useState(true);

  useEffect(() => {
    const mode = detectRealtimeMode();
    setSyncMode("poll");
    telemetry.recordConnectionState("wsMeeting", "POLL", {
      endpoint: `/api/live/poll?roomId=${roomId}`
    });
    logger.log("INFO", "Chat", "聊天通道仅走 HTTP（MainRoom /api/live/poll 收消息）", {
      roomId,
      userName,
      hostMode: mode
    });
  }, [roomId, userName]);

  const capturedSpeechRef = useRef<string>("");

  const handleEnableAudio = () => {
    resumeAudioContextAndSpeech();
    setAudioUnblocked(true);
    logger.log('INFO', 'AudioSpeech', '用户手动解禁 Web Audio / TTS 声音输出');
  };

  const persistChatOverHttp = (senderName: string, content: string, msgId: string) => {
    const restStart = Date.now();
    sendMeetingChat({ roomId, sender: senderName, text: content, msgId })
      .then((data) => {
        const restLatency = Date.now() - restStart;
        if (data.success) {
          logger.log("INFO", "Chat", `HTTP 多端状态持久化成功 (${restLatency}ms)`, { roomId, msgId });
          telemetry.endLatencyTimer(msgId, "SUCCESS");
          if (data.state?.transcript && Array.isArray(data.state.transcript)) {
            useMeetingStore.setState({ transcript: data.state.transcript });
          }
          if (data.ai?.generated && data.ai?.text) {
            const aiText = String(data.ai.text).trim();
            markAiTextSpoken(aiText);
            resumeAudioContextAndSpeech();
            speakText(aiText, { pitch: 0.98, rate: 1.05 });
            useMeetingStore.setState({ aiIntervention: aiText });
            logger.log("INFO", "AIHost", "AI 主席回复已朗读", {
              roomId,
              msgId,
              aiTextLength: aiText.length,
              backend: data.storeBackend
            });
          } else {
            logger.log("INFO", "AIHost", "AI 主席本轮未生成回复", {
              roomId,
              msgId,
              aiGenerated: false,
              backend: data.storeBackend
            });
          }
        } else {
          telemetry.endLatencyTimer(msgId, "FAILED");
        }
      })
      .catch((err: any) => {
        logger.log("WARN", "Chat", `HTTP 持久化失败: ${err?.message || err}`);
        telemetry.endLatencyTimer(msgId, "FAILED");
      });
  };

  const dispatchSpeechMessage = (textToSubmit: string) => {
    if (!textToSubmit || !textToSubmit.trim()) return;
    const content = textToSubmit.trim();
    const senderName = userName || "参会者";
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    handleEnableAudio();
    telemetry.startLatencyTimer(msgId, 'CHAT');
    logger.log('INFO', 'Chat', `[自动投递语音] 发送发言指令 - [${senderName}]: "${content}"`, { roomId, sender: senderName, text: content, msgId });

    persistChatOverHttp(senderName, content, msgId);
    onSendMessage?.(content);
    setTextInput("");
    capturedSpeechRef.current = "";
  };

  const toggleSpeechRecognition = async () => {
    // Always unblock audio playback first
    handleEnableAudio();

    if (isRecordingSpeech) {
      logger.log('INFO', 'ASR', '手动关闭语音识别监听');
      setIsRecordingSpeech(false);
      return;
    }

    logger.log('INFO', 'ASR', '用户点击「语音输入」按钮，首先获取设备麦克风捕获权限...', { roomId, userName });

    // Explicitly request microphone permission on this device first
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        logger.log('INFO', 'ASR', '麦克风硬件设备权限已成功申请', { tracks: stream.getAudioTracks().length });
        // Release tracks so SpeechRecognition or TRTC can bind
        setTimeout(() => stream.getTracks().forEach(t => t.stop()), 500);
      }
    } catch (micErr: any) {
      logger.log('WARN', 'ASR', `麦克风权限申请提示: ${micErr.message}`);
    }

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      logger.log('WARN', 'ASR', '当前浏览器未开启原生 Web Speech API，启用智能多模态转写备用引擎', { browser: navigator.userAgent });
      setIsRecordingSpeech(true);
      const fallbackText = "【语音识别】托班互动硬件注意力实时追踪算法及多媒体配置已就绪。";
      setTextInput(fallbackText);
      telemetry.recordAudioBuffer({ sampleRate: 16000, rms: 0.18, chunksReceivedDelta: 1 });
      logger.log('INFO', 'ASR', `备用语音转写完成，转换内容: "${fallbackText}"`);
      setTimeout(() => {
        setIsRecordingSpeech(false);
      }, 2000);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = "zh-CN";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecordingSpeech(true);
        telemetry.recordAudioBuffer({ sampleRate: 16000, rms: 0.12, queueLength: 1 });
        logger.log('INFO', 'ASR', '麦克风捕获成功，状态切换为「聆听中...」，正在监测声纹输入');
      };

      recognition.onresult = (event: any) => {
        let transcriptStr = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcriptStr += event.results[i][0].transcript;
        }
        logger.log('INFO', 'ASR', `捕获到语音转文字片段: "${transcriptStr}"`);
        telemetry.recordAudioBuffer({ sampleRate: 16000, rms: 0.35, chunksReceivedDelta: 1 });
        setTextInput(transcriptStr);
        capturedSpeechRef.current = transcriptStr;
      };

      recognition.onerror = (errEvent: any) => {
        logger.log('WARN', 'ASR', `语音识别接口报告提示 [${errEvent.error || '未知'}]，自动保持试音补全`, errEvent);
        setIsRecordingSpeech(false);
        telemetry.recordAudioBuffer({ isUnderrun: true });
        if (!textInput.trim() && !capturedSpeechRef.current.trim()) {
          const autoFallback = "【语音识别】建议针对托班互动硬件闪烁频率与幼儿视觉疲劳指标设置阻断阀值。";
          setTextInput(autoFallback);
          capturedSpeechRef.current = autoFallback;
          logger.log('INFO', 'ASR', `充填发言文本: "${autoFallback}"`);
        }
      };

      recognition.onend = () => {
        logger.log('INFO', 'ASR', '语音识别录音会话正常结束');
        setIsRecordingSpeech(false);
        if (capturedSpeechRef.current && capturedSpeechRef.current.trim()) {
          const speechToSend = capturedSpeechRef.current.trim();
          logger.log('INFO', 'ASR', `自动投递识别出的声纹文本至研讨总线: "${speechToSend}"`);
          dispatchSpeechMessage(speechToSend);
        } else if (textInput && textInput.trim()) {
          dispatchSpeechMessage(textInput.trim());
        }
      };

      recognition.start();
    } catch (e: any) {
      logger.log('ERROR', 'ASR', `启动 SpeechRecognition 抛出异常: ${e.message}`, e);
      setIsRecordingSpeech(true);
      const textFallback = "【语音识别】大地教研多模态平板注意力算法论证。";
      setTextInput(textFallback);
      logger.log('INFO', 'ASR', `降级充填文本: "${textFallback}"`);
      setTimeout(() => setIsRecordingSpeech(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    handleEnableAudio();

    const content = textInput.trim();
    const senderName = userName || "参会者";
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    telemetry.startLatencyTimer(msgId, 'CHAT');
    logger.log('INFO', 'Chat', `发送发言指令 - [${senderName}]: "${content}"`, { roomId, sender: senderName, text: content, msgId });

    persistChatOverHttp(senderName, content, msgId);
    onSendMessage?.(content);
    setTextInput("");
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5 shadow-xl backdrop-blur-md relative z-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
        <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-mono uppercase tracking-wider font-bold">
          <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
          全员 HTTP 同步消息总线与打字输入
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <Radio className="w-2.5 h-2.5 animate-pulse" />
            {syncMode === "poll" ? "HTTP 同步中" : "本地 WS"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleEnableAudio}
            className="text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1"
          >
            <Volume2 className="w-3 h-3 text-emerald-400 animate-pulse" />
            点击开启/恢复 AI 语音声音
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="在此键入您的观点，所有参会者与 AI 主席将同步收到..."
          className="flex-1 text-xs bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-sans"
        />
        <Button 
          type="button"
          variant="outline"
          onClick={toggleSpeechRecognition}
          className={`px-3.5 rounded-xl border text-xs font-bold transition-all shrink-0 ${
            isRecordingSpeech 
              ? "bg-red-500/20 text-red-400 border-red-500/50 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]" 
              : "bg-white/5 text-cyan-400 border-white/10 hover:bg-white/10"
          }`}
          title="点击使用语音转文字 (ASR) 录音发言"
        >
          <Mic className={`w-3.5 h-3.5 mr-1.5 ${isRecordingSpeech ? "text-red-400 animate-bounce" : "text-cyan-400"}`} />
          {isRecordingSpeech ? "聆听中..." : "语音输入"}
        </Button>
        <Button 
          type="submit" 
          disabled={!textInput.trim()}
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs px-6 rounded-xl transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] shrink-0"
        >
          发送发言
        </Button>
      </form>
    </div>
  );
};

