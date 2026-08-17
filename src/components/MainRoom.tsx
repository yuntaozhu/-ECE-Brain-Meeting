import React, { useEffect, useRef, useState } from "react";
import { useMeetingStore } from "../store";
import { logger } from "../lib/logger";
import { apiUrl } from "../lib/apiBase";
import { telemetry } from "../lib/telemetry";
import { resumeAudioContextAndSpeech, speakText } from "../lib/audioSpeech";
import {
  LogOut,
  Users,
  Play,
  Loader2,
  Clock,
  Shield,
  Volume2,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRole } from "../hooks/useRole";
import AgendaKanbanBoard from "./AgendaKanbanBoard";
import { AttendeesList } from "./AttendeesList";
import { ChatBox, wasAiTextSpoken, markAiTextSpoken } from "./ChatBox";

function SharedTranscriptFeed({
  transcript,
  localUserName
}: {
  transcript: Array<{ speaker: string; text: string; timestamp?: Date | string | number }>;
  localUserName: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript.length]);

  const lines = (transcript || []).filter((t) => t?.text?.trim());

  return (
    <div className="rounded-2xl border border-white/10 bg-black/50 flex flex-col min-h-[220px] max-h-[42vh]">
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-mono font-bold">
          多端同步消息
        </span>
        <span className="text-[10px] text-slate-500 font-mono">{lines.length} 条</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {lines.length === 0 ? (
          <p className="text-xs text-slate-600 italic py-6 text-center">等待各终端发言同步…</p>
        ) : (
          lines.map((line, idx) => {
            const isAi = line.speaker.includes("AI") || line.speaker.includes("主席");
            const isSystem = line.speaker.includes("系统");
            const isSelf = line.speaker === localUserName;
            return (
              <div
                key={`${line.speaker}-${idx}-${String(line.text).slice(0, 24)}`}
                className={`text-xs leading-relaxed rounded-lg px-2.5 py-2 border ${
                  isAi
                    ? "bg-cyan-500/10 border-cyan-500/20 text-slate-200"
                    : isSelf
                      ? "bg-emerald-500/10 border-emerald-500/20 text-slate-200"
                      : isSystem
                        ? "bg-white/5 border-white/5 text-slate-400"
                        : "bg-amber-500/10 border-amber-500/20 text-slate-200"
                }`}
              >
                <span
                  className={`font-bold mr-1.5 ${
                    isAi
                      ? "text-cyan-400"
                      : isSelf
                        ? "text-emerald-400"
                        : isSystem
                          ? "text-slate-500"
                          : "text-amber-300"
                  }`}
                >
                  {line.speaker}
                  {isSelf ? " (我)" : ""}:
                </span>
                {line.text}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default function MainRoom() {
  const {
    joined,
    setJoined,
    currentTopic,
    aiIntervention,
    addTranscriptLine,
    userName,
    userRole,
    meetingId,
    joinMeeting,
    meetingStarted,
    setMeetingStarted,
    transcript
  } = useMeetingStore();

  const { isCreator, canControl } = useRole();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const [lobbyRoomId, setLobbyRoomId] = useState(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const rmId = searchParams.get("roomId");
      if (rmId) return rmId;
      return "10086";
    }
    return "10086";
  });

  const [lobbyName, setLobbyName] = useState("管理员");
  const [lobbyRole, setLobbyRole] = useState("会议发起人");

  const activeRoomId = meetingId || lobbyRoomId || "10086";

  // HTTP poll sync (Phase-1) — authoritative multi-device transcript
  useEffect(() => {
    if (!joined) return;

    let sinceSeq = 0;
    let cancelled = false;
    let silencePosted = false;

    const applyServerState = (serverState: any, seq?: number) => {
      if (!serverState) return;
      const currentState = useMeetingStore.getState();
      const patch: Record<string, unknown> = {};
      const localName = currentState.userName || "";

      if (serverState.currentTopic && serverState.currentTopic !== currentState.currentTopic) {
        patch.currentTopic = serverState.currentTopic;
      }
      if (serverState.agendaStage && serverState.agendaStage !== currentState.agendaStage) {
        patch.agendaStage = serverState.agendaStage;
      }
      if (Array.isArray(serverState.agendas) && serverState.agendas.length) {
        patch.agendas = serverState.agendas;
      }
      if (Array.isArray(serverState.latestToDos)) {
        patch.latestToDos = serverState.latestToDos;
      }
      if (Array.isArray(serverState.tencentParticipants)) {
        patch.tencentParticipants = serverState.tencentParticipants;
      }
      if (serverState.mountedFiles) {
        patch.mountedFiles = serverState.mountedFiles;
      }
      // One-way latch: never let poll flip a started meeting back to waiting lobby
      if (serverState.meetingStarted === true && !currentState.meetingStarted) {
        patch.meetingStarted = true;
        logger.log("INFO", "Phase1Sync", "远端会议已开始，本终端进入研讨", {
          roomId: activeRoomId,
          seq
        });
      }

      if (serverState.transcript && Array.isArray(serverState.transcript)) {
        const currentList = currentState.transcript || [];
        const map = new Map<string, { speaker: string; text: string; timestamp?: Date | string | number }>();
        for (const item of currentList) {
          if (!item) continue;
          const spk = item.speaker || "参会者";
          const txt = (item.text || "").trim();
          if (txt) map.set(`${spk}_${txt}`, { ...item, speaker: spk, text: txt });
        }

        const newlyAdded: Array<{ speaker: string; text: string }> = [];
        for (const item of serverState.transcript) {
          if (!item) continue;
          const spk = item.speaker || item.sender || "参会者";
          const txt = (item.text || "").trim();
          if (!txt) continue;
          const key = `${spk}_${txt}`;
          if (!map.has(key)) {
            map.set(key, { ...item, speaker: spk, text: txt });
            newlyAdded.push({ speaker: spk, text: txt });
          }
        }

        if (newlyAdded.length > 0 || map.size !== currentList.length) {
          patch.transcript = Array.from(map.values());
        }

        if (newlyAdded.length > 0) {
          logger.log("INFO", "Phase1Sync", `同步到 ${newlyAdded.length} 条远端消息`, {
            roomId: activeRoomId,
            seq,
            speakers: newlyAdded.map((n) => n.speaker)
          });

          for (const msg of newlyAdded) {
            const spk = msg.speaker;
            const txt = msg.text;
            const isAi = String(spk).includes("AI") || String(spk).includes("主席");
            const isSystem = String(spk).includes("系统");
            const isSelf = Boolean(localName) && spk === localName;

            if (isAi && !wasAiTextSpoken(txt)) {
              markAiTextSpoken(txt);
              resumeAudioContextAndSpeech();
              speakText(txt, { pitch: 0.98, rate: 1.05 });
            } else if (!isAi && !isSystem && !isSelf) {
              // Cross-terminal dialogue: read other attendees' messages aloud
              resumeAudioContextAndSpeech();
              speakText(`${spk}说：${txt}`, { pitch: 1, rate: 1.05 });
              logger.log("INFO", "Phase1Sync", `朗读远端发言: [${spk}] ${txt.slice(0, 40)}`, {
                roomId: activeRoomId
              });
            }
          }
        }
      }

      if (Object.keys(patch).length) {
        useMeetingStore.setState(patch);
      }
    };

    const pollOnce = async () => {
      try {
        const res = await fetch(
          apiUrl(`/api/live/poll?roomId=${encodeURIComponent(activeRoomId)}&since=${sinceSeq}`)
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.seq) sinceSeq = Math.max(sinceSeq, data.seq);
        applyServerState(data.state, data.seq);

        const state = useMeetingStore.getState();
        if (state.meetingStarted && !silencePosted) {
          const humanLines = (state.transcript || []).filter(
            (t) =>
              t?.speaker &&
              !String(t.speaker).includes("系统") &&
              !String(t.speaker).includes("AI")
          );
          const last = humanLines[humanLines.length - 1];
          const lastTs = last?.timestamp ? new Date(last.timestamp as Date).getTime() : 0;
          if (lastTs && Date.now() - lastTs > 8000) {
            silencePosted = true;
            fetch(apiUrl("/api/ai/intervene"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ roomId: activeRoomId, reason: "silence" })
            })
              .then(() =>
                setTimeout(() => {
                  silencePosted = false;
                }, 20000)
              )
              .catch(() => {
                silencePosted = false;
              });
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.log("WARN", "Phase1Sync", `轮询异常: ${msg}`, { roomId: activeRoomId });
      }
    };

    pollOnce();
    const syncInterval = setInterval(pollOnce, 1500);
    telemetry.recordConnectionState("wsMeeting", "POLL", {
      endpoint: `/api/live/poll?roomId=${activeRoomId}`
    });
    return () => {
      cancelled = true;
      clearInterval(syncInterval);
    };
  }, [joined, activeRoomId]);

  const handleJoin = () => {
    const isGuest =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("role") === "attendee";
    joinMeeting(lobbyName, lobbyRole, lobbyRoomId, isGuest ? "attendee" : "creator");
  };

  const handleStartMeeting = async () => {
    if (!canControl || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const res = await fetch(apiUrl("/api/meeting/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: activeRoomId, startedBy: userName })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `开始会议失败（HTTP ${res.status}）`);
      }

      const openingText = typeof data.ai?.text === "string" ? data.ai.text.trim() : "";
      setMeetingStarted(true);
      useMeetingStore.setState({
        meetingStarted: true,
        transcript: data.state?.transcript || transcript,
        aiIntervention: openingText || null
      });

      // The start response already contains the opening line. Speak it now instead
      // of waiting for a later poll, which will treat it as an existing transcript item.
      if (openingText) {
        markAiTextSpoken(openingText);
        resumeAudioContextAndSpeech();
        speakText(openingText, { pitch: 0.98, rate: 1.05 });
      }

      logger.log("INFO", "MeetingStart", "会议已开始，AI 开场已返回", {
        roomId: activeRoomId,
        openingGenerated: Boolean(openingText)
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "开始会议失败，请重试";
      setStartError(message);
      logger.log("ERROR", "MeetingStart", message, { roomId: activeRoomId });
    } finally {
      setStarting(false);
    }
  };

  const handleLeave = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setJoined(false);
  };

  if (!joined) {
    return (
      <div className="flex flex-1 h-full flex-col items-center justify-center p-4 bg-[#05070A]">
        <Card className="w-full max-w-md border-white/10 bg-black/70 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm text-white text-center flex items-center justify-center gap-2">
              <Users className="h-4 w-4 text-cyan-400" />
              管理员进入研讨室
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-2 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-center">
              <span className="text-[10px] text-cyan-400 font-mono">ROOM ID: {lobbyRoomId}</span>
            </div>
            <input
              className="w-full text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
              placeholder="姓名"
              value={lobbyName}
              onChange={(e) => setLobbyName(e.target.value)}
            />
            <input
              className="w-full text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
              placeholder="职务"
              value={lobbyRole}
              onChange={(e) => setLobbyRole(e.target.value)}
            />
            <input
              className="w-full text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none font-mono"
              placeholder="房间 ID"
              value={lobbyRoomId}
              onChange={(e) => setLobbyRoomId(e.target.value)}
            />
            <Button className="w-full bg-cyan-500 text-black font-bold" onClick={handleJoin}>
              进入等待室
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Waiting lobby — still show synced transcript so share-link devices see activity
  if (!meetingStarted) {
    return (
      <section className="flex-1 flex flex-col p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          <div className="text-center space-y-2">
            <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30">
              等待室 · 仅管理员与 AI · 等待分享链接入会 · room {activeRoomId}
            </Badge>
            <h2 className="text-xl font-light text-white">{currentTopic}</h2>
            <p className="text-sm text-slate-400">
              您以 <strong className="text-cyan-400">{userName}</strong>（{userRole}）身份已加入。
              {canControl
                ? " 请复制分享链接邀请参会者；确认到齐后点击开始会议，AI 主席将主导研讨。"
                : " 请等待管理员确认人员到齐并开始会议。开始后即可发言参与。"}
            </p>
          </div>

          <AttendeesList meetingId={activeRoomId} />

          <SharedTranscriptFeed transcript={transcript} localUserName={userName} />

          {canControl ? (
            <div className="flex flex-col items-center gap-3 pt-2">
              <p className="text-xs text-slate-500">确认参会者到齐后，点击下方按钮开始 AI 主导会议</p>
              {startError ? (
                <p role="alert" className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {startError}
                </p>
              ) : null}
              <Button
                size="lg"
                disabled={starting}
                onClick={handleStartMeeting}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-8 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                {starting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    AI 正在准备开场…
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    开始会议
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400 py-4">
              <Clock className="h-4 w-4 animate-pulse text-amber-400" />
              等待管理员开始会议…
            </div>
          )}

          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={handleLeave} className="text-slate-500">
              <LogOut className="h-3.5 w-3.5 mr-1" />
              离开
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 mb-2">
            会议进行中 · HTTP 多端同步 · room {activeRoomId}
          </Badge>
          <h2 className="text-lg font-light text-white">主题：{currentTopic}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resumeAudioContextAndSpeech();
              logger.log("INFO", "AudioSpeech", "手动解禁 AI 朗读");
            }}
            className="text-xs border-emerald-500/40 text-emerald-300"
          >
            <Volume2 className="h-3 w-3 mr-1" />
            开启语音朗读
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLeave} className="text-red-400 text-xs">
            <LogOut className="h-3.5 w-3.5 mr-1" />
            离开
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/10 p-4 flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
          <Zap className="h-6 w-6 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-cyan-400">AI 主席 (大地教研督导)</span>
            {isCreator && (
              <Badge className="text-[9px] bg-purple-500/15 text-purple-300">
                <Shield className="h-2.5 w-2.5 mr-0.5" />
                管理员
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-400">
            各终端消息经 HTTP 同步；远端发言与 AI 回复会自动朗读。
          </p>
          {aiIntervention && aiIntervention !== "PROCEED" && (
            <p className="mt-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              {aiIntervention}
            </p>
          )}
        </div>
      </div>

      <SharedTranscriptFeed transcript={transcript} localUserName={userName} />

      <div className="max-w-4xl w-full mx-auto">
        <ChatBox
          roomId={activeRoomId}
          userName={userName}
          onSendMessage={(text) => {
            addTranscriptLine(userName || "我", text);
          }}
        />
      </div>

      <AttendeesList meetingId={activeRoomId} />
      <AgendaKanbanBoard />
    </section>
  );
}
