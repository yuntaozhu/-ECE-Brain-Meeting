/**
 * Vexa 会议 Bot 适配器（转写优先，dry-run 可无密钥）
 * @see https://github.com/Vexa-ai/vexa
 */
import {
  createMeetingEvent,
  pushMeetingEvent,
  type MeetingEvent
} from "../meetingEvents";
import type {
  BotHandle,
  BotStatus,
  CreateBotInput,
  ExternalMeetingBotAdapter,
  MeetingBotPlatform,
  TranscriptPullResult
} from "./types";

function baseUrl() {
  return (
    (process.env.VEXA_API_BASE || "https://api.cloud.vexa.ai").trim().replace(/\/$/, "")
  );
}

function apiKey() {
  return (process.env.VEXA_API_KEY || "").trim();
}

function dryRun() {
  const v = (process.env.VEXA_DRY_RUN || "").trim();
  if (v === "1" || v.toLowerCase() === "true") return true;
  // 无密钥时默认 dry-run，避免误打生产
  return !apiKey();
}

function meetingIdOf(platform: MeetingBotPlatform, native: string) {
  return `vexa:${platform}:${String(native || "").trim()}`;
}

function mapPlatform(p: string): MeetingBotPlatform {
  const x = String(p || "").toLowerCase().replace(/-/g, "_");
  if (x === "google_meet" || x === "meet" || x === "google") return "google_meet";
  if (x === "teams" || x === "ms_teams" || x === "microsoft_teams") return "teams";
  if (x === "zoom") return "zoom";
  if (x === "jitsi") return "jitsi";
  return "google_meet";
}

/** Vexa API 平台字段（文档常用 google_meet / teams / zoom） */
function toVexaPlatform(p: MeetingBotPlatform) {
  return p;
}

async function vexaFetch(method: string, path: string, body?: object) {
  if (dryRun()) {
    return { ok: true, dryRun: true, status: 200, json: null as any };
  }
  const key = apiKey();
  if (!key) {
    throw Object.assign(new Error("缺少 VEXA_API_KEY（或设 VEXA_DRY_RUN=1）"), {
      code: "UNCONFIGURED",
      status: 503
    });
  }
  const url = `${baseUrl()}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": key
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 400) };
  }
  if (!res.ok) {
    const err = Object.assign(
      new Error(json?.detail || json?.message || json?.error || `Vexa HTTP ${res.status}`),
      { code: "VEXA_API_ERROR", status: res.status, body: json }
    );
    throw err;
  }
  return { ok: true, dryRun: false, status: res.status, json };
}

const dryStore = new Map<string, BotHandle>();

function dryKey(platform: MeetingBotPlatform, native: string) {
  return `${platform}::${native}`;
}

export class VexaMeetingBotAdapter implements ExternalMeetingBotAdapter {
  readonly provider = "vexa" as const;

  async createBot(input: CreateBotInput): Promise<BotHandle> {
    const platform = mapPlatform(input.platform);
    const nativeMeetingId = String(input.nativeMeetingId || "").trim();
    if (!nativeMeetingId) {
      throw Object.assign(new Error("nativeMeetingId 必填"), { code: "BAD_REQUEST", status: 400 });
    }
    const botName = String(input.botName || process.env.VEXA_BOT_NAME || "ECE-Meeting-Bot").trim();
    const meetingId = meetingIdOf(platform, nativeMeetingId);

    if (dryRun()) {
      const handle: BotHandle = {
        platform,
        nativeMeetingId,
        meetingId,
        botName,
        status: "joined",
        reason: "dry_run"
      };
      dryStore.set(dryKey(platform, nativeMeetingId), handle);
      pushMeetingEvent(
        createMeetingEvent({
          meeting_id: meetingId,
          provider: "vexa",
          type: "bot.joined",
          speaker: { id: botName, role: "ai" },
          connection: { state: "connected", reason: "dry_run" },
          ext: { dryRun: true, speakInMeeting: false, mode: "transcript_only" }
        })
      );
      return handle;
    }

    try {
      await vexaFetch("POST", "/bots", {
        platform: toVexaPlatform(platform),
        native_meeting_id: nativeMeetingId,
        bot_name: botName,
        language: input.language || "zh",
        transcribe_enabled: input.transcribeEnabled !== false
      });
      const handle: BotHandle = {
        platform,
        nativeMeetingId,
        meetingId,
        botName,
        status: "joining"
      };
      pushMeetingEvent(
        createMeetingEvent({
          meeting_id: meetingId,
          provider: "vexa",
          type: "bot.joined",
          speaker: { id: botName, role: "ai" },
          connection: { state: "connected" },
          ext: { speakInMeeting: false, mode: "transcript_only" }
        })
      );
      return handle;
    } catch (e: any) {
      const handle: BotHandle = {
        platform,
        nativeMeetingId,
        meetingId,
        botName,
        status: "failed",
        reason: String(e?.message || e).slice(0, 240)
      };
      pushMeetingEvent(
        createMeetingEvent({
          meeting_id: meetingId,
          provider: "vexa",
          type: "bot.failed",
          connection: { state: "failed", reason: handle.reason },
          ext: { speakInMeeting: false }
        })
      );
      throw e;
    }
  }

  async stopBot(input: {
    platform: MeetingBotPlatform;
    nativeMeetingId: string;
  }): Promise<BotHandle> {
    const platform = mapPlatform(input.platform);
    const nativeMeetingId = String(input.nativeMeetingId || "").trim();
    const meetingId = meetingIdOf(platform, nativeMeetingId);
    const botName = dryStore.get(dryKey(platform, nativeMeetingId))?.botName || "ECE-Meeting-Bot";

    if (dryRun()) {
      dryStore.delete(dryKey(platform, nativeMeetingId));
      const handle: BotHandle = {
        platform,
        nativeMeetingId,
        meetingId,
        botName,
        status: "stopped",
        reason: "dry_run"
      };
      pushMeetingEvent(
        createMeetingEvent({
          meeting_id: meetingId,
          provider: "vexa",
          type: "meeting.ended",
          ext: { dryRun: true, stopped: true }
        })
      );
      return handle;
    }

    await vexaFetch("DELETE", `/bots/${encodeURIComponent(toVexaPlatform(platform))}/${encodeURIComponent(nativeMeetingId)}`);
    const handle: BotHandle = {
      platform,
      nativeMeetingId,
      meetingId,
      botName,
      status: "stopped"
    };
    pushMeetingEvent(
      createMeetingEvent({
        meeting_id: meetingId,
        provider: "vexa",
        type: "meeting.ended",
        ext: { stopped: true }
      })
    );
    return handle;
  }

  async getStatus(input?: {
    platform?: MeetingBotPlatform;
    nativeMeetingId?: string;
  }): Promise<BotStatus[]> {
    if (dryRun()) {
      let list = [...dryStore.values()].map((h) => ({
        ...h,
        running: h.status === "joined" || h.status === "joining",
        raw: { dryRun: true }
      }));
      if (input?.platform) {
        const p = mapPlatform(input.platform);
        list = list.filter((x) => x.platform === p);
      }
      if (input?.nativeMeetingId) {
        list = list.filter((x) => x.nativeMeetingId === input.nativeMeetingId);
      }
      return list;
    }

    const res = await vexaFetch("GET", "/bots/status");
    const arr = Array.isArray(res.json) ? res.json : res.json?.bots || res.json?.data || [];
    return (arr as any[]).map((row) => {
      const platform = mapPlatform(row.platform || row.Platform || "google_meet");
      const nativeMeetingId = String(
        row.native_meeting_id || row.nativeMeetingId || row.meeting_id || ""
      );
      return {
        platform,
        nativeMeetingId,
        meetingId: meetingIdOf(platform, nativeMeetingId),
        botName: String(row.bot_name || row.botName || "bot"),
        status: "joined" as const,
        running: true,
        raw: row
      };
    });
  }

  async pullTranscripts(input: {
    platform: MeetingBotPlatform;
    nativeMeetingId: string;
  }): Promise<TranscriptPullResult> {
    const platform = mapPlatform(input.platform);
    const nativeMeetingId = String(input.nativeMeetingId || "").trim();
    const meetingId = meetingIdOf(platform, nativeMeetingId);
    const events: MeetingEvent[] = [];

    if (dryRun()) {
      const sample = createMeetingEvent({
        meeting_id: meetingId,
        provider: "vexa",
        type: "transcript.final",
        speaker: { id: "speaker_dry", display_name: "演示发言人", role: "guest" },
        track: "unknown",
        text: "（dry-run）这是一条演示转写，不会进入真实会议发言。",
        is_final: true,
        ext: { dryRun: true, speakInMeeting: false }
      });
      const pushed = pushMeetingEvent(sample);
      if (pushed.accepted) events.push(pushed.event);
      return { meetingId, events, rawCount: 1 };
    }

    const res = await vexaFetch(
      "GET",
      `/transcripts/${encodeURIComponent(toVexaPlatform(platform))}/${encodeURIComponent(nativeMeetingId)}`
    );
    const segments = Array.isArray(res.json)
      ? res.json
      : res.json?.segments || res.json?.transcripts || res.json?.data || [];

    for (const seg of segments as any[]) {
      const text = String(seg.text || seg.transcript || seg.content || "").trim();
      if (!text) continue;
      const speakerName = String(seg.speaker || seg.speaker_name || seg.participant || "").trim();
      const isFinal = seg.is_final !== false && seg.partial !== true;
      const ev = createMeetingEvent({
        meeting_id: meetingId,
        provider: "vexa",
        type: isFinal ? "transcript.final" : "transcript.partial",
        speaker: speakerName
          ? { id: speakerName, display_name: speakerName, role: "guest" }
          : { id: "unknown", role: "guest" },
        track: "unknown",
        text,
        is_final: isFinal,
        event_id: seg.id
          ? `vexa_seg_${seg.id}`
          : undefined,
        ext: {
          speakInMeeting: false,
          absolute_start_time: seg.absolute_start_time || seg.start || null,
          absolute_end_time: seg.absolute_end_time || seg.end || null
        }
      });
      const pushed = pushMeetingEvent(ev);
      if (pushed.accepted) events.push(pushed.event);
    }

    return { meetingId, events, rawCount: (segments as any[]).length };
  }
}

export function getVexaAdapter(): VexaMeetingBotAdapter {
  return new VexaMeetingBotAdapter();
}

export function vexaConfigStatus() {
  return {
    dryRun: dryRun(),
    configured: Boolean(apiKey()),
    baseUrl: baseUrl(),
    botName: (process.env.VEXA_BOT_NAME || "ECE-Meeting-Bot").trim(),
    speakInMeeting: false,
    note: "Bot 默认仅转写；不可假设能在原会议里发言"
  };
}
