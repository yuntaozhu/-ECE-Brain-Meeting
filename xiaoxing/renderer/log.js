/**
 * 小星系统日志 UI（与对话气泡 #log 分离）
 * 对照大智 renderer/ui/log.js 独立落地
 */
(function (global) {
  function formatDetail(detail) {
    if (detail == null) return "";
    if (typeof detail === "string") return detail.slice(0, 400);
    try {
      return JSON.stringify(detail).slice(0, 400);
    } catch {
      return String(detail).slice(0, 200);
    }
  }

  function appendSysLogLine(level, tag, message, detail) {
    const el = document.getElementById("sysLog");
    if (!el) return;
    const t = new Date().toLocaleTimeString();
    const det = detail !== undefined ? " " + formatDetail(detail) : "";
    const color =
      level === "ERROR"
        ? "#f87171"
        : level === "WARN"
          ? "#fbbf24"
          : level === "DEBUG"
            ? "#64748b"
            : "#a5d6a7";
    const line = document.createElement("div");
    line.className = "sys-log-line";
    line.style.color = color;
    line.textContent = `[${t}] [${level}] [${tag}] ${String(message || "")}${det}`;
    el.insertBefore(line, el.firstChild);
    while (el.childNodes.length > 400) el.removeChild(el.lastChild);
  }

  function slog(level, tag, message, detail) {
    appendSysLogLine(level, tag, message, detail);
    try {
      window.xiaoxing?.logUi?.(level, tag, message, detail);
    } catch (_) {}
  }

  global.XiaoxingLog = {
    appendSysLogLine,
    slog,
    formatDetail
  };
})(window);
