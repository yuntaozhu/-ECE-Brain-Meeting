/**
 * 小星会议管理台客户端（product=xiaoxing；不依赖 desktop 源码）
 */
"use strict";

function serverBase() {
  return (
    (process.env.XIAOXING_SERVER_URL || process.env.DAZHI_SERVER_URL || "http://127.0.0.1:3000")
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

const PRODUCT = "xiaoxing";

function withProduct(p, extra) {
  const qs = new URLSearchParams({ product: PRODUCT, ...(extra || {}) });
  return `${p}?${qs}`;
}

module.exports = {
  serverBase,
  product: PRODUCT,
  health: () => request("GET", withProduct("/api/meeting-admin/health")),
  experts: () => request("GET", withProduct("/api/meeting-admin/experts")),
  upsertExpert: (body) =>
    request("POST", withProduct("/api/meeting-admin/experts"), { ...body, product: PRODUCT }),
  setExpertEnabled: (id, enabled) =>
    request("PATCH", withProduct(`/api/meeting-admin/experts/${encodeURIComponent(id)}/enabled`), {
      product: PRODUCT,
      enabled
    }),
  topics: (q) =>
    request(
      "GET",
      withProduct("/api/meeting-admin/topics", {
        projectTag: q?.projectTag || "",
        audience: q?.audience || ""
      })
    ),
  upsertTopic: (body) =>
    request("POST", withProduct("/api/meeting-admin/topics"), { ...body, product: PRODUCT }),
  deleteTopic: (id) =>
    request("DELETE", withProduct(`/api/meeting-admin/topics/${encodeURIComponent(id)}`)),
  sessions: () => request("GET", withProduct("/api/meeting-admin/sessions")),
  createSession: (body) =>
    request("POST", withProduct("/api/meeting-admin/sessions"), { ...body, product: PRODUCT }),
  getSession: (id) =>
    request("GET", withProduct(`/api/meeting-admin/sessions/${encodeURIComponent(id)}`)),
  patchSession: (id, body) =>
    request("PATCH", withProduct(`/api/meeting-admin/sessions/${encodeURIComponent(id)}`), {
      ...body,
      product: PRODUCT
    })
};
