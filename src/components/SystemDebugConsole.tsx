import React, { useState, useEffect } from "react";
import { logger, LogEntry } from "../lib/logger";
import { TelemetryPanel } from "./TelemetryPanel";
import { Button } from "@/components/ui/button";
import { Terminal, Copy, Trash2, X, AlertTriangle, CheckCircle, RefreshCw, Filter, ShieldCheck, Activity, Radio } from "lucide-react";

interface SystemDebugConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemDebugConsole: React.FC<SystemDebugConsoleProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'TELEMETRY' | 'LOGS'>('TELEMETRY');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLogs(logger.getLogs());
    const unsubscribe = logger.subscribe((updated) => {
      setLogs(updated);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) return false;
    if (searchQuery.trim() && !log.message.toLowerCase().includes(searchQuery.toLowerCase()) && !log.category.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleCopyBundle = () => {
    const bundle = logger.exportJson();
    navigator.clipboard.writeText(bundle);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#0c0f17] border border-cyan-500/40 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-cyan-950/40 via-[#0c0f17] to-black border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center space-x-3">
                <span>通信层遥测拦截器与 AI 调试控制台 (Telemetry Interceptor & Diagnostics)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  实时遥测中
                </span>
              </h2>
              <p className="text-xs text-slate-400">集中拦截通信层连接状态变更、音频缓冲区指标、消息传输耗时 (RTT) 与系统日志</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyBundle}
              className="h-8 text-[11px] font-mono bg-white/5 border-white/10 text-cyan-300 hover:bg-cyan-500/20 hover:text-white"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              {copied ? "已复制诊断包" : "复制遥测诊断包"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logger.clear()}
              className="h-8 text-[11px] font-mono bg-white/5 border-white/10 text-red-400 hover:bg-red-500/20 hover:text-white"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              清空
            </Button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher & Navigation */}
        <div className="px-6 py-2.5 bg-black/40 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('TELEMETRY')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 ${
                activeTab === 'TELEMETRY'
                  ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              通信层遥测仪表盘 (Communication Telemetry)
            </button>

            <button
              onClick={() => setActiveTab('LOGS')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 ${
                activeTab === 'LOGS'
                  ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              全链路控制台日志 ({logs.length})
            </button>
          </div>

          {activeTab === 'LOGS' && (
            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              {['ALL', 'TELEMETRY', 'INFO', 'WARN', 'ERROR', 'API', 'TENCENT', 'LLM'].map((level) => (
                <button
                  key={level}
                  onClick={() => setFilterLevel(level)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded transition-all ${
                    filterLevel === level
                      ? 'bg-cyan-500 text-black font-bold'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-black/80">
          {activeTab === 'TELEMETRY' ? (
            <TelemetryPanel />
          ) : (
            <div className="font-mono text-xs space-y-2">
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="搜索日志内容或模块..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs font-mono bg-white/5 border border-white/10 focus:border-cyan-500 rounded-lg px-3 py-2 text-cyan-200 outline-none placeholder:text-slate-600"
                />
              </div>

              {filteredLogs.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <Terminal className="w-10 h-10 stroke-[1.5] text-slate-600" />
                  <p className="text-xs">暂无匹配的调试日志事件</p>
                </div>
              ) : (
                filteredLogs.map((log) => {
                  let badgeColor = "bg-slate-500/20 text-slate-300 border-slate-500/30";
                  if (log.level === 'ERROR') badgeColor = "bg-red-500/20 text-red-400 border-red-500/40";
                  if (log.level === 'WARN') badgeColor = "bg-amber-500/20 text-amber-400 border-amber-500/40";
                  if (log.level === 'API' || log.level === 'TENCENT') badgeColor = "bg-cyan-500/20 text-cyan-400 border-cyan-500/40";
                  if (log.level === 'TELEMETRY') badgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
                  if (log.level === 'LLM') badgeColor = "bg-purple-500/20 text-purple-300 border-purple-500/40";
                  if (log.level === 'INFO') badgeColor = "bg-cyan-500/20 text-cyan-400 border-cyan-500/40";

                  return (
                    <div key={log.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] transition-all space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded border font-bold uppercase ${badgeColor}`}>
                            {log.level}
                          </span>
                          <span className="text-cyan-400 font-semibold">[{log.category}]</span>
                          <span className="text-slate-500">{log.timestamp}</span>
                        </div>
                      </div>
                      <div className="text-slate-200 text-xs break-all whitespace-pre-wrap leading-relaxed">
                        {log.message}
                      </div>
                      {log.data && (
                        <div className="mt-2 p-2.5 bg-black/60 border border-white/10 rounded-lg text-[11px] text-slate-400 overflow-x-auto">
                          <pre className="font-mono text-[10px] text-cyan-300">
                            {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-black/80 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>通信层集中式遥测拦截引擎活跃中 — 拦截连接状态变迁、音频 Buffer 下溢及 RTT 消息耗时</span>
          </div>
          <div className="text-slate-500">
            ECE-Brain Telemetry Layer v3.0
          </div>
        </div>

      </div>
    </div>
  );
};
