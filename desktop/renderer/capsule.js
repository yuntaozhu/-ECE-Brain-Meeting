/**
 * 悬浮胶囊：只展示 smart-replies / 短转写，不做策略。
 */
const cardsEl = document.getElementById("cards");
const metaEl = document.getElementById("meta");
const liveEl = document.getElementById("live");

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPacket(msg) {
  if (!msg?.should_trigger || !msg.suggestions) {
    cardsEl.innerHTML = `<p class="empty">未触发建议 · ${esc(msg?.category || "等待会场")}</p>`;
    metaEl.textContent = msg?.segment ? String(msg.segment).slice(0, 28) : "待命";
    return;
  }
  metaEl.textContent = `${msg.urgency || ""} · ${msg.category || ""}`.trim();
  const s = msg.suggestions;
  const labels = msg.labels || {};
  cardsEl.innerHTML = ["push_forward", "push_back", "counter_inquiry"]
    .map((k) => {
      const text = s[k];
      if (!text) return "";
      return `<article class="card">
        <header>${esc(labels[k] || k)}</header>
        <p>${esc(text)}</p>
        <div class="row">
          <button type="button" data-copy="${esc(text)}">复制</button>
          <button type="button" data-speak="${esc(text)}">试播</button>
        </div>
      </article>`;
    })
    .join("");

  cardsEl.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(btn.getAttribute("data-copy") || "");
      } catch (_) {}
    };
  });
  cardsEl.querySelectorAll("[data-speak]").forEach((btn) => {
    btn.onclick = async () => {
      const text = btn.getAttribute("data-speak") || "";
      if (text) await window.bridge?.hostSpeak?.(text);
    };
  });
}

document.getElementById("btnHide").onclick = () => {
  window.bridge?.setCapsuleVisible?.(false);
};

if (window.bridge?.onEvent) {
  window.bridge.onEvent((msg) => {
    if (msg.type === "smart-replies") renderPacket(msg);
    else if (msg.type === "asr" && msg.final) {
      const role = msg.role === "me" ? "Me" : "Others";
      liveEl.textContent = `${role}: ${String(msg.text || "").slice(0, 64)}`;
    } else if (msg.type === "listen-ready") {
      metaEl.textContent = msg.ok ? "听会中" : "听会失败";
    } else if (msg.type === "host-speaking") {
      liveEl.textContent = `Host: ${String(msg.text || "").slice(0, 48)}`;
    }
  });
}
