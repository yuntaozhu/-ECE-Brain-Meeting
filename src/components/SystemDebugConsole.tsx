import React, { useState, useEffect } from "react";
import { logger, LogEntry } from "../lib/logger";
import { Button } from "@/components/ui/button";
import { Terminal, Copy, Trash2, X, AlertTriangle, CheckCircle, RefreshCw, Filter, ShieldCheck } from "lucide-react";

interface SystemDebugConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemDebugConsole: React.FC<SystemDebugConsoleProps> = ({ isOpen, onClose }) => {
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#0c0f17] border border-cyan-500/30 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-[0_0_40px_rgba(6,182,212,0.15)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-black/60 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <span>系统诊断与 AI 调试控制台 (System & AI Debug Console)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
                  {logs.length} 条实时事件
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">捕获腾讯会议API、Doubao/Gemini大模型、TRTC音频及状态机全链路运行数据</p>
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
              {copied ? "已复制诊断包" : "复制全部日志供AI调试"}
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

        {/* Toolbar Filter */}
        <div className="px-6 py-3 bg-black/30 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] text-slate-300 font-mono">日志级别过滤:</span>
            {['ALL', 'INFO', 'WARN', 'ERROR', 'API', 'TENCENT', 'LLM'].map((level) => (
              <button
                key={level}
                onClick={() => setFilterLevel(level)}
                className={`text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all ${
                  filterLevel === level
                    ? 'bg-cyan-500 text-black font-bold shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-72">
            <input
              type="text"
              placeholder="搜索日志内容或模块..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-mono bg-white/5 border border-white/10 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-cyan-200 outline-none placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Log Stream Body */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-2 bg-black/80">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
              <Terminal className="w-10 h-10 stroke-[1.5] text-slate-600" />
              <p className="text-xs">暂无匹配的调试日志事件</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              let badgeColor = "bg-slate-500/20 text-slate-300 border-slate-500/30";
              if (log.level === 'ERROR') badgeColor = "bg-red-500/20 text-red-400 border-red-500/40";
              if (log.level === 'WARN') badgeColor = "bg-amber-500/20 text-amber-400 border-amber-500/40";
              if (log.level === 'API' || log.level === 'TENCENT') badgeColor = "bg-cyan-500/20 text-cyan-400 border-cyan-500/40";
              if (log.level === 'LLM') badgeColor = "bg-purple-500/20 text-purple-300 border-purple-500/40";
              if (log.level === 'INFO') badgeColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";

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
                  <div className="text-slate-200 text-xs break-all whitespace-pre-wrap">
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

        {/* Footer */}
        <div className="px-6 py-3 bg-black/60 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>AI 调试诊断引擎活跃中 — 遇到腾讯会议号无效或接口报错时，点击「复制全部日志供AI调试」即可发给AI排查</span>
          </div>
          <div className="text-slate-500">
            Runtime: Cloud Run Sandbox
          </div>
        </div>
      </div>
    </div>
  );
};
