import React, { useEffect, useState, useCallback } from "react";
import { ChevronDown, ChevronUp, Mic, MicOff, Users, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TencentParticipant } from "../types";
import { useMeetingStore } from "../store";
import { apiUrl } from "../lib/apiBase";

interface ParticipantsStripProps {
  meetingId?: string;
  className?: string;
  /** When true, start collapsed (meeting-in-progress); lobby can pass false */
  defaultCollapsed?: boolean;
}

export function ParticipantsStrip({
  meetingId: propMeetingId,
  className = "",
  defaultCollapsed = true
}: ParticipantsStripProps) {
  const storeMeetingId = useMeetingStore((s) => s.meetingId);
  const tencentParticipants = useMeetingStore((s) => s.tencentParticipants);
  const micOn = useMeetingStore((s) => s.micOn);
  const userName = useMeetingStore((s) => s.userName);
  const userIdFromCtx = (() => {
    try {
      const raw = localStorage.getItem("dadimeeting_context");
      return raw ? JSON.parse(raw)?.userId : "";
    } catch {
      return "";
    }
  })();

  const activeMeetingId = propMeetingId || storeMeetingId || "10086";
  const [participants, setParticipants] = useState<TencentParticipant[]>(tencentParticipants || []);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const sync = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/api/meeting/state/${encodeURIComponent(activeMeetingId)}`));
      if (!res.ok) return;
      const data = await res.json();
      const list: TencentParticipant[] = data.state?.tencentParticipants || [];
      setParticipants(list);
      useMeetingStore.getState().setTencentParticipants(list);
    } catch {
      setParticipants(useMeetingStore.getState().tencentParticipants || []);
    }
  }, [activeMeetingId]);

  useEffect(() => {
    sync();
    const id = setInterval(sync, 3000);
    return () => clearInterval(id);
  }, [sync]);

  useEffect(() => {
    setParticipants(tencentParticipants || []);
  }, [tencentParticipants]);

  const rows: Array<{
    key: string;
    name: string;
    role: string;
    muted: boolean;
    isAi?: boolean;
    isSelf?: boolean;
  }> = [
    {
      key: "ai-chair",
      name: "AI 主席",
      role: "大地教研督导",
      muted: false,
      isAi: true
    },
    ...participants.map((p) => {
      const isSelf =
        (userIdFromCtx && p.userId === userIdFromCtx) ||
        (userName && p.userName === userName);
      return {
        key: p.userId || p.userName,
        name: p.userName,
        role: p.userRole || (p.userRoleType === "creator" ? "管理员" : "参会者"),
        muted: isSelf ? !micOn : Boolean(p.isMuted),
        isSelf
      };
    })
  ];

  return (
    <div
      className={`rounded-xl border border-white/10 bg-black/50 backdrop-blur-md ${className}`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-[11px] font-semibold text-slate-200">参会成员</span>
          <Badge variant="outline" className="text-[9px] border-cyan-500/30 text-cyan-300">
            {participants.length} 人 + AI
          </Badge>
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>

      {!collapsed && (
        <div className="px-3 pb-2.5 flex gap-2 overflow-x-auto items-stretch">
          {rows.map((row) => (
            <div
              key={row.key}
              className={`shrink-0 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 min-w-[132px] ${
                row.isAi
                  ? "bg-cyan-500/10 border-cyan-500/25"
                  : row.isSelf
                    ? "bg-emerald-500/10 border-emerald-500/25"
                    : "bg-white/5 border-white/10"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                  row.isAi
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                    : "bg-slate-800 text-slate-200 border-white/10"
                }`}
              >
                {row.isAi ? <Zap className="w-3.5 h-3.5" /> : row.name.slice(-2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-slate-100 truncate">{row.name}</div>
                <div className="text-[9px] text-slate-400 truncate">{row.role}</div>
              </div>
              <div
                className={`shrink-0 p-1 rounded-md ${
                  row.muted
                    ? "bg-red-500/15 text-red-400"
                    : "bg-emerald-500/15 text-emerald-400"
                }`}
                title={row.muted ? "麦克风关闭" : "麦克风开启"}
              >
                {row.muted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {collapsed && (
        <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto">
          {rows.map((row) => (
            <div
              key={`chip-${row.key}`}
              className={`shrink-0 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${
                row.isAi
                  ? "border-cyan-500/30 text-cyan-300 bg-cyan-500/10"
                  : "border-white/10 text-slate-300 bg-white/5"
              }`}
            >
              <span className="max-w-[72px] truncate">{row.name}</span>
              {row.muted ? (
                <MicOff className="w-2.5 h-2.5 text-red-400" />
              ) : (
                <Mic className="w-2.5 h-2.5 text-emerald-400" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
