/**
 * Wave K：多角色聊天气泡流 + 智能滚底 + 单句快捷操作。
 */
import { $, S } from "../state.js";
import { showAlert } from "./status.js";
import { slog } from "./log.js";
import { refreshJotList } from "./meetingAid.js";

let nearBottom = true;
let roleFilter = "all";
let scrollBound = false;

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function lineRole(line) {
  const s = String(line?.speaker || "");
  const role = String(line?.role || "").toLowerCase();
  if (role === "me" || /^我$/.test(s)) return "me";
  if (/大智|Host|AI/i.test(s)) return "host";
  return "others";
}

function roleMeta(role) {
  if (role === "me") return { cls: "chat-me", label: "🙋 我 [Me · 仅标定]" };
  if (role === "host") return { cls: "chat-host", label: "🤖 大智 [Host]" };
  return { cls: "chat-others", label: "👤 会场 [Others]" };
}

function bindScrollOnce() {
  if (scrollBound) return;
  const el = $("transcript");
  if (!el) return;
  scrollBound = true;
  el.addEventListener("scroll", () => {
    nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    const btn = $("scrollBottomBtn");
    if (btn) btn.style.display = nearBottom ? "none" : "inline-block";
  });
  $("scrollBottomBtn")?.addEventListener("click", () => {
    el.scrollTop = el.scrollHeight;
    nearBottom = true;
    const btn = $("scrollBottomBtn");
    if (btn) btn.style.display = "none";
  });
  document.querySelectorAll("[data-role-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      roleFilter = btn.getAttribute("data-role-filter") || "all";
      document.querySelectorAll("[data-role-filter]").forEach((b) => {
        b.classList.toggle("active", b === btn);
      });
      renderTranscript();
    });
  });
}

async function askAiAboutLine(text) {
  const evaluate = window.bridge?.strategyEvaluate;
  if (!evaluate) {
    showAlert("桥接未就绪", "bad");
    return;
  }
  showAlert("正在以该句生成建议卡…", "ok");
  try {
    await evaluate({
      transcript: `会场: ${text}`,
      agenda: $("agenda")?.value || "",
      reason: "push-ask",
      forceCopilot: true
    });
  } catch (e) {
    showAlert(String(e?.message || e), "bad");
  }
}

async function jotLine(text) {
  const res = await window.bridge?.copilotJot?.({
    text,
    meetingId: S.meetingIdUi || "live"
  });
  if (res?.ok) {
    showAlert("已记入速记", "ok");
    await refreshJotList();
  } else {
    showAlert(res?.error || "速记失败", "bad");
  }
}

function bindBubbleActions(root) {
  root.querySelectorAll("[data-ask-line]").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      void askAiAboutLine(btn.getAttribute("data-ask-line") || "");
    };
  });
  root.querySelectorAll("[data-jot-line]").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      void jotLine(btn.getAttribute("data-jot-line") || "");
      slog("INFO", "Copilot", "单句速记", { text: (btn.getAttribute("data-jot-line") || "").slice(0, 40) });
    };
  });
}

export function renderTranscript() {
  bindScrollOnce();
  const el = $("transcript");
  if (!el) return;

  const lines = S.transcriptLines || [];
  const parts = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const role = lineRole(line);
    if (roleFilter === "others" && role !== "others") continue;
    if (roleFilter === "host" && role !== "host") continue;
    const meta = roleMeta(role);
    const ts = line.at ? new Date(line.at).toLocaleTimeString() : "";
    const synthesizing = /合成中/.test(String(line.text || ""));
    const actions =
      role === "others"
        ? `<div class="chat-actions">
            <button type="button" class="ghost" data-ask-line="${esc(line.text)}">⚡问AI</button>
            <button type="button" class="ghost" data-jot-line="${esc(line.text)}">📌速记</button>
          </div>`
        : "";
    parts.push(`
      <div class="chat-row ${meta.cls}">
        <header><span>${meta.label}${synthesizing ? " · 合成中" : ""}</span><span>${esc(ts)}</span></header>
        <div class="chat-bubble">${esc(line.text)}${actions}</div>
      </div>
    `);
  }

  if (S.partialAsr && (roleFilter === "all" || roleFilter === "others")) {
    parts.push(`
      <div class="chat-row chat-others chat-partial">
        <header><span>👤 会场 [Others] · 识别中</span></header>
        <div class="chat-bubble cursor-blink">${esc(S.partialAsr)}</div>
      </div>
    `);
  }
  if (S.partialAsrMe && roleFilter === "all") {
    parts.push(`
      <div class="chat-row chat-me chat-partial">
        <header><span>🙋 我 [Me] · 识别中</span></header>
        <div class="chat-bubble cursor-blink">${esc(S.partialAsrMe)}</div>
      </div>
    `);
  }

  if (!parts.length) {
    el.innerHTML = `<p class="sr-empty">（等待会场发言…）</p>`;
  } else {
    el.innerHTML = parts.join("");
    bindBubbleActions(el);
  }

  if (nearBottom) {
    el.scrollTop = el.scrollHeight;
    const btn = $("scrollBottomBtn");
    if (btn) btn.style.display = "none";
  }

  const stats = $("asrStats");
  if (stats) {
    stats.textContent = S.listening
      ? `已确认句 ${S.asrFinalCount} · 中间结果 ${S.asrDeltaCount} · ${
          S.partialAsr || S.partialAsrMe ? "正在识别…" : "等待下一句"
        }`
      : "启动听会后，此处显示实时转写（含中间结果）";
    stats.className = "status " + (S.asrFinalCount > 0 ? "ok" : "warn");
  }
}
