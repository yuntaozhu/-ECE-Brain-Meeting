/**
 * 扫视化副驾驶建议卡（纯展示；策略在主进程）。
 */
import { $, S } from "../state.js";
import { slog } from "./log.js";
import { showAlert } from "./status.js";
import { ensureMermaidStyles, renderMermaidBox } from "./mermaidView.js";

export function updateCopilotModeUi() {
  const btn = $("copilotModeBtn");
  if (btn) btn.textContent = `模式: ${S.copilotMode || "auto"}`;
}

/**
 * Push-to-Ask：近 60s 会场转写 → strategy:evaluate(forceCopilot)。
 */
export async function runCopilotPushAsk() {
  const now = Date.now();
  const windowMs = 60000;
  const lines = (S.transcriptLines || [])
    .map((l, i) => ({
      ...l,
      at: l.at || now - (S.transcriptLines.length - i) * 2500
    }))
    .filter((l) => now - l.at <= windowMs);
  const use = lines.length ? lines : (S.transcriptLines || []).slice(-10);
  const textLog = use
    .filter((l) => l.role !== "me")
    .map((l) => `${l.speaker || "会场"}: ${l.text}`)
    .join("\n");
  if (!textLog.trim()) {
    showAlert("近 60 秒无会场转写，无法 Push-to-Ask", "warn");
    return;
  }
  slog("INFO", "Copilot", "Push-to-Ask", { chars: textLog.length, mode: S.copilotMode });
  showAlert("正在生成建议卡…", "ok");
  try {
    const evaluate = window.bridge?.strategyEvaluate;
    if (!evaluate) {
      showAlert("桥接未就绪", "bad");
      return;
    }
    await evaluate({
      transcript: textLog,
      agenda: $("agenda")?.value || "",
      reason: "push-ask",
      forceCopilot: true
    });
  } catch (e) {
    showAlert(String(e?.message || e), "bad");
  }
}

export function bindCopilotControls() {
  updateCopilotModeUi();
  const modeBtn = $("copilotModeBtn");
  if (modeBtn) {
    modeBtn.onclick = async () => {
      const next = S.copilotMode === "manual" ? "auto" : "manual";
      const res = await window.bridge?.copilotSetMode?.(next);
      if (res?.ok) {
        S.copilotMode = res.mode;
        updateCopilotModeUi();
      }
    };
  }
  const askBtn = $("copilotPushAskBtn");
  if (askBtn) askBtn.onclick = () => void runCopilotPushAsk();
  void window.bridge?.copilotGetMode?.().then((r) => {
    if (r?.mode) {
      S.copilotMode = r.mode;
      updateCopilotModeUi();
    }
  });
}

export function renderSmartReplies(msg) {
  const box = $("smartReplies");
  const meta = $("smartRepliesMeta");
  if (!box) return;

  if (!msg || msg.enabled === false) {
    box.innerHTML = `<p class="sr-empty">副驾驶已关闭（COPILOT_ENABLED=0）</p>`;
    if (meta) meta.textContent = "";
    return;
  }

  if (msg.trigger_mode) {
    S.copilotMode = msg.trigger_mode;
    updateCopilotModeUi();
  }

  if (!msg.should_trigger || !msg.suggestions) {
    const why = msg.held_for_manual
      ? `Manual 待命 · ${msg.category || "—"}（按 Alt+Z）`
      : msg.category || "—";
    box.innerHTML = `<p class="sr-empty">未触发建议 · ${escapeHtml(why)}${
      msg.throttled ? "（节流）" : ""
    }</p>`;
    if (meta) {
      meta.textContent = msg.segment
        ? `最近片段：${String(msg.segment).slice(0, 48)}`
        : "";
    }
    return;
  }

  const s = msg.suggestions;
  const labels = msg.labels || {};
  const facts = Array.isArray(msg.key_facts) ? msg.key_facts : [];
  if (meta) {
    const pre = msg.prefetch?.used ? " · prefetch" : "";
    meta.textContent = `[${msg.urgency || "—"}] ${msg.category || ""} · ${
      msg.target_topic || ""
    }${msg.faq_title ? ` · FAQ:${msg.faq_title}` : ""}${pre}`;
  }

  const dive = msg.deep_dive;
  box.innerHTML = `
    <div class="sr-cards">
      ${cardHtml("push_forward", labels.push_forward, s.push_forward)}
      ${cardHtml("push_back", labels.push_back, s.push_back)}
      ${cardHtml("counter_inquiry", labels.counter_inquiry, s.counter_inquiry)}
    </div>
    ${
      dive
        ? `<article class="sr-card sr-deep">
        <header>Deep Dive · 可口述支撑</header>
        <p><strong>${escapeHtml(dive.thesis || "")}</strong></p>
        <ul>${(dive.bullets || [])
          .map((b) => `<li>${escapeHtml(b)}</li>`)
          .join("")}</ul>
        <p>${escapeHtml(dive.speak_script || "")}</p>
        <div class="sr-actions">
          <button type="button" class="ghost" data-copy="${escapeAttr(
            dive.speak_script || ""
          )}">复制口述</button>
          <button type="button" class="ghost" data-speak="${escapeAttr(
            dive.speak_script || ""
          )}">试播</button>
        </div>
      </article>`
        : ""
    }
    ${
      facts.length
        ? `<ul class="sr-facts">${facts
            .map((f) => `<li>${escapeHtml(f)}</li>`)
            .join("")}</ul>`
        : ""
    }
  `;

  if (msg.mermaid_diagram) {
    ensureMermaidStyles();
    renderMermaidBox(msg.mermaid_diagram);
  }

  box.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.onclick = async () => {
      const text = btn.getAttribute("data-copy") || "";
      try {
        await navigator.clipboard.writeText(text);
        showAlert("已复制建议口径", "ok");
        slog("INFO", "Copilot", "复制建议", { text: text.slice(0, 60) });
      } catch (e) {
        showAlert("复制失败", "bad");
      }
    };
  });

  box.querySelectorAll("[data-speak]").forEach((btn) => {
    btn.onclick = async () => {
      const text = btn.getAttribute("data-speak") || "";
      if (!text || !window.bridge?.hostSpeak) return;
      slog("INFO", "Copilot", "试播建议", { text: text.slice(0, 60) });
      const res = await window.bridge.hostSpeak(text);
      if (!res?.ok) showAlert(res?.error || "试播失败", "bad");
    };
  });
}

function cardHtml(key, label, text) {
  const t = String(text || "").trim();
  if (!t) return "";
  return `
    <article class="sr-card" data-key="${escapeHtml(key)}">
      <header>${escapeHtml(label || key)}</header>
      <p>${escapeHtml(t)}</p>
      <div class="sr-actions">
        <button type="button" class="ghost" data-copy="${escapeAttr(t)}">复制</button>
        <button type="button" class="ghost" data-speak="${escapeAttr(t)}">试播</button>
      </div>
    </article>
  `;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
