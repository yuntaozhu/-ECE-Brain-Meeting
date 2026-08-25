import React from "react";
import { useMeetingStore } from "../store";
import { useRole } from "../hooks/useRole";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  Play,
  CheckCircle2,
  Hourglass,
  ChevronRight,
  Milestone,
  AlertCircle,
  Loader2,
  Radio
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function runA2aFromUi() {
  window.dispatchEvent(new CustomEvent("kaiban:run-a2a"));
}

export default function AgendaKanbanBoard() {
  const {
    agendas,
    agendaStage,
    setAgendaStage,
    a2aTrace,
    joined,
    kaibanAnalyzing,
    kaibanStatus
  } = useMeetingStore();
  const { canControl } = useRole();

  const activeIndex = agendas.findIndex((a) => a.id === agendaStage);

  const doneAgendas =
    agendaStage === "Conclusion" && activeIndex === -1 ? agendas : agendas.slice(0, activeIndex);

  const inProgressAgendas = activeIndex !== -1 ? [agendas[activeIndex]] : [];
  const pendingAgendas = activeIndex !== -1 ? agendas.slice(activeIndex + 1) : [];

  const handleStageShift = (stageId: any) => {
    if (!canControl) return;
    setAgendaStage(stageId);
  };

  const latestA2a = (a2aTrace || []).slice(-3).reverse();

  return (
    <div className="w-full bg-[#05070a]/90 border border-white/5 rounded-2xl p-4 flex flex-col gap-3 shadow-2xl relative overflow-hidden backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white font-mono flex items-center gap-1.5">
            <Milestone className="w-3.5 h-3.5 text-cyan-400" />
            KaibanJS 议程进程看板
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[9px] font-mono tracking-tighter">
            {kaibanAnalyzing || kaibanStatus === "Thinking"
              ? "A2A RUNNING"
              : kaibanStatus === "Intervening"
                ? "HOST INTERVENING"
                : "PROACTIVE ORCHESTRATOR"}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            disabled={kaibanAnalyzing || !joined}
            onClick={runA2aFromUi}
            className="h-7 text-[10px] font-bold border-cyan-500/40 text-cyan-200"
          >
            {kaibanAnalyzing ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Play className="w-3 h-3 mr-1" />
            )}
            运行 A2A 巡检
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-2.5 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-[10px] text-cyan-300 font-bold uppercase tracking-wider">
          <Radio className="w-3.5 h-3.5" />
          A2A 多 Agent 协作状态
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          {[
            { id: "HostAgent", desc: "打断偏题 / 点名" },
            { id: "DirectorAgent", desc: "冷场与偏题巡检" },
            { id: "SecretaryAgent", desc: "学术待办提炼" },
            { id: "ResearcherAgent", desc: "RAG 检索回传" }
          ].map((agent) => {
            const hit = latestA2a.find((e) => e.sender === agent.id || e.target === agent.id);
            return (
              <div
                key={agent.id}
                className={`rounded-lg border px-2 py-1.5 ${
                  hit ? "border-cyan-400/40 bg-cyan-500/10" : "border-white/10 bg-black/30"
                }`}
              >
                <div className="text-[10px] font-bold text-slate-200">
                  {agent.id.replace("Agent", "")}
                </div>
                <div className="text-[9px] text-slate-500">{agent.desc}</div>
                {hit ? (
                  <div className="text-[9px] text-amber-300 mt-0.5 truncate">{hit.action}</div>
                ) : null}
              </div>
            );
          })}
        </div>
        {latestA2a.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {latestA2a.map((ev) => (
              <span
                key={ev.eventId}
                className="text-[9px] font-mono rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-slate-300"
              >
                {ev.sender}→{ev.target}:{ev.action}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-slate-500 italic">
            尚无 A2A 事件。点击「运行 A2A 巡检」，或等待静默自动触发后，此处会显示 Director→Host
            等协作轨迹。
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="flex flex-col gap-2 rounded-xl bg-black/40 border border-white/5 p-3 min-h-48">
          <div className="flex items-center justify-between border-b border-white/5 pb-1.5 mb-1">
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1">
              <Hourglass className="w-3 h-3 text-slate-500" />
              等待讨论 ({pendingAgendas.length})
            </span>
            <Badge variant="secondary" className="text-[8px] bg-white/5 text-slate-500 leading-none">
              Pending
            </Badge>
          </div>
          <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-60 pr-0.5 scrollbar-thin">
            <AnimatePresence mode="popLayout">
              {pendingAgendas.map((item) => (
                <motion.div
                  key={item.id}
                  layoutId={`card-${item.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className={`p-3 rounded-lg bg-white/5 border border-white/5 relative group ${
                    canControl ? "hover:border-cyan-500/20 cursor-pointer" : ""
                  }`}
                  onClick={() => canControl && handleStageShift(item.id)}
                >
                  <h4 className="text-xs font-bold text-slate-300 leading-tight group-hover:text-cyan-400 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed mt-1.5 truncate">
                    {item.description}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between text-[9px] font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {item.durationSeconds}s 限时
                    </span>
                    {canControl && (
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400 flex items-center gap-0.5">
                        切换 <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {pendingAgendas.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-[10px] text-slate-600 italic">
                无等待讨论议案
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl bg-cyan-950/5 border border-cyan-500/15 p-3 min-h-48">
          <div className="flex items-center justify-between border-b border-cyan-500/10 pb-1.5 mb-1">
            <span className="text-[10px] font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-1 animate-pulse">
              <Play className="w-3 h-3 fill-cyan-400" />
              正在讨论 ({inProgressAgendas.length})
            </span>
            <Badge className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 leading-none">
              In Progress
            </Badge>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-2.5">
            <AnimatePresence mode="popLayout">
              {inProgressAgendas.map((item) => (
                <motion.div
                  key={item.id}
                  layoutId={`card-${item.id}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="p-3.5 rounded-lg bg-cyan-500/5 border-2 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)] relative overflow-hidden"
                >
                  <h4 className="text-xs font-bold text-white leading-tight">{item.title}</h4>
                  <p className="text-[10.5px] text-slate-300 leading-relaxed mt-2 italic">
                    {item.description}
                  </p>
                  <div className="mt-3.5 pt-2 border-t border-cyan-500/15 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-cyan-400 flex items-center gap-1 font-bold">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      计时跑表运行中
                    </span>
                    <span className="text-slate-400 font-bold bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                      ACTIVE STAGE
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {inProgressAgendas.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center text-[10px] text-red-400">
                ⚠️ 本场议程已全部落幕
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl bg-black/40 border border-white/5 p-3 min-h-48">
          <div className="flex items-center justify-between border-b border-white/5 pb-1.5 mb-1">
            <span className="text-[10px] font-semibold tracking-wider text-emerald-400 uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              已完成讨论 ({doneAgendas.length})
            </span>
            <Badge
              variant="secondary"
              className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 leading-none"
            >
              Done
            </Badge>
          </div>
          <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-60 pr-0.5 scrollbar-thin">
            <AnimatePresence mode="popLayout">
              {doneAgendas.map((item) => (
                <motion.div
                  key={item.id}
                  layoutId={`card-${item.id}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-3 rounded-lg bg-emerald-500/[0.02] border border-emerald-500/10 opacity-70"
                >
                  <div className="flex items-start gap-1 justify-between">
                    <h4 className="text-xs font-semibold text-slate-400 leading-tight line-through">
                      {item.title}
                    </h4>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{item.description}</p>
                </motion.div>
              ))}
            </AnimatePresence>
            {doneAgendas.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-[10px] text-slate-600 italic">
                待大模型推演结案
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono bg-black/20 p-2.5 rounded-lg border border-white/5 gap-2">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span>管理员可点击议程卡片切换阶段；A2A 由 Director→Host→Secretary→Researcher 协作</span>
        </div>
        {!canControl && (
          <span className="text-amber-500 font-bold">⚠️ 普通观众只读锁定 (RBAC)</span>
        )}
      </div>
    </div>
  );
}
