import React, { useRef, useEffect, useMemo } from "react";
import { useMeetingStore } from "../store";
import { useMeetingOrchestrator } from "../hooks/useMeetingOrchestrator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, Play } from "lucide-react";

export default function AgentPanel() {
  const {
    transcript,
    aiIntervention,
    currentTopic,
    latestToDos,
    agendaStage,
    meetingStarted,
    a2aTrace
  } = useMeetingStore();
  const { orchestratorStatus, analyzing, triggerOrchestration } = useMeetingOrchestrator();
  const scrollRef = useRef<HTMLDivElement>(null);

  const agendaProgress = useMemo(() => {
    let base = 25;
    if (agendaStage === "MainDiscussion") base = 65;
    if (agendaStage === "Conclusion") base = 95;
    const msgBonus = Math.min(25, transcript.length * 2);
    return Math.min(100, base + msgBonus);
  }, [agendaStage, transcript.length]);

  const currentAgendaTitle =
    agendaStage === "IceBreaking"
      ? "研讨会开场与背景宣读"
      : agendaStage === "MainDiscussion"
        ? "双核托班教学注意力大模型配置"
        : "待办清单确立与数字会议总结";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, a2aTrace]);

  return (
    <aside className="w-72 flex flex-col h-full border-l border-white/5 bg-black/40 p-4 gap-4 overflow-y-auto shrink-0">
      <div className="space-y-3">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">KaibanJS A2A</div>

        <div className="p-3 rounded-lg bg-cyan-400/5 border border-cyan-500/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-cyan-400">HostAgent</span>
            <Badge className="text-[8px] bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
              {meetingStarted ? (orchestratorStatus === "Thinking" ? "分析中" : "监控中") : "待命"}
            </Badge>
          </div>
          <p className="text-[11px] text-slate-400">大地教研督导 · 打断偏题 / 点名推进</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
            <div className="text-[10px] font-bold text-amber-300">Director</div>
            <p className="text-[9px] text-slate-500 mt-0.5">冷场与偏题巡检</p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
            <div className="text-[10px] font-bold text-emerald-300">Secretary</div>
            <p className="text-[9px] text-slate-500 mt-0.5">学术待办提炼</p>
          </div>
          <div className="p-2 rounded-lg bg-violet-500/5 border border-violet-500/15 col-span-2">
            <div className="text-[10px] font-bold text-violet-300">Researcher</div>
            <p className="text-[9px] text-slate-500 mt-0.5">RAG 知识库检索 → 回传 Host</p>
          </div>
        </div>

        {meetingStarted && (
          <Button
            variant="outline"
            size="sm"
            onClick={triggerOrchestration}
            disabled={analyzing}
            className="w-full h-8 text-[10px] uppercase font-bold"
          >
            {analyzing ? (
              <Loader2 className="h-3 w-3 animate-spin mr-2" />
            ) : (
              <Play className="h-3 w-3 mr-2" />
            )}
            运行 A2A 巡检
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">A2A 事件流</div>
        <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-lg border border-white/5 bg-black/30 p-2">
          {!a2aTrace?.length ? (
            <p className="text-[10px] text-slate-600 italic py-2 text-center">等待 Agent 协作事件…</p>
          ) : (
            [...a2aTrace].slice(-12).reverse().map((ev) => (
              <div
                key={ev.eventId}
                className="text-[10px] leading-snug rounded border border-white/5 bg-white/[0.03] px-2 py-1.5"
              >
                <div className="flex items-center gap-1 text-slate-400">
                  <span className="text-cyan-400 font-mono">{ev.sender}</span>
                  <span>→</span>
                  <span className="text-emerald-400 font-mono">{ev.target}</span>
                </div>
                <div className="text-amber-200/90 font-semibold mt-0.5">{ev.action}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">议程进度</div>
        <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-300 truncate max-w-[140px]" title={currentAgendaTitle}>
              {currentAgendaTitle}
            </span>
            <span className="font-mono text-teal-400">{agendaProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${agendaProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 truncate" title={currentTopic}>
            {currentTopic}
          </p>
        </div>
      </div>

      {aiIntervention && aiIntervention !== "PROCEED" && (
        <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
          <div className="text-[10px] text-orange-400 font-bold mb-1">Host 干预</div>
          <p className="text-xs text-slate-300 italic">{aiIntervention}</p>
        </div>
      )}

      {latestToDos && latestToDos.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">学术待办</div>
          {latestToDos.slice(0, 5).map((todo, idx) => (
            <div
              key={idx}
              className="text-[11px] text-slate-300 p-2 rounded bg-emerald-500/5 border border-emerald-500/10"
            >
              {todo}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-32 bg-black/40 border border-white/5 rounded-xl p-3 overflow-hidden">
        <div className="text-[10px] text-slate-500 font-mono mb-2 uppercase">会议记录</div>
        <ScrollArea className="flex-1 pr-1" ref={scrollRef}>
          {transcript.length === 0 ? (
            <div className="text-xs text-slate-600 italic">暂无记录</div>
          ) : (
            <div className="space-y-2 pb-2">
              {transcript.map((line, idx) => {
                const isAi = line.speaker.includes("AI") || line.speaker.includes("主席");
                const isSystem = line.speaker.includes("系统");
                return (
                  <p key={idx} className="text-[11px] text-slate-300 leading-relaxed">
                    <span
                      className={`font-bold mr-1 ${
                        isAi ? "text-cyan-400" : isSystem ? "text-amber-400" : "text-slate-400"
                      }`}
                    >
                      {line.speaker}:
                    </span>
                    {line.text}
                  </p>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </aside>
  );
}
