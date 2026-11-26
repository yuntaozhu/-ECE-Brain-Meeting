/**
 * 会议控制运维：审计（无原文默认）、费用计数告警阈值、按会议删除
 */
import {
  deleteByMeetingId,
  listMeetingEvents,
  type MeetingEvent,
  resetMeetingEventBufferForTests
} from "./meetingEvents";

export type AuditAction =
  | "rtc.join"
  | "rtc.kick"
  | "rtc.interrupt"
  | "bot.create"
  | "bot.stop"
  | "bot.transcript_pull"
  | "events.delete"
  | "meeting.event";

export type AuditEntry = {
  id: string;
  ts: string;
  action: AuditAction;
  meeting_id?: string;
  provider?: string;
  ok: boolean;
  /** 不落全文；仅长度与类型 */
  meta?: Record<string, unknown>;
};

const MAX_AUDIT = 300;
const auditLog: AuditEntry[] = [];

type CostCounters = {
  rtcJoin: number;
  rtcKick: number;
  rtcInterrupt: number;
  botCreate: number;
  botTranscriptPull: number;
  eventsAccepted: number;
  warnHits: number;
};

const costs: CostCounters = {
  rtcJoin: 0,
  rtcKick: 0,
  rtcInterrupt: 0,
  botCreate: 0,
  botTranscriptPull: 0,
  eventsAccepted: 0,
  warnHits: 0
};

function numEnv(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** 留存小时；默认 24h（内存缓冲本就短命，此值供策略/API 声明） */
export function retentionHours() {
  return numEnv("MEETING_EVENT_RETENTION_HOURS", 24);
}

function warnThreshold(kind: keyof CostCounters) {
  const map: Partial<Record<keyof CostCounters, string>> = {
    rtcJoin: "MEETING_COST_WARN_RTC_JOIN",
    botCreate: "MEETING_COST_WARN_BOT_CREATE",
    eventsAccepted: "MEETING_COST_WARN_EVENTS"
  };
  const envName = map[kind];
  return envName ? numEnv(envName, 200) : 999999;
}

export function appendAudit(entry: Omit<AuditEntry, "id" | "ts"> & { ts?: string }) {
  const row: AuditEntry = {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ts: entry.ts || new Date().toISOString(),
    action: entry.action,
    meeting_id: entry.meeting_id,
    provider: entry.provider,
    ok: entry.ok,
    meta: entry.meta
  };
  auditLog.push(row);
  while (auditLog.length > MAX_AUDIT) auditLog.shift();
  return row;
}

export function listAudit(opts?: { limit?: number; meeting_id?: string }) {
  const limit = Math.min(Math.max(Number(opts?.limit) || 50, 1), MAX_AUDIT);
  let list = auditLog;
  const mid = String(opts?.meeting_id || "").trim();
  if (mid) list = auditLog.filter((e) => e.meeting_id === mid);
  return list.slice(-limit);
}

export function noteCost(kind: keyof CostCounters, n = 1) {
  costs[kind] = (costs[kind] || 0) + n;
  const th = warnThreshold(kind);
  if (costs[kind] >= th) {
    costs.warnHits += 1;
    appendAudit({
      action: "meeting.event",
      ok: true,
      meta: { costWarn: true, kind, value: costs[kind], threshold: th }
    });
    return { warned: true, value: costs[kind], threshold: th };
  }
  return { warned: false, value: costs[kind], threshold: th };
}

export function getCostSnapshot() {
  return {
    ...costs,
    retentionHours: retentionHours(),
    thresholds: {
      rtcJoin: warnThreshold("rtcJoin"),
      botCreate: warnThreshold("botCreate"),
      eventsAccepted: warnThreshold("eventsAccepted")
    },
    note: "计数为进程内累计，供告警阈值；正式账单以云厂商控制台为准"
  };
}

/** 从环形缓冲删除某会议事件（返回删除条数） */
export function deleteMeetingData(meetingId: string) {
  const mid = String(meetingId || "").trim();
  if (!mid) return { ok: false, deleted: 0, reason: "meeting_id_required" };
  const deleted = deleteByMeetingId(mid);
  appendAudit({
    action: "events.delete",
    meeting_id: mid,
    ok: true,
    meta: { deleted, retentionHours: retentionHours() }
  });
  return { ok: true, deleted, retentionHours: retentionHours() };
}

export function auditFromMeetingEvent(ev: MeetingEvent, accepted: boolean) {
  if (accepted) noteCost("eventsAccepted");
  appendAudit({
    action: "meeting.event",
    meeting_id: ev.meeting_id,
    provider: ev.provider,
    ok: accepted,
    meta: {
      type: ev.type,
      textChars: ev.text ? String(ev.text).length : 0,
      // 明确不落全文
      textRedacted: true
    }
  });
}

export function meetingControlHealth() {
  const events = listMeetingEvents({ limit: 5 });
  return {
    ok: true,
    retentionHours: retentionHours(),
    auditSize: auditLog.length,
    recentEvents: events.length,
    cost: getCostSnapshot(),
    flags: {
      storeRawAudioDefault: false,
      storeFullTranscriptInAudit: false,
      speakInMeetingDefault: false
    }
  };
}

export function resetMeetingOpsForTests() {
  auditLog.length = 0;
  for (const k of Object.keys(costs) as (keyof CostCounters)[]) costs[k] = 0;
  resetMeetingEventBufferForTests();
}
