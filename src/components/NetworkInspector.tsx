import { useState, useEffect } from "react";
import { Activity, X, ChevronDown, ChevronUp, RefreshCw, Send, CheckCircle2, AlertCircle, Globe, Volume2, Radio } from "lucide-react";
import { networkLogger, NetworkLogEntry } from "../lib/networkLogger";
import { tencentMeetingClient } from "../lib/tencentMeetingClient";
import { AudioConnectionMonitor } from "./AudioConnectionMonitor";

export default function NetworkInspector() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"api" | "audio">("audio");
  const [logs, setLogs] = useState<NetworkLogEntry[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    return networkLogger.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
      if (!selectedLogId && updatedLogs.length > 0) {
        setSelectedLogId(updatedLogs[0].id);
      }
    });
  }, []);

  const selectedLog = logs.find((l) => l.id === selectedLogId) || logs[0];

  const handleTestCreateMeeting = async () => {
    setTesting(true);
    try {
      await tencentMeetingClient.createMeeting({
        subject: "网络诊断测试会议 - " + new Date().toLocaleTimeString(),
        type: 0,
        startTime: Math.floor(Date.now() / 1000) + 60,
        endTime: Math.floor(Date.now() / 1000) + 3600,
        settings: {
          allow_in_before_host: true,
          auto_in_waiting_room: false,
          allow_unmute_self: true
        }
      });
    } catch (e) {
      // Handled by client logger
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button (Bottom-Right Corner) */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <button
          onClick={() => {
            setActiveTab("audio");
            setIsOpen(!isOpen);
          }}
          className="flex items-center gap-1.5 bg-cyan-950/90 hover:bg-cyan-900/90 text-cyan-300 border border-cyan-500/40 px-3 py-2 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.25)] backdrop-blur-md transition-all text-xs font-mono font-bold cursor-pointer"
          title="打开 TRTC 音频传输监控器"
        >
          <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>音频传输监控</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("api");
            setIsOpen(!isOpen);
          }}
          className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30 px-3.5 py-2 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.2)] backdrop-blur-md transition-all text-xs font-mono font-bold cursor-pointer"
          title="打开 API 网络请求检查器"
        >
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>API 检查器 ({logs.length})</span>
          {logs.some(l => l.status && l.status >= 400) && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          )}
        </button>
      </div>

      {/* Expanded Inspector Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-x-4 bottom-16 md:inset-x-auto md:right-4 md:bottom-16 md:w-[780px] md:max-w-[92vw] h-[540px] max-h-[85vh] z-50 bg-[#0B0F17]/95 border border-cyan-500/30 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl flex flex-col overflow-hidden font-sans text-slate-200">
          {/* Header with Navigation Tabs */}
          <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex bg-black/40 p-1 rounded-lg border border-white/10">
                <button
                  onClick={() => setActiveTab("audio")}
                  className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded transition-all cursor-pointer ${
                    activeTab === "audio" 
                      ? "bg-cyan-500/25 text-cyan-200 font-bold border border-cyan-500/40" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>🔊 音频传输监控 (Audio Monitor)</span>
                </button>

                <button
                  onClick={() => setActiveTab("api")}
                  className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded transition-all cursor-pointer ${
                    activeTab === "api" 
                      ? "bg-cyan-500/25 text-cyan-200 font-bold border border-cyan-500/40" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>API 网络请求检查器 ({logs.length})</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === "api" && (
                <button
                  onClick={handleTestCreateMeeting}
                  disabled={testing}
                  className="flex items-center gap-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-mono px-2.5 py-1 rounded transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
                  <span>测试创建会议</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          {activeTab === "audio" ? (
            <AudioConnectionMonitor />
          ) : (
            /* Split View: Request Logs */
            <div className="flex-1 flex overflow-hidden">
              {/* Left List: Requests */}
              <div className="w-1/3 border-r border-white/10 overflow-y-auto bg-black/20">
                {logs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 font-mono">
                    暂无网络请求。点击上方【测试创建会议】触发请求。
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {logs.map((log) => {
                      const isSelected = log.id === selectedLogId;
                      const isError = log.status && log.status >= 400;
                      return (
                        <div
                          key={log.id}
                          onClick={() => setSelectedLogId(log.id)}
                          className={`p-2.5 text-xs font-mono cursor-pointer transition-all flex flex-col gap-1 ${
                            isSelected ? "bg-cyan-500/15 border-l-2 border-cyan-400" : "hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                              log.method === 'POST' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                            }`}>
                              {log.method}
                            </span>
                            <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                          </div>
                          <div className="truncate text-slate-300 text-[11px]" title={log.url}>
                            {log.url}
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className={isError ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                              {log.status ? `Status: ${log.status}` : 'Pending...'}
                            </span>
                            {log.durationMs && (
                              <span className="text-slate-500">{log.durationMs}ms</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Pane: Request & Response Details */}
              <div className="w-2/3 overflow-y-auto p-4 flex flex-col gap-4 font-mono text-xs">
                {selectedLog ? (
                  <>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Request URL</div>
                      <div className="p-2 bg-black/40 rounded border border-white/10 text-cyan-300 break-all select-all">
                        {selectedLog.method} {selectedLog.url}
                      </div>
                    </div>

                    {selectedLog.requestBody && (
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Request Body / Payload</div>
                        <pre className="p-2.5 bg-black/55 rounded border border-white/10 text-slate-300 overflow-x-auto text-[11px]">
                          {JSON.stringify(selectedLog.requestBody, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">Response Details</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          selectedLog.status && selectedLog.status < 400 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {selectedLog.status ? `HTTP Status ${selectedLog.status}` : 'No Status'} {selectedLog.durationMs ? `(${selectedLog.durationMs}ms)` : ''}
                        </span>
                      </div>
                      <pre className={`p-2.5 rounded border text-[11px] overflow-x-auto ${
                        selectedLog.status && selectedLog.status >= 400 
                          ? 'bg-rose-950/20 border-rose-500/30 text-rose-200' 
                          : 'bg-black/55 border-white/10 text-slate-300'
                      }`}>
                        {selectedLog.responseBody ? JSON.stringify(selectedLog.responseBody, null, 2) : (selectedLog.error || 'No response data')}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    选择左侧的请求以查看详细请求头与响应负载
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
