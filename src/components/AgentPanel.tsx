import React, { useRef, useState, useEffect } from "react";
import { useMeetingStore } from "../store";
import { useMeetingOrchestrator } from "../hooks/useMeetingOrchestrator";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Volume2 } from "lucide-react";

export default function AgentPanel() {
  const { transcript, aiIntervention, aiSummary, currentTopic, addTranscriptLine, latestToDos } = useMeetingStore();
  const { orchestratorStatus, analyzing, triggerOrchestration } = useMeetingOrchestrator();
  
  const [draftInput, setDraftInput] = useState("");
  const [trtcStatus, setTrtcStatus] = useState<"offline" | "loading" | "online">("offline");
  const [userSigData, setUserSigData] = useState<{ userSig: string; sdkAppId: number; userId: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleFetchTRTCSig = async () => {
    setTrtcStatus("loading");
    try {
      const res = await fetch("/api/trtc/usersig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "ece-brain-moderator" })
      });
      const data = await res.json();
      setUserSigData(data);
      setTrtcStatus("online");
    } catch (err) {
      console.error(err);
      setTrtcStatus("offline");
    }
  };

  // Simulate pushing something to voice
  const handleSimulateTalk = (e: React.FormEvent) => {
      e.preventDefault();
      if (!draftInput.trim()) return;
      addTranscriptLine("You", draftInput);
      setDraftInput("");
  };

  return (
    <aside className="w-80 flex flex-col h-full border-l border-white/5 bg-black/40 p-5 gap-6 overflow-y-auto">
       
       {/* KaibanJS State Panels */}
       <div className="space-y-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">活跃 Agent 团队 (KaibanJS)</div>
          
          {/* AI Chairperson Status */}
          <div className="p-3 rounded-lg bg-cyan-400/5 border border-cyan-500/20 shadow-inner">
             <div className="flex items-center justify-between mb-2">
               <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">AI 主席 (督导)</span>
               <span className={`px-1.5 py-0.5 rounded text-[8px] border font-bold uppercase tracking-widest ${
                 orchestratorStatus === "Thinking" 
                   ? "bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse"
                   : orchestratorStatus === "Intervening"
                   ? "bg-red-500/20 text-red-400 border-red-500/40 animate-ping"
                   : "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
               }`}>
                  {orchestratorStatus === "Thinking" ? "分析中" : orchestratorStatus === "Intervening" ? "强干预中" : "主题监控"}
               </span>
             </div>
             <p className="text-[11px] text-slate-400 leading-relaxed italic">
                {orchestratorStatus === "Thinking" 
                  ? "评估发言内容，检测端午粽子等非数字化偏题词组..." 
                  : orchestratorStatus === "Intervening"
                  ? "⚠️ 已抓取到偏离托班教育硬件无关话题，执行系统发音喝止！"
                  : "严厉而专一。正在严格监督发言，对闲聊保持高压戒备。"}
             </p>
             <div className="mt-2.5 flex gap-1">
                 <div className={`h-1 flex-1 rounded bg-cyan-500 ${orchestratorStatus !== "Idle" ? "animate-pulse" : "opacity-30"}`}></div>
                 <div className={`h-1 flex-1 rounded bg-cyan-500 ${orchestratorStatus === "Thinking" ? "animate-pulse" : "opacity-30"}`}></div>
                 <div className={`h-1 flex-1 rounded bg-cyan-400 ${orchestratorStatus === "Intervening" ? "animate-bounce" : "opacity-100 bg-cyan-950/40"}`}></div>
             </div>
          </div>

          {/* AI Secretary Status */}
          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15 shadow-inner">
             <div className="flex items-center justify-between mb-2">
               <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">AI 秘书 (纪要员)</span>
               <Badge className="text-[8px] px-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 scale-90">
                  {orchestratorStatus === "Thinking" ? "提炼中" : "自动记录"}
               </Badge>
             </div>
             <p className="text-[11px] text-slate-400 leading-relaxed italic">
                {orchestratorStatus === "Thinking" 
                  ? "汇聚讨论细节并实时归纳成 3 项深度科研待办列表..." 
                  : "严谨细致。等待最新的会议转写累积，自动记录关键共识。"}
             </p>
          </div>

          <div className="pt-1">
             <Button variant="outline" size="sm" onClick={triggerOrchestration} disabled={analyzing} className="w-full h-8 text-[10px] tracking-widest uppercase font-bold bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:text-white transition-all shadow-sm">
                 {analyzing ? <Loader2 className="h-3 w-3 animate-spin mr-2 text-cyan-400" /> : <Play className="h-3 w-3 mr-2 text-cyan-400" />}
                 运行 KaibanJS 评测
             </Button>
          </div>
       </div>

         {/* TRTC Tencent RTC Integration Controller */}
         <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">TRTC 腾讯实时音视频</h3>
          </div>
          
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 shadow-inner space-y-3 font-sans">
             <div className="flex items-center justify-between font-mono text-[9px] text-slate-400">
                <span>SDKAppID: {userSigData ? userSigData.sdkAppId : "1400xxxxxx"}</span>
                <Badge className={`text-[8px] px-1.5 py-0.5 rounded-full ${trtcStatus === "online" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold" : "bg-white/5 text-slate-400 border border-white/10"}`}>
                   {trtcStatus === "online" ? "● 已就绪" : trtcStatus === "loading" ? "签名中..." : "未连接"}
                </Badge>
             </div>

             {userSigData && (
                <div className="text-[10px] text-slate-400 bg-black/60 p-2 rounded border border-white/5 space-y-1">
                   <div className="flex items-center justify-between">
                      <span className="text-emerald-400 font-bold">UserSig 生成成功!</span>
                      <span className="font-mono text-slate-500 text-[8px]">{userSigData.userId}</span>
                   </div>
                   <div className="font-mono break-all text-[8px] max-h-12 overflow-y-auto leading-tight text-cyan-300 bg-black/80 p-1.5 rounded select-all selection:bg-cyan-500/30 scrollbar-thin">
                      {userSigData.userSig}
                   </div>
                </div>
             )}

             <Button 
                onClick={handleFetchTRTCSig} 
                disabled={trtcStatus === "loading"} 
                size="sm" 
                className="w-full h-8 text-[10px] tracking-widest uppercase font-bold bg-cyan-500 hover:bg-cyan-600 text-black shadow-[0_0_10px_rgba(6,182,212,0.3)] hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all cursor-pointer"
             >
                {trtcStatus === "loading" ? <Loader2 className="h-3 w-3 animate-spin mr-1 text-black" /> : null}
                {trtcStatus === "online" ? "更新 TRTC 签名 Token" : "获取 TRTC 签名 Token"}
             </Button>
          </div>
        </div>

       {/* Socratic Interventions */}
       <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">主席语音干预</h3>
          </div>
          <div className="space-y-3">
             <div className="p-3 rounded bg-orange-500/5 border border-orange-500/20 shadow-inner">
               <div className="text-[10px] text-orange-400 font-bold mb-1 uppercase tracking-widest">待输出结果</div>
               <p className="text-xs text-slate-300 italic min-h-6">
                  {aiIntervention 
                    ? (aiIntervention === "PROCEED" ? "会议进展顺利，无需干预。" : `"${aiIntervention}"`)
                    : "等待分析..."}
               </p>
             </div>
          </div>
       </div>

       {/* Secretary Summary (Task 4) */}
       <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white">秘书实时学术待办</h3>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
             {latestToDos && latestToDos.length > 0 ? (
                latestToDos.map((todo, idx) => (
                  <div key={idx} className="flex gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/30 transition-all hover:bg-emerald-500/10">
                     <div className="flex h-4 w-4 shrink-0 rounded-full border border-emerald-500/30 bg-emerald-950/20 items-center justify-center text-[9px] text-emerald-400 font-bold">
                        ✓
                     </div>
                     <span className="text-[11px] text-slate-300 font-sans leading-relaxed">{todo}</span>
                  </div>
                ))
             ) : (
                <div className="p-3 text-[11px] text-slate-500 italic rounded-lg bg-white/5 border border-white/5 leading-relaxed">
                   等待会议讨论充分，AI 秘书自动在后台提取核心共识学术待办...
                </div>
             )}
          </div>
       </div>

       {/* Realtime Transcript */}
       <div className="flex-1 flex flex-col min-h-32 bg-black/40 backdrop-blur border border-white/5 rounded-xl p-4 overflow-hidden relative mt-auto shadow-inner">
          <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10"></div>
          <div className="text-[10px] text-slate-500 font-mono mb-2 uppercase tracking-tight relative z-20">语音转写 (支持打断)</div>
          
          <ScrollArea className="flex-1 mb-2 pr-2 relative z-20" ref={scrollRef}>
             {transcript.length === 0 ? (
                 <div className="text-xs text-slate-600 italic mt-4">会场安静...</div>
             ) : (
                <div className="space-y-3 pb-2 pt-2">
                  {transcript.map((line, idx) => {
                      const isAi = line.speaker === "Chairperson" || line.speaker.includes("AI 主席") || line.speaker.includes("Chairperson");
                      const isSystem = line.speaker.includes("系统提示");
                      const displayName = isAi ? "AI 主席 (大地督导)" : (isSystem ? "系统提示" : line.speaker);
                      const colorClass = isAi 
                        ? "text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.15)] bg-cyan-950/20 px-1 py-0.5 rounded" 
                        : (isSystem ? "text-amber-400 font-semibold" : "text-slate-300");
                      return (
                        <p key={idx} className="text-xs text-slate-300 leading-relaxed">
                            <span className={`font-bold mr-1 ${colorClass}`}>
                                {displayName}:
                            </span>{" "}
                            {line.text}
                        </p>
                      );
                  })}
                </div>
             )}
          </ScrollArea>
          
          <form onSubmit={handleSimulateTalk} className="flex gap-2 relative z-20 mt-2">
              <input 
                 value={draftInput} 
                 onChange={e => setDraftInput(e.target.value)}
                 placeholder="模拟输入发言..." 
                 className="flex-1 text-[11px] bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all font-mono"
              />
              <Button type="submit" size="sm" variant="ghost" className="h-auto py-1.5 px-3 text-[10px] uppercase font-bold tracking-widest text-slate-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10">发送</Button>
          </form>
       </div>
    </aside>
  );
}
