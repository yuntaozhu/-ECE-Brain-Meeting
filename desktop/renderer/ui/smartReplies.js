/**
 * Wave K：三色语义建议卡 + 证据胶囊 + 1/2/3 快捷复制。
 */
import { $, S } from "../state.js";
import { slog } from "./log.js";
import { showAlert } from "./status.js";
import { ensureMermaidStyles, renderMermaidBox } from "./mermaidView.js";

let lastSuggestions = { push_forward: "", push_back: "", counter_inquiry: "" };
let keysBound = false;

export function updateCopilotModeUi() {
  const btn = $("copilotModeBtn");
  if (btn) btn.textContent = `模式: ${S.copilotMode || "auto"}`;
}

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

async function copySuggestion(key) {
  const text = lastSuggestions[key] || "";
  if (!text) {
    showAlert("当前无对应建议可复制", "warn");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showAlert(`已通过快捷键复制建议口径`, "ok");
    const card = document.querySelector(`.sr-card[data-key="${key}"]`);
    if (card) {
      card.classList.add("flash");
      setTimeout(() => card.classList.remove("flash"), 300);
    }
    slog("INFO", "Copilot", "快捷复制", { key, text: text.slice(0, 60) });
  } catch (_) {
    showAlert("复制失败", "bad");
  }
}

function bindDigitKeys() {
  if (keysBound) return;
  keysBound = true;
  document.addEventListener("keydown", (e) => {
    const tag = String(document.activeElement?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable) {
      return;
    }
    if (e.key === "1") {
      e.preventDefault();
      void copySuggestion("push_forward");
    } else if (e.key === "2") {
      e.preventDefault();
      void copySuggestion("push_back");
    } else if (e.key === "3") {
      e.preventDefault();
      void copySuggestion("counter_inquiry");
    }
  });
}

export function bindCopilotControls() {
  updateCopilotModeUi();
  bindDigitKeys();
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

function factPill(f) {
  const t = String(f || "");
  let cls = "sr-fact-pill";
  let prefix = "";
  if (/否决|SUPERSEDED/i.test(t)) {
    cls += " danger";
    prefix = "🚫 ";
  } else if (/\[CLAIM-|FAQ/i.test(t)) {
    cls += " ok";
    prefix = "✅ ";
  } else if (/Screen Context|截屏|屏幕/i.test(t)) {
    cls += " screen";
    prefix = "📸 ";
  } else {
    prefix = "· ";
  }
  return `<li class="${cls}">${prefix}${escapeHtml(t)}</li>`;
}

function cardClass(key, text, facts) {
  if (key === "push_forward") return "sr-card sr-card-forward";
  if (key === "counter_inquiry") return "sr-card sr-card-counter";
  const blob = `${text} ${(facts || []).join(" ")}`;
  if (/否决|SUPERSEDED/i.test(blob)) return "sr-card sr-card-back sr-card-danger";
  return "sr-card sr-card-back";
}

function cardTitle(key, label) {
  if (key === "push_forward") return `🟢 [1] ${label || "Option A · 快速推进"}`;
  if (key === "push_back") return `⚠️ [2] ${label || "Option B · 谨慎权衡"}`;
  return `🔵 [3] ${label || "Option C · 澄清反问"}`;
}

export function renderSmartReplies(msg) {
  const box = $("smartReplies");
  const meta = $("smartRepliesMeta");
  if (!box) return;

  if (!msg || msg.enabled === false) {
    box.innerHTML = `<div class="sr-empty-state"><h3>副驾驶已关闭</h3><p>环境变量 COPILOT_ENABLED=0。开启后将在此显示 Option A/B/C。</p></div>`;
    if (meta) meta.innerHTML = "";
    lastSuggestions = { push_forward: "", push_back: "", counter_inquiry: "" };
    return;
  }

  if (msg.trigger_mode) {
    S.copilotMode = msg.trigger_mode;
    updateCopilotModeUi();
  }

  if (!msg.should_trigger || !msg.suggestions) {
    const why = msg.held_for_manual
      ? `Manual 待命 · ${msg.category || "—"}`
      : msg.category || "等待会场";
    const hint = msg.held_for_manual
      ? "当前为 Manual：按 Alt+Z 或点 Push-to-Ask 立即出卡。"
      : msg.throttled
        ? "刚出过卡，短暂节流中。可强制 Push-to-Ask。"
        : "听会巡检后自动出卡，也可随时强制生成。";
    box.innerHTML = `
      <div class="sr-empty-state">
        <h3>未触发建议 · ${escapeHtml(why)}</h3>
        <p>${escapeHtml(hint)}</p>
        <button type="button" class="accent" id="srEmptyAskBtn">⚡ 立即 Push-to-Ask</button>
      </div>`;
    $("srEmptyAskBtn")?.addEventListener("click", () => void runCopilotPushAsk());
    if (meta) {
      meta.innerHTML = msg.segment
        ? `<span class="sr-badge">最近：${escapeHtml(String(msg.segment).slice(0, 48))}</span>`
        : "";
    }
    lastSuggestions = { push_forward: "", push_back: "", counter_inquiry: "" };
    return;
  }

  const s = msg.suggestions;
  lastSuggestions = {
    push_forward: String(s.push_forward || "").trim(),
    push_back: String(s.push_back || "").trim(),
    counter_inquiry: String(s.counter_inquiry || "").trim()
  };
  const labels = msg.labels || {};
  const facts = Array.isArray(msg.key_facts) ? msg.key_facts : [];

  if (meta) {
    const badges = [];
    badges.push(`<span class="sr-badge warn">${escapeHtml(msg.urgency || "—")}</span>`);
    badges.push(`<span class="sr-badge">${escapeHtml(msg.category || "")}</span>`);
    if (msg.target_topic) {
      badges.push(`<span class="sr-badge">${escapeHtml(String(msg.target_topic).slice(0, 24))}</span>`);
    }
    if (msg.faq_title) {
      badges.push(`<span class="sr-badge ok">FAQ:${escapeHtml(String(msg.faq_title).slice(0, 20))}</span>`);
    }
    if (msg.prefetch?.used) {
      badges.push(`<span class="sr-badge hot">⚡ Prefetch 命中</span>`);
    }
    if (msg.held_for_manual) {
      badges.push(`<span class="sr-badge warn">Manual 待命</span>`);
    }
    if (msg.counter_pattern) {
      badges.push(
        `<span class="sr-badge">C:${escapeHtml(String(msg.counter_pattern))}</span>`
      );
    }
    if (msg.refined || msg.stage === "refined") {
      badges.push(`<span class="sr-badge hot">✨ AI 已精炼</span>`);
    } else if (msg.counter_refined || msg.stage === "counter_refined") {
      badges.push(`<span class="sr-badge hot">✨ C 已精炼</span>`);
    } else if (msg.refining) {
      badges.push(`<span class="sr-badge warn">✨ 精炼中…</span>`);
    } else {
      badges.push(`<span class="sr-badge">⚡ 毫秒级快照</span>`);
    }
    meta.innerHTML = badges.join("");
  }

  const dive = msg.deep_dive;
  const diveSpeak = String(dive?.speakable || dive?.speak_script || "").trim();
  const diveInternal = Array.isArray(dive?.internal) ? dive.internal.filter(Boolean) : [];
  const factsHtml = facts.length
    ? `<ul class="sr-facts">${facts.map(factPill).join("")}</ul>`
    : `<p class="sr-empty" style="margin-top:8px">Wiki 未命中 · 无证据胶囊</p>`;

  box.innerHTML = `
    <div class="sr-cards">
      ${cardHtml("push_forward", labels.push_forward, s.push_forward, facts)}
      ${cardHtml("push_back", labels.push_back, s.push_back, facts)}
      ${cardHtml("counter_inquiry", labels.counter_inquiry, s.counter_inquiry, facts)}
    </div>
    ${
      dive
        ? `<article class="sr-card sr-deep">
        <header>Deep Dive · 可口述支撑</header>
        <p><strong>${escapeHtml(dive.thesis || "")}</strong></p>
        <ul>${(dive.bullets || [])
          .map((b) => `<li>${escapeHtml(b)}</li>`)
          .join("")}</ul>
        <p class="sr-speakable">${escapeHtml(diveSpeak)}</p>
        ${
          diveInternal.length
            ? `<div class="sr-internal"><div class="sr-internal-label">【内部控场 · 不进入语音播报】</div><ul>${diveInternal
                .map((b) => `<li>${escapeHtml(b)}</li>`)
                .join("")}</ul></div>`
            : ""
        }
        <div class="sr-actions">
          <button type="button" class="ghost" data-copy="${escapeAttr(
            diveSpeak
          )}">复制口述</button>
          <button type="button" class="ghost" data-speak="${escapeAttr(
            diveSpeak
          )}">试播</button>
        </div>
      </article>`
        : ""
    }
    ${factsHtml}
  `;

  if (msg.mermaid_diagram) {
    ensureMermaidStyles();
    renderMermaidBox(msg.mermaid_diagram);
  }

  box.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const text = btn.getAttribute("data-copy") || "";
      try {
        await navigator.clipboard.writeText(text);
        showAlert("已复制建议口径", "ok");
        slog("INFO", "Copilot", "复制建议", { text: text.slice(0, 60) });
      } catch (err) {
        showAlert("复制失败", "bad");
      }
    };
  });

  box.querySelectorAll("[data-speak]").forEach((btn) => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const text = btn.getAttribute("data-speak") || "";
      if (!text || !window.bridge?.hostSpeak) return;
      slog("INFO", "Copilot", "试播建议", { text: text.slice(0, 60) });
      const res = await window.bridge.hostSpeak(text);
      if (!res?.ok) showAlert(res?.error || "试播失败", "bad");
    };
  });

  box.querySelectorAll("[data-copy-card]").forEach((card) => {
    card.addEventListener("click", async (e) => {
      if (e.target.closest("button")) return;
      const text = card.getAttribute("data-copy-card") || "";
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        card.classList.add("flash");
        setTimeout(() => card.classList.remove("flash"), 280);
        showAlert("已复制建议口径", "ok");
      } catch (_) {
        showAlert("复制失败", "bad");
      }
    });
  });
}

function cardHtml(key, label, text, facts) {
  const t = String(text || "").trim();
  if (!t) return "";
  const kbd = key === "push_forward" ? "1" : key === "push_back" ? "2" : "3";
  return `
    <article class="${cardClass(key, t, facts)}" data-key="${escapeHtml(key)}" data-copy-card="${escapeAttr(t)}" title="点击正文复制">
      <header>
        <span>${escapeHtml(cardTitle(key, label))}</span>
        <span class="sr-kbd">${kbd}</span>
      </header>
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
