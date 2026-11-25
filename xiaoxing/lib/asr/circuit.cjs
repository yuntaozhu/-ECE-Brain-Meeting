"use strict";

/**
 * ASR 网络错误熔断：DNS/超时连续失败后拉长退避，避免 ERROR 刷屏
 */

const NETWORK_CODES = new Set([
  "connect_timeout",
  "socket_error",
  "handshake_502",
  "handshake_503",
  "handshake_504"
]);

function isNetworkFailure(err) {
  if (!err) return false;
  const code = String(err.code || "");
  const msg = String(err.message || "");
  if (NETWORK_CODES.has(code)) return true;
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|connect_timeout/i.test(msg)) {
    return true;
  }
  if (/handshake_5\d\d/.test(code)) return true;
  return false;
}

function classifyError(err) {
  const code = String(err?.code || "unknown");
  const msg = String(err?.message || "");
  if (/ENOTFOUND/i.test(msg)) return "dns";
  if (code === "connect_timeout" || /ETIMEDOUT/i.test(msg)) return "timeout";
  if (/ECONNREFUSED/i.test(msg)) return "refused";
  if (code === "missing_speech_key") return "config";
  if (code === "asr_server") return "server";
  if (isNetworkFailure(err)) return "network";
  return "other";
}

/**
 * @param {{ failThreshold?: number, baseBackoffMs?: number, maxBackoffMs?: number }} [opts]
 */
function createAsrCircuit(opts = {}) {
  const failThreshold = opts.failThreshold ?? 3;
  const baseBackoffMs = opts.baseBackoffMs ?? 30000;
  const maxBackoffMs = opts.maxBackoffMs ?? 120000;

  let failCount = 0;
  let openUntil = 0;
  let suppressed = 0;
  let lastErr = null;
  let lastClass = null;

  function now() {
    return Date.now();
  }

  function isOpen() {
    return now() < openUntil;
  }

  function remainingMs() {
    return Math.max(0, openUntil - now());
  }

  function reset() {
    failCount = 0;
    openUntil = 0;
    suppressed = 0;
    lastErr = null;
    lastClass = null;
  }

  function onSuccess() {
    const wasOpen = isOpen() || failCount > 0;
    reset();
    return { recovered: wasOpen };
  }

  /**
   * @returns {{ emit: boolean, level: 'error'|'warn'|'info', payload: object, reconnectDelayMs: number }}
   */
  function onFailure(err) {
    lastErr = err;
    lastClass = classifyError(err);
    const network = isNetworkFailure(err);

    if (!network) {
      // 配置/服务端错误不拉长熔断，但仍记一次
      return {
        emit: true,
        level: "error",
        payload: {
          ...normalize(err),
          class: lastClass,
          failCount,
          circuit: "bypass"
        },
        reconnectDelayMs: 2000
      };
    }

    failCount += 1;

    if (isOpen()) {
      suppressed += 1;
      const emit = suppressed === 1 || suppressed % 10 === 0;
      return {
        emit,
        level: "warn",
        payload: {
          code: "circuit_hold",
          message: `ASR 熔断中（${lastClass}）`,
          class: lastClass,
          suppressed,
          failCount,
          openUntil,
          remainingMs: remainingMs(),
          last: normalize(err)
        },
        reconnectDelayMs: remainingMs() || baseBackoffMs
      };
    }

    if (failCount >= failThreshold) {
      const exp = Math.min(
        maxBackoffMs,
        baseBackoffMs * Math.pow(2, Math.max(0, failCount - failThreshold))
      );
      openUntil = now() + exp;
      suppressed = 0;
      return {
        emit: true,
        level: "error",
        payload: {
          code: "circuit_open",
          message: `ASR 熔断开启 ${Math.round(exp / 1000)}s（${lastClass}）`,
          class: lastClass,
          failCount,
          backoffMs: exp,
          openUntil,
          last: normalize(err)
        },
        reconnectDelayMs: exp
      };
    }

    return {
      emit: true,
      level: "error",
      payload: {
        ...normalize(err),
        class: lastClass,
        failCount,
        threshold: failThreshold,
        circuit: "counting"
      },
      reconnectDelayMs: Math.min(8000, 1500 * failCount)
    };
  }

  function snapshot() {
    return {
      failCount,
      open: isOpen(),
      openUntil,
      remainingMs: remainingMs(),
      suppressed,
      lastClass,
      last: lastErr ? normalize(lastErr) : null
    };
  }

  return {
    isNetworkFailure,
    classifyError,
    isOpen,
    remainingMs,
    onSuccess,
    onFailure,
    reset,
    snapshot
  };
}

function normalize(err) {
  if (!err || typeof err !== "object") return { message: String(err || "") };
  return {
    code: err.code || null,
    message: String(err.message || "").slice(0, 200)
  };
}

module.exports = {
  createAsrCircuit,
  isNetworkFailure,
  classifyError,
  NETWORK_CODES
};
