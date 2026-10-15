/**
 * 大智 RTC VoiceChat 业务路由（P0）。
 * 回调 URL 在控制台配置为 https://<域名>/rtc/voicechat/callback
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { Router, type Request, type Response } from "express";
import {
  VoiceChatApiError,
  VoiceChatConfigError,
  interruptDazhi,
  joinDazhiToRoom,
  kickDazhiFromRoom,
  voiceChatConfigStatus
} from "../lib/dazhiVoiceChat";

const router = Router();

function sendError(res: Response, err: unknown) {
  if (err instanceof VoiceChatConfigError) {
    return res.status(503).json({ success: false, code: err.code, error: err.message });
  }
  if (err instanceof VoiceChatApiError) {
    return res.status(err.status).json({ success: false, code: err.code, error: err.message });
  }
  const message = err instanceof Error ? err.message : String(err);
  return res.status(500).json({ success: false, code: "INTERNAL", error: message });
}

function callbackSignatureOk(req: Request) {
  const secret = (process.env.RTC_VOICECHAT_CALLBACK_SECRET || "").trim();
  if (!secret) return true;
  const given = String(req.get("x-rtc-signature") || "").trim();
  if (!given) return false;
  const expected = createHmac("sha256", secret).update(JSON.stringify(req.body ?? {}), "utf8").digest("hex");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

router.get("/api/dazhi/voicechat/status", (_req, res) => {
  res.json({ success: true, ...voiceChatConfigStatus() });
});

router.post("/api/dazhi/voicechat/join", async (req, res) => {
  try {
    const roomId = String(req.body?.roomId || "").trim();
    const targetUserId = String(req.body?.targetUserId || "").trim();
    const result = await joinDazhiToRoom({ roomId, targetUserId });
    res.json({ success: true, ...result });
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/api/dazhi/voicechat/kick", async (req, res) => {
  try {
    const result = await kickDazhiFromRoom({
      roomId: String(req.body?.roomId || "").trim(),
      taskId: req.body?.taskId ? String(req.body.taskId) : undefined
    });
    res.json({ success: true, ...result });
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/api/dazhi/voicechat/interrupt", async (req, res) => {
  try {
    const result = await interruptDazhi({
      roomId: String(req.body?.roomId || "").trim(),
      taskId: req.body?.taskId ? String(req.body.taskId) : undefined
    });
    res.json({ success: true, ...result });
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/rtc/voicechat/callback", (req, res) => {
  if (!callbackSignatureOk(req)) {
    return res.status(401).json({ success: false, error: "callback signature mismatch" });
  }
  const body = req.body || {};
  const data = body.EventData || body.eventData || body;
  console.log(
    `[dazhi-rtc] ${JSON.stringify({
      event: "callback",
      EventType: body.EventType || body.eventType || data.EventType || null,
      RoomId: data.RoomId || data.roomId || null,
      TaskId: data.TaskId || data.taskId || null,
      ErrorInfo: data.ErrorInfo || data.errorInfo || body.ErrorInfo || null,
      EventDetail: data.EventDetail || data.eventDetail || body.EventDetail || null,
      at: new Date().toISOString()
    })}`
  );
  res.json({ success: true });
});

/**
 * 预留 RTC 回调入口（运维配置公网地址后再完善 HMAC 验签与 VoiceChat 事件处理）。
 * 文档：https://www.volcengine.com/docs/6348/75110
 */
function rtcCallbackStub(_req: Request, res: Response) {
  res.status(200).json({});
}
router.get("/rtc/callback", rtcCallbackStub);
router.post("/rtc/callback", rtcCallbackStub);

export default router;
