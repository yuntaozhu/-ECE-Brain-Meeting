import { $, S } from "../state.js";

export function setThinkingUi(on, label) {
  S.thinkingUi = !!on;
  const chip = $("chipThinking");
  if (chip) {
    chip.classList.toggle("on", S.thinkingUi);
    chip.classList.toggle("warn", S.thinkingUi);
    chip.textContent = S.thinkingUi ? label || "思考中" : "思考中";
  }
  renderDuplexStats();
}

export function renderDuplexStats() {
  const el = $("duplexStats");
  if (!el) return;
  const holdLeft = Math.max(0, S.holdUntil - Date.now());
  const cdLeft = Math.max(0, S.cooldownUntil - Date.now());
  const q = S.pendingPatrolReason ? " · 排队 1 问" : "";
  const th = S.thinkingUi ? " · 思考中" : S.patrolInFlight ? " · 巡检中" : "";
  el.textContent = `会阶 ${S.meetingLifeLabel || S.meetingLifeUi} · 大智: ${S.interactionModeLabel || S.interactionModeUi} · 听写 ${S.duplexPhase} · hold ${Math.ceil(
    holdLeft / 1000
  )}s · cool ${Math.ceil(cdLeft / 1000)}s · 回灌丢弃 ${S.echoDiscardCount} · 采纳 ${S.asrAcceptedCount} · 抑制播报 ${S.suppressSpeakCount}${th}${q}`;
  el.className =
    "status " +
    (S.thinkingUi ||
    S.pendingPatrolReason ||
    S.meetingLifeUi === "OPENING" ||
    S.meetingLifeUi === "CLOSING" ||
    S.meetingLifeUi === "HOLD" ||
    S.interactionModeUi === "HA_ASK" ||
    S.interactionModeUi === "HA_TALK" ||
    S.interactionModeUi === "HA_BIZ"
      ? "warn"
      : S.duplexPhase === "IDLE"
        ? "ok"
        : "warn");
  const chip = $("chipAgentMode");
  if (chip) {
    chip.textContent = S.interactionModeLabel || S.interactionModeUi || "模式";
    chip.classList.toggle("on", true);
    chip.classList.toggle(
      "warn",
      S.interactionModeUi === "HA_ASK" ||
        S.interactionModeUi === "HA_TALK" ||
        S.interactionModeUi === "HA_BIZ" ||
        S.interactionModeUi === "HH_SUM"
    );
    chip.classList.toggle("good", S.interactionModeUi === "HH" || S.interactionModeUi === "IDLE_LISTEN");
  }
  const lifeChip = $("chipMeetingLife");
  if (lifeChip) {
    const duplexHint =
      S.duplexPhase === "SPEAKING"
        ? "播报中"
        : S.meetingLifeUi === "HOLD" || S.agentHoldListening
          ? "占麦中"
          : S.meetingLifeLabel || S.meetingLifeUi || "会阶";
    lifeChip.textContent =
      S.duplexPhase === "SPEAKING" && S.meetingLifeUi !== "CLOSING" && S.meetingLifeUi !== "OPENING"
        ? `播报 · ${S.meetingLifeLabel || S.meetingLifeUi}`
        : duplexHint === "占麦中"
          ? "占麦中"
          : S.meetingLifeLabel || S.meetingLifeUi || "会阶";
    lifeChip.classList.toggle("on", true);
    lifeChip.classList.toggle(
      "warn",
      S.meetingLifeUi === "OPENING" ||
        S.meetingLifeUi === "CLOSING" ||
        S.meetingLifeUi === "HOLD" ||
        S.meetingLifeUi === "SUMMARY" ||
        S.duplexPhase === "SPEAKING"
    );
    lifeChip.classList.toggle(
      "good",
      S.meetingLifeUi === "SILENT" || S.meetingLifeUi === "OFF"
    );
  }
}

export function showAlert(text, kind) {
  const el = $("alertBanner");
  if (!el) return;
  if (!text) {
    el.style.display = "none";
    el.textContent = "";
    return;
  }
  el.style.display = "block";
  el.textContent = text;
  el.className = "status " + (kind || "warn");
  if (kind === "bad") {
    el.style.borderColor = "#f87171";
    el.style.background = "#450a0a";
    el.style.color = "#fecaca";
  } else if (kind === "ok") {
    el.style.borderColor = "#4ade80";
    el.style.background = "#052e16";
    el.style.color = "#bbf7d0";
  } else {
    el.style.borderColor = "#f59e0b";
    el.style.background = "#422006";
    el.style.color = "#fde68a";
  }
}

export function setStatus(text, kind) {
  $("status").textContent = text;
  $("status").className = "status " + (kind || "warn");
}

export function setChip(id, on, extra) {
  const el = $(id);
  el.classList.toggle("on", !!on);
  if (extra === "good") {
    el.classList.add("good");
    el.classList.remove("bad");
  } else if (extra === "bad") {
    el.classList.add("bad");
    el.classList.remove("good");
  } else if (!on) {
    el.classList.remove("good", "bad");
  }
}
