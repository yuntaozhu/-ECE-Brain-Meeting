import { create } from 'zustand';
import { AgendaStageType, TranscriptLine, UserRoleType, DynamicAgendaItem } from './types';

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
  
  // New role-based access control & dynamic agenda fields
  userRoleType: UserRoleType;
  agendas: DynamicAgendaItem[];
  mountedFiles: Array<{ name: string; size: string; status: 'uploaded' | 'vectorizing' | 'done' }>;
  meetingStarted: boolean;
  
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

  setJoined: (joined) => set({ joined }),
  toggleMic: () => set((state) => ({ micOn: !state.micOn })),
  setMicOn: (on) => set({ micOn: on }),
  toggleVideo: () => set((state) => ({ videoOn: !state.videoOn })),
  setTopic: (topic) => set({ currentTopic: topic }),
  addTranscriptLine: (speaker, text) => set((state) => ({
    transcript: [...state.transcript, { speaker, text, timestamp: new Date() }]
  })),
  setAiIntervention: (text) => set({ aiIntervention: text }),
  setAiSummary: (text) => set({ aiSummary: text }),
  setAgendaStage: (stage) => set({ agendaStage: stage }),
  setLatestToDos: (todos) => set({ latestToDos: todos }),
  
  // Custom Setters
  setUserRoleType: (roleType) => set({ userRoleType: roleType }),
  setAgendas: (agendas) => set({ agendas }),
  setMountedFiles: (files) => set({ mountedFiles: files }),
  setMeetingStarted: (started) => set({ meetingStarted: started }),

  joinMeeting: (name, role, roomId, roleType) => set((state) => {
    const isAttendeeQuery = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("role") === "attendee";
    const actualRoleType = roleType || (isAttendeeQuery ? "attendee" : "creator");
    const isAttendee = actualRoleType === "attendee";

    return {
      userName: name || (isAttendee ? "客座顾问" : "张园长"),
      userRole: role || (isAttendee ? "数字化教研员" : "学前数字融合组长"),
      meetingId: roomId || "10086",
      userRoleType: actualRoleType,
      joined: true,
      transcript: [
        { speaker: "系统提示", text: `🎯 参会者 ${name || (isAttendee ? "客座顾问" : "张园长")}(职务：${role || (isAttendee ? "数字化教研员" : "学前数字融合组长")}) 以【${isAttendee ? "普通参会嘉宾 (Attendee)" : "会议发起高管 (Creator/Host)"}】身份成功加入研讨通道。`, timestamp: new Date() },
        { speaker: "系统提示", text: isAttendee 
          ? "💡 您已作为被邀请的正常参会嘉宾加入。系统已锁定主控制栏权限，普通参会者不能跳过议程阶段或强制挂断大局会议。"
          : "💡 您作为大地特级发起人：点击【正式开始会议】会自动激活 AI 虚拟主席发出主题致辞、并按照定制的议程大纲控场开篇。", timestamp: new Date() }
      ]
    };
  }),
}));

