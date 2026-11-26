/**
 * 会议控制运维 API：健康、审计、费用阈值、按会议删除
 */
import { Router } from "express";
import { setMeetingEventPushHook } from "../lib/meetingEvents";
import {
  appendAudit,
  auditFromMeetingEvent,
  deleteMeetingData,
  getCostSnapshot,
  listAudit,
  meetingControlHealth,
  noteCost
} from "../lib/meetingOps";
import { voiceChatConfigStatus } from "../lib/dazhiVoiceChat";
import { vexaConfigStatus } from "../lib/meetingBot/vexaAdapter";

setMeetingEventPushHook(auditFromMeetingEvent);

const router = Router();

router.get("/api/meeting-ops/health", (_req, res) => {
  const rtc = voiceChatConfigStatus();
  const bot = vexaConfigStatus();
  res.json({
    success: true,
    meetingControl: meetingControlHealth(),
    rtc: {
      ready: rtc.ready,
      activeRooms: rtc.activeRooms,
      appIdMatch: rtc.appIdMatch
    },
    bot: {
      dryRun: bot.dryRun,
      configured: bot.configured,
      speakInMeeting: false
    },
    gray: {
      /** 简单灰度开关：MEETING_CONTROL_GRAY_PERCENT=0..100 */
      percent: Math.min(100, Math.max(0, Number(process.env.MEETING_CONTROL_GRAY_PERCENT) || 100)),
      featureRtc: process.env.MEETING_FEATURE_RTC !== "0",
      featureBot: process.env.MEETING_FEATURE_BOT !== "0"
    }
  });
});

router.get("/api/meeting-ops/audit", (req, res) => {
  const meeting_id = String(req.query.meeting_id || "").trim() || undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  res.json({
    success: true,
    textRedacted: true,
    entries: listAudit({ meeting_id, limit })
  });
});

router.get("/api/meeting-ops/cost", (_req, res) => {
  res.json({ success: true, cost: getCostSnapshot() });
});

router.post("/api/meeting-ops/delete", (req, res) => {
  const meeting_id = String(req.body?.meeting_id || req.body?.meetingId || "").trim();
  if (!meeting_id) {
    return res.status(400).json({ success: false, error: "meeting_id 必填" });
  }
  const result = deleteMeetingData(meeting_id);
  res.json({ success: result.ok, ...result });
});

/** 供 RTC/Bot 路由可选调用的审计辅助（也可用 hook 自动记事件） */
export function auditRtc(action: "rtc.join" | "rtc.kick" | "rtc.interrupt", meeting_id: string, ok: boolean) {
  if (action === "rtc.join") noteCost("rtcJoin");
  if (action === "rtc.kick") noteCost("rtcKick");
  if (action === "rtc.interrupt") noteCost("rtcInterrupt");
  appendAudit({ action, meeting_id, provider: "volc_rtc", ok });
}

export function auditBot(
  action: "bot.create" | "bot.stop" | "bot.transcript_pull",
  meeting_id: string,
  ok: boolean
) {
  if (action === "bot.create") noteCost("botCreate");
  if (action === "bot.transcript_pull") noteCost("botTranscriptPull");
  appendAudit({ action, meeting_id, provider: "vexa", ok, meta: { speakInMeeting: false } });
}

export default router;
