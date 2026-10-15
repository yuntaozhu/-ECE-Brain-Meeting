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
腾讯会议 · 主持人账号          腾讯会议 · AI 专家账号              本 EXE（AI 大脑）
真麦克风 / 真音箱              扬声器 → 虚拟音频输出 ───────────→ ① 采集（听会 ASR）
                              麦克风 ← 虚拟麦克风   ←─────────── ② 播放（仅 Host TTS）
                                    ↑ 电脑内部数字环路，无外接线 ↑
驱动：VB-Cable / VoiceMeeter / 微软 SysVAD 类 Virtual Audio Device
`.trim();
}
