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
import { useRole } from "./hooks/useRole";

function getShareLinkParams() {
  if (typeof window === "undefined") return { role: null as string | null, roomId: null as string | null };
  const searchParams = new URLSearchParams(window.location.search);
  return {
    role: searchParams.get("role"),
    roomId: searchParams.get("roomId")
  };
}

export default function App() {
  const { joined, userName, userRole, meetingId, tencentMeetingInfo, joinMeeting } = useMeetingStore();
  const { isCreator } = useRole();
  const [copied, setCopied] = useState(false);

  const { role: urlRole, roomId: urlRoomId } = getShareLinkParams();
  const isShareLinkEntry = urlRole === "attendee" || Boolean(urlRoomId);

  const [activeView, setActiveView] = useState<"setup" | "meeting">(() => {
    if (typeof window !== "undefined") {
      const { role, roomId } = getShareLinkParams();
      if (role === "attendee" || roomId) return "meeting";
    }
    return "setup";
  });

  // Share-link entry form — always require explicit submit (no auto-join)
  const [entryName, setEntryName] = useState("");
  const [entryRole, setEntryRole] = useState("");
  const [entryRoomId] = useState(() => urlRoomId || "10086");
  const [showEntryForm, setShowEntryForm] = useState(() => isShareLinkEntry);

  useEffect(() => {
    if (!isShareLinkEntry || joined) return;
    // Pre-fill drafts only; user must click confirm
    try {
      const ctx = localStorage.getItem("dadimeeting_context");
      if (ctx) {
        const parsed = JSON.parse(ctx);
        if (parsed?.meetingId === entryRoomId) {
          if (parsed.userName && !entryName) setEntryName(parsed.userName);
          if (parsed.userRole && !entryRole) setEntryRole(parsed.userRole);
        }
      }
    } catch {
      /* ignore */
    }
  }, [isShareLinkEntry, joined, entryRoomId, entryName, entryRole]);

  const confirmShareLinkJoin = () => {
    const name = entryName.trim();
    const role = entryRole.trim();
    if (!name || !role) return;

    const roomId = entryRoomId;
    try {
      localStorage.setItem(`dadimeeting_display_name_${roomId}`, name);
    } catch {
      /* ignore */
    }
    setShowEntryForm(false);
    joinMeeting(name, role, roomId, "attendee");
  };

  const activeRoomId = tencentMeetingInfo?.meetingCode || meetingId || entryRoomId || "10086";
  const meetingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?role=attendee&roomId=${activeRoomId}`
      : `https://dadimeeting.minervaedu.app/?role=attendee&roomId=${activeRoomId}`;

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(meetingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (activeView === "setup") {
    return <MeetingSetup onSetupComplete={() => setActiveView("meeting")} />;
  }

  if (showEntryForm && !joined) {
    return (
      <div className="min-h-screen bg-[#05070A] flex items-center justify-center px-4">
        <div className="w-full max-w-md border border-white/10 bg-black/70 rounded-2xl p-6 space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-cyan-400 font-mono">分享链接入会</p>
            <h2 className="text-xl text-white font-light">请填写参会信息</h2>
            <p className="text-xs text-slate-400">
              房间 <span className="font-mono text-cyan-300">{entryRoomId}</span>
              — 填写姓名与职务后进入等待室，管理员开始会议后 AI 将主导研讨。
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-mono uppercase text-slate-500">姓名 *</label>
              <input
                className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
                placeholder="例如：李园长"
                value={entryName}
                onChange={(e) => setEntryName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-slate-500">职务 *</label>
              <input
                className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
                placeholder="例如：省优质名园考评长"
                value={entryRole}
                onChange={(e) => setEntryRole(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmShareLinkJoin();
                }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={confirmShareLinkJoin}
            disabled={!entryName.trim() || !entryRole.trim()}
            className="w-full rounded-lg bg-cyan-500/90 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-semibold py-2.5"
          >
            进入等待室
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#05070A] text-slate-200 overflow-hidden font-sans select-none">
      {joined && (
        <header className="h-14 border-b border-white/10 px-6 flex items-center justify-between bg-black/40 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded bg-cyan-500 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rotate-45" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold tracking-widest text-white uppercase">大地 ECE-Brain</h1>
                {isCreator ? (
                  <span className="text-[9px] bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20 flex items-center gap-0.5">
                    <Shield className="w-2.5 h-2.5" />
                    发起高管
                  </span>
                ) : (
                  <span className="text-[9px] bg-slate-500/15 text-slate-400 px-1.5 py-0.5 rounded border border-slate-500/10 flex items-center gap-0.5">
                    <User className="w-2.5 h-2.5" />
                    参会嘉宾
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400">
                {userName} · {userRole}
              </span>
            </div>
          </div>

          {isCreator && (
            <div className="hidden md:flex items-center gap-2 max-w-xl bg-white/5 border border-white/10 rounded-full p-1 pl-4 pr-1">
              <Share2 className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="text-xs truncate font-mono text-slate-300 max-w-[200px]">{meetingUrl}</span>
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${
                  copied ? "bg-emerald-500 text-black" : "bg-cyan-500 text-black hover:bg-cyan-400"
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
                    复制分享链接
                  </>
                )}
              </button>
            </div>
          )}
        </header>
      )}

      <main className="flex-1 flex overflow-hidden">
        <MainRoom />
        {joined && <AgentPanel />}
      </main>
    </div>
  );
}
