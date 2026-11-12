/**
 * Host 独立 TTS — 不走 dialog 下行。
 *
 * HOST_TTS_MODE=independent：独立单向流式合成，消费 seed-tts-2.0 字符额度，
 * 不与 Dialog / Seeduplex 共享配额桶。
 *
 * text_words_lifetime：字符总量额度（资源包字数 / 后付费），不是并发、不是 QPS、不是日限额。
 * 换 Key / 换应用 / 换 speaker 都不能重置该额度，须在控制台补资源包或开通后付费；
 * 配置生效通常延迟 5–10 分钟。不要对 lifetime 配额错误重试。
 *
 * HTTP：POST https://openspeech.bytedance.com/api/v3/tts/unidirectional
 * 鉴权（默认新版）：仅 X-Api-Key + X-Api-Resource-Id=seed-tts-2.0
 * 旧版（DOUBAO_TTS_LEGACY_AUTH=1）：X-Api-App-Id + X-Api-Access-Key + Resource-Id，勿再带 X-Api-Key
 * 禁止新/旧字段混用（曾导致 Forbidden）。
 */
const https = require("https");
const { randomUUID } = require("crypto");
const { EventEmitter } = require("events");
const { debugLog } = require("../platform");

const TTS_URL = "https://openspeech.bytedance.com/api/v3/tts/unidirectional";
const TTS_RESOURCE_DEFAULT = "seed-tts-2.0";
/** seed-tts-2.0 常用 2.0 音色；jupiter 多为 dialog，勿直接当 2.0 speaker */
const TTS_VOICE_DEFAULT = "zh_female_vv_uranus_bigtts";
const TEXT_MAX_DEFAULT = 1000;
const CONNECT_TIMEOUT_MS = 3000;
const FIRST_PACKET_TIMEOUT_MS = 10000;
const TOTAL_TIMEOUT_FLOOR_MS = 15000;
/** 估算合成总时长：约 200 字/秒 */
const CHARS_PER_SEC = 200;

const CONCURRENCY_BACKOFF_MS = [100, 300, 1000];
const SERVER_BACKOFF_MS = [200, 600];
const LIFETIME_WINDOW_MS = 5 * 60 * 1000;
const LIFETIME_TRIP_COUNT = 3;
const BREAKER_OPEN_MS = 10 * 60 * 1000;

const ttsEvents = new EventEmitter();
ttsEvents.setMaxListeners(20);

/** @type {{ openUntil: number, lifetimeHits: number[] }} */
const breaker = { openUntil: 0, lifetimeHits: [] };

const metrics = {
  tts_requests_total: {
    success: 0,
    quota_words: 0,
    quota_concurrency: 0,
    bad_request: 0,
    server_error: 0,
    timeout: 0,
    circuit_open: 0,
    aborted: 0,
    config_error: 0
  },
  tts_durations_ms: { count: 0, sum: 0, max: 0 },
  tts_first_packet_ms: { count: 0, sum: 0, max: 0 },
  tts_billed_chars_total: 0
};

function maskSecret(s) {
  const t = String(s || "");
  if (t.length <= 8) return t ? "****" : "(empty)";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(Object.assign(new Error("aborted"), { code: "aborted" }));
      return;
    }
    const timer = setTimeout(resolve, ms);
    if (!signal) return;
    const onAbort = () => {
      clearTimeout(timer);
      reject(Object.assign(new Error("aborted"), { code: "aborted" }));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function observeHist(bucket, value) {
  if (!Number.isFinite(value) || value < 0) return;
  bucket.count += 1;
  bucket.sum += value;
  if (value > bucket.max) bucket.max = value;
}

function incResult(result) {
  if (metrics.tts_requests_total[result] == null) {
    metrics.tts_requests_total[result] = 0;
  }
  metrics.tts_requests_total[result] += 1;
}

/** @param {object} p */
function makeTtsError(p) {
  const message = String(p.message || p.statusText || "tts_error");
  const lower = message.toLowerCase();
  let isQuota = false;
  /** @type {"text_words_lifetime"|"concurrency"|"other"|null} */
  let quotaType = null;
  let retriable = Boolean(p.retriable);
  let businessCode = p.businessCode || undefined;

  if (/quota exceeded for types:\s*text_words_lifetime/i.test(message)) {
    isQuota = true;
    quotaType = "text_words_lifetime";
    retriable = false;
    businessCode = "TTS_QUOTA_EXHAUSTED";
  } else if (/quota exceeded for types:\s*concurrency/i.test(message)) {
    isQuota = true;
    quotaType = "concurrency";
    retriable = true;
    businessCode = "TTS_QUOTA_CONCURRENCY";
  } else if (
    Number(p.httpStatus) === 401 ||
    Number(p.httpStatus) === 403 ||
    Number(p.code) === 45000030 ||
    /forbidden|unauthorized|not granted|requested resource/i.test(message)
  ) {
    // 独立 TTS 鉴权/资源未开通：与额度耗尽区分，勿自动重试
    retriable = false;
    businessCode = "TTS_AUTH_FORBIDDEN";
  } else if (Number(p.code) === 45000000 && /payload unmarshal/i.test(message)) {
    retriable = false;
    businessCode = "TTS_BAD_PAYLOAD";
  } else if ([45000001, 45002000, 45002001].includes(Number(p.code))) {
    retriable = false;
    businessCode = "TTS_BAD_SPEAKER_OR_TEXT";
  } else if (
    (Number(p.httpStatus) >= 500 && Number(p.httpStatus) < 600) ||
    Number(p.code) >= 55000000 ||
    /timeout|econnreset|enotfound|socket hang up|network/i.test(lower)
  ) {
    retriable = true;
    if (!businessCode) businessCode = "TTS_SERVER_OR_NETWORK";
  }

  return {
    httpStatus: p.httpStatus != null ? Number(p.httpStatus) : undefined,
    code: p.code != null && p.code !== "" ? Number(p.code) : undefined,
    message,
    logid: p.logid || undefined,
    isQuota,
    quotaType,
    retriable,
    businessCode,
    rawBodySnippet: p.rawBodySnippet
  };
}

function noteLifetimeQuota() {
  const now = Date.now();
  breaker.lifetimeHits = breaker.lifetimeHits.filter((t) => now - t < LIFETIME_WINDOW_MS);
  breaker.lifetimeHits.push(now);
  if (breaker.lifetimeHits.length >= LIFETIME_TRIP_COUNT) {
    breaker.openUntil = now + BREAKER_OPEN_MS;
    debugLog.error("HostTts", "TTS 熔断器打开：5 分钟内多次 text_words_lifetime，10 分钟内快速失败", {
      hits: breaker.lifetimeHits.length,
      openUntil: new Date(breaker.openUntil).toISOString()
    });
  }
}

function breakerIsOpen() {
  return Date.now() < breaker.openUntil;
}

function textMaxChars() {
  const n = Number(process.env.DOUBAO_TTS_TEXT_MAX || TEXT_MAX_DEFAULT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : TEXT_MAX_DEFAULT;
}

/**
 * 独立 TTS 用的 API Key。
 * 默认优先 DOUBAO_SPEECH_API_KEY（与 ASR 同源、已验证可调 seed-tts-2.0）。
 * 仅当 DOUBAO_TTS_USE_DEDICATED_KEY=1 时才优先 DOUBAO_TTS_API_KEY，
 * 避免 Shell/系统里残留的未授权 TTS Key 盖住可用 SPEECH Key（表现为 45000030 Forbidden）。
 */
function speechApiKey() {
  const dedicated = (process.env.DOUBAO_TTS_API_KEY || "").trim();
  const speech = (process.env.DOUBAO_SPEECH_API_KEY || "").trim();
  const realtime = (process.env.DOUBAO_REALTIME_API_KEY || "").trim();
  if (process.env.DOUBAO_TTS_USE_DEDICATED_KEY === "1") {
    return dedicated || speech || realtime;
  }
  return speech || dedicated || realtime;
}

/** 实际命中的 API Key 环境变量名（脱敏诊断用，不返回密钥）。 */
function speechApiKeySource() {
  const dedicated = (process.env.DOUBAO_TTS_API_KEY || "").trim();
  const speech = (process.env.DOUBAO_SPEECH_API_KEY || "").trim();
  const realtime = (process.env.DOUBAO_REALTIME_API_KEY || "").trim();
  if (process.env.DOUBAO_TTS_USE_DEDICATED_KEY === "1") {
    if (dedicated) return "DOUBAO_TTS_API_KEY";
    if (speech) return "DOUBAO_SPEECH_API_KEY";
    if (realtime) return "DOUBAO_REALTIME_API_KEY";
    return "(none)";
  }
  if (speech) return "DOUBAO_SPEECH_API_KEY";
  if (dedicated) return "DOUBAO_TTS_API_KEY";
  if (realtime) return "DOUBAO_REALTIME_API_KEY";
  return "(none)";
}

function speechAppId() {
  return (process.env.DOUBAO_SPEECH_APP_ID || process.env.DOUBAO_APP_ID || "").trim();
}

/** 旧版 AppID+AccessKey；默认关，避免与新版 X-Api-Key 混用被拒（对齐 ASR）。 */
function useLegacyTtsAuth() {
  return process.env.DOUBAO_TTS_LEGACY_AUTH === "1";
}

function ttsResourceId() {
  return (process.env.DOUBAO_TTS_RESOURCE_ID || TTS_RESOURCE_DEFAULT).trim();
}

/**
 * 组装独立 TTS HTTP 鉴权头：新/旧只保留一套。
 * @param {{ requestId?: string, includeContentType?: boolean, includeUsageControl?: boolean }} [opts]
 * @returns {{ headers: Record<string,string>, authMode: "x-api-key"|"legacy-app+access", resourceId: string, appIdUsed: string|null, keySource: string, headerNames: string[] }}
 */
function buildIndependentTtsAuthHeaders(opts = {}) {
  const apiKey = speechApiKey();
  const resourceId = ttsResourceId();
  const requestId = opts.requestId || randomUUID();
  const legacy = useLegacyTtsAuth();
  const appId = speechAppId();
  /** @type {Record<string, string>} */
  const headers = {};
  if (opts.includeContentType !== false) {
    headers["Content-Type"] = "application/json";
  }
  headers["X-Api-Resource-Id"] = resourceId;
  headers["X-Api-Request-Id"] = requestId;
  if (opts.includeUsageControl !== false) {
    headers["X-Control-Require-Usage-Tokens-Return"] = "*";
  }

  let authMode = "x-api-key";
  let appIdUsed = null;
  if (legacy) {
    authMode = "legacy-app+access";
    headers["X-Api-Access-Key"] = apiKey;
    if (appId && /^\d{6,}$/.test(appId)) {
      headers["X-Api-App-Id"] = appId;
      appIdUsed = appId;
    }
  } else {
    headers["X-Api-Key"] = apiKey;
    // 新版禁止附带 App-Id / Access-Key，即使 .env 里有 DOUBAO_SPEECH_APP_ID
  }

  return {
    headers,
    authMode,
    resourceId,
    appIdUsed,
    keySource: speechApiKeySource(),
    requestId,
    headerNames: Object.keys(headers).sort()
  };
}

function ttsVoice() {
  const raw = (
    process.env.DOUBAO_TTS_SPEAKER ||
    process.env.DOUBAO_TTS_VOICE ||
    process.env.DOUBAO_DUPLEX_VOICE ||
    TTS_VOICE_DEFAULT
  ).trim();
  // dialog 的 jupiter 音色在 seed-tts-2.0 上常不可用，自动映射到 uranus
  if (/jupiter_bigtts$/i.test(raw)) {
    return raw.replace(/jupiter_bigtts$/i, "uranus_bigtts");
  }
  return raw || TTS_VOICE_DEFAULT;
}

function ttsSampleRate() {
  const n = Number(process.env.DOUBAO_TTS_SAMPLE_RATE || 24000);
  return Number.isFinite(n) && n > 0 ? n : 24000;
}

/**
 * HOST_TTS_MODE=independent：独立 TTS，消费 seed-tts-2.0 字符额度，不与 Dialog 共享。
 * USE_DIALOG_TTS=1 时强制 dialog（勿走本客户端配额桶）。
 */
function hostTtsMode() {
  if (process.env.USE_DIALOG_TTS === "1") return "dialog";
  const m = (process.env.HOST_TTS_MODE || "independent").trim().toLowerCase();
  return m === "dialog" ? "dialog" : "independent";
}

function rawHostTtsMode() {
  return String(process.env.HOST_TTS_MODE ?? "").trim();
}

/**
 * 独立 TTS 启动/首次初始化 fail-fast。
 * @returns {{ ok: boolean, error?: string, config?: object }}
 */
function validateIndependentTtsConfig() {
  const rawMode = rawHostTtsMode();
  const modeNorm = rawMode.toLowerCase();
  if (process.env.USE_DIALOG_TTS === "1") {
    const msg =
      "HOST_TTS_MODE 必须为 independent，当前=dialog（USE_DIALOG_TTS=1）；独立 TTS 不能走 dialog 配额桶";
    debugLog.error("HostTts", `FATAL: ${msg}`);
    return { ok: false, error: msg };
  }
  if (modeNorm && modeNorm !== "independent") {
    const msg = `HOST_TTS_MODE 必须为 independent，当前=${rawMode}；独立 TTS 不能走 dialog 配额桶`;
    debugLog.error("HostTts", `FATAL: ${msg}`);
    return { ok: false, error: msg };
  }
  if (!modeNorm) {
    debugLog.info("HostTts", "HOST_TTS_MODE 未设置，缺省 independent（建议在 .env 显式写出）");
  }

  const apiKey = speechApiKey();
  const keySource = speechApiKeySource();
  if (!apiKey) {
    const msg =
      "DOUBAO_TTS_API_KEY / DOUBAO_SPEECH_API_KEY 为空，独立 TTS 无法鉴权";
    debugLog.error("HostTts", `FATAL: ${msg}`);
    return { ok: false, error: msg };
  }

  const resourceId = ttsResourceId();
  if (!resourceId) {
    const msg = "DOUBAO_TTS_RESOURCE_ID 为空";
    debugLog.error("HostTts", `FATAL: ${msg}`);
    return { ok: false, error: msg };
  }
  if (resourceId === "seed-tts-2.0") {
    debugLog.info(
      "HostTts",
      "resource_id=seed-tts-2.0：豆包语音合成模型 2.0 官方音色通道（字符额度 text_words_lifetime）"
    );
  }

  const speaker = ttsVoice();
  if (!speaker) {
    const msg = "DOUBAO_TTS_SPEAKER / DOUBAO_TTS_VOICE 为空";
    debugLog.error("HostTts", `FATAL: ${msg}`);
    return { ok: false, error: msg };
  }
  debugLog.info(
    "HostTts",
    "音色须为 seed-tts-2.0（2.0）音色 ID，勿使用 1.0 / dialog-jupiter 音色",
    { speaker }
  );

  const legacy = useLegacyTtsAuth();
  const appId = speechAppId();
  const ttsKey = (process.env.DOUBAO_TTS_API_KEY || "").trim();
  const speechKey = (process.env.DOUBAO_SPEECH_API_KEY || "").trim();
  const keysDiffer = Boolean(ttsKey && speechKey && ttsKey !== speechKey);
  if (keysDiffer) {
    const usingDedicated = process.env.DOUBAO_TTS_USE_DEDICATED_KEY === "1";
    debugLog.warn(
      "HostTts",
      usingDedicated
        ? "已启用 DOUBAO_TTS_USE_DEDICATED_KEY：正使用 DOUBAO_TTS_API_KEY；请确认该 Key 已开通 seed-tts-2.0 且与语音应用同属"
        : "检测到 DOUBAO_TTS_API_KEY 与 DOUBAO_SPEECH_API_KEY 不同：默认忽略专用 TTS Key，改用 SPEECH Key；若确需专用 Key，设 DOUBAO_TTS_USE_DEDICATED_KEY=1",
      {
        usingDedicated,
        keySource,
        ttsKeyLen: ttsKey.length,
        speechKeyLen: speechKey.length,
        ttsKeyTail: ttsKey.slice(-4),
        speechKeyTail: speechKey.slice(-4)
      }
    );
  }
  if (!legacy && appId) {
    debugLog.info(
      "HostTts",
      "新版鉴权忽略 DOUBAO_SPEECH_APP_ID（仅使用 X-Api-Key）；旧版请设 DOUBAO_TTS_LEGACY_AUTH=1",
      { appIdPresent: true, appIdLen: appId.length }
    );
  }
  if (legacy && !appId) {
    debugLog.warn(
      "HostTts",
      "DOUBAO_TTS_LEGACY_AUTH=1 但未设置 DOUBAO_SPEECH_APP_ID：旧版需要 AppId+AccessKey 成对"
    );
  }

  const sampleRate = ttsSampleRate();
  const config = {
    mode: "independent",
    auth_mode: legacy ? "legacy-app+access" : "x-api-key",
    resource_id: resourceId,
    speaker,
    sample_rate: sampleRate,
    api_key_source: keySource,
    api_key_masked: maskSecret(apiKey),
    app_id: legacy ? appId || "(none)" : "(ignored-new-auth)",
    keys_tts_vs_speech_differ: keysDiffer,
    text_max: textMaxChars()
  };
  debugLog.info("HostTts", "独立 TTS 配置已校验（已脱敏）", config);
  return { ok: true, config };
}

let validatedOnce = false;

function ensureIndependentTtsReady() {
  if (validatedOnce) {
    if (hostTtsMode() !== "independent") {
      return {
        ok: false,
        error: `HOST_TTS_MODE 必须为 independent，当前=${hostTtsMode()}；独立 TTS 不能走 dialog 配额桶`
      };
    }
    return { ok: true };
  }
  const v = validateIndependentTtsConfig();
  if (v.ok) validatedOnce = true;
  return v;
}

function totalTimeoutMs(textLen) {
  const byLen = Math.ceil(textLen / CHARS_PER_SEC) * 1000;
  return Math.max(TOTAL_TIMEOUT_FLOOR_MS, byLen + FIRST_PACKET_TIMEOUT_MS);
}

/**
 * 按标点分片，单片 ≤ maxLen。
 * @param {string} text
 * @param {number} maxLen
 */
function splitTextForTts(text, maxLen) {
  const t = String(text || "").trim();
  if (t.length <= maxLen) return [t];
  const parts = [];
  let rest = t;
  while (rest.length > maxLen) {
    let cut = -1;
    const window = rest.slice(0, maxLen);
    for (const sep of ["。", "！", "？", "；", "\n", ".", "!", "?", ";", "，", ","]) {
      const i = window.lastIndexOf(sep);
      if (i > maxLen * 0.4 && i > cut) cut = i + sep.length;
    }
    if (cut <= 0) cut = maxLen;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts.filter(Boolean);
}

function parseUsageChars(headers) {
  if (!headers || typeof headers !== "object") return undefined;
  const keys = Object.keys(headers);
  for (const k of keys) {
    const lk = k.toLowerCase();
    if (
      lk.includes("usage") ||
      lk.includes("billed") ||
      lk.includes("token") ||
      lk === "x-tt-logid"
    ) {
      // 优先找 usage / billed 数值头
      if (lk.includes("usage") || lk.includes("billed") || lk.includes("char")) {
        const n = Number(headers[k]);
        if (Number.isFinite(n) && n >= 0) return n;
      }
    }
  }
  // 部分网关把 usage 放在自定义头里以 JSON 字符串形式返回
  for (const k of keys) {
    const lk = k.toLowerCase();
    if (!lk.includes("usage") && !lk.includes("control")) continue;
    const raw = String(headers[k] || "");
    try {
      const j = JSON.parse(raw);
      const n = Number(j?.text_words ?? j?.billed_chars ?? j?.chars ?? j?.usage);
      if (Number.isFinite(n) && n >= 0) return n;
    } catch (_) {
      const m = raw.match(/(\d+)/);
      if (m) return Number(m[1]);
    }
  }
  return undefined;
}

function pickLogId(headers) {
  if (!headers) return "";
  return String(
    headers["x-tt-logid"] ||
      headers["X-Tt-Logid"] ||
      headers["x-request-id"] ||
      headers["X-Request-Id"] ||
      headers["request-id"] ||
      headers["Request-Id"] ||
      ""
  );
}

/**
 * 单次 HTTP 合成（无外层分片/熔断业务重试）。
 * @param {string} text
 * @param {{ onChunk?: (b64: string) => void, signal?: AbortSignal, format?: string, sampleRate?: number, voice?: string, resourceId?: string }} opts
 */
function synthesizeOnce(text, opts = {}) {
  const t = String(text || "").trim();
  const sampleRate = opts.sampleRate || ttsSampleRate();
  const format = opts.format || "pcm";
  const voice = opts.voice || ttsVoice();
  const resourceId = opts.resourceId || ttsResourceId();
  const startedAt = Date.now();
  let firstPacketMs;

  const auth = buildIndependentTtsAuthHeaders();
  const headers = auth.headers;
  const requestId = auth.requestId;
  debugLog.info("HostTts", "独立 TTS 请求鉴权", {
    authMode: auth.authMode,
    keySource: auth.keySource,
    resourceId: auth.resourceId,
    headerNames: auth.headerNames,
    appIdUsed: auth.appIdUsed,
    speaker: voice,
    text_len: t.length,
    requestId
  });
  // 官方：顶层必须是 req_params；audio_params 在其内。user 为兼容字段。
  const bodyObj = {
    user: { uid: "dazhi-host" },
    req_params: {
      text: t,
      speaker: voice,
      audio_params: {
        format,
        sample_rate: sampleRate
      }
    }
  };
  const body = JSON.stringify(bodyObj);
  const timeoutMs = totalTimeoutMs(t.length);

  return new Promise((resolve) => {
    let settled = false;
    let chunks = 0;
    let bytes = 0;
    let logId = "";
    let buf = "";
    let lastEvtErr = null;
    let billedChars;
    let httpStatus = 0;
    let connectTimer;
    let firstPacketTimer;
    let totalTimer;
    let req;

    const clearTimers = () => {
      if (connectTimer) clearTimeout(connectTimer);
      if (firstPacketTimer) clearTimeout(firstPacketTimer);
      if (totalTimer) clearTimeout(totalTimer);
      connectTimer = firstPacketTimer = totalTimer = null;
    };

    const finish = (ok, ttsError, extra = {}) => {
      if (settled) return;
      settled = true;
      clearTimers();
      try {
        if (opts.signal) opts.signal.removeEventListener("abort", onAbort);
      } catch (_) {}
      const durationMs = Date.now() - startedAt;
      observeHist(metrics.tts_durations_ms, durationMs);
      if (firstPacketMs != null) observeHist(metrics.tts_first_packet_ms, firstPacketMs);
      if (Number.isFinite(billedChars)) {
        metrics.tts_billed_chars_total += billedChars;
      }

      const struct = {
        ts: new Date().toISOString(),
        request_id: requestId,
        mode: "independent",
        resource_id: resourceId,
        speaker: voice,
        text_len: t.length,
        audio_format: format,
        sample_rate: sampleRate,
        http_status: httpStatus || undefined,
        err_code: ttsError?.code,
        err_msg: ttsError?.message,
        err_msg_quota_type: ttsError?.quotaType || undefined,
        duration_ms: durationMs,
        first_packet_ms: firstPacketMs,
        audio_bytes: bytes,
        billed_chars: billedChars,
        ok,
        chunks,
        logid: logId || ttsError?.logid
      };
      debugLog.info("HostTts", ok ? "合成完成" : "合成失败", struct);

      resolve({
        ok,
        chunks,
        bytes,
        error: ttsError
          ? `${ttsError.businessCode || ttsError.code || "err"}:${ttsError.message}`
          : extra.error,
        logId: logId || ttsError?.logid || "",
        sampleRate,
        requestId,
        durationMs,
        firstPacketMs,
        billedChars,
        retriable: ttsError ? ttsError.retriable : extra.retriable,
        quotaType: ttsError?.quotaType ?? null,
        businessCode: ttsError?.businessCode,
        ttsError: ttsError || undefined,
        ...extra
      });
    };

    const onAbort = () => {
      try {
        req?.destroy();
      } catch (_) {}
      finish(false, makeTtsError({ message: "aborted", retriable: false, businessCode: "TTS_ABORTED" }));
    };

    const armFirstPacket = () => {
      firstPacketTimer = setTimeout(() => {
        try {
          req?.destroy();
        } catch (_) {}
        finish(
          false,
          makeTtsError({
            message: "first_packet_timeout",
            retriable: true,
            businessCode: "TTS_FIRST_PACKET_TIMEOUT",
            logid: logId
          })
        );
      }, FIRST_PACKET_TIMEOUT_MS);
    };

    totalTimer = setTimeout(() => {
      try {
        req?.destroy();
      } catch (_) {}
      finish(
        false,
        makeTtsError({
          message: "http_timeout",
          retriable: true,
          businessCode: "TTS_TIMEOUT",
          logid: logId
        })
      );
    }, timeoutMs);

    req = https.request(
      TTS_URL,
      {
        method: "POST",
        headers,
        // 连接阶段超时由下方 socket.setTimeout / connectTimer 控制
        timeout: timeoutMs
      },
      (res) => {
        if (connectTimer) {
          clearTimeout(connectTimer);
          connectTimer = null;
        }
        httpStatus = res.statusCode || 0;
        logId = pickLogId(res.headers);
        billedChars = parseUsageChars(res.headers);

        if (httpStatus >= 400) {
          const parts = [];
          res.on("data", (c) => parts.push(c));
          res.on("end", () => {
            const bodyText = Buffer.concat(parts).toString("utf8");
            let code;
            let message = res.statusMessage || `http_${httpStatus}`;
            try {
              const j = JSON.parse(bodyText);
              const h = j.header && typeof j.header === "object" ? j.header : null;
              if (j.code != null) code = Number(j.code);
              else if (h?.code != null) code = Number(h.code);
              if (j.message || j.msg) message = String(j.message || j.msg);
              else if (h?.message || h?.msg) message = String(h.message || h.msg);
            } catch (_) {
              message = bodyText.slice(0, 512) || message;
            }
            const err = makeTtsError({
              httpStatus,
              code,
              message,
              logid: logId,
              rawBodySnippet: bodyText.slice(0, 512),
              retriable: httpStatus >= 500
            });
            handleClassifiedError(err, bodyText);
          });
          return;
        }

        armFirstPacket();
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          buf += chunk;
          let nl;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;
            handleLine(line);
          }
        });
        res.on("end", () => {
          const tail = buf.trim();
          if (tail) handleLine(tail);
          if (chunks > 0) {
            finish(true, null);
          } else if (lastEvtErr) {
            handleClassifiedError(lastEvtErr);
          } else {
            finish(
              false,
              makeTtsError({
                message: "timeout-no-audio",
                retriable: true,
                businessCode: "TTS_NO_AUDIO",
                logid: logId,
                httpStatus
              })
            );
          }
        });
        res.on("error", (err) => {
          finish(
            false,
            makeTtsError({
              message: err.message || "res_error",
              retriable: true,
              logid: logId,
              httpStatus
            })
          );
        });
      }
    );

    function handleLine(line) {
      let evt;
      try {
        evt = JSON.parse(line);
      } catch {
        return;
      }
      const code = Number(evt.code);
      if ((code === 0 || code === 20000000) && evt.data) {
        const b64 = String(evt.data);
        chunks += 1;
        bytes += Math.floor((b64.length * 3) / 4);
        if (firstPacketMs == null) {
          firstPacketMs = Date.now() - startedAt;
          if (firstPacketTimer) {
            clearTimeout(firstPacketTimer);
            firstPacketTimer = null;
          }
        }
        if (typeof opts.onChunk === "function") opts.onChunk(b64);
      } else if (code && code !== 0 && code !== 20000000) {
        lastEvtErr = makeTtsError({
          httpStatus,
          code,
          message: evt.message || evt.msg || "tts_error",
          logid: logId,
          rawBodySnippet: line.slice(0, 512)
        });
      }
    }

    function handleClassifiedError(err, rawBody) {
      if (err.quotaType === "text_words_lifetime") {
        debugLog.error(
          "HostTts",
          "TTS 字符额度耗尽（text_words_lifetime/independent），请在豆包语音控制台为 seed-tts-2.0 购买字符资源包或开通后付费；不要重试",
          {
            code: err.code,
            message: err.message,
            logid: err.logid,
            request_id: requestId
          },
          { rateKey: "tts-quota-lifetime", rateMs: 60000 }
        );
        noteLifetimeQuota();
        try {
          ttsEvents.emit("tts_quota_exhausted", {
            message: "[TTS] 豆包语音合成2.0字符额度已耗尽，影响独立TTS链路",
            error: err,
            requestId
          });
        } catch (_) {}
      } else if (err.quotaType === "concurrency") {
        debugLog.warn("HostTts", "已触达并发上限，考虑增购并发包或降低并发", {
          code: err.code,
          message: err.message,
          logid: err.logid
        });
      } else if (err.businessCode === "TTS_AUTH_FORBIDDEN") {
        // 同一会话鉴权失败会连打：合并 ERROR，避免刷屏盖住后续 SPEECH/策略日志
        debugLog.error(
          "HostTts",
          "TTS 鉴权/资源未授权（Forbidden）：请在豆包语音控制台为当前 App 开通 seed-tts-2.0，并核对 DOUBAO_TTS_API_KEY（或 DOUBAO_SPEECH_API_KEY）与 DOUBAO_SPEECH_APP_ID 同属该应用；开通后约 5–10 分钟生效，勿用方舟 LLM Key 顶替",
          {
            code: err.code,
            message: err.message,
            httpStatus: err.httpStatus,
            logid: err.logid,
            request_id: requestId,
            resource_id: resourceId,
            speaker: voice
          },
          { rateKey: "tts-auth-forbidden", rateMs: 60000 }
        );
      } else if (err.businessCode === "TTS_BAD_PAYLOAD") {
        debugLog.error("HostTts", "协议/JSON 异常（payload unmarshal），请检查请求体", {
          code: err.code,
          payload_snippet: String(rawBody || err.rawBodySnippet || "").slice(0, 512),
          logid: err.logid
        });
      } else if (err.businessCode === "TTS_BAD_SPEAKER_OR_TEXT") {
        debugLog.error("HostTts", "speaker 或 text 参数异常", {
          code: err.code,
          message: err.message,
          speaker: voice,
          text_len: t.length,
          text_preview: t.slice(0, 24) + (t.length > 24 ? "…" : ""),
          logid: err.logid
        });
      } else if (err.retriable) {
        debugLog.warn("HostTts", "可重试的服务端/网络错误", {
          code: err.code,
          message: err.message,
          httpStatus: err.httpStatus,
          logid: err.logid
        });
      } else {
        debugLog.error("HostTts", "TTS 业务错误", {
          code: err.code,
          message: err.message,
          businessCode: err.businessCode,
          logid: err.logid
        });
      }
      finish(false, err);
    }

    connectTimer = setTimeout(() => {
      try {
        req.destroy();
      } catch (_) {}
      finish(
        false,
        makeTtsError({
          message: "connect_timeout",
          retriable: true,
          businessCode: "TTS_CONNECT_TIMEOUT"
        })
      );
    }, CONNECT_TIMEOUT_MS);

    req.on("socket", (s) => {
      s.setTimeout(CONNECT_TIMEOUT_MS);
      s.once("connect", () => {
        if (connectTimer) {
          clearTimeout(connectTimer);
          connectTimer = null;
        }
        try {
          s.setTimeout(0);
        } catch (_) {}
      });
      s.once("timeout", () => {
        // 仅连接阶段；已 connect 后 setTimeout(0)
        if (!settled && connectTimer) {
          try {
            req.destroy();
          } catch (_) {}
        }
      });
    });

    req.on("timeout", () => {
      try {
        req.destroy();
      } catch (_) {}
      finish(
        false,
        makeTtsError({
          message: "http_timeout",
          retriable: true,
          businessCode: "TTS_TIMEOUT",
          logid: logId
        })
      );
    });

    req.on("error", (err) => {
      if (settled) return;
      finish(
        false,
        makeTtsError({
          message: err.message || "req_error",
          retriable: true,
          logid: logId
        })
      );
    });

    if (opts.signal) {
      if (opts.signal.aborted) onAbort();
      else opts.signal.addEventListener("abort", onAbort, { once: true });
    }

    req.write(body);
    req.end();
  });
}

function metricResultFromError(ttsError) {
  if (!ttsError) return "server_error";
  if (ttsError.quotaType === "text_words_lifetime") return "quota_words";
  if (ttsError.quotaType === "concurrency") return "quota_concurrency";
  if (ttsError.businessCode === "TTS_AUTH_FORBIDDEN") return "auth_forbidden";
  if (ttsError.businessCode === "TTS_TIMEOUT" || ttsError.businessCode === "TTS_FIRST_PACKET_TIMEOUT") {
    return "timeout";
  }
  if (ttsError.businessCode === "TTS_ABORTED") return "aborted";
  if (!ttsError.retriable && (ttsError.httpStatus === 400 || ttsError.code >= 45000000)) {
    return "bad_request";
  }
  if (ttsError.retriable) return "server_error";
  return "bad_request";
}

/**
 * @param {string} text
 * @param {{ onChunk?: (b64: string) => void, signal?: AbortSignal, format?: string, sampleRate?: number, skipValidate?: boolean }} [opts]
 * @returns {Promise<object>}
 */
async function synthesizeHostTts(text, opts = {}) {
  const t = String(text || "").trim();
  const sampleRate = opts.sampleRate || ttsSampleRate();
  if (!t) {
    return { ok: false, chunks: 0, bytes: 0, error: "empty", sampleRate, retriable: false };
  }

  if (!opts.skipValidate) {
    const ready = ensureIndependentTtsReady();
    if (!ready.ok) {
      incResult("config_error");
      return {
        ok: false,
        chunks: 0,
        bytes: 0,
        error: ready.error,
        sampleRate,
        retriable: false,
        businessCode: "TTS_CONFIG_INVALID",
        ttsError: makeTtsError({
          message: ready.error,
          retriable: false,
          businessCode: "TTS_CONFIG_INVALID"
        })
      };
    }
  }

  if (breakerIsOpen()) {
    incResult("circuit_open");
    const msg =
      "TTS 熔断中（近期 text_words_lifetime 多次失败），暂不请求豆包；请检查字符额度/后付费后等待熔断结束";
    debugLog.error("HostTts", msg, {
      openUntil: new Date(breaker.openUntil).toISOString()
    });
    return {
      ok: false,
      chunks: 0,
      bytes: 0,
      error: msg,
      sampleRate,
      retriable: false,
      quotaType: "text_words_lifetime",
      businessCode: "TTS_QUOTA_EXHAUSTED",
      ttsError: makeTtsError({
        message: msg,
        retriable: false,
        businessCode: "TTS_QUOTA_EXHAUSTED"
      })
    };
  }

  const maxLen = textMaxChars();
  const parts = splitTextForTts(t, maxLen);
  if (parts.length > 1) {
    debugLog.info("HostTts", "文本超长，按标点分片合成", {
      text_len: t.length,
      max: maxLen,
      parts: parts.length
    });
  }

  let totalChunks = 0;
  let totalBytes = 0;
  let lastLogId = "";
  let lastRequestId = "";
  let billedSum = 0;
  let firstPacketMs;
  const wallStart = Date.now();

  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi];
    let attempt = 0;
    let partResult;

    while (true) {
      if (opts.signal?.aborted) {
        return {
          ok: false,
          chunks: totalChunks,
          bytes: totalBytes,
          error: "aborted",
          sampleRate,
          retriable: false,
          businessCode: "TTS_ABORTED"
        };
      }
      if (breakerIsOpen()) {
        incResult("circuit_open");
        return {
          ok: false,
          chunks: totalChunks,
          bytes: totalBytes,
          error: "TTS 熔断中",
          sampleRate,
          retriable: false,
          businessCode: "TTS_QUOTA_EXHAUSTED",
          quotaType: "text_words_lifetime"
        };
      }

      partResult = await synthesizeOnce(part, {
        ...opts,
        onChunk: (b64) => {
          if (firstPacketMs == null) firstPacketMs = Date.now() - wallStart;
          if (typeof opts.onChunk === "function") opts.onChunk(b64);
        }
      });

      if (partResult.ok) break;

      const err = partResult.ttsError;
      // 配额 lifetime：绝不重试
      if (err?.quotaType === "text_words_lifetime" || partResult.businessCode === "TTS_QUOTA_EXHAUSTED") {
        incResult("quota_words");
        return {
          ...partResult,
          chunks: totalChunks,
          bytes: totalBytes,
          firstPacketMs,
          durationMs: Date.now() - wallStart
        };
      }

      // 并发：最多 2 次退避重试（100/300/1000ms）
      if (err?.quotaType === "concurrency" && attempt < CONCURRENCY_BACKOFF_MS.length) {
        const wait = CONCURRENCY_BACKOFF_MS[attempt];
        attempt += 1;
        debugLog.warn("HostTts", "并发配额重试", { attempt, waitMs: wait });
        try {
          await sleep(wait, opts.signal);
        } catch {
          return { ...partResult, chunks: totalChunks, bytes: totalBytes, retriable: false };
        }
        continue;
      }

      // 5xx / 网络：有限重试
      if (err?.retriable && err.quotaType !== "concurrency" && attempt < SERVER_BACKOFF_MS.length) {
        const wait = SERVER_BACKOFF_MS[attempt];
        attempt += 1;
        debugLog.warn("HostTts", "服务端/网络错误重试", {
          attempt,
          waitMs: wait,
          code: err.code,
          message: err.message
        });
        try {
          await sleep(wait, opts.signal);
        } catch {
          return { ...partResult, chunks: totalChunks, bytes: totalBytes, retriable: false };
        }
        continue;
      }

      incResult(metricResultFromError(err));
      return {
        ...partResult,
        chunks: totalChunks,
        bytes: totalBytes,
        firstPacketMs,
        durationMs: Date.now() - wallStart
      };
    }

    totalChunks += partResult.chunks || 0;
    totalBytes += partResult.bytes || 0;
    lastLogId = partResult.logId || lastLogId;
    lastRequestId = partResult.requestId || lastRequestId;
    if (Number.isFinite(partResult.billedChars)) billedSum += partResult.billedChars;
  }

  incResult("success");
  return {
    ok: true,
    chunks: totalChunks,
    bytes: totalBytes,
    sampleRate,
    logId: lastLogId,
    requestId: lastRequestId,
    durationMs: Date.now() - wallStart,
    firstPacketMs,
    billedChars: billedSum || undefined,
    retriable: false
  };
}

function getTtsMetrics() {
  return JSON.parse(JSON.stringify(metrics));
}

function resetTtsCircuitForTests() {
  breaker.openUntil = 0;
  breaker.lifetimeHits = [];
  validatedOnce = false;
}

module.exports = {
  synthesizeHostTts,
  hostTtsMode,
  ttsVoice,
  ttsResourceId,
  ttsSampleRate,
  validateIndependentTtsConfig,
  ensureIndependentTtsReady,
  makeTtsError,
  getTtsMetrics,
  ttsEvents,
  maskSecret,
  speechApiKey,
  speechApiKeySource,
  speechAppId,
  useLegacyTtsAuth,
  buildIndependentTtsAuthHeaders,
  splitTextForTts,
  resetTtsCircuitForTests,
  TTS_URL,
  TTS_RESOURCE_DEFAULT
};
