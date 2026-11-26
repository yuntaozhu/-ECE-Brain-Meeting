/**
 * 外部会议 Bot HTTP 客户端（转写 only；不持 Vexa 密钥）
 */
"use strict";

function serverBase() {
  return (
    (process.env.DAZHI_SERVER_URL || process.env.VOICECHAT_SERVER_URL || "http://127.0.0.1:3000")
      .trim()
      .replace(/\/$/, "")
  );
}

async function request(method, path, body) {
  const url = `${serverBase()}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, status: res.status, error: json.error || `HTTP ${res.status}`, data: json };
    }
    return { ok: true, status: res.status, data: json };
  } catch (err) {
    return { ok: false, status: 0, error: String(err?.message || err), code: "NETWORK" };
  }
}

module.exports = {
  serverBase,
  status: () => request("GET", "/api/meeting-bot/status"),
  create: (body) => request("POST", "/api/meeting-bot/create", body),
  stop: (body) => request("POST", "/api/meeting-bot/stop", body),
  bots: () => request("GET", "/api/meeting-bot/bots"),
  transcripts: (q) => {
    const qs = new URLSearchParams();
    if (q?.platform) qs.set("platform", q.platform);
    if (q?.nativeMeetingId) qs.set("nativeMeetingId", q.nativeMeetingId);
    return request("GET", `/api/meeting-bot/transcripts?${qs}`);
  },
  /** 会议控制运维健康（灰度/审计标志） */
  opsHealth: () => request("GET", "/api/meeting-ops/health"),
  opsAudit: (q) => {
    const qs = new URLSearchParams();
    if (q?.meeting_id) qs.set("meeting_id", q.meeting_id);
    if (q?.limit) qs.set("limit", String(q.limit));
    return request("GET", `/api/meeting-ops/audit?${qs}`);
  },
  opsCost: () => request("GET", "/api/meeting-ops/cost"),
  opsDelete: (body) => request("POST", "/api/meeting-ops/delete", body)
};
