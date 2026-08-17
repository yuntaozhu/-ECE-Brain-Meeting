import React, { useEffect, useState, useCallback } from 'react';
import { Users, RefreshCw, Mic, MicOff, Shield, UserCheck, Clock, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TencentParticipant } from '../types';
import { useMeetingStore } from '../store';

interface AttendeesListProps {
  meetingId?: string;
  className?: string;
}

export function AttendeesList({ meetingId: propMeetingId, className = '' }: AttendeesListProps) {
  const storeMeetingId = useMeetingStore((state) => state.meetingId);
  const tencentParticipants = useMeetingStore((state) => state.tencentParticipants);
  const isTencentSyncEnabled = useMeetingStore((state) => state.isTencentSyncEnabled);

  const activeMeetingId = propMeetingId || storeMeetingId || '10086';

  const [participants, setParticipants] = useState<TencentParticipant[]>(tencentParticipants || []);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [newMemberAlert, setNewMemberAlert] = useState<string | null>(null);

  const fetchParticipants = useCallback(async (isManual = false) => {
    if (isManual) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tencent/meetings/${activeMeetingId}/participants`);
      const contentType = res.headers.get('content-type') || '';
      const text = await res.text();
      if (!contentType.includes('application/json')) {
        throw new Error(`Non-JSON response received (${contentType})`);
      }
      const data = JSON.parse(text);
      if (data.success && data.data?.participants) {
        const fetched: TencentParticipant[] = data.data.participants;
        
        // Read current store state directly to avoid reactive dependency loops
        const currentStore = useMeetingStore.getState().tencentParticipants || [];
        const map = new Map<string, TencentParticipant>();
        fetched.forEach(p => map.set(p.userName, p));
        currentStore.forEach(p => {
          if (!map.has(p.userName)) {
            map.set(p.userName, p);
          }
        });
        const merged = Array.from(map.values());

        // Check for newly joined members before updating state
        setParticipants(prevParticipants => {
          if (prevParticipants.length > 0 && merged.length > prevParticipants.length) {
            const latest = merged[merged.length - 1];
            setTimeout(() => {
              setNewMemberAlert(`新参会者 ${latest.userName} 已加入会议！`);
              setTimeout(() => setNewMemberAlert(null), 4000);
            }, 0);
          }
          return merged;
        });

        // Synchronize store outside of state updater callback
        useMeetingStore.getState().setTencentParticipants(merged);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.error || '获取参会成员列表失败');
      }
    } catch (err: any) {
      console.log('[AttendeesList] Using synced store/fallback participants:', err.message);
      setError(err.message);
      const storeParticipants = useMeetingStore.getState().tencentParticipants;
      if (storeParticipants && storeParticipants.length > 0) {
        setParticipants(storeParticipants);
      } else {
        setParticipants(prev => prev.length > 0 ? prev : [
          { userId: 'daid_it', userName: '大地督导 (Host)', userRole: 'host', isMuted: false },
        ]);
      }
    } finally {
      if (isManual) setLoading(false);
    }
  }, [activeMeetingId]);

  // Tencent is an opt-in external bridge. Phase-1 attendee state comes from
  // /api/live/poll, so never create a background Tencent polling loop by default.
  useEffect(() => {
    if (!isTencentSyncEnabled) {
      setParticipants(tencentParticipants || []);
      return;
    }
    fetchParticipants(false);
    const interval = setInterval(() => {
      fetchParticipants(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchParticipants, isTencentSyncEnabled, tencentParticipants]);

  return (
    <div className={`bg-black/40 border border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              {isTencentSyncEnabled ? "腾讯会议外链参会成员" : "本站研讨室参会成员"}
              <Badge variant="outline" className="text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                {participants.length} 人在线
              </Badge>
            </h3>
            <p className="text-[11px] text-slate-400">
              Room ID: <span className="font-mono text-cyan-300">{activeMeetingId}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => isTencentSyncEnabled && fetchParticipants(true)}
            disabled={loading || !isTencentSyncEnabled}
            className="h-7 text-xs text-slate-300 hover:text-white hover:bg-white/10 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {newMemberAlert && (
        <div className="bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs px-3 py-2 rounded-xl flex items-center gap-2 animate-bounce">
          <UserCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{newMemberAlert}</span>
        </div>
      )}

      {error && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>API 离线模式：使用本地与同步状态</span>
        </div>
      )}

      <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
        {participants.map((p, idx) => {
          const isHost = p.userRole === 'host';
          const isCoHost = p.userRole === 'co_host';
          return (
            <div
              key={p.userId || idx}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                  isHost 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                    : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                }`}>
                  {p.userName ? p.userName.slice(-2) : '参会'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">{p.userName}</span>
                    {isHost && (
                      <Badge className="text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30 px-1.5 py-0">
                        <Shield className="w-2.5 h-2.5 mr-0.5 inline" /> 主持人
                      </Badge>
                    )}
                    {isCoHost && (
                      <Badge className="text-[9px] bg-cyan-500/20 text-cyan-300 border-cyan-500/30 px-1.5 py-0">
                        联席主持
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {p.joinTime ? new Date(p.joinTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '刚刚'} 入会
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className={`px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 ${
                  p.isMuted 
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {p.isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                  <span>{p.isMuted ? '已静音' : '讲话中'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/5">
        <span>腾讯会议 REST API 实时同步中</span>
        <span>上次更新: {lastUpdated.toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
