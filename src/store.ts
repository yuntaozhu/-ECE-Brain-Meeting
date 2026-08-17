import { create } from 'zustand';
import { io } from 'socket.io-client';
import { AgendaStageType, TranscriptLine, UserRoleType, DynamicAgendaItem, TencentMeetingInfo, TencentParticipant } from './types';
import { shouldUseNativeWebSocket } from './lib/realtimeChannel';
import { telemetry } from './lib/telemetry';

// Retrieve saved meeting session context from localStorage if available
const savedMeetingContext = typeof window !== "undefined" ? localStorage.getItem("dadimeeting_context") : null;
let parsedMeetingContext: any = null;
try {
  if (savedMeetingContext) {
    parsedMeetingContext = JSON.parse(savedMeetingContext);
  }
} catch (e) {
  console.warn("Failed to parse saved meeting context from localStorage:", e);
}

const initialSearchUrlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
const urlRoomId = initialSearchUrlParams ? initialSearchUrlParams.get("roomId") : null;
const urlRole = initialSearchUrlParams ? initialSearchUrlParams.get("role") : null;

const isShareLinkEntry = urlRole === "attendee" || urlRoomId !== null;
const defaultMeetingId = urlRoomId || (parsedMeetingContext && parsedMeetingContext.meetingId) || "10086";
// Share links always require explicit form submit — never auto-join from URL or localStorage
const defaultJoined = !isShareLinkEntry && Boolean(parsedMeetingContext?.joined);
const defaultUserName = (parsedMeetingContext && parsedMeetingContext.userName) || (urlRole === "attendee" ? "" : "管理员");
const defaultUserRole = (parsedMeetingContext && parsedMeetingContext.userRole) || (urlRole === "attendee" ? "" : "会议发起人");
const defaultUserRoleType = (parsedMeetingContext && parsedMeetingContext.userRoleType) || (urlRole === "attendee" ? "attendee" : "creator");
let socket: any = null;
if (typeof window !== "undefined" && shouldUseNativeWebSocket()) {
  try {
    socket = io({
      reconnectionAttempts: 0,
      timeout: 3000,
      transports: ['websocket']
    });
    socket.on("connect", () => {
      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const searchRoomId = urlParams ? urlParams.get("roomId") : null;
      console.log(`[Socket.IO Client] WebSocket handshake established successfully. Socket ID: ${socket.id}, Search RoomId param: ${searchRoomId}`);
      const state = useMeetingStore.getState();
      const targetRoomId = searchRoomId || state.meetingId;
      if (targetRoomId) {
        console.log(`[Socket.IO Client] Emitting join-room for shared meeting room context: ${targetRoomId}`);
        socket.emit("join-room", targetRoomId);
      }
    });

    socket.on("connect_error", (err: any) => {
      console.warn("[Socket.IO Client] Serverless deployment notice (Using resilient REST & polling fallback):", err?.message);
    });

    socket.on("chat-received", (data: { sender: string; text: string; timestamp?: any }) => {
      if (data && data.text) {
        const state = useMeetingStore.getState();
        state.addTranscriptLine(data.sender || "参会者", data.text);
        if ((data.sender || "").includes("AI") || (data.sender || "").includes("主席") || (data.sender || "").includes("督导")) {
          import("./lib/audioSpeech").then(({ speakText, resumeAudioContextAndSpeech }) => {
            resumeAudioContextAndSpeech();
            speakText(data.text, { pitch: 0.98, rate: 1.05 });
          });
          import("./lib/trtcAudioMonitor").then(({ trtcAudioMonitor }) => {
            trtcAudioMonitor.recordEvent('audio-push', `[AI 互动中心] AI 主席回应: "${data.text.slice(0, 25)}..."`, 85);
            trtcAudioMonitor.updateChannel('ai-tts', { volumeLevel: 85, isTransmitting: true });
            setTimeout(() => {
              trtcAudioMonitor.updateChannel('ai-tts', { volumeLevel: 0, isTransmitting: false });
            }, 3000);
          });
        }
      }
    });

    socket.on("ai-intervention", (data: { roomId: string; text: string; state?: any }) => {
      if (data && data.text) {
        useMeetingStore.setState({ aiIntervention: data.text });
        import("./lib/audioSpeech").then(({ speakText, resumeAudioContextAndSpeech }) => {
          resumeAudioContextAndSpeech();
          speakText(data.text, { pitch: 0.98, rate: 1.05 });
        });
      }
    });

    socket.on("participants-updated", (data: { roomId: string; participants: TencentParticipant[] }) => {
      if (data && data.participants && Array.isArray(data.participants)) {
        useMeetingStore.setState({ tencentParticipants: data.participants });
      }
    });

    socket.on("participant-joined", (data: { roomId: string; participant: TencentParticipant }) => {
      if (data && data.participant) {
        const state = useMeetingStore.getState();
        const existing = state.tencentParticipants || [];
        const idx = existing.findIndex(p => p.userName === data.participant.userName);
        let updated: TencentParticipant[];
        if (idx >= 0) {
          updated = [...existing];
          updated[idx] = { ...updated[idx], ...data.participant };
        } else {
          updated = [...existing, data.participant];
        }
        useMeetingStore.setState({ tencentParticipants: updated });
      }
    });
  } catch (socketInitErr) {
    console.warn("[Socket.IO] Initialization notice:", socketInitErr);
  }
} else if (typeof window !== "undefined") {
  telemetry.recordConnectionState("socketIoState", "DISCONNECTED", {
    endpoint: "/api/live/poll",
    error: "Socket.IO disabled on serverless; using HTTP poll"
  });
}

interface MeetingState {
  joined: boolean;
  micOn: boolean;
  videoOn: boolean;
  currentTopic: string;
  transcript: TranscriptLine[];
  aiIntervention: string | null;
  aiSummary: string;
  agendaStage: AgendaStageType;
  latestToDos: string[];
  
  // Dynamic user identities & routing fields for Task 1
  userName: string;
  userRole: string;
  meetingId: string;
  
  // Role-based access control & dynamic agenda fields
  userRoleType: UserRoleType;
  agendas: DynamicAgendaItem[];
  mountedFiles: Array<{ name: string; size: string; status: 'uploaded' | 'vectorizing' | 'done' }>;
  meetingStarted: boolean;

  // Tencent Meeting Integration State
  isTencentSyncEnabled: boolean;
  tencentMeetingInfo: TencentMeetingInfo | null;
  tencentParticipants: TencentParticipant[];
  
  setJoined: (joined: boolean) => void;
  toggleMic: () => void;
  setMicOn: (on: boolean) => void;
  toggleVideo: () => void;
  setTopic: (topic: string) => void;
  addTranscriptLine: (speaker: string, text: string) => void;
  setAiIntervention: (text: string | null) => void;
  setAiSummary: (text: string) => void;
  setAgendaStage: (stage: AgendaStageType) => void;
  setLatestToDos: (todos: string[]) => void;
  setUserRoleType: (roleType: UserRoleType) => void;
  setAgendas: (agendas: DynamicAgendaItem[]) => void;
  setMountedFiles: (files: Array<{ name: string; size: string; status: 'uploaded' | 'vectorizing' | 'done' }>) => void;
  setMeetingStarted: (started: boolean) => void;
  
  // Tencent Meeting Setters
  setTencentSyncEnabled: (enabled: boolean) => void;
  setTencentMeetingInfo: (info: TencentMeetingInfo | null) => void;
  setTencentParticipants: (participants: TencentParticipant[]) => void;

  joinMeeting: (name: string, role: string, roomId: string, roleType?: UserRoleType) => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  joined: defaultJoined,
  micOn: false,
  videoOn: false,
  currentTopic: "关于下一代幼儿教育数字化基础设施的规划",
  transcript: [
    { speaker: "系统提示", text: "研讨室待命。创建会议并分享链接后，参会者将逐一加入；到齐后由管理员开始，AI 主席主导研讨。", timestamp: new Date() }
  ],
  aiIntervention: null,
  aiSummary: "",
  agendaStage: "IceBreaking",
  latestToDos: [
    "1. 确定多媒体托班硬件供应商",
    "2. 组织注意力模型算法验证",
    "3. 筹划数字化课室首批网络部署"
  ],
  userName: defaultUserName,
  userRole: defaultUserRole,
  meetingId: defaultMeetingId,

  // Defaults
  userRoleType: defaultUserRoleType,
  agendas: [
    {
      id: "IceBreaking",
      title: "研讨会开场与背景宣读",
      durationSeconds: 45,
      description: "核验参会人声纹状态，宣读 3 个核心学术议题"
    },
    {
      id: "MainDiscussion",
      title: "双核托班教学注意力大模型配置",
      durationSeconds: 90,
      description: "研讨传感器护眼技术、眨眼注意力计算规则与阻断机制"
    },
    {
      id: "Conclusion",
      title: "待办清单确立与数字会议总结",
      durationSeconds: 45,
      description: "剔除行政性闲聊，AI 秘书出具共识方案"
    }
  ],
  mountedFiles: [],
  meetingStarted: false,

  // Tencent Meeting Integration Default State (Phase-1: off unless user opts in)
  isTencentSyncEnabled: false,
  tencentMeetingInfo: null,
  tencentParticipants: [],

  setJoined: (joined) => set((state) => {
    if (typeof window !== "undefined") {
      try {
        const existing = JSON.parse(localStorage.getItem("dadimeeting_context") || "{}");
        localStorage.setItem("dadimeeting_context", JSON.stringify({
          ...existing,
          joined,
          meetingId: state.meetingId,
          userName: state.userName,
          userRole: state.userRole,
          userRoleType: state.userRoleType
        }));
      } catch (e) {}
    }
    return { joined };
  }),
  toggleMic: () => set((state) => ({ micOn: !state.micOn })),
  setMicOn: (on) => set({ micOn: on }),
  toggleVideo: () => set((state) => ({ videoOn: !state.videoOn })),
  setTopic: (topic) => set({ currentTopic: topic }),
  addTranscriptLine: (speaker, text) => set((state) => {
    if (!text || !text.trim()) return state;
    const trimmedText = text.trim();
    const last = state.transcript[state.transcript.length - 1];
    if (last && last.speaker === speaker && last.text === trimmedText && (Date.now() - new Date(last.timestamp).getTime() < 3000)) {
      return state;
    }
    return {
      transcript: [...state.transcript, { speaker, text: trimmedText, timestamp: new Date() }]
    };
  }),
  setAiIntervention: (text) => set({ aiIntervention: text }),
  setAiSummary: (text) => set({ aiSummary: text }),
  setAgendaStage: (stage) => set({ agendaStage: stage }),
  setLatestToDos: (todos) => set({ latestToDos: todos }),
  
  // Custom Setters
  setUserRoleType: (roleType) => set({ userRoleType: roleType }),
  setAgendas: (agendas) => set({ agendas }),
  setMountedFiles: (files) => set({ mountedFiles: files }),
  setMeetingStarted: (started) => set({ meetingStarted: started }),

  // Tencent Meeting Setters
  setTencentSyncEnabled: (enabled) => set({ isTencentSyncEnabled: enabled }),
  setTencentMeetingInfo: (info) => set({ tencentMeetingInfo: info }),
  setTencentParticipants: (participants) => set({ tencentParticipants: participants }),

  joinMeeting: (name, role, roomId, roleType) => set((state) => {
    const isAttendeeQuery = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("role") === "attendee";
    const actualRoleType = roleType || (isAttendeeQuery ? "attendee" : "creator");
    const isAttendee = actualRoleType === "attendee";
    const actualName = name || (isAttendee ? "参会嘉宾" : "管理员");
    const actualRole = role || (isAttendee ? "参会者" : "会议发起人");
    const activeRoomId = roomId || state.meetingId || "10086";

    let stableUserId = "";
    if (typeof window !== "undefined") {
      try {
        const key = `dadimeeting_uid_${activeRoomId}`;
        stableUserId = localStorage.getItem(key) || "";
        if (!stableUserId) {
          stableUserId =
            typeof crypto !== "undefined" && crypto.randomUUID
              ? `user_${crypto.randomUUID()}`
              : `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          localStorage.setItem(key, stableUserId);
        }
      } catch {
        stableUserId = `user_${Date.now()}`;
      }
    } else {
      stableUserId = `user_${Date.now()}`;
    }

    const newParticipant = {
      userId: stableUserId,
      userName: actualName,
      userRole: actualRole,
      userRoleType: actualRoleType,
      isMuted: !state.micOn,
      joinTime: Math.floor(Date.now() / 1000)
    };

    if (typeof fetch !== "undefined") {
      fetch(`/api/meeting/participants/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: activeRoomId, participant: newParticipant })
      }).catch((err) => console.warn("Failed to sync participant join:", err));

      if (state.isTencentSyncEnabled) {
        fetch(`/api/tencent/meetings/${activeRoomId}/participants/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newParticipant)
        }).catch(() => {});
      }
    }

    if (socket && activeRoomId) {
      socket.emit("join-room", activeRoomId);
      socket.emit("participant-joined", { roomId: activeRoomId, participant: newParticipant });
    }

    const existingParticipants = state.tencentParticipants || [];
    const filtered = existingParticipants.filter(
      (p) => p.userId !== stableUserId && p.userName !== actualName
    );
    const updatedParticipants = [...filtered, newParticipant];

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "dadimeeting_context",
          JSON.stringify({
            joined: true,
            userName: actualName,
            userRole: actualRole,
            meetingId: activeRoomId,
            userRoleType: actualRoleType,
            userId: stableUserId
          })
        );
      } catch (e) {}
    }

    return {
      userName: actualName,
      userRole: actualRole,
      meetingId: activeRoomId,
      userRoleType: actualRoleType,
      joined: true,
      tencentParticipants: updatedParticipants,
      transcript: [
        ...state.transcript,
        {
          speaker: "系统提示",
          text: isAttendee
            ? `🎯 ${actualName}（${actualRole}）已通过分享链接加入等待室 roomId=${activeRoomId}，等待管理员开始会议。`
            : `🎯 管理员 ${actualName}（${actualRole}）已进入等待室 roomId=${activeRoomId}。当前仅管理员与 AI 主席在场，请分享链接邀请参会者。`,
          timestamp: new Date()
        }
      ]
    };
  }),
}));

