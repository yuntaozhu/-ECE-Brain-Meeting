import { $ } from "../state.js";

/**
 * Agent 工作台：展示 MeetingAgent 结构化步骤（兼容旧 sender/target/action）
 */
export function renderA2a(events) {
  if (!events?.length) {
    $("a2a").textContent = "尚无 Agent 步骤";
    return;
  }
  const lines = events
    .slice()
    .reverse()
    .map((e) => {
      const role = e.role || e.sender || "?";
      const action = e.action || "?";
      const summary = e.summary || "";
      const run = e.runId ? ` · ${String(e.runId).slice(-8)}` : "";
      if (summary) return `${role} · ${action}${run}\n  ${summary}`;
      const legacy = e.target ? ` → ${e.target}` : "";
      return `${role}${legacy}: ${action}${run}`;
    });
  $("a2a").textContent = lines.join("\n\n");
}

export function renderTodos(todos) {
  $("todos").innerHTML = "";
  (todos || []).forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t;
    $("todos").appendChild(li);
  });
}

export function renderArch() {
  $("archBox").textContent = `
腾讯会议 · 主持人/远端           腾讯会议 · AI 账号                 本 EXE
远端发言 → AI 扬声器=CABLE In ──────────────────────────────→ ① Others 采集 → ASR[Others] → 策略/建议卡
本机操作员真麦 ─────────────────────────────────────────────→ ①b Me 采集 → ASR[Me]（口令/标定）
                              AI 麦=CABLE Out ←────────────── ② Host TTS 播放
环路驱动：VB-Cable（默认）| 系统内录 displayMedia（实验）
悬浮胶囊：置顶扫视 Option A/B/C；Ctrl+Shift+H 隐藏；Alt+Z Push-to-Ask；Alt+Shift+Z Auto/Manual
`.trim();
}
