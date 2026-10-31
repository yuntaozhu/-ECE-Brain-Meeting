import { $, S } from "../state.js";

function speakerTag(line) {
  const s = String(line?.speaker || "");
  const role = String(line?.role || "").toLowerCase();
  if (role === "me" || /^我$/.test(s)) return "我[Me]";
  if (/大智|Host|AI/i.test(s)) return `${s}[Host]`;
  if (/会场|Others|Remote/i.test(s) || role === "others") return "会场[Others]";
  return s || "会场[Others]";
}

export function renderTranscript() {
  const finals = S.transcriptLines.map((l) => `${speakerTag(l)}: ${l.text}`).join("\n");
  const liveOthers = S.partialAsr ? `\n会场[Others](识别中): ${S.partialAsr}` : "";
  const liveMe = S.partialAsrMe ? `\n我[Me](识别中): ${S.partialAsrMe}` : "";
  $("transcript").textContent = (finals || "（等待会场发言…）") + liveOthers + liveMe;
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
