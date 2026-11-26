/**
 * 统一会议事件契约（MeetingEvent）· 服务端规范化与环形缓冲
 * 契约说明：dev_knowledge/shared/patterns/meeting-event-contract.md
 */
export type MeetingProvider = "volc_rtc" | "vexa" | "desktop_local" | "xiaoxing_local";

export type MeetingEventType =
  | "meeting.started"
  | "meeting.ended"
  | "participant.joined"
  | "participant.left"
  | "transcript.partial"
  | "transcript.final"
  | "ai.speaking.started"
  | "ai.speaking.completed"
  | "ai.interrupted"
  | "bot.joined"
  | "bot.failed"
  | "provider.disconnected";

export type MeetingEvent = {
  meeting_id: string;
  provider: MeetingProvider;
  event_id: string;
  seq: number;
  ts: string;
  type: MeetingEventType;
  speaker?: { id: string; display_name?: string; role?: "user" | "ai" | "guest" | "host" };
  track?: "me" | "others" | "mixed" | "unknown";
  text?: string;
  is_final?: boolean;
  connection?: { state: "connected" | "reconnecting" | "failed"; reason?: string };
  ext?: Record<string, unknown>;
};

const MAX_BUFFER = 200;
const buffer: MeetingEvent[] = [];
const seenIds = new Set<string>();
const seqByMeeting = new Map<string, number>();

function nextSeq(meetingId: string) {
  const n = (seqByMeeting.get(meetingId) || 0) + 1;
  seqByMeeting.set(meetingId, n);
  return n;
}

export function createMeetingEvent(
  partial: Omit<MeetingEvent, "event_id" | "seq" | "ts"> & {
    event_id?: string;
    seq?: number;
    ts?: string;
  }
): MeetingEvent {
  const meeting_id = String(partial.meeting_id || "").trim() || "unknown";
  const event_id =
    String(partial.event_id || "").trim() ||
    `${meeting_id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    meeting_id,
    provider: partial.provider,
    event_id,
    seq: typeof partial.seq === "number" ? partial.seq : nextSeq(meeting_id),
    ts: partial.ts || new Date().toISOString(),
    type: partial.type,
    speaker: partial.speaker,
    track: partial.track,
    text: partial.text,
    is_final: partial.is_final,
    connection: partial.connection,
    ext: partial.ext
  };
}

type PushHook = (ev: MeetingEvent, accepted: boolean) => void;
let pushHook: PushHook | null = null;

/** 供运维审计挂接；避免 meetingEvents ↔ meetingOps 循环依赖 */
export function setMeetingEventPushHook(hook: PushHook | null) {
  pushHook = hook;
}

export function pushMeetingEvent(ev: MeetingEvent): { accepted: boolean; event: MeetingEvent } {
  if (seenIds.has(ev.event_id)) {
    if (pushHook) {
      try {
        pushHook(ev, false);
      } catch (_) {}
    }
    return { accepted: false, event: ev };
  }
  seenIds.add(ev.event_id);
  buffer.push(ev);
  while (buffer.length > MAX_BUFFER) {
    const dropped = buffer.shift();
    if (dropped) seenIds.delete(dropped.event_id);
  }
  // 限制 seenIds 膨胀
  if (seenIds.size > MAX_BUFFER * 2) {
    seenIds.clear();
    for (const e of buffer) seenIds.add(e.event_id);
  }
  if (pushHook) {
    try {
      pushHook(ev, true);
    } catch (_) {}
  }
  return { accepted: true, event: ev };
}

export function listMeetingEvents(opts?: { meeting_id?: string; limit?: number }) {
  const limit = Math.min(Math.max(Number(opts?.limit) || 50, 1), MAX_BUFFER);
  let list = buffer;
  const mid = String(opts?.meeting_id || "").trim();
  if (mid) list = buffer.filter((e) => e.meeting_id === mid);
  return list.slice(-limit);
}

/** 按会议删除内存事件（隐私删除权） */
export function deleteByMeetingId(meetingId: string): number {
  const mid = String(meetingId || "").trim();
  if (!mid) return 0;
  const before = buffer.length;
  const kept = buffer.filter((e) => e.meeting_id !== mid);
  const deleted = before - kept.length;
  buffer.length = 0;
  buffer.push(...kept);
  seenIds.clear();
  for (const e of buffer) seenIds.add(e.event_id);
  return deleted;
}

/** 火山 VoiceChat 回调 → MeetingEvent（尽力映射，未知类型进 ext） */
export function mapVolcVoiceChatCallback(body: any): MeetingEvent | null {
  const data = body?.EventData || body?.eventData || body || {};
  const roomId = String(data.RoomId || data.roomId || body?.RoomId || "").trim();
  const taskId = String(data.TaskId || data.taskId || "").trim();
  const rawType = String(body?.EventType || body?.eventType || data.EventType || data.eventType || "").trim();
  const detail = data.EventDetail || data.eventDetail || body?.EventDetail || null;
  const err = data.ErrorInfo || data.errorInfo || body?.ErrorInfo || null;

  if (!roomId && !rawType) return null;

  let type: MeetingEventType = "provider.disconnected";
  const lower = rawType.toLowerCase();
  if (/start|join|create/i.test(rawType)) type = "meeting.started";
  else if (/stop|end|finish/i.test(rawType)) type = "meeting.ended";
  else if (/interrupt/i.test(rawType)) type = "ai.interrupted";
  else if (/speak|tts|say/i.test(rawType)) type = "ai.speaking.started";
  else if (/error|fail/i.test(rawType) || err) type = "bot.failed";
  else if (/disconnect|offline|timeout/i.test(rawType)) type = "provider.disconnected";
  else if (lower.includes("transcript") || lower.includes("asr")) {
    type = /final|complete/i.test(rawType) ? "transcript.final" : "transcript.partial";
  }

  return createMeetingEvent({
    meeting_id: roomId || taskId || "volc_unknown",
    provider: "volc_rtc",
    type,
    speaker: { id: "dazhi-ai-bot", role: "ai" },
    track: "mixed",
    text: typeof detail === "string" ? detail : undefined,
    is_final: type === "transcript.final" || type === "meeting.ended",
    connection: err
      ? { state: "failed", reason: String(err).slice(0, 200) }
      : { state: "connected" },
    ext: {
      volcEventType: rawType || null,
      taskId: taskId || null,
      detail: detail ?? null,
      errorInfo: err ?? null
    }
  });
}

export function resetMeetingEventBufferForTests() {
  buffer.length = 0;
  seenIds.clear();
  seqByMeeting.clear();
}
