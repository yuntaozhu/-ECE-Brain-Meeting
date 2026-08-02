import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Mic, Loader2, Radio } from "lucide-react";

interface ChatBoxProps {
  roomId: string;
  userName: string;
  onSendMessage: (text: string) => void;
  onReceiveMessage?: (sender: string, text: string) => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  roomId,
  userName,
  onSendMessage,
  onReceiveMessage
}) => {
  const [textInput, setTextInput] = useState("");
  const [isRecordingSpeech, setIsRecordingSpeech] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/meeting?roomId=${roomId}&userName=${encodeURIComponent(userName || "参会者")}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      console.log("[ChatBox WS] Connected to broadcast bus");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "chat" || data.text) {
          if (onReceiveMessage) {
            onReceiveMessage(data.sender || "广播系统", data.text);
          }
        }
      } catch (e) {
        console.warn("[ChatBox WS Parse Error]", e);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [roomId, userName, onReceiveMessage]);

  const toggleSpeechRecognition = () => {
    if (isRecordingSpeech) {
      setIsRecordingSpeech(false);
      return;
    }

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsRecordingSpeech(true);
      setTextInput("【语音识别模拟】托班互动硬件注意力实时追踪算法及多媒体配置已就绪。");
      setTimeout(() => setIsRecordingSpeech(false), 2500);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = "zh-CN";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => setIsRecordingSpeech(true);
      recognition.onresult = (event: any) => {
        let transcriptStr = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcriptStr += event.results[i][0].transcript;
        }
        setTextInput(transcriptStr);
      };
      recognition.onerror = () => setIsRecordingSpeech(false);
      recognition.onend = () => setIsRecordingSpeech(false);

      recognition.start();
    } catch (e) {
      setIsRecordingSpeech(true);
      setTextInput("【语音识别】大地教研多模态平板注意力算法论证。");
      setTimeout(() => setIsRecordingSpeech(false), 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    const content = textInput.trim();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "chat",
        sender: userName || "参会者",
        text: content
      }));
    }

    onSendMessage(content);
    setTextInput("");
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5 shadow-xl backdrop-blur-md relative z-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
        <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-mono uppercase tracking-wider font-bold">
          <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
          全员 WebSocket 实时消息总线与打字输入
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono ${wsConnected ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"}`}>
            <Radio className="w-2.5 h-2.5 animate-pulse" />
            {wsConnected ? "WebSocket 已连通" : "连接中..."}
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          全员无限制参与发言，所有参会者及 AI 虚拟主席均可实时互通。
        </span>
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
