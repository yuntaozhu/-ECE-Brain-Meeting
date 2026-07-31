import { useMeetingStore } from "../store";
import { 
  Copy, Mic, MicOff, Video, VideoOff, LogOut, Loader2, Play, Users, 
  HelpCircle, Sparkles, MessageSquare, ShieldAlert, CheckCircle2,
  Zap, Clock, Shuffle, ChevronRight, Settings, Shield, Lock
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import React, { useEffect, useRef, useState } from "react";
import { useTrtcMultiUser } from "../hooks/useTrtcMultiUser";
import { useMeetingOrchestrator } from "../hooks/useMeetingOrchestrator";
import { useAgendaDriver } from "../hooks/useAgendaDriver";
import { useRole } from "../hooks/useRole";
import AgendaKanbanBoard from "./AgendaKanbanBoard";
import { SystemDebugConsole } from "./SystemDebugConsole";
import { ApiHealthPanel } from "./ApiHealthPanel";
import { Terminal } from "lucide-react";

export default function MainRoom() {
  const { 
    joined, 
    setJoined, 
    micOn, 
    toggleMic, 
    videoOn, 
    toggleVideo, 
    currentTopic, 
    agendaStage, 
    setAgendaStage,
    aiIntervention,
    addTranscriptLine,
    userName,
    userRole,
    meetingId,
    joinMeeting,
    isTencentSyncEnabled,
    tencentMeetingInfo,
    tencentParticipants,
    setTencentParticipants
  } = useMeetingStore();

  // Periodically query Tencent Meeting participant list if sync is active
  useEffect(() => {
    if (!isTencentSyncEnabled || !tencentMeetingInfo?.meetingId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tencent/meetings/${tencentMeetingInfo.meetingId}/participants`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.participants) {
            setTencentParticipants(data.participants);
          }
        }
      } catch (e) {
        // Silent fallback
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [isTencentSyncEnabled, tencentMeetingInfo, setTencentParticipants]);

  const {
    remoteUsers,
    activeSpeakerId,
    isAutoDiscussing,
    setIsAutoDiscussing,
    makeAttendeeSpeak,
    toggleAttendeeMic,
    toggleAttendeeVideo,
    getAudioMixingConcept,
    trtcStatusText
  } = useTrtcMultiUser();

  const {
    triggerOrchestration,
    analyzing
  } = useMeetingOrchestrator();

  const {
    agendas,
    timeLeft,
    silenceCounter,
    isMeetingActive,
    hasPromptedStart,
    triggerOpeningSpeech,
    forceAdvanceStage,
    setIsMeetingActive
  } = useAgendaDriver();

  const { isCreator, isAttendee, canControl } = useRole();

  const [showMixExplanation, setShowMixExplanation] = useState(false);
  const [showDebugConsole, setShowDebugConsole] = useState(false);
  const [showApiHealth, setShowApiHealth] = useState(false);
  const [textInput, setTextInput] = useState("");

  // Lobby form inputs prefilled dynamically from invitation path parameters
  const [lobbyName, setLobbyName] = useState(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("role") === "attendee") {
        return "杨督导";
      }
    }
    return "张园长";
  });
  
  const [lobbyRole, setLobbyRole] = useState(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("role") === "attendee") {
        return "省优质名园考评长";
      }
    }
    return "学前数字融合组长";
  });

  const [lobbyRoomId, setLobbyRoomId] = useState(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const rmId = searchParams.get("roomId");
      if (rmId) return rmId;
      const match = window.location.pathname.match(/^\/meeting\/([^/]+)/);
      return match ? match[1] : "10086";
    }
    return "10086";
  });

  const handleJoin = () => {
    const isGuest = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("role") === "attendee";
    joinMeeting(lobbyName, lobbyRole, lobbyRoomId, isGuest ? "attendee" : "creator");
  };

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    // 1. Insert participant's key statement of opinion as custom user name
    addTranscriptLine(userName, textInput.trim());
    setTextInput("");

    // 2. Trigger KaibanJS evaluations immediately with a brief margin to update state
    setTimeout(() => {
      triggerOrchestration();
    }, 100);
  };

  const handleEndMeeting = () => {
    // 1. Force cut off all browser audio speech synthesis to silence any active virtual host or simulated attendee voices instantly
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    
    // 2. Shut down auto simulation discussions
    setIsAutoDiscussing(false);
    
    // 3. Insert final explicit conclusion event in meeting journal logs
    addTranscriptLine("系统提示", "🔴 研讨会已由您强制结束：所有 AI 控场智能体、TRTC 多路流混音、及自动模拟发言服务已顺利降噪并全面挂断释放。");
    
    // 4. Force leave the viewport state
    setJoined(false);
  };

  if (!joined) {
    return (
      <div className="flex flex-1 h-full flex-col items-center justify-center space-y-6 bg-[#05070A] bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.08)_0%,_transparent_70%)] relative p-4 overflow-y-auto w-full">
        <div className="text-center z-10 max-w-2xl px-4 mt-6">
          <div className="mb-4 text-[10px] uppercase tracking-widest text-cyan-400 font-bold border border-cyan-500/20 px-3 py-1 bg-cyan-500/10 rounded-full inline-block">
            ECE-Brain 智慧研讨空间 v2.5
          </div>
          <h1 className="font-sans text-3xl sm:text-4xl font-extralight tracking-tight text-white leading-tight">
            大地 ECE-Brain “数字主理人”
          </h1>
          <h2 className="text-md sm:text-lg font-light text-cyan-400 mt-2 tracking-wide">
            多人研讨室动态入会大厅 & 智能调度中心
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            由大地AI大脑持握纪律，自动纠正无关喧哗。
            请配置您的参会虚拟姓名与学术职位，申请与全场声纹直连。
          </p>
        </div>

        <Card className="w-full max-w-md shadow-[0_0_50px_rgba(6,182,212,0.12)] border-white/10 bg-black/70 backdrop-blur z-10 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-500"></div>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-white tracking-widest uppercase text-center flex items-center justify-center gap-2">
              <Users className="h-4 w-4 text-cyan-400" />
              填写参会学术履历身份
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Character Role Indicator in Lobby (Task 2) */}
            <div className="flex justify-center -mt-1 mb-2">
              {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("role") === "attendee" ? (
                <Badge className="bg-slate-500/15 border border-slate-500/20 text-slate-400 text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  参会身份: 普通受邀嘉宾 (只读议案流控)
                </Badge>
              ) : (
                <Badge className="bg-purple-500/15 border border-purple-500/20 text-purple-400 text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  参会身份: 会议发起高管 (享有独家议程流控权)
                </Badge>
              )}
            </div>

             {/* Dynamic Room ID banner */}
             <div className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-center">
               <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 block mb-0.5">即将接入的研讨室</span>
               <span className="text-sm font-bold text-white tracking-widest font-mono">ROOM ID: {lobbyRoomId}</span>
             </div>

             <div className="space-y-3 pt-1">
               <div className="space-y-1">
                 <label className="text-[10px] font-mono uppercase text-slate-400">真实姓名</label>
                 <input
                   type="text"
                   value={lobbyName}
                   onChange={(e) => setLobbyName(e.target.value)}
                   placeholder="请输入真实姓名，如：周副院长"
                   className="w-full text-xs bg-white/5 border border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-xl px-3.5 py-2.5 text-white outline-none transition-all font-sans"
                 />
               </div>

               <div className="space-y-1">
                 <label className="text-[10px] font-mono uppercase text-slate-400">教研职位 (Role / Post)</label>
                 <input
                   type="text"
                   value={lobbyRole}
                   onChange={(e) => setLobbyRole(e.target.value)}
                   placeholder="请输入学术职位，如：儿童智能感知工程组长"
                   className="w-full text-xs bg-white/5 border border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-xl px-3.5 py-2.5 text-white outline-none transition-all font-sans"
                 />
               </div>

               <div className="space-y-1">
                 <label className="text-[10px] font-mono uppercase text-slate-400">研讨频道号 (Room ID)</label>
                 <input
                   type="text"
                   value={lobbyRoomId}
                   onChange={(e) => setLobbyRoomId(e.target.value)}
                   placeholder="请输入房间ID"
                   className="w-full text-xs bg-white/5 border border-white/10 hover:border-white/20 focus:border-cyan-500/50 rounded-xl px-3.5 py-2.5 text-white outline-none transition-all font-mono"
                 />
               </div>
             </div>

             {/* Prefill quick items */}
             <div className="space-y-1.5 pt-1">
               <span className="text-[10px] font-mono uppercase text-slate-500 block">候选身份快速套用</span>
               <div className="grid grid-cols-2 gap-2">
                 <button
                   onClick={() => { setLobbyName("张园长"); setLobbyRole("学前数字融合组长"); }}
                   className="text-[10px] text-left p-2 rounded-lg bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all text-slate-300 truncate"
                 >
                   ✍️ <strong>张园长</strong> <span className="block text-[8px] text-slate-500">学前数字融合</span>
                 </button>
                 <button
                   onClick={() => { setLobbyName("杨督导"); setLobbyRole("省优质名园考评长"); }}
                   className="text-[10px] text-left p-2 rounded-lg bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all text-slate-300 truncate"
                 >
                   ✍️ <strong>杨督导</strong> <span className="block text-[8px] text-slate-500">省优质名园考</span>
                 </button>
               </div>
             </div>

             {/* Hardware control indicators */}
             <div className="grid grid-cols-2 gap-2 pt-1">
               <div className="flex items-center justify-between border border-white/5 bg-white/5 rounded-xl p-2.5">
                 <span className="text-[10px] text-slate-400 flex items-center gap-1.5"><Mic className="h-3.5 w-3.5 text-cyan-400"/>音频</span>
                 <Button variant={micOn ? "default" : "secondary"} size="icon" onClick={toggleMic} className={`h-7 w-7 rounded-lg ${micOn ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white'}`}>
                   {micOn ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                 </Button>
               </div>
               <div className="flex items-center justify-between border border-white/5 bg-white/5 rounded-xl p-2.5">
                 <span className="text-[10px] text-slate-400 flex items-center gap-1.5"><Video className="h-3.5 w-3.5 text-cyan-400"/>视频</span>
                 <Button variant={videoOn ? "default" : "secondary"} size="icon" onClick={toggleVideo} className={`h-7 w-7 rounded-lg ${videoOn ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white'}`}>
                   {videoOn ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
                 </Button>
               </div>
             </div>

             <Button 
               className="w-full mt-4 bg-cyan-500 border border-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] font-bold uppercase tracking-widest text-[10px] h-10 transition-all rounded-xl" 
               onClick={handleJoin}
             >
               绑定身份并接入 TRTC 研讨室
             </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <section className="flex-1 relative flex flex-col p-6 bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.06)_0%,_transparent_70%)] border-r border-white/5 overflow-y-auto">
      {/* Upper Meta-Info & Simulator Tool belt */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[9px] text-cyan-400 font-mono font-bold border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              第 4 阶段：多人声纹追踪与实时控场
            </span>
            <Badge className="bg-cyan-500/10 border-cyan-500/20 text-cyan-400 text-[9px] px-2 font-mono">
              ● TRTC STATUS: {trtcStatusText}
            </Badge>

            {isTencentSyncEnabled && (
              <Badge className="bg-blue-500/20 border-blue-400/40 text-blue-300 text-[9px] px-2 font-mono flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping"></span>
                腾讯会议联调 (号: {tencentMeetingInfo?.meetingCode || '328-910-442'})
              </Badge>
            )}
          </div>
          <h2 className="text-lg font-light text-white tracking-tight flex items-center gap-2">
            主题：{currentTopic}
          </h2>
        </div>
        
        {/* Playable Mode Toggles */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowApiHealth(true)}
            className="text-[10px] border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-lg h-8 font-mono"
          >
            <ShieldAlert className="h-3 w-3 mr-1 text-red-400" />
            ⚠️ API 健康与故障面板
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowDebugConsole(true)}
            className="text-[10px] border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg h-8 font-mono animate-pulse"
          >
            <Terminal className="h-3 w-3 mr-1 text-amber-400" />
            🛠️ AI调试日志控制台
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowMixExplanation(!showMixExplanation)}
            className="text-[10px] border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/15 text-cyan-300 rounded-lg h-8"
          >
            <HelpCircle className="h-3 w-3 mr-1" />
            多路音频混音架构
          </Button>

          <Button 
            variant="default" 
            size="sm" 
            onClick={() => setIsAutoDiscussing(!isAutoDiscussing)}
            className={`text-[10px] rounded-lg font-bold tracking-wider uppercase h-8 transition-all ${
              isAutoDiscussing 
                ? "bg-amber-500 hover:bg-amber-600 text-black shadow-[0_0_15px_rgba(245,158,11_0.4)]" 
                : "bg-white/10 text-white border border-white/10 hover:bg-white/20"
            }`}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {isAutoDiscussing ? "■ 停止模拟多人交谈" : "▶ 启动模拟多人交谈"}
          </Button>
        </div>
      </div>

      <SystemDebugConsole isOpen={showDebugConsole} onClose={() => setShowDebugConsole(false)} />
      <ApiHealthPanel isOpen={showApiHealth} onClose={() => setShowApiHealth(false)} />

      {/* Audio mixing details slide panel */}
      {showMixExplanation && (
        <div className="mb-4 p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 font-mono text-[11px] leading-relaxed text-cyan-300 relative">
          <button 
            className="absolute top-2 right-2 hover:text-white" 
            onClick={() => setShowMixExplanation(false)}
          >
            ✕
          </button>
          <pre className="whitespace-pre-wrap font-sans">{getAudioMixingConcept()}</pre>
        </div>
      )}

      {/* TASK 2 COMPLIANCE: AI PROACTIVE ORCHESTRATION PACEMAKER CONTROL CONSOLE */}
      <div className="mb-6 p-4 rounded-2xl border border-dashed border-cyan-500/30 bg-cyan-950/5 relative overflow-hidden backdrop-blur shadow-[0_0_20px_rgba(6,182,212,0.03)]">
        <div className="absolute top-0 right-0 p-3 opacity-10">
          <Zap className="h-20 w-20 text-cyan-400 rotate-12" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></div>
              <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold font-mono">
                AI 主动驱动引擎 (Proactive AI Pacemaker)
              </span>
              <Badge className={`text-[8px] font-mono font-bold ${isMeetingActive ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-white/5 text-slate-500 border border-transparent"}`}>
                {isMeetingActive ? "活跃起搏中 (LIVE)" : "冷机等待 (STANDBY)"}
              </Badge>
            </div>
            <h3 className="text-sm font-semibold text-white tracking-tight">
              智慧教研心脏起搏器 · 声纹与时序双重驱动器
            </h3>
            <p className="text-xs text-slate-400 max-w-xl">
              系统静默监测：持续 <strong>8 秒无声音</strong> 将瞬间触发静默逆向脉冲刺激 AI 主席（大地督导）主动发话纠偏。议题时间耗尽后自动跳转。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Silence meter indicator */}
            <div className="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl bg-black/40 border border-white/5 w-24">
              <span className="text-[8px] text-slate-500 font-mono tracking-wider uppercase mb-0.5">累积静默</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-sm font-bold font-mono ${silenceCounter >= 6 ? "text-red-400 animate-pulse" : "text-cyan-400"}`}>
                  {silenceCounter}s
                </span>
                <span className="text-[9px] text-slate-600 font-mono">/ 8s</span>
              </div>
            </div>

            {/* Stage countdown timer */}
            <div className="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl bg-black/40 border border-white/5 w-28">
              <span className="text-[8px] text-slate-500 font-mono tracking-wider uppercase mb-0.5">本议程倒计时</span>
              <div className="flex items-baseline gap-0.5">
                <Clock className="h-3 w-3 text-emerald-400 mr-1 shrink-0 self-center" />
                <span className="text-sm font-bold font-mono text-emerald-400">{timeLeft}s</span>
              </div>
            </div>

            {/* Pacific control triggers */}
            <div className="flex items-center gap-2">
              {!canControl ? (
                <Button
                  disabled
                  size="sm"
                  className="bg-slate-800/60 text-slate-500 border border-slate-700/30 font-bold uppercase text-[10px] tracking-widest h-9 select-none cursor-not-allowed pr-3"
                >
                  <Lock className="h-3 w-3 mr-1" />
                  已锁定 (限高管)
                </Button>
              ) : !hasPromptedStart ? (
                <Button
                  onClick={() => triggerOpeningSpeech(remoteUsers)}
                  size="sm"
                  className="bg-cyan-500 hover:bg-cyan-600 font-bold uppercase text-[10px] tracking-widest text-black h-9 shadow-[0_0_12px_rgba(6,182,212,0.4)] hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] cursor-pointer pr-3"
                >
                  <Zap className="h-3 w-3 mr-1 animate-bounce" />
                  正式开始会议
                </Button>
              ) : (
                <Button
                  onClick={() => triggerOpeningSpeech(remoteUsers)}
                  variant="outline"
                  size="sm"
                  className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 font-bold uppercase text-[10px] tracking-widest h-9"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  促使主席发话
                </Button>
              )}

              <Button
                onClick={forceAdvanceStage}
                disabled={!canControl}
                variant="outline"
                size="sm"
                className={`font-bold uppercase text-[10px] tracking-widest h-9 ${
                  !canControl 
                    ? "border-white/5 bg-white/2 cursor-not-allowed text-slate-600 opacity-40 select-none" 
                    : "border-white/10 hover:bg-white/5 text-slate-300 cursor-pointer"
                }`}
              >
                ⏩ {!canControl ? "跳过 (限高管)" : "强制切议题"}
              </Button>
            </div>
          </div>
        </div>

        {/* Visual progress bars representing silence safety threshold */}
        <div className="mt-3.5 h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5 flex gap-0.5 p-0.5">
          <div 
            className={`h-full rounded-full transition-all duration-300 ${
              silenceCounter >= 6 
                ? "bg-gradient-to-r from-red-500 to-red-400 animate-pulse" 
                : "bg-gradient-to-r from-cyan-500 to-cyan-400"
            }`} 
            style={{ width: `${(silenceCounter / 8) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* KaibanJS 议程状态看板 - Dynamic Swimlanes (Task 3) */}
      <div className="mb-6">
        <AgendaKanbanBoard />
      </div>

      {/* Main Conference Viewport (Task 3: Prominent AI Chairman + Human Grid Layout) */}
      <div className="flex-1 flex flex-col gap-5">
        
        {/* FIXED PROMINENT COMPONENT: AI Chairman Host Room Card */}
        <div className="w-full relative rounded-2xl overflow-hidden border border-cyan-500/30 bg-cyan-950/10 shadow-[0_0_30px_rgba(6,182,212,0.06)] p-5 flex flex-col md:flex-row items-center gap-6">
          <div className="relative shrink-0 w-24 h-24 rounded-full bg-cyan-500/5 border border-cyan-500/30 flex items-center justify-center shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]">
            <div className="absolute w-[85%] h-[85%] rounded-full border border-cyan-500/10"></div>
            <div className="absolute w-[70%] h-[70%] rounded-full border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center justify-center bg-cyan-500/15">
              <span className="text-3xl text-cyan-400 font-serif italic drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">A</span>
            </div>
            
            {/* Pulsing voice status ring */}
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 animate-ping opacity-60"></div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start mb-1.5">
              <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase">
                AI 虚拟主席 (大地教研核心枢纽)
              </span>
              <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-[8px] animate-pulse">
                KaibanJS 多人控场监控中
              </Badge>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              会议督导对走题、闲聊词汇(如“端午采购、粽子预算”)保持高敏拦截状态。
              若发言中夹杂与“双语托班多媒体和算法校验”不符的主题，本机会进行高声发音警告打断！
            </p>
            {aiIntervention && (
              <div className="mt-3 inline-flex items-center gap-2 py-2 px-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium animate-bounce max-w-full">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
                <span className="truncate">“AI 主席干预： {aiIntervention} ”</span>
              </div>
            )}
          </div>
          
          <div className="absolute bottom-4 right-4 text-[10px] text-cyan-400/60 font-mono uppercase bg-black/40 px-2 py-1 rounded border border-cyan-500/10">
            Chairman (Active Voice)
          </div>

          {/* AI active speech wave visualizer */}
          <AIWaveformActive />
        </div>

        {/* HUMAN GRID LAYOUT (Responsive Grid of 4 attendees: 1 Local + 3 Simulated) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* USER 1: Local User card (自定义绑定的身份) */}
          <div className={`relative rounded-xl border p-4 bg-black/40 backdrop-blur transition-all flex flex-col justify-between aspect-[4/3] ${
            activeSpeakerId === "user_me" || micOn
              ? "border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
              : "border-white/5"
          }`}>
            <div className="flex items-center justify-between">
              <Badge className="bg-cyan-500/10 text-cyan-400 px-2 py-0 border-cyan-500/20 text-[9px]">
                LOCAL ({userName || "我"})
              </Badge>
              <div className="flex gap-1.5">
                {micOn ? (
                  <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.7)] animate-pulse"></span>
                ) : (
                  <MicOff className="h-3 w-3 text-red-500" />
                )}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center flex-1 my-3">
              <div className={`relative rounded-full h-16 w-16 bg-white/5 border border-white/15 flex items-center justify-center transition-all ${
                micOn ? "scale-105 border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]" : ""
              }`}>
                <span className="text-lg font-light tracking-widest text-slate-300">
                  {userName ? userName.slice(-2) : "我"}
                </span>
                
                {/* Visual active ring if speaking */}
                {micOn && (
                  <span className="absolute inset-x-0 inset-y-0 rounded-full border border-cyan-400/30 animate-ping"></span>
                )}
              </div>
              <span className="text-xs font-semibold text-slate-200 mt-2">{userName || "我"}</span>
              <span className="text-[10px] text-slate-500 mt-0.5">{userRole || "大地教研代表"}</span>
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-2">
              <div className="flex gap-1">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={toggleMic} 
                  className={`h-7 w-7 rounded ${micOn ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-500 hover:text-white'}`}
                >
                  {micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={toggleVideo} 
                  className={`h-7 w-7 rounded ${videoOn ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-500 hover:text-white'}`}
                >
                  {videoOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <span className="text-[8px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded uppercase">
                {micOn ? "Active" : "Muted"}
              </span>
            </div>
          </div>

          {/* SIMULATED REMOTE USER CARDS */}
          {remoteUsers.map((user) => {
            const isSpeaking = user.isSpeaking;
            return (
              <div 
                key={user.id} 
                className={`relative rounded-xl border p-4 bg-black/40 backdrop-blur transition-all flex flex-col justify-between aspect-[4/3] ${
                  isSpeaking 
                    ? "border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.15)] bg-amber-500/[0.02]"
                    : "border-white/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Badge className={`px-2 py-0 border text-[9px] ${
                    isSpeaking 
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30" 
                      : "bg-white/5 text-slate-400 border-white/5"
                  }`}>
                    {isSpeaking ? "正在发言" : "在线"}
                  </Badge>
                  <div className="flex gap-1.5 items-center">
                    {!user.micOn && (
                      <MicOff className="h-3 w-3 text-red-500" />
                    )}
                    {isSpeaking && (
                      <div className="flex items-end gap-0.5 h-3">
                        <div className="w-0.5 h-1.5 bg-amber-400 animate-pulse"></div>
                        <div className="w-0.5 h-2.5 bg-amber-400 animate-pulse delay-75"></div>
                        <div className="w-0.5 h-2 bg-amber-400 animate-pulse delay-150"></div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center flex-1 my-3">
                  <div className={`relative rounded-full h-16 w-16 bg-white/5 border flex items-center justify-center transition-all ${
                    isSpeaking 
                      ? "border-amber-400 scale-105 shadow-[0_0_12px_rgba(245,158,11,0.2)] bg-amber-500/10" 
                      : "border-white/10"
                  }`}>
                    <span className={`text-lg font-bold ${isSpeaking ? 'text-amber-400' : 'text-slate-300'}`}>
                      {user.avatar}
                    </span>
                    {isSpeaking && (
                      <span className="absolute inset-x-0 inset-y-0 rounded-full border border-amber-400/40 animate-ping"></span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-200 mt-2">{user.name}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{user.role}</span>
                </div>

                {/* Simulated action row for users */}
                <div className="flex items-center justify-between border-t border-white/5 pt-2">
                  <div className="flex gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => toggleAttendeeMic(user.id)} 
                      className={`h-7 w-7 rounded ${user.micOn ? 'text-cyan-400' : 'text-slate-500 hover:text-white'}`}
                    >
                      {user.micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => toggleAttendeeVideo(user.id)} 
                      className={`h-7 w-7 rounded ${user.videoOn ? 'text-cyan-400' : 'text-slate-500 hover:text-white'}`}
                    >
                      {user.videoOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  
                  <Button 
                    size="xs" 
                    variant="outline"
                    onClick={() => makeAttendeeSpeak(user.id)}
                    className="h-6 text-[9px] px-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 font-bold"
                  >
                    模拟发言
                  </Button>
                </div>
              </div>
            );
          })}

        </div>
      </div>

      {/* 参会者文字发言输入 Tray (Task: 参会者，除了语音输入，也可以文字输入) */}
      <div className="mt-6 w-full max-w-4xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5 shadow-xl backdrop-blur-md relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
          <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-mono uppercase tracking-wider font-bold">
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            参会者文字发言（打字输入与麦克风同行）
          </div>
          <span className="text-[10px] text-slate-400">
            发送后发言将编入教研记录流，且立即触发 AI 虚拟主席对内容的偏题检测
          </span>
        </div>
        
        <form onSubmit={handleSubmitText} className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="在此键入您的观点或测试词汇，例如：‘我们应当严加控制这次端午亲子采购预算，多买点高端粽子。’"
            className="flex-1 text-xs bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all font-sans"
          />
          <Button 
            type="submit" 
            disabled={!textInput.trim() || analyzing}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs px-6 rounded-xl transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] shrink-0"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                考量中
              </>
            ) : (
              "发送发言"
            )}
          </Button>
        </form>
      </div>

      {/* Conference control panel */}
      <div className="h-16 bg-black/60 backdrop-blur border border-white/10 rounded-full mt-6 flex items-center justify-center gap-6 px-10 self-center shadow-[0_10px_30px_rgba(0,0,0,0.5)] max-w-md shrink-0 w-full">
        <Button 
          id="local-mic-toggle-btn"
          variant="outline" 
          onClick={toggleMic} 
          size="lg" 
          title={micOn ? "静音麦克风 (Mute)" : "开启麦克风 (Unmute)"}
          className={`rounded-full w-10 h-10 p-0 border border-white/10 transition-all cursor-pointer ${
            micOn 
              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
              : 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
          }`}
        >
           {micOn ? <Mic className="h-4.5 w-4.5 text-cyan-400" /> : <MicOff className="h-4.5 w-4.5 text-red-400" />}
        </Button>
        <Button variant="outline" onClick={toggleVideo} size="lg" className={`rounded-full w-10 h-10 p-0 border-white/20 transition-all ${videoOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]'}`}>
           {videoOn ? <Video className="h-4.5 w-4.5" /> : <VideoOff className="h-4.5 w-4.5" />}
        </Button>
        <div className="w-px h-6 bg-white/10 mx-1"></div>
        <Button onClick={handleEndMeeting} size="lg" className="rounded-full px-5 h-10 font-bold uppercase tracking-widest text-[9px] bg-red-500/20 text-red-100 border border-red-500/40 hover:bg-red-600 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]">
           结束会议
        </Button>
      </div>
    </section>
  );
}

function AIWaveformActive() {
    const { aiIntervention } = useMeetingStore();
    if (!aiIntervention || aiIntervention === "PROCEED") return null;
    return (
        <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-end gap-1.5 h-12 z-0 opacity-40">
            <div className="w-1.5 h-6 bg-cyan-400 rounded-full animate-[bounce_1s_infinite]"></div>
            <div className="w-1.5 h-10 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_0.1s] shadow-[0_0_10px_#22d3ee]"></div>
            <div className="w-1.5 h-8 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_0.2s]"></div>
            <div className="w-1.5 h-12 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_0.3s] shadow-[0_0_12px_#22d3ee]"></div>
            <div className="w-1.5 h-5 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_0.4s]"></div>
        </div>
    )
}
