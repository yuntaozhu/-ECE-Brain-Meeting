import React, { useState, useEffect } from "react";
import { trtcAudioMonitor, AudioChannelStats, TrtcStreamEvent } from "../lib/trtcAudioMonitor";
import { speakText, playAudioChime, resumeAudioContextAndSpeech } from "../lib/audioSpeech";
import { Volume2, Radio, Activity, Mic, ShieldCheck, Zap, RefreshCw, AlertCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AudioConnectionMonitor() {
  const [channels, setChannels] = useState<AudioChannelStats[]>([]);
  const [events, setEvents] = useState<TrtcStreamEvent[]>([]);
  const [isPushing, setIsPushing] = useState(false);
  const [roomId, setRoomId] = useState("10086");
  const [testSpeechText, setTestSpeechText] = useState("【TRTC音频链路诊断】测试 AI 主席语音推流及波形振幅");

  useEffect(() => {
    const update = () => {
      setChannels(trtcAudioMonitor.getChannels());
      setEvents(trtcAudioMonitor.getEvents());
      setIsPushing(trtcAudioMonitor.getIsPushingStream());
      setRoomId(trtcAudioMonitor.getRoomId());
    };

    update();
    return trtcAudioMonitor.subscribe(update);
  }, []);

  const handleTriggerTestPush = () => {
    resumeAudioContextAndSpeech();
    trtcAudioMonitor.recordEvent('audio-push', `手动触发诊断音轨推流: "${testSpeechText.slice(0, 20)}..."`, 90);
    trtcAudioMonitor.setPushingState(true);
    
    trtcAudioMonitor.updateChannel('ai-tts', {
      volumeLevel: 90,
      isTransmitting: true,
      audioTrackActive: true
    });

    speakText(testSpeechText, {
      pitch: 1.0,
      rate: 1.05,
      onEnd: () => {
        trtcAudioMonitor.setPushingState(false);
        trtcAudioMonitor.updateChannel('ai-tts', { volumeLevel: 0, isTransmitting: false });
      }
    });

    // Simulate volume decay curve for visual bar graph test
    let currentVol = 90;
    const interval = setInterval(() => {
      currentVol = Math.max(0, currentVol - 12);
      trtcAudioMonitor.updateChannel('ai-tts', { volumeLevel: currentVol, isTransmitting: currentVol > 0 });
      if (currentVol <= 0) clearInterval(interval);
    }, 300);
  };

  const handleTestChime = () => {
    resumeAudioContextAndSpeech();
    playAudioChime(660, 0.3);
    trtcAudioMonitor.recordEvent('volume', '触发 Web Audio 诊断试音提示音', 75);
    trtcAudioMonitor.updateChannel('local-mic', { volumeLevel: 75, isTransmitting: true });
    setTimeout(() => {
      trtcAudioMonitor.updateChannel('local-mic', { volumeLevel: 0, isTransmitting: false });
    }, 1200);
  };

  const activeChannelsCount = channels.filter(c => c.isTransmitting).length;

  return (
    <div className="flex flex-col gap-4 p-4 font-mono text-xs text-slate-200 overflow-y-auto h-full bg-[#0B0F17]/80">
      {/* Top Overview Bar */}
      <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Radio className={`w-5 h-5 ${isPushing ? 'text-amber-400 animate-spin' : 'text-cyan-400 animate-pulse'}`} />
            {isPushing && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>}
          </div>
          <div>
            <div className="text-cyan-300 font-bold text-xs flex items-center gap-2">
              <span>TRTC 音频链路连接监控器 (Audio Stream Monitor)</span>
              <span className="text-[10px] bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 rounded text-cyan-200">
                Room #{roomId}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              实时监测 TRTC 频道内各端音频振幅 (Volume Level) 及推流/订阅传输状态
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${
            activeChannelsCount > 0 
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${activeChannelsCount > 0 ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
            {activeChannelsCount > 0 ? `${activeChannelsCount} 个音轨正活跃传输` : '音频流静音中 / 无输入'}
          </span>
        </div>
      </div>

      {/* Real-time Bar Graphs: Volume Level Meters per Channel */}
      <div>
        <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            各端音轨实时振幅柱状图 (Real-time Volume Level Meters)
          </span>
          <span className="text-[9px] text-slate-500">Vol &gt; 0% 代表音频流正在向网络发帧/播放</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {channels.map((ch) => {
            const isTransmitting = ch.volumeLevel > 0;
            return (
              <div 
                key={ch.id} 
                className={`p-3 rounded-xl border transition-all ${
                  isTransmitting 
                    ? 'bg-cyan-950/30 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.15)]' 
                    : 'bg-black/40 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Mic className={`w-3.5 h-3.5 ${isTransmitting ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                    <span className="font-bold text-slate-200 text-xs truncate max-w-[180px]" title={ch.name}>
                      {ch.name}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isTransmitting ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isTransmitting ? `音轨传输中: ${ch.volumeLevel}%` : '静音 (Volume: 0%)'}
                  </span>
                </div>

                {/* Real-time Bar Graph (Waveform Equalizer) */}
                <div className="bg-black/60 p-2 rounded-lg border border-white/5 flex items-end gap-1 h-12">
                  {ch.volumeHistory.map((vol, idx) => {
                    const normalizedHeight = Math.max(8, Math.min(100, vol));
                    return (
                      <div
                        key={idx}
                        className="flex-1 rounded-t transition-all duration-150"
                        style={{
                          height: `${normalizedHeight}%`,
                          backgroundColor: vol > 50 ? '#10B981' : vol > 0 ? '#06B6D4' : '#334155'
                        }}
                        title={`Sample #${idx + 1}: ${vol}%`}
                      />
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2">
                  <span>角色: {ch.role}</span>
                  <span>最后活跃时间: {ch.lastActiveTime}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Testing & Diagnostic Controls */}
      <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-2.5">
        <div className="text-[10px] text-cyan-300 font-bold flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          音轨诊断与硬件测试工具 (Audio Transmission Diagnostics)
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="xs"
            onClick={handleTriggerTestPush}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-[11px] px-3 py-1 rounded flex items-center gap-1.5"
          >
            <Play className="w-3 h-3" />
            测试 AI 虚拟主席语音推流波形
          </Button>

          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={handleTestChime}
            className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 font-mono text-[11px] px-3 py-1 rounded flex items-center gap-1.5"
          >
            <Volume2 className="w-3 h-3" />
            播放测试音效 (Chime Test)
          </Button>

          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => resumeAudioContextAndSpeech()}
            className="text-emerald-400 hover:bg-emerald-500/20 font-mono text-[11px] px-3 py-1 rounded flex items-center gap-1.5 border border-emerald-500/30"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            解禁 Web Audio / TTS 声音
          </Button>
        </div>
      </div>

      {/* Stream Event Log Timeline */}
      <div className="flex-1 flex flex-col min-h-[140px]">
        <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
          <span>TRTC 音频事件日志 (Audio Stream Event Logs)</span>
          <span className="text-[9px] text-slate-500">保留最新 {events.length} 条事件</span>
        </div>

        <div className="flex-1 bg-black/50 rounded-xl border border-white/10 overflow-y-auto p-2 divide-y divide-white/5">
          {events.length === 0 ? (
            <div className="text-center text-slate-500 text-[10px] py-4">
              暂无音频流事件。点击【测试 AI 虚拟主席语音推流波形】或开启发言以捕获事件。
            </div>
          ) : (
            events.map((evt) => (
              <div key={evt.id} className="py-1.5 px-1 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-slate-500 shrink-0">{evt.timestamp}</span>
                  <span className={`px-1.5 py-0.2 rounded font-bold shrink-0 ${
                    evt.eventType === 'audio-push' ? 'bg-amber-500/20 text-amber-300' :
                    evt.eventType === 'stream-subscribed' ? 'bg-emerald-500/20 text-emerald-300' :
                    evt.eventType === 'stream-published' ? 'bg-purple-500/20 text-purple-300' :
                    'bg-cyan-500/20 text-cyan-300'
                  }`}>
                    {evt.eventType}
                  </span>
                  <span className="text-slate-300 truncate" title={evt.details}>
                    {evt.details}
                  </span>
                </div>
                {evt.volume !== undefined && evt.volume > 0 && (
                  <span className="text-emerald-400 font-bold shrink-0 bg-emerald-500/10 px-1.5 rounded border border-emerald-500/30">
                    Vol: {evt.volume}%
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
