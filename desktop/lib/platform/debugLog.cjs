/**
 * Desktop debug logger — UTF-8 file + console + UI.
 * 控制台默认 Unicode/UTF-8；旧 GBK cmd 设 ECE_CONSOLE_GBK=1。
 */
const fs = require("fs");
const path = require("path");

const MAX_MEMORY = 1200;
const memory = [];
let logDir = null;
let logFile = null;
let uiSink = null;
let fileReady = false;
const skipWarnBucket = new Map();

/** desktop/ 根目录（本文件在 lib/platform/） */
const DESKTOP_ROOT = path.join(__dirname, "..", "..");

function electronApp() {
  if (!process.versions?.electron) return null;
  try {
    const { app } = require("electron");
    return app || null;
  } catch (_) {
    return null;
  }
}

let iconv = null;
try {
  iconv = require("iconv-lite");
} catch (_) {
  iconv = null;
}

function ensureUtf8Console() {
  try {
    if (process.platform === "win32") {
      // 父进程 cmd 常为 GBK；文件仍写 UTF-8，控制台改写 GBK 避免乱码
      if (process.stdout?.setDefaultEncoding) process.stdout.setDefaultEncoding("utf8");
      if (process.stderr?.setDefaultEncoding) process.stderr.setDefaultEncoding("utf8");
    }
  } catch (_) {}
}

function writeConsoleLine(line, level) {
  // 默认走 console（Windows 控制台用 Unicode，管道/Cursor 终端用 UTF-8）。
  // 仅旧版 GBK cmd 需要 ECE_CONSOLE_GBK=1。
  if (process.platform === "win32" && process.env.ECE_CONSOLE_GBK === "1" && iconv) {
    try {
      const buf = iconv.encode(line + "\n", "gbk");
      const stream = level === "ERROR" ? process.stderr : process.stdout;
      if (stream?.writable) {
        stream.write(buf);
        return;
      }
    } catch (_) {}
  }
  const consoleFn =
    level === "ERROR" ? console.error : level === "WARN" ? console.warn : console.log;
  consoleFn(line);
}

function ensurePaths() {
  if (logFile) return;
  try {
    const app = electronApp();
    if (app?.getPath) {
      logDir = path.join(app.getPath("userData"), "logs");
    } else {
      logDir = path.join(DESKTOP_ROOT, "logs");
    }
    fs.mkdirSync(logDir, { recursive: true });
    const day = new Date().toISOString().slice(0, 10);
    logFile = path.join(logDir, `bridge-${day}.log`);
    // 同步一份到项目 desktop/logs，方便在仓库旁直接打开调试
    try {
      const projectLogs = path.join(DESKTOP_ROOT, "logs");
      fs.mkdirSync(projectLogs, { recursive: true });
      const mirror = path.join(projectLogs, `bridge-${day}.log`);
      if (!fs.existsSync(mirror) || fs.statSync(mirror).size === 0) {
        fs.writeFileSync(mirror, "\uFEFF", { encoding: "utf8" });
      }
      // store mirror path on module for dual-write
      ensurePaths._mirror = mirror;
    } catch (_) {}
  } catch (err) {
    logDir = path.join(DESKTOP_ROOT, "logs");
    fs.mkdirSync(logDir, { recursive: true });
    logFile = path.join(logDir, `bridge-fallback.log`);
    console.warn("[debugLog] fallback path", String(err?.message || err));
  }
}

function ensureFileBom() {
  ensurePaths();
  if (fileReady) return;
  try {
    if (!fs.existsSync(logFile) || fs.statSync(logFile).size === 0) {
      fs.writeFileSync(logFile, "\uFEFF", { encoding: "utf8" });
    }
    fileReady = true;
  } catch (err) {
    console.warn("[debugLog] bom write failed", String(err?.message || err));
  }
}

function stamp() {
  return new Date().toISOString();
}

function normalizeError(err) {
  if (err == null) return undefined;
  if (typeof err === "string") return err;
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack?.split("\n").slice(0, 6) };
  }
  if (typeof err === "object") {
    try {
      return JSON.parse(
        JSON.stringify(err, (_k, v) => {
          if (typeof v === "string" && v.length > 800) return v.slice(0, 400) + `…(+${v.length - 400})`;
          return v;
        })
      );
    } catch {
      return { message: String(err) };
    }
  }
  return String(err);
}

function safeDetail(detail) {
  if (detail == null) return undefined;
  if (typeof detail === "string") return detail.slice(0, 2000);
  if (detail instanceof Error) return normalizeError(detail);
  try {
    return JSON.parse(
      JSON.stringify(detail, (_k, v) => {
        if (v instanceof Error) return normalizeError(v);
        if (typeof v === "string" && v.length > 500) return v.slice(0, 200) + `…(+${v.length - 200})`;
        if (_k && /key|token|secret|authorization/i.test(String(_k))) return "***";
        return v;
      })
    );
  } catch {
    return { raw: String(detail).slice(0, 500) };
  }
}

function rateLimited(key, ms = 5000) {
  const now = Date.now();
  const last = skipWarnBucket.get(key) || 0;
  if (now - last < ms) return true;
  skipWarnBucket.set(key, now);
  return false;
}

/**
 * @param {"DEBUG"|"INFO"|"WARN"|"ERROR"} level
 * @param {string} tag
 * @param {string} message
 * @param {any} [detail]
 */
function write(level, tag, message, detail, opts = {}) {
  if (opts.rateKey && rateLimited(opts.rateKey, opts.rateMs || 5000)) {
    return null;
  }

  ensureFileBom();
  const entry = {
    ts: stamp(),
    level,
    tag,
    message: String(message || ""),
    detail: safeDetail(detail)
  };
  memory.push(entry);
  if (memory.length > MAX_MEMORY) memory.splice(0, memory.length - MAX_MEMORY);

  let detailStr = "";
  if (entry.detail !== undefined) {
    try {
      detailStr = " | " + JSON.stringify(entry.detail, null, 0);
    } catch {
      detailStr = " | [detail]";
    }
  }
  const line = `[${entry.ts}] [${level}] [${tag}] ${entry.message}${detailStr}`;

  writeConsoleLine(line, level);

  try {
    fs.appendFileSync(logFile, line + "\n", { encoding: "utf8" });
    if (ensurePaths._mirror) {
      fs.appendFileSync(ensurePaths._mirror, line + "\n", { encoding: "utf8" });
    }
  } catch (err) {
    console.warn("[debugLog] append failed", String(err?.message || err));
  }

  try {
    uiSink?.(entry);
  } catch (_) {}

  return entry;
}

ensureUtf8Console();

const debugLog = {
  debug: (tag, msg, d, opts) => write("DEBUG", tag, msg, d, opts),
  info: (tag, msg, d, opts) => write("INFO", tag, msg, d, opts),
  warn: (tag, msg, d, opts) => write("WARN", tag, msg, d, opts),
  error: (tag, msg, d, opts) => write("ERROR", tag, msg, d, opts),
  setUiSink: (fn) => {
    uiSink = fn;
  },
  getFilePath: () => {
    ensureFileBom();
    return logFile;
  },
  getDir: () => {
    ensurePaths();
    return logDir;
  },
  recent: (n = 300) => memory.slice(-(n || 300)),
  clearMemory: () => {
    memory.length = 0;
  },
  normalizeError
};

module.exports = { debugLog };
