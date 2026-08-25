import React, { useRef, useEffect, useMemo } from "react";
import { useMeetingStore } from "../store";
import { useMeetingOrchestrator } from "../hooks/useMeetingOrchestrator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Radio } from "lucide-react";

export default function AgentPanel() {
  const {
    transcript,
    aiIntervention,
    currentTopic,
    latestToDos,
    agendaStage,
    meetingStarted,
    joined,
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

  const hostStatusLabel = !joined
    ? "未入会"
    : analyzing || orchestratorStatus === "Thinking"
      ? "分析中"
      : orchestratorStatus === "Intervening"
        ? "干预中"
        : meetingStarted
          ? "监控中"
          : "待命";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, a2aTrace]);

  return (
    <aside className="w-80 max-w-[40vw] flex flex-col h-full border-l border-white/5 bg-black/50 shrink-0">
      {/* Sticky Kaiban controls — always visible */}
      <div className="sticky top-0 z-10 shrink-0 border-b border-cyan-500/20 bg-[#070b12]/95 backdrop-blur-md p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold">
              KaibanJS A2A 控制台
            </span>
          </div>
          <Badge className="text-[8px] bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
            {hostStatusLabel}
          </Badge>
        </div>

        <div className="grid grid-cols-4 gap-1">
          {[
            { name: "Host", tip: "主席", color: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10" },
            { name: "Dir", tip: "巡检", color: "text-amber-300 border-amber-500/30 bg-amber-500/10" },
            { name: "Sec", tip: "秘书", color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
            { name: "Res", tip: "检索", color: "text-violet-300 border-violet-500/30 bg-violet-500/10" }
          ].map((a) => (
            <div
              key={a.name}
              title={a.tip}
              className={`rounded border px-1 py-1 text-center ${a.color}`}
            >
              <div className="text-[9px] font-bold leading-none">{a.name}</div>
              <div className="text-[8px] opacity-70 mt-0.5">{a.tip}</div>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={triggerOrchestration}
          disabled={analyzing || !joined}
          className="w-full h-9 text-[11px] font-bold border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10"
        >
          {analyzing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
          ) : (
            <Play className="h-3.5 w-3.5 mr-2" />
          )}
          运行 A2A 巡检
        </Button>

        <div className="rounded-lg border border-white/10 bg-black/40 p-2 max-h-28 overflow-y-auto space-y-1">
          <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">
            A2A 事件流
          </div>
          {!a2aTrace?.length ? (
            <p className="text-[10px] text-slate-500 italic text-center py-2">
              点击上方按钮或等待冷场自动巡检
            </p>
          ) : (
            [...a2aTrace]
              .slice(-8)
              .reverse()
              .map((ev) => (
                <div
                  key={ev.eventId}
                  className="text-[10px] leading-snug rounded border border-white/5 bg-white/[0.03] px-1.5 py-1"
                >
                  <span className="text-cyan-400 font-mono">{ev.sender}</span>
                  <span className="text-slate-500"> → </span>
                  <span className="text-emerald-400 font-mono">{ev.target}</span>
                  <div className="text-amber-200/90 font-semibold">{ev.action}</div>
                </div>
              ))
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
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

        <div className="flex flex-col min-h-40 bg-black/40 border border-white/5 rounded-xl p-3 overflow-hidden">
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
      </div>
    </aside>
  );
}
