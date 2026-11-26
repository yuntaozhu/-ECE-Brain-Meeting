/**
 * 大智 · 火山 RTC VoiceChat HTTP 客户端（不持服务端 AK/SK）
 * 默认连本机业务后端：DAZHI_SERVER_URL 或 http://127.0.0.1:3000
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
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Number(process.env.VOICECHAT_HTTP_TIMEOUT_MS) || 15000);
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text.slice(0, 300) };
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: json?.error || json?.message || `HTTP ${res.status}`,
        code: json?.code || null,
        data: json
      };
    }
    return { ok: true, status: res.status, data: json };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err?.name === "AbortError" ? "timeout" : String(err?.message || err),
      code: "NETWORK"
    };
  } finally {
    clearTimeout(timer);
  }
}

function status() {
  return request("GET", "/api/dazhi/voicechat/status");
}

function join({ roomId, targetUserId }) {
  return request("POST", "/api/dazhi/voicechat/join", { roomId, targetUserId });
}

function kick({ roomId, taskId }) {
  return request("POST", "/api/dazhi/voicechat/kick", { roomId, taskId });
}

function interrupt({ roomId, taskId }) {
  return request("POST", "/api/dazhi/voicechat/interrupt", { roomId, taskId });
}

function events({ meeting_id, limit } = {}) {
  const q = new URLSearchParams();
  if (meeting_id) q.set("meeting_id", meeting_id);
  if (limit) q.set("limit", String(limit));
  const qs = q.toString();
  return request("GET", `/api/dazhi/voicechat/events${qs ? `?${qs}` : ""}`);
}

module.exports = {
  serverBase,
  status,
  join,
  kick,
  interrupt,
  events
};
