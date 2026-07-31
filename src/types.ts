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
}

export interface TranscriptLine {
  speaker: string;
  text: string;
  timestamp: Date;
}

export interface TencentMeetingSettings {
  allow_in_before_host?: boolean;
  auto_in_waiting_room?: boolean;
  allow_unmute_self?: boolean;
  allow_screen_shared_watermark?: boolean;
  mute_enable_join?: boolean;
}

export interface CreateMeetingParams {
  subject: string;
  type?: number; // 0: scheduled, 1: instant
  startTime?: number | string; // unix timestamp in seconds
  endTime?: number | string; // unix timestamp in seconds
  userId?: string;
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
}

export interface TencentParticipant {
  userId: string;
  userName: string;
  userRole: 'host' | 'co_host' | 'participant' | string;
  joinTime?: number;
  isMuted?: boolean;
}

export interface TencentAccessTokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

