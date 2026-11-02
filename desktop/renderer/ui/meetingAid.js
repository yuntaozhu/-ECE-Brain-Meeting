/**
 * Wave K：结构化 Catch Me Up 看板 + Quick Jot（meetingId 贯通）。
 */
import { $, S } from "../state.js";
import { slog } from "./log.js";
import { showAlert } from "./status.js";
import { ensureMermaidStyles, renderMermaidBox } from "./mermaidView.js";
import { selectAidTab } from "./cockpit.js";

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function meetingId() {
  return S.meetingIdUi || "live";
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

function listBlock(items, emptyHtml) {
  const arr = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!arr.length) return emptyHtml;
  return `<ul>${arr.map((x) => `<li>${escapeHtml(typeof x === "string" ? x : JSON.stringify(x))}</li>`).join("")}</ul>`;
}

export function renderCatchMeUp(msg) {
  const box = $("catchMeUpBox");
  if (!box) return;

  if (!msg || (!msg.current_topic && !msg.digest && !msg.markdown)) {
    box.innerHTML = "";
    return;
  }

  // 扩写草稿可能只带 markdown
  if (msg.markdown && !msg.current_topic && !msg.disagreements) {
    box.innerHTML = `<pre class="sr-meta" style="white-space:pre-wrap;margin:0">${escapeHtml(msg.markdown)}</pre>`;
    return;
  }

  const speakers = Array.isArray(msg.active_speakers) ? msg.active_speakers : [];
  const speakerHtml = speakers.length
    ? `<ul>${speakers
        .map(
          (s) =>
            `<li>${escapeHtml(s.name || s)} <span class="sr-badge">${escapeHtml(
              String(s.lines != null ? s.lines : "")
            )}</span></li>`
        )
        .join("")}</ul>`
    : `<p class="recap-empty">近窗暂无发言统计</p>`;

  box.innerHTML = `
    <div class="recap-board">
      <div class="recap-card topic">
        <h3>🎯 当前焦点议题</h3>
        <div class="recap-body">${escapeHtml(msg.current_topic || "（未检出）")}</div>
      </div>
      <div class="recap-card disagree">
        <h3>⚡ 核心分歧与风险</h3>
        ${listBlock(
          msg.disagreements,
          `<p class="recap-empty">暂无明显分歧</p>`
        )}
      </div>
      <div class="recap-card decide">
        <h3>📌 待拍板决策</h3>
        ${listBlock(
          msg.pending_decisions,
          `<p class="sr-empty">近窗未检出明确决策句</p>`
        )}
      </div>
      <div class="recap-card wiki">
        <h3>📚 Wiki 2.0 快照</h3>
        ${listBlock(
          msg.wiki_facts,
          `<p class="sr-empty">Wiki 未命中</p>`
        )}
      </div>
      <div class="recap-card speakers">
        <h3>🗣️ 近窗活跃发言人</h3>
        ${speakerHtml}
      </div>
    </div>
  `;

  if (msg.mermaid_diagram) {
    ensureMermaidStyles();
    renderMermaidBox(msg.mermaid_diagram);
  }
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
    .map(
      (j) =>
        `<li>${escapeHtml(j.text)} <span style="opacity:.6">${new Date(
          j.ts
        ).toLocaleTimeString()}</span></li>`
    )
    .join("");
}

export async function refreshJotList() {
  try {
    const res = await window.bridge?.copilotListJots?.({ meetingId: meetingId() });
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
    selectAidTab("aid");
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
  const res = await window.bridge?.copilotJot?.({ text, meetingId: meetingId() });
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
    meetingId: meetingId(),
    transcript
  });
  if (!res?.ok) {
    showAlert("扩写失败", "bad");
    return;
  }
  renderCatchMeUp({ markdown: res.markdown });
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
