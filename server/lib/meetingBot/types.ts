/**
 * 外部会议 Bot 适配器接口（阶段 2）
 * Bot 入会 ≠ 会议内可发言；默认只产出转写 → MeetingEvent
 */
import type { MeetingEvent } from "../meetingEvents";

export type MeetingBotPlatform = "google_meet" | "teams" | "zoom" | "jitsi";

export type CreateBotInput = {
  platform: MeetingBotPlatform;
  /** 平台原生会议 ID（Meet 码 / Teams 会议码等） */
  nativeMeetingId: string;
  botName?: string;
  language?: string;
  /** 显式关闭转写（仅采集）时为 false；默认 true */
  transcribeEnabled?: boolean;
};

export type BotHandle = {
  platform: MeetingBotPlatform;
  nativeMeetingId: string;
  meetingId: string;
  botName: string;
  status: "requested" | "joining" | "joined" | "stopped" | "failed";
  reason?: string;
};

export type BotStatus = BotHandle & {
  running: boolean;
  raw?: unknown;
};

export type TranscriptPullResult = {
  meetingId: string;
  events: MeetingEvent[];
  rawCount: number;
};

export interface ExternalMeetingBotAdapter {
  readonly provider: "vexa";
  createBot(input: CreateBotInput): Promise<BotHandle>;
  stopBot(input: {
    platform: MeetingBotPlatform;
    nativeMeetingId: string;
  }): Promise<BotHandle>;
  getStatus(input?: {
    platform?: MeetingBotPlatform;
    nativeMeetingId?: string;
  }): Promise<BotStatus[]>;
  pullTranscripts(input: {
    platform: MeetingBotPlatform;
    nativeMeetingId: string;
  }): Promise<TranscriptPullResult>;
}
