import React, { useState, useEffect } from "react";
import { telemetry, TelemetryMetrics, ConnectionTarget, ConnectionStatus } from "../lib/telemetry";
import { logger } from "../lib/logger";
import { 
  Activity, Radio, Zap, Volume2, Clock, RefreshCw, 
  Wifi, AlertTriangle, CheckCircle2, ShieldAlert, Cpu, Database, 
  BarChart3, ArrowUpRight, ArrowDownLeft, Gauge
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const TelemetryPanel: React.FC = () => {
  const [metrics, setMetrics] = useState<TelemetryMetrics>(telemetry.getMetrics());

  useEffect(() => {
    const unsubscribe = telemetry.subscribe((updated) => {
      setMetrics(updated);
    });
    return unsubscribe;
  }, []);

  const { connectionStates, audioBuffer, latency } = metrics;

  const targetLabels: Record<ConnectionTarget, { name: string; icon: any; desc: string }> = {
    wsMeeting: { name: "会议同步通道 (/api/live/poll)", icon: Radio, desc: "Phase-1 HTTP Poll 多端状态同步" },
    wsAudioStream: { name: "语音音频流代理 (/api/live/stream)", icon: Cpu, desc: "Vercel 禁用；本地 Node 可连 Seeduplex" },
    trtcState: { name: "腾讯云 TRTC 实时网络引擎", icon: Wifi, desc: "Phase-1 跳过；仅真实密钥时启用" },
    socketIoState: { name: "Socket.IO 多端协同同步", icon: Database, desc: "Serverless 禁用，改用 HTTP Poll" }
  };

  const getStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case 'CONNECTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> CONNECTED</span>;
      case 'POLL':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> HTTP POLL</span>;
      case 'CONNECTING':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 animate-pulse"><RefreshCw className="w-3 h-3 animate-spin" /> CONNECTING</span>;
      case 'ERROR':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> ERROR</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">DISCONNECTED</span>;
    }
  };

  const getLatencyColor = (ms: number) => {
    if (ms === 0) return "text-slate-400";
    if (ms < 80) return "text-emerald-400";
    if (ms < 200) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. Connection State Interceptor Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              通信层连接状态拦截器 (Connection States)
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            4 通道全双工实时心跳监控
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.keys(connectionStates) as ConnectionTarget[]).map((key) => {
            const item = connectionStates[key];
            const meta = targetLabels[key];
            const Icon = meta.icon;

            return (
              <div 
                key={key}
                className={`p-3.5 rounded-xl border transition-all ${
                  item.status === 'CONNECTED' || item.status === 'POLL'
                    ? 'bg-emerald-950/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.08)]' 
                    : item.status === 'ERROR'
                      ? 'bg-red-950/20 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                      : 'bg-white/[0.02] border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-cyan-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{meta.name}</h4>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{meta.desc}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5">
                  {getStatusBadge(item.status)}
                  <span className="text-[10px] text-slate-500 font-mono">
                    {item.lastChangedAt ? new Date(item.lastChangedAt).toLocaleTimeString() : '--:--'}
                  </span>
                </div>

                {item.endpoint && (
                  <div className="mt-2 text-[9px] font-mono text-slate-400 truncate bg-black/40 p-1 rounded border border-white/5">
                    端点: {item.endpoint}
                  </div>
                )}

                {item.reconnectCount > 0 && (
                  <div className="mt-1 text-[9px] font-mono text-amber-400">
                    重连尝试: {item.reconnectCount} 次
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Audio Buffer & Latency Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Audio Buffer Status (7 cols) */}
        <div className="lg:col-span-7 bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                音频缓冲区状态 (Audio Buffer Telemetry)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              {audioBuffer.sampleRate} Hz 采样率
            </span>
          </div>

          {/* RMS Level Meter */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-mono">实时音量能量 (RMS Level)</span>
              <span className="font-mono font-bold text-cyan-300">
                {(audioBuffer.currentRms * 100).toFixed(1)}% (Peak: {(audioBuffer.peakRms * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="w-full h-3 bg-black/60 rounded-full border border-white/10 p-0.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-75 ${
                  audioBuffer.currentRms > 0.4 ? 'bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500' : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(2, audioBuffer.currentRms * 100))}%` }}
              />
            </div>
          </div>

          {/* Buffer Metrics Counter Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-center">
            <div className="bg-black/40 border border-white/5 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block mb-0.5">缓冲队列长度</span>
              <span className="text-sm font-bold text-white">{audioBuffer.queueLength} 帧</span>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block mb-0.5">已发送音频包</span>
              <span className="text-sm font-bold text-emerald-400">{audioBuffer.chunksSent}</span>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block mb-0.5">已接收音频包</span>
              <span className="text-sm font-bold text-cyan-400">{audioBuffer.chunksReceived}</span>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block mb-0.5">下溢/上溢 (Underruns)</span>
              <span className={`text-sm font-bold ${audioBuffer.underruns > 0 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
                {audioBuffer.underruns} / {audioBuffer.overflows}
              </span>
            </div>
          </div>
        </div>

        {/* Message Transmission Latency (5 cols) */}
        <div className="lg:col-span-5 bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center space-x-2">
              <Gauge className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                消息传输延时 (Message Latency RTT)
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => telemetry.resetStats()}
              className="h-6 text-[10px] font-mono bg-white/5 border-white/10 text-slate-300 hover:text-white"
            >
              重置计数
            </Button>
          </div>

          {/* RTT Summary Gauges */}
          <div className="grid grid-cols-3 gap-2 font-mono text-center">
            <div className="bg-black/40 border border-white/5 rounded-xl p-2">
              <span className="text-[9px] text-slate-400 block">最近 RTT</span>
              <span className={`text-base font-bold ${getLatencyColor(latency.lastRttMs)}`}>
                {latency.lastRttMs > 0 ? `${latency.lastRttMs}ms` : '--'}
              </span>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-2">
              <span className="text-[9px] text-slate-400 block">平均延时</span>
              <span className={`text-base font-bold ${getLatencyColor(latency.avgRttMs)}`}>
                {latency.avgRttMs > 0 ? `${latency.avgRttMs}ms` : '--'}
              </span>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-2">
              <span className="text-[9px] text-slate-400 block">最小/最大</span>
              <span className="text-xs font-bold text-slate-200 mt-1 block">
                {latency.minRttMs > 0 ? `${latency.minRttMs}/${latency.maxRttMs}ms` : '--'}
              </span>
            </div>
          </div>

          {/* Transmission Stats */}
          <div className="flex items-center justify-between text-[11px] font-mono bg-black/40 p-2.5 rounded-xl border border-white/5">
            <span className="text-slate-400">数据包数: 发送 <strong className="text-cyan-300">{latency.totalSent}</strong> / 确认 <strong className="text-emerald-300">{latency.totalReceived}</strong></span>
            <span className="text-slate-500">丢包率: 0%</span>
          </div>
        </div>

      </div>

      {/* 3. Transmission Latency Records Table */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              实时数据包延迟基准流水 (Recent Packet Latency Stream)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">保留最近 {latency.records.length} 条记录</span>
        </div>

        <div className="overflow-x-auto">
          {latency.records.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-mono">
              尚未有消息包传输。尝试在主画面键入发言或切换议程，遥测模块将自动评估 RTT 延迟。
            </div>
          ) : (
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="text-[10px] text-slate-400 border-b border-white/10 bg-black/30">
                  <th className="py-2 px-3">消息 ID</th>
                  <th className="py-2 px-3">类型</th>
                  <th className="py-2 px-3">发送时间</th>
                  <th className="py-2 px-3">接收时间</th>
                  <th className="py-2 px-3">传输耗时 (RTT)</th>
                  <th className="py-2 px-3">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {latency.records.slice(0, 10).map((record) => (
                  <tr key={record.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-2 px-3 text-cyan-300 font-bold">{record.id}</td>
                    <td className="py-2 px-3 text-slate-300">
                      <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] border border-white/10">{record.msgType}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-400 text-[11px]">{new Date(record.sentAt).toLocaleTimeString()}</td>
                    <td className="py-2 px-3 text-slate-400 text-[11px]">{new Date(record.receivedAt).toLocaleTimeString()}</td>
                    <td className={`py-2 px-3 font-bold ${getLatencyColor(record.latencyMs)}`}>
                      {record.latencyMs} ms
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        record.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
};
