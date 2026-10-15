import { $, S } from "../state.js";

export function renderTranscript() {
  const finals = S.transcriptLines.map((l) => `${l.speaker}: ${l.text}`).join("\n");
  const live = S.partialAsr ? `\n会场(识别中): ${S.partialAsr}` : "";
  $("transcript").textContent = (finals || "（等待会场发言…）") + live;
  const stats = $("asrStats");
  if (stats) {
    stats.textContent = S.listening
      ? `已确认句 ${S.asrFinalCount} · 中间结果 ${S.asrDeltaCount} · ${
          S.partialAsr ? "正在识别…" : "等待下一句"
        }`
      : "启动听会后，此处显示实时转写（含中间结果）";
    stats.className = "status " + (S.asrFinalCount > 0 ? "ok" : "warn");
  }
}
