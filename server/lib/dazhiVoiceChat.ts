/**
 * 大智 P0：火山 RTC StartVoiceChat / StopVoiceChat / UpdateVoiceChat
 * 版本固定 2025-06-01。ASR/TTS/LLM 参数不可随意改。
 */
import { randomBytes } from "node:crypto";
import { signVolcOpenApi } from "./volcOpenApiSign";

const HOST = "rtc.volcengineapi.com";
const VERSION = "2025-06-01";
const SERVICE = "rtc";
const QPS_LIMIT = 60;

const BOT_USER_ID = () => (process.env.DAZHI_BOT_USER_ID || "dazhi-ai-bot").trim() || "dazhi-ai-bot";

type TaskRecord = {
  taskId: string;
  roomId: string;
  targetUserId: string;
  startedAt: number;
};

const tasksByRoom = new Map<string, TaskRecord>();
const callTimestamps: number[] = [];

export class VoiceChatConfigError extends Error {
  code = "UNCONFIGURED";
}
export class VoiceChatApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = "RTC_API_ERROR", status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function requireEnv(name: string) {
  const value = (process.env[name] || "").trim();
  if (!value) throw new VoiceChatConfigError(`缺少环境变量 ${name}`);
  return value;
}

function logVoice(level: "info" | "error", event: string, fields: Record<string, unknown>) {
  const line = JSON.stringify({ event, ...fields, at: new Date().toISOString() });
  if (level === "error") console.error(`[dazhi-rtc] ${line}`);
  else console.log(`[dazhi-rtc] ${line}`);
}

function rtcConfig() {
  return {
    appId: requireEnv("RTC_APP_ID"),
    accessKey: requireEnv("VOLC_ACCESSKEY"),
    secretKey: requireEnv("VOLC_SECRETKEY"),
    region: (process.env.VOLC_REGION || "cn-north-1").trim(),
    arkKey: requireEnv("ARK_API_KEY"),
    endpointId: (process.env.ARK_ENDPOINT_ID || "ep-20260928112753-fqzc7").trim()
  };
}

async function throttle() {
  const now = Date.now();
  while (callTimestamps.length && now - callTimestamps[0] >= 1000) callTimestamps.shift();
  if (callTimestamps.length >= QPS_LIMIT) {
    const wait = 1000 - (now - callTimestamps[0]) + 5;
    await new Promise((resolve) => setTimeout(resolve, Math.max(20, wait)));
  }
  callTimestamps.push(Date.now());
  while (callTimestamps.length && Date.now() - callTimestamps[0] >= 1000) callTimestamps.shift();
}

function shortId() {
  return randomBytes(4).toString("hex");
}

function safeRoomToken(roomId: string) {
  return String(roomId || "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 48) || "room";
}

/** 实测通过的 StartVoiceChat Body（Version 2025-06-01）。勿改字段层级/命名。 */
function buildStartBody(roomId: string, targetUserId: string, taskId: string) {
  const cfg = rtcConfig();
  return {
    AppId: cfg.appId,
    RoomId: roomId,
    TaskId: taskId,
    AgentConfig: {
      TargetUserId: [targetUserId],
      UserId: BOT_USER_ID(),
      IdleTimeout: 180
    },
    Config: {
      ASRConfig: {
        Provider: "volcano",
        ProviderParams: {
          Mode: "bigmodel",
          Credential: { ApiResourceId: "volc.seedasr.sauc.duration" },
          StreamMode: 2
        }
      },
      TTSConfig: {
        Provider: "volcano_bidirection",
        ProviderParams: {
          Credential: { ResourceId: "seed-tts-2.0" },
          Voice: "zh_female_vv_uranus_bigtts"
        }
      },
      LLMConfig: {
        Mode: "ArkV3",
        APIKey: cfg.arkKey,
        ModelName: cfg.endpointId,
        EndPointId: cfg.endpointId
      }
    }
  };
}

async function callRtc(action: "StartVoiceChat" | "StopVoiceChat" | "UpdateVoiceChat", body: object) {
  const cfg = rtcConfig();
  const payload = JSON.stringify(body);
  const query = { Action: action, Version: VERSION };
  const signed = signVolcOpenApi({
    host: HOST,
    query,
    body: payload,
    accessKey: cfg.accessKey,
    secretKey: cfg.secretKey,
    region: cfg.region,
    service: SERVICE
  });
  await throttle();
  const url = `https://${HOST}/?${signed.canonicalQuery}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Host: HOST,
      "X-Date": signed.xDate,
      "X-Content-Sha256": signed.payloadHash,
      Authorization: signed.authorization
    },
    body: payload
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  const err = json?.ResponseMetadata?.Error;
  if (!res.ok || err) {
    const message = err?.Message || text.slice(0, 300) || `HTTP ${res.status}`;
    const code = err?.Code || "RTC_API_ERROR";
    logVoice("error", "rtc.api_error", { action, code, message, status: res.status });
    throw new VoiceChatApiError(`${action} 失败：${code} ${message}`, code, res.status >= 400 ? res.status : 502);
  }
  logVoice("info", "rtc.api_ok", {
    action,
    requestId: json?.ResponseMetadata?.RequestId || null,
    roomId: (body as any).RoomId || null,
    taskId: (body as any).TaskId || null
  });
  return json;
}

export function getDazhiTask(roomId: string) {
  return tasksByRoom.get(String(roomId)) || null;
}

export async function joinDazhiToRoom(input: { roomId: string; targetUserId: string }) {
  const roomId = String(input.roomId || "").trim();
  const targetUserId = String(input.targetUserId || "").trim();
  if (!roomId || !targetUserId) {
    throw new VoiceChatApiError("roomId 与 targetUserId 必填", "BAD_REQUEST", 400);
  }
  const existing = tasksByRoom.get(roomId);
  if (existing) {
    logVoice("info", "rtc.join", { roomId, taskId: existing.taskId, idempotent: true });
    return { taskId: existing.taskId, idempotent: true, botUserId: BOT_USER_ID() };
  }
  const taskId = `dazhi_${safeRoomToken(roomId)}_${shortId()}`;
  const body = buildStartBody(roomId, targetUserId, taskId);
  await callRtc("StartVoiceChat", body);
  const record: TaskRecord = { taskId, roomId, targetUserId, startedAt: Date.now() };
  tasksByRoom.set(roomId, record);
  return { taskId, idempotent: false, botUserId: BOT_USER_ID() };
}

export async function kickDazhiFromRoom(input: { roomId: string; taskId?: string }) {
  const roomId = String(input.roomId || "").trim();
  if (!roomId) throw new VoiceChatApiError("roomId 必填", "BAD_REQUEST", 400);
  const known = tasksByRoom.get(roomId);
  const taskId = String(input.taskId || known?.taskId || "").trim();
  if (!taskId) throw new VoiceChatApiError("未找到该房间的大智任务", "NO_TASK", 404);
  const cfg = rtcConfig();
  await callRtc("StopVoiceChat", { AppId: cfg.appId, RoomId: roomId, TaskId: taskId });
  tasksByRoom.delete(roomId);
  return { taskId, stopped: true };
}

export async function interruptDazhi(input: { roomId: string; taskId?: string }) {
  const roomId = String(input.roomId || "").trim();
  if (!roomId) throw new VoiceChatApiError("roomId 必填", "BAD_REQUEST", 400);
  const known = tasksByRoom.get(roomId);
  const taskId = String(input.taskId || known?.taskId || "").trim();
  if (!taskId) throw new VoiceChatApiError("未找到该房间的大智任务", "NO_TASK", 404);
  const cfg = rtcConfig();
  await callRtc("UpdateVoiceChat", {
    AppId: cfg.appId,
    RoomId: roomId,
    TaskId: taskId,
    Command: "Interrupt"
  });
  return { taskId, interrupted: true };
}

export function voiceChatConfigStatus() {
  const names = ["RTC_APP_ID", "VOLC_ACCESSKEY", "VOLC_SECRETKEY", "ARK_API_KEY"] as const;
  const missing = names.filter((name) => !(process.env[name] || "").trim());
  const voiceChatAppId = (process.env.RTC_APP_ID || "").trim();
  const tokenAppId = (process.env.VOLC_RTC_APP_ID || "").trim();
  const tokenAppKeyConfigured = Boolean((process.env.VOLC_RTC_APP_KEY || "").trim());
  const appIdMatch = Boolean(voiceChatAppId && tokenAppId && voiceChatAppId === tokenAppId);
  return {
    ready: missing.length === 0,
    missing,
    endpointId: (process.env.ARK_ENDPOINT_ID || "ep-20260928112753-fqzc7").trim(),
    botUserId: BOT_USER_ID(),
    version: VERSION,
    activeRooms: tasksByRoom.size,
    voiceChatAppId: voiceChatAppId || null,
    tokenAppId: tokenAppId || null,
    tokenAppKeyConfigured,
    appIdMatch,
    appIdWarning: !tokenAppId
      ? "未配置 VOLC_RTC_APP_ID：客户端无法签发加房 Token"
      : !appIdMatch
        ? "VOLC_RTC_APP_ID 与 RTC_APP_ID 不一致：真人与 dazhi-ai-bot 将不在同一应用，联调必失败"
        : null
  };
}
