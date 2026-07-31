import React, { useState, useEffect } from "react";
import { logger, LogEntry } from "../lib/logger";
import { ShieldAlert, Terminal, Copy, Trash2, CheckCircle2, AlertTriangle, RefreshCw, Activity, ExternalLink, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApiHealthPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiHealthPanel: React.FC<ApiHealthPanelProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [copied, setCopied] = useState(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'ERRORS' | 'TENCENT'>('ERRORS');

  useEffect(() => {
    setLogs(logger.getLogs());
    const unsubscribe = logger.subscribe((updated) => {
      setLogs(updated);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  // Filter logs related to API, Tencent, or errors
  const apiLogs = logs.filter(log => {
    const isTencentOrApi = log.category.includes('Tencent') || log.category.includes('Api') || log.level === 'ERROR' || log.level === 'WARN';
    if (!isTencentOrApi) return false;
    if (filterMode === 'ERRORS') {
      return log.level === 'ERROR' || log.level === 'WARN' || log.message.includes('❌') || log.message.includes('fail') || log.message.includes('invalid');
    }
    if (filterMode === 'TENCENT') {
      return log.category.includes('Tencent');
    }
    return true;
  });

  const failureCount = logs.filter(l => l.level === 'ERROR' || l.message.includes('❌')).length;

  const handleCopyLog = (log: LogEntry) => {
    const text = `[${log.timestamp}] [${log.level}] [${log.category}] ${log.message}\nData: ${JSON.stringify(log.data, null, 2)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#0b0e14] border border-red-500/40 rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col shadow-[0_0_50px_rgba(239,68,68,0.2)] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-950/40 via-[#0b0e14] to-black border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center space-x-3">
                <span>API 健康与故障诊断面板 (API Health & Premature Closure Diagnostics)</span>
                {failureCount > 0 ? (
                  <span className="text-[11px] font-mono px-2.5 py-0.5 bg-red-500/20 text-red-300 rounded-full border border-red-500/40 flex items-center gap-1 font-semibold">
                    <Flame className="w-3 h-3 text-red-400 animate-bounce" />
                    {failureCount} 次异常/API 失败捕获
                  </span>
                ) : (
                  <span className="text-[11px] font-mono px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    链路健康
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">实时监控腾讯会议 REST API、Token 刷新、会话存活状态及异常堆栈，诊断会议提前关闭原因。</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => logger.clear()}
              className="bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              清空日志
            </Button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-3 bg-black/40 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilterMode('ERRORS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                filterMode === 'ERRORS' 
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm' 
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              仅看异常与调用失败
            </button>
            <button
              onClick={() => setFilterMode('TENCENT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                filterMode === 'TENCENT' 
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm' 
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              腾讯会议全链路 API
            </button>
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterMode === 'ALL' 
                  ? 'bg-white/20 text-white border border-white/30' 
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              全部 API 日志 ({logs.length})
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <span>实时订阅中</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
        </div>

        {/* Content Split: List & Detail */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* Left: Log Entries list */}
          <div className="lg:col-span-7 border-r border-white/10 overflow-y-auto p-4 space-y-2 font-mono">
            {apiLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16">
                <Activity className="w-12 h-12 mb-3 opacity-30 text-cyan-400 animate-pulse" />
                <p className="text-sm font-sans font-medium text-slate-400">当前没有捕获到 API 异常或腾讯会议事件</p>
                <p className="text-xs text-slate-600 mt-1 font-sans">当进行会议创建、Token 刷新或成员查询时，详细请求与返回数据将在此实时呈现。</p>
              </div>
            ) : (
              apiLogs.map((log) => {
                const isError = log.level === 'ERROR' || log.message.includes('❌') || log.message.includes('fail');
                const isWarn = log.level === 'WARN' || log.message.includes('⚠️');
                const isSelected = selectedLog?.id === log.id;

                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                        : isError
                          ? 'bg-red-500/5 border-red-500/30 hover:bg-red-500/10'
                          : isWarn
                            ? 'bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10'
                            : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isError ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          isWarn ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        }`}>
                          {log.level}
                        </span>
                        <span className="text-slate-400 font-semibold text-[11px]">{log.category}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className={`text-xs font-sans leading-relaxed ${isError ? 'text-red-200 font-medium' : 'text-slate-200'}`}>
                      {log.message}
                    </p>

                    {log.data && (
                      <div className="mt-2 text-[10px] text-slate-400 bg-black/40 p-1.5 rounded border border-white/5 truncate font-mono">
                        📦 数据包预览: {JSON.stringify(log.data).slice(0, 100)}...
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Detailed Inspection of selected log */}
          <div className="lg:col-span-5 bg-black/60 p-5 flex flex-col overflow-y-auto font-mono">
            {selectedLog ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">事件详情诊断</span>
                    <h3 className="text-xs text-white font-bold mt-0.5">{selectedLog.category} · {selectedLog.id}</h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyLog(selectedLog)}
                    className="h-7 text-[11px] bg-white/5 border-white/10 text-slate-300 hover:text-white"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    {copied ? "已复制" : "复制详情"}
                  </Button>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">时间戳</label>
                  <div className="text-xs text-slate-300 bg-white/5 p-2 rounded border border-white/10">
                    {selectedLog.timestamp}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">诊断消息</label>
                  <div className={`text-xs p-2.5 rounded border ${
                    selectedLog.level === 'ERROR' 
                      ? 'bg-red-500/10 text-red-200 border-red-500/30' 
                      : 'bg-white/5 text-slate-200 border-white/10'
                  }`}>
                    {selectedLog.message}
                  </div>
                </div>

                {selectedLog.data && (
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">响应包 / 负载详情 (Response Payload & Stack)</label>
                    <pre className="text-[11px] text-cyan-300 bg-black p-3 rounded-xl border border-white/10 overflow-x-auto max-h-96 leading-relaxed">
                      {JSON.stringify(selectedLog.data, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-200 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-amber-300">
                    <AlertTriangle className="w-4 h-4" />
                    为什么会议会提前关闭？(Premature Closure Diagnosis)
                  </div>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed font-sans">
                    若腾讯会议在几分钟内自动关闭，通常由于：
                    1. <strong>startTime</strong> 与当前时间戳偏差过大（需严格为秒级 UNIX 时间戳）。
                    2. <strong>endTime</strong> 授权时长设置过短或过期。
                    3. 沙箱模拟模式下未关联官方 SecretID，导致第三方 API 拒绝会话维持。
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-16">
                <Terminal className="w-10 h-10 mb-3 opacity-30 text-slate-400" />
                <p className="text-xs font-sans text-slate-400">请在左侧点击任意一条 API 日志以检查详细错误堆栈与响应报文</p>
              </div>
            )}
          </div>

        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-black/80 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>大地 ECE-Brain 全链路诊断系统 v2.4</span>
          <span className="font-mono text-cyan-400">Centralized Logger (max 500 entries)</span>
        </div>

      </div>
    </div>
  );
};
