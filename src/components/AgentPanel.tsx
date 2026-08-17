import React, { useRef, useEffect, useMemo } from "react";
import { useMeetingStore } from "../store";
import { useMeetingOrchestrator } from "../hooks/useMeetingOrchestrator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, Play } from "lucide-react";

export default function AgentPanel() {
  const { transcript, aiIntervention, currentTopic, latestToDos, agendaStage, meetingStarted } =
    useMeetingStore();
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
  }, [transcript]);

  return (
    <aside className="w-72 flex flex-col h-full border-l border-white/5 bg-black/40 p-4 gap-4 overflow-y-auto shrink-0">
      <div className="space-y-3">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">AI 智能体状态</div>

        <div className="p-3 rounded-lg bg-cyan-400/5 border border-cyan-500/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-cyan-400">AI 主席</span>
            <Badge className="text-[8px] bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
              {meetingStarted ? (orchestratorStatus === "Thinking" ? "分析中" : "监控中") : "等待开始"}
            </Badge>
          </div>
          <p className="text-[11px] text-slate-400">
            {meetingStarted
              ? "结合知识库引导议程、纠正跑题、静默时主动发言。"
              : "会议开始后将自动结合已加载知识库主导研讨。"}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-emerald-400">AI 秘书</span>
            <Badge className="text-[8px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              自动记录
            </Badge>
          </div>
          <p className="text-[11px] text-slate-400">实时提炼讨论共识与待办事项。</p>
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
            运行 KaibanJS 分析
          </Button>
        )}
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
          <div className="text-[10px] text-orange-400 font-bold mb-1">主席干预</div>
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
                const isAi =
                  line.speaker.includes("AI") || line.speaker.includes("主席");
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
