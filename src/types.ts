export type AgendaStageType = 'IceBreaking' | 'MainDiscussion' | 'Conclusion';
export type UserRoleType = 'creator' | 'attendee';

export interface DynamicAgendaItem {
  id: string; // 'IceBreaking' | 'MainDiscussion' | 'Conclusion'
  title: string;
  description: string;
  durationSeconds: number;
}

export interface KaibanAnalysisResult {
  shouldIntervene: boolean;
  interventionText: string;
  latestToDos: string[];
  nextStageRecommendation?: AgendaStageType | null;
  pushAudioStream?: boolean;
  hostAgentPayload?: {
    targetAgent: string;
    audioOrchestratorNotify: boolean;
    ttsText: string;
  };
  a2aCommand?: {
    sender: string;
    target: string;
    action: string;
    payload: any;
  };
}

export interface TranscriptLine {
  speaker: string;
  text: string;
  timestamp: Date;
}

export interface TencentMeetingSettings {
  mute_enable_type_join?: number; // 0:关闭, 1:开启, 2:超过6人后自动
  mute_enable_join?: boolean;
  allow_unmute_self?: boolean;
  allow_in_before_host?: boolean;
  auto_in_waiting_room?: boolean;
  allow_screen_shared_watermark?: boolean;
  water_mark_type?: number; // 0:单排, 1:多排
  only_enterprise_user_allowed?: boolean;
  only_user_join_type?: number; // 1:所有, 2:仅受邀, 3:仅企业
  auto_record_type?: string; // none, local, cloud
  participant_join_auto_record?: boolean;
  enable_host_pause_auto_record?: boolean;
  allow_multi_device?: boolean;
  change_nickname?: number; // 1:允许, 2:不允许
  auto_asr?: boolean; // 自动文字转写
  open_asr_view?: number; // 0:打开, 1:不打开
  audio_watermark?: boolean;
  allow_chat?: number;
}

export interface TencentUserObject {
  userid: string;
  is_anonymous?: boolean;
  nick_name?: string;
}

export interface TencentRecurringRule {
  recurring_type?: number; // 0:每天, 1:工作日, 2:每周, 3:每两周, 4:每月
  until_type?: number; // 0:按日期, 1:按次数
  until_date?: number;
  until_count?: number;
}

export interface TencentLiveConfig {
  live_subject?: string;
  live_summary?: string;
  enable_live_password?: boolean;
  live_password?: string;
  enable_live_im?: boolean;
  enable_live_replay?: boolean;
}

export interface CreateMeetingParams {
  subject: string;
  type?: number; // 0: scheduled, 1: instant
  instanceid?: number; // 1: PC, 5: Web, etc.
  startTime?: number | string; // unix timestamp in seconds
  endTime?: number | string; // unix timestamp in seconds
  userId?: string;
  hosts?: TencentUserObject[];
  invitees?: TencentUserObject[];
  password?: string;
  meeting_type?: number; // 0:普通, 1:周期性, 5:个人号
  recurring_rule?: TencentRecurringRule;
  enable_live?: boolean;
  live_config?: TencentLiveConfig;
  enable_host_key?: boolean;
  host_key?: string; // 6 digits
  time_zone?: string;
  location?: string;
  settings?: TencentMeetingSettings;
}

export interface TencentMeetingInfo {
  meetingId: string;
  meetingCode: string;
  subject: string;
  joinUrl: string;
  status: 'MEETING_STATE_INIT' | 'MEETING_STATE_STARTED' | 'MEETING_STATE_ENDED' | 'MEETING_STATE_CANCELLED' | string;
  startTime?: number;
  endTime?: number;
  hostUserId?: string;
  currentParticipantsCount?: number;
  password?: string;
  hostKey?: string;
  liveAddr?: string;
}

export interface TencentParticipant {
  userId: string;
  userName: string;
  userRole: 'host' | 'co_host' | 'participant' | string;
  userRoleType?: 'creator' | 'attendee' | string;
  joinTime?: number;
  isMuted?: boolean;
}

export interface TencentAccessTokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}


