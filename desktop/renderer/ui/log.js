import { $ } from "../state.js";

export function formatDetail(detail) {
  if (detail == null) return "";
  if (typeof detail === "string") return detail.slice(0, 400);
  try {
    return JSON.stringify(detail).slice(0, 400);
  } catch {
    return String(detail).slice(0, 200);
  }
}

export function appendLogLine(level, tag, message, detail) {
  const el = $("log");
  if (!el) return;
  const t = new Date().toLocaleTimeString();
  const det = detail !== undefined ? " " + formatDetail(detail) : "";
  const color =
    level === "ERROR" ? "#f87171" : level === "WARN" ? "#fbbf24" : level === "DEBUG" ? "#64748b" : "#cbd5e1";
  const line = document.createElement("div");
  line.style.color = color;
  line.textContent = `[${t}] [${level}] [${tag}] ${String(message || "")}${det}`;
  el.insertBefore(line, el.firstChild);
  while (el.childNodes.length > 500) el.removeChild(el.lastChild);
}

export function slog(level, tag, message, detail) {
  appendLogLine(level, tag, message, detail);
  try {
    window.bridge?.logUi?.(level, tag, message, detail);
  } catch (_) {}
}

export function log(message, detail) {
  slog("INFO", "UI", message, detail);
}
