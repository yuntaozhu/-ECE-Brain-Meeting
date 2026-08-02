import { create } from 'zustand';
import { io } from 'socket.io-client';
import { AgendaStageType, TranscriptLine, UserRoleType, DynamicAgendaItem, TencentMeetingInfo, TencentParticipant } from './types';

// Initialize Socket.IO client for real-time bidirectional sync
let socket: any = null;
if (typeof window !== "undefined") {
  try {
    socket = io({
      reconnectionAttempts: 2,
      timeout: 3000,
      transports: ['polling', 'websocket']
    });
    socket.on("connect", () => {
      console.log("[Socket.IO Client] Connected successfully for real-time meeting sync.");
      const state = useMeetingStore.getState();
      if (state.meetingId) {
        socket.emit("join-room", state.meetingId);
      }
    });

    socket.on("connect_error", (err: any) => {
      console.warn("[Socket.IO Client] Serverless deployment notice (Using resilient REST & polling fallback):", err?.message);
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
  joined: false,
  micOn: false,
  videoOn: false,
  currentTopic: "关于下一代幼儿教育数字化基础设施的规划",
  transcript: [
    { speaker: "系统提示", text: "📡 大地 ECE-Brain 多人语音智能研讨会平台已成功载入。等待参会者加入会议进行学术对话验证...", timestamp: new Date() }
  ],
  aiIntervention: null,
  aiSummary: "",
  agendaStage: "IceBreaking",
  latestToDos: [
    "1. 确定多媒体托班硬件供应商",
    "2. 组织注意力模型算法验证",
    "3. 筹划数字化课室首批网络部署"
  ],
  userName: "我",
  userRole: "大地教研代表",
  meetingId: "10086",

  // Defaults
  userRoleType: "creator",
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

  // Tencent Meeting Integration Default State
  isTencentSyncEnabled: true,
  tencentMeetingInfo: null,
  tencentParticipants: [
    { userId: 'daid_it', userName: '大地督导 (Host)', userRole: 'host', isMuted: false, joinTime: Math.floor(Date.now() / 1000) - 300 },
  ],

  setJoined: (joined) => set({ joined }),
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
    const actualName = name || (isAttendee ? "杨督导" : "张园长");
    const actualRole = role || (isAttendee ? "省优质名园考评长" : "学前数字融合组长");
    const activeRoomId = roomId || state.meetingId || "10086";

    const newParticipant = {
      userId: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userName: actualName,
      userRole: actualRole,
      userRoleType: actualRoleType,
      isMuted: !state.micOn,
      joinTime: Math.floor(Date.now() / 1000)
    };

    // Sync to backend API immediately
    if (typeof fetch !== "undefined") {
      fetch(`/api/tencent/meetings/${activeRoomId}/participants/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newParticipant)
      }).catch(err => console.warn('Failed to sync participant join to backend:', err));
    }

    if (socket && activeRoomId) {
      socket.emit("join-room", activeRoomId);
      socket.emit("participant-joined", { roomId: activeRoomId, participant: newParticipant });
    }

    const existingParticipants = state.tencentParticipants || [];
    const filtered = existingParticipants.filter(p => p.userName !== actualName);
    const updatedParticipants = [...filtered, newParticipant];

    return {
      userName: actualName,
      userRole: actualRole,
      meetingId: activeRoomId,
      userRoleType: actualRoleType,
      joined: true,
      tencentParticipants: updatedParticipants,
      transcript: [
        ...state.transcript,
        { speaker: "系统提示", text: `🎯 参会者 ${actualName}(职务：${actualRole}) 以【${isAttendee ? "普通参会嘉宾 (Attendee)" : "会议发起高管 (Creator/Host)"}】身份成功加入研讨通道。`, timestamp: new Date() }
      ]
    };
  }),
}));

