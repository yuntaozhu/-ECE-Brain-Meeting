/**
 * Catch Me Up / Quick Jot / 屏幕上下文（纯展示 + IPC；策略在主进程）。
 */
import { $, S } from "../state.js";
import { slog } from "./log.js";
import { showAlert } from "./status.js";
import { ensureMermaidStyles, renderMermaidBox } from "./mermaidView.js";

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function recentTranscriptText(windowMs = 5 * 60 * 1000) {
  const now = Date.now();
  const lines = (S.transcriptLines || []).map((l, i) => ({
    ...l,
    at: l.at || now - (S.transcriptLines.length - i) * 2500
  }));
  const recent = lines.filter((l) => now - l.at <= windowMs);
  const use = recent.length ? recent : lines.slice(-30);
  return use.map((l) => `${l.speaker || "会场"}: ${l.text}`).join("\n");
}

export function renderCatchMeUp(msg) {
  const box = $("catchMeUpBox");
  if (!box) return;
  box.textContent = msg?.digest || "";
  ensureMermaidStyles();
  renderMermaidBox(msg?.mermaid_diagram || "");
}

export function renderJotList(jots) {
  const ul = $("jotList");
  if (!ul) return;
  const list = Array.isArray(jots) ? jots.slice(-8).reverse() : [];
  if (!list.length) {
    ul.innerHTML = "";
    return;
  }
  ul.innerHTML = list
    .map((j) => `<li>${escapeHtml(j.text)} <span style="opacity:.6">${new Date(j.ts).toLocaleTimeString()}</span></li>`)
    .join("");
}

export async function refreshJotList() {
  try {
    const res = await window.bridge?.copilotListJots?.({ meetingId: "live" });
    if (res?.ok) renderJotList(res.jots);
  } catch (_) {}
}

export async function runCatchMeUp() {
  const transcript = recentTranscriptText();
  if (!transcript.trim()) {
    showAlert("近窗无转写，无法速览", "warn");
    return;
  }
  slog("INFO", "Copilot", "Catch Me Up", { chars: transcript.length });
  const res = await window.bridge?.copilotCatchMeUp?.({
    transcript,
    agenda: $("agenda")?.value || "",
    windowMs: 5 * 60 * 1000
  });
  if (res?.ok) {
    renderCatchMeUp(res);
    showAlert("已生成近 5 分钟速览", "ok");
  } else {
    showAlert(res?.error || "速览失败", "bad");
  }
}

export async function runQuickJot() {
  const input = $("quickJotInput");
  const text = String(input?.value || "").trim();
  if (!text) {
    showAlert("请先输入短记", "warn");
    return;
  }
  const res = await window.bridge?.copilotJot?.({ text, meetingId: "live" });
  if (res?.ok) {
    if (input) input.value = "";
    showAlert("已记下", "ok");
    await refreshJotList();
  } else {
    showAlert(res?.error || "速记失败", "bad");
  }
}

export async function runExpandJots() {
  const transcript = recentTranscriptText(10 * 60 * 1000);
  const res = await window.bridge?.copilotExpandJots?.({
    meetingId: "live",
    transcript
  });
  if (!res?.ok) {
    showAlert("扩写失败", "bad");
    return;
  }
  const box = $("catchMeUpBox");
  if (box) box.textContent = res.markdown;
  try {
    await navigator.clipboard.writeText(res.markdown);
    showAlert("扩写草稿已复制到剪贴板", "ok");
  } catch (_) {
    showAlert("已生成扩写草稿", "ok");
  }
  slog("INFO", "Copilot", "Expand jots", { jots: res.jotCount });
}

export async function runCaptureScreen() {
  const res = await window.bridge?.copilotCaptureScreen?.({
    note: "meeting-aid"
  });
  if (res?.ok) {
    showAlert("已截取屏幕上下文", "ok");
    slog("INFO", "Copilot", "Screen capture", { path: res.path, bytes: res.bytes });
  } else {
    showAlert(res?.error || "截屏失败", "bad");
  }
}

export function bindMeetingAidControls() {
  ensureMermaidStyles();
  $("catchMeUpBtn")?.addEventListener("click", () => void runCatchMeUp());
  $("quickJotBtn")?.addEventListener("click", () => void runQuickJot());
  $("quickJotInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void runQuickJot();
    }
  });
  $("expandJotsBtn")?.addEventListener("click", () => void runExpandJots());
  $("screenCtxBtn")?.addEventListener("click", () => void runCaptureScreen());
  void refreshJotList();
}
