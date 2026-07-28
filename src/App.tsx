/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { Copy, Check, Share2, Shield, User } from "lucide-react";
import MainRoom from "./components/MainRoom";
import AgentPanel from "./components/AgentPanel";
import MeetingSetup from "./components/MeetingSetup";
import { useMeetingStore } from "./store";
import { useGeminiLive } from "./hooks/useGeminiLive";
import { useRole } from "./hooks/useRole";

export default function App() {
  const { joined, userRoleType, userName, userRole } = useMeetingStore();
  const { isConnected, connectStream, disconnectStream } = useGeminiLive();
  const { isCreator, isAttendee } = useRole();
  const [copied, setCopied] = useState(false);

  // Local state router: Creator gets setup page; Attendee goes straight to login lobby
  const [activeView, setActiveView] = useState<'setup' | 'meeting'>(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("role") === "attendee") {
        return "meeting";
      }
    }
    return "setup";
  });

  // Get current meeting URL dynamically
  const meetingUrl = typeof window !== "undefined" ? window.location.href : "https://ece.dadi.edu/room/brain-orchestrator";

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(meetingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Connect and establish modern bidirectional voice flow with Gemini Live model on join
  useEffect(() => {
    if (joined) {
      connectStream();
    } else {
      disconnectStream();
    }
    return () => {
      disconnectStream();
    };
  }, [joined]);

  if (activeView === "setup") {
    return <MeetingSetup onSetupComplete={() => setActiveView("meeting")} />;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#05070A] text-slate-200 overflow-hidden font-sans select-none">
       {/* Header: System Identity */}
       {joined && (
         <header className="h-16 border-b border-white/10 px-6 flex items-center justify-between bg-black/40 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rotate-45"></div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold tracking-widest text-white uppercase">大地 ECE-Brain</h1>
                <span className="text-[10px] bg-cyan-500/15 text-cyan-400 px-1.5 py-0.2 rounded border border-cyan-500/20 font-bold font-mono tracking-tighter uppercase self-center leading-none">
                  AI 智能研讨
                </span>
                {isCreator ? (
                  <span className="text-[9px] bg-purple-500/15 text-purple-400 px-1.5 py-0.2 rounded border border-purple-500/20 font-semibold self-center leading-none flex items-center gap-0.5">
                    <Shield className="w-2.5 h-2.5" />
                    发起高管
                  </span>
                ) : (
                  <span className="text-[9px] bg-slate-500/15 text-slate-400 px-1.5 py-0.2 rounded border border-slate-500/10 font-semibold self-center leading-none flex items-center gap-0.5">
                    <User className="w-2.5 h-2.5" />
                    普通参会者
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                主持决策单元 ({userName} · {userRole})
              </span>
            </div>
          </div>

          {/* Prominent Meeting Room Link Display & Quick Copy */}
          <div className="hidden md:flex items-center gap-2 max-w-sm lg:max-w-md bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all rounded-full p-1 pl-4 pr-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 flex items-center gap-1.5 shrink-0">
              <Share2 className="w-3 h-3 text-cyan-400" />
              当前分享口:
            </span>
            <span className="text-xs truncate font-mono text-slate-300 select-all max-w-[150px] lg:max-w-[240px]">
              {meetingUrl}
            </span>
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-all cursor-pointer ${
                copied
                  ? "bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                  : "bg-cyan-500 text-black font-bold hover:bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.25)]"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  复制链接
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-amber-500 animate-ping"} transition-all`}></div>
                <span className="text-xs font-medium text-white uppercase tracking-wider">
                  {isConnected ? "Gemini Live 已就绪" : "连接中..."}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
                混音引擎: 120ms | 音频模式: 全双工
              </span>
            </div>
          </div>
        </header>
       )}

       <main className="flex-1 flex overflow-hidden">
         <MainRoom />
         {joined && <AgentPanel />}
       </main>
    </div>
  );
}
