/**
 * Wave L：双态胶囊 HUD（折叠 Mini-Pill / 展开作战）· 纯展示 + IPC。
 */
const cardsEl = document.getElementById("cards");
const metaEl = document.getElementById("meta");
const liveEl = document.getElementById("live");
const liveMini = document.getElementById("liveMini");
const factsEl = document.getElementById("facts");
const diveHost = document.getElementById("diveHost");
const recapDrawer = document.getElementById("recapDrawer");
const liveDot = document.getElementById("liveDot");
const modeBtn = document.getElementById("capModeBtn");
const askBtn = document.getElementById("capAskBtn");
const recapBtn = document.getElementById("capRecapBtn");
const collapseBtn = document.getElementById("capCollapseBtn");

let collapsed = false;
let mode = "auto";
const recentLines = [];
const MAX_LINES = 40;

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setLiveText(text) {
  const t = String(text || "").slice(0, 72);
  if (liveEl) liveEl.textContent = t;
  if (liveMini) liveMini.textContent = t || "等待会场…";
}

function applyCollapsedUi() {
  document.body.classList.toggle("collapsed", collapsed);
  if (collapseBtn) collapseBtn.textContent = collapsed ? "▾" : "▴";
}

async function setCollapsed(next) {
  collapsed = Boolean(next);
  applyCollapsedUi();
  await window.bridge?.setCapsuleCollapsed?.(collapsed);
}

function cardTone(key, text, facts) {
  if (key === "push_forward") return "forward";
  if (key === "counter_inquiry") return "counter";
  const blob = `${text} ${(facts || []).join(" ")}`;
  if (/否决|SUPERSEDED/i.test(blob)) return "danger";
  return "back";
}

function titleFor(key, label) {
  if (key === "push_forward") return `🟢 [1] ${label || "推进"}`;
  if (key === "push_back") return `⚠️ [2] ${label || "权衡"}`;
  return `🔵 [3] ${label || "反问"}`;
}

async function copyText(text, card) {
  try {
    await navigator.clipboard.writeText(text || "");
    if (card) {
      card.classList.add("flash");
      setTimeout(() => card.classList.remove("flash"), 280);
    }
  } catch (_) {}
}

function pushLine(role, text) {
  const speaker = role === "me" ? "我" : role === "host" ? "大智" : "会场";
  recentLines.push({ speaker, text: String(text || ""), at: Date.now() });
  while (recentLines.length > MAX_LINES) recentLines.shift();
}

function renderPacket(msg) {
  if (!msg?.should_trigger || !msg.suggestions) {
    cardsEl.innerHTML = `<p class="empty">未触发建议 · ${esc(msg?.category || "等待会场")}</p>`;
    metaEl.textContent = msg?.segment ? String(msg.segment).slice(0, 28) : "待命";
    if (factsEl) factsEl.innerHTML = "";
    if (diveHost) diveHost.innerHTML = "";
    return;
  }

  // 折叠态收到新卡 → 自动展开
  if (collapsed && msg.should_trigger) {
    void setCollapsed(false);
  }

  metaEl.textContent = `${msg.urgency || ""} · ${msg.category || ""}${
    msg.refined || msg.stage === "refined" ? " · ✨" : ""
  }`.trim();
  if (msg.trigger_mode) {
    mode = msg.trigger_mode;
    if (modeBtn) modeBtn.textContent = mode === "manual" ? "Manual" : "Auto";
  }

  const s = msg.suggestions;
  const labels = msg.labels || {};
  const facts = Array.isArray(msg.key_facts) ? msg.key_facts : [];
  cardsEl.innerHTML = ["push_forward", "push_back", "counter_inquiry"]
    .map((k) => {
      const text = s[k];
      if (!text) return "";
      const tone = cardTone(k, text, facts);
      const n = k === "push_forward" ? "1" : k === "push_back" ? "2" : "3";
      return `<article class="card ${tone}" data-copy="${esc(text)}">
        <header><span>${esc(titleFor(k, labels[k]))}</span><span>${n}</span></header>
        <p>${esc(text)}</p>
        <div class="row">
          <button type="button" data-copy-btn="${esc(text)}">复制</button>
          <button type="button" data-speak="${esc(text)}">试播</button>
        </div>
      </article>`;
    })
    .join("");

  if (factsEl) {
    factsEl.innerHTML = facts
      .slice(0, 5)
      .map((f) => {
        const t = String(f || "");
        const cls = /否决|SUPERSEDED/i.test(t) ? "pill danger" : "pill";
        return `<span class="${cls}">${esc(t.slice(0, 48))}</span>`;
      })
      .join("");
  }

  const dive = msg.deep_dive;
  if (diveHost) {
    if (dive && (dive.thesis || dive.speak_script)) {
      diveHost.innerHTML = `<details class="cap-dive">
        <summary>▸ Deep Dive 口述支撑</summary>
        <div class="dive-body">
          <strong>${esc(dive.thesis || "")}</strong>
          <ul>${(dive.bullets || []).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
          <p>${esc(dive.speak_script || "")}</p>
        </div>
      </details>`;
    } else {
      diveHost.innerHTML = "";
    }
  }

  cardsEl.querySelectorAll(".card[data-copy]").forEach((card) => {
    card.onclick = (e) => {
      if (e.target.closest("button")) return;
      void copyText(card.getAttribute("data-copy"), card);
    };
  });
  cardsEl.querySelectorAll("[data-copy-btn]").forEach((btn) => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      await copyText(btn.getAttribute("data-copy-btn"), btn.closest(".card"));
    };
  });
  cardsEl.querySelectorAll("[data-speak]").forEach((btn) => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const text = btn.getAttribute("data-speak") || "";
      if (text) await window.bridge?.hostSpeak?.(text);
    };
  });
}

document.getElementById("btnHide").onclick = () => {
  window.bridge?.setCapsuleVisible?.(false);
};

collapseBtn?.addEventListener("click", () => {
  void setCollapsed(!collapsed);
});

modeBtn?.addEventListener("click", async () => {
  const next = mode === "manual" ? "auto" : "manual";
  const res = await window.bridge?.copilotSetMode?.(next);
  if (res?.ok) {
    mode = res.mode;
    modeBtn.textContent = mode === "manual" ? "Manual" : "Auto";
  }
});

askBtn?.addEventListener("click", async () => {
  metaEl.textContent = "生成建议中…";
  const now = Date.now();
  const lines = recentLines.filter((l) => now - l.at <= 60 * 1000);
  const use = lines.length ? lines : recentLines.slice(-12);
  const transcript = use
    .filter((l) => l.speaker !== "我")
    .map((l) => `${l.speaker}: ${l.text}`)
    .join("\n");
  if (!transcript.trim()) {
    // 无本地缓存时仍广播，让主窗用其转写兜底
    await window.bridge?.copilotPushAsk?.({ reason: "capsule-ask" });
    return;
  }
  try {
    await window.bridge?.strategyEvaluate?.({
      transcript,
      reason: "capsule-ask",
      forceCopilot: true
    });
  } catch (_) {
    await window.bridge?.copilotPushAsk?.({ reason: "capsule-ask" });
  }
});

recapBtn?.addEventListener("click", async () => {
  if (collapsed) await setCollapsed(false);
  const now = Date.now();
  const lines = recentLines.filter((l) => now - l.at <= 5 * 60 * 1000);
  const use = lines.length ? lines : recentLines.slice(-20);
  const transcript = use.map((l) => `${l.speaker}: ${l.text}`).join("\n");
  if (!transcript.trim()) {
    if (recapDrawer) {
      recapDrawer.classList.add("show");
      recapDrawer.textContent = "近窗无转写，无法速览";
    }
    return;
  }
  const res = await window.bridge?.copilotCatchMeUp?.({
    transcript,
    windowMs: 5 * 60 * 1000
  });
  if (recapDrawer) {
    recapDrawer.classList.add("show");
    if (res?.ok) {
      const parts = [
        `议题：${res.current_topic || "—"}`,
        res.disagreements?.length
          ? `分歧：${res.disagreements.slice(0, 2).join("；")}`
          : "分歧：暂无",
        res.pending_decisions?.length
          ? `待拍板：${res.pending_decisions.slice(0, 2).join("；")}`
          : "待拍板：暂无"
      ];
      recapDrawer.textContent = parts.join("\n");
    } else {
      recapDrawer.textContent = res?.error || "速览失败";
    }
  }
});

void window.bridge?.copilotGetMode?.().then((r) => {
  if (r?.mode) {
    mode = r.mode;
    if (modeBtn) modeBtn.textContent = mode === "manual" ? "Manual" : "Auto";
  }
});

void window.bridge?.getCapsuleCollapsed?.().then((r) => {
  if (r?.ok) {
    collapsed = Boolean(r.collapsed);
    applyCollapsedUi();
  }
});

if (window.bridge?.onEvent) {
  window.bridge.onEvent((msg) => {
    if (msg.type === "smart-replies") renderPacket(msg);
    else if (msg.type === "copilot-mode" && msg.mode) {
      mode = msg.mode;
      if (modeBtn) modeBtn.textContent = mode === "manual" ? "Manual" : "Auto";
    } else if (msg.type === "capsule-collapsed") {
      collapsed = Boolean(msg.collapsed);
      applyCollapsedUi();
    } else if (msg.type === "asr" && msg.final) {
      const role = msg.role === "me" ? "me" : "others";
      pushLine(role, msg.text);
      setLiveText(`${role === "me" ? "Me" : "Others"}: ${msg.text}`);
    } else if (msg.type === "listen-ready") {
      metaEl.textContent = msg.ok ? "听会中" : "听会失败";
      liveDot?.classList.toggle("live", Boolean(msg.ok));
      liveDot?.classList.remove("speak");
    } else if (msg.type === "host-speaking") {
      pushLine("host", msg.text);
      setLiveText(`Host: ${msg.text}`);
      liveDot?.classList.add("speak");
      liveDot?.classList.remove("live");
    } else if (msg.type === "host-speak-end" || msg.type === "tts-end") {
      liveDot?.classList.remove("speak");
      liveDot?.classList.add("live");
    }
  });
}

applyCollapsedUi();
