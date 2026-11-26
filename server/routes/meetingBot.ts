/**
 * 外部会议 Bot API（阶段 2 · Vexa）
 * 产品语义：转写 + 屏幕建议；禁止把「已入会」写成「可发言」
 */
import { Router, type Response } from "express";
import { listMeetingEvents } from "../lib/meetingEvents";
import { getVexaAdapter, vexaConfigStatus } from "../lib/meetingBot/vexaAdapter";
import { auditBot } from "./meetingOps";

const router = Router();

function sendError(res: Response, err: unknown) {
  const e = err as { code?: string; status?: number; message?: string };
  const status = e?.status && e.status >= 400 ? e.status : 500;
  return res.status(status).json({
    success: false,
    code: e?.code || "INTERNAL",
    error: e?.message || String(err),
    speakInMeeting: false
  });
}

router.get("/api/meeting-bot/status", (_req, res) => {
  res.json({
    success: true,
    speakInMeeting: false,
    adapter: "vexa",
    ...vexaConfigStatus()
  });
});

router.post("/api/meeting-bot/create", async (req, res) => {
  try {
    const adapter = getVexaAdapter();
    const handle = await adapter.createBot({
      platform: req.body?.platform || "google_meet",
      nativeMeetingId: String(req.body?.nativeMeetingId || req.body?.native_meeting_id || "").trim(),
      botName: req.body?.botName || req.body?.bot_name,
      language: req.body?.language,
      transcribeEnabled: req.body?.transcribeEnabled !== false
    });
    auditBot("bot.create", handle.meetingId, true);
    res.json({
      success: true,
      speakInMeeting: false,
      mode: "transcript_only",
      handle
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/api/meeting-bot/stop", async (req, res) => {
  try {
    const adapter = getVexaAdapter();
    const handle = await adapter.stopBot({
      platform: req.body?.platform || "google_meet",
      nativeMeetingId: String(req.body?.nativeMeetingId || req.body?.native_meeting_id || "").trim()
    });
    auditBot("bot.stop", handle.meetingId, true);
    res.json({ success: true, speakInMeeting: false, handle });
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/api/meeting-bot/bots", async (req, res) => {
  try {
    const adapter = getVexaAdapter();
    const bots = await adapter.getStatus({
      platform: req.query.platform as any,
      nativeMeetingId: req.query.nativeMeetingId
        ? String(req.query.nativeMeetingId)
        : undefined
    });
    res.json({ success: true, speakInMeeting: false, bots });
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/api/meeting-bot/transcripts", async (req, res) => {
  try {
    const adapter = getVexaAdapter();
    const platform = (req.query.platform as any) || "google_meet";
    const nativeMeetingId = String(
      req.query.nativeMeetingId || req.query.native_meeting_id || ""
    ).trim();
    const pulled = await adapter.pullTranscripts({ platform, nativeMeetingId });
    auditBot("bot.transcript_pull", pulled.meetingId, true);
    res.json({
      success: true,
      speakInMeeting: false,
      mode: "transcript_only",
      ...pulled
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/api/meeting-bot/events", (req, res) => {
  const meeting_id = String(req.query.meeting_id || "").trim() || undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const events = listMeetingEvents({ meeting_id, limit }).filter((e) => e.provider === "vexa");
  res.json({ success: true, speakInMeeting: false, events });
});

export default router;
