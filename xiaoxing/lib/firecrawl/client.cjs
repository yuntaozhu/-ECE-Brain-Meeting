/**
 * Firecrawl v1 REST 客户端（不把 key 写进代码）
 */
const DEFAULT_BASE = "https://api.firecrawl.dev/v1";

function getApiKey() {
  const key = process.env.FIRECRAWL_API_KEY || "";
  if (!key) throw new Error("缺少 FIRECRAWL_API_KEY（请写入 xiaoxing/.env）");
  return key;
}

function hasApiKey() {
  return Boolean(process.env.FIRECRAWL_API_KEY);
}

function classifyHttpError(status, body) {
  const msg = body?.error || body?.message || body?.code || "";
  if (status === 401 || status === 403) {
    return { code: "auth", hint: "检查 FIRECRAWL_API_KEY 是否有效" };
  }
  if (status === 402 || /credit|quota|billing/i.test(String(msg))) {
    return { code: "quota", hint: "额度不足，稍后重试或检查账单" };
  }
  if (status === 408 || status === 504 || /timeout/i.test(String(msg))) {
    return { code: "timeout", hint: "目标站慢或 Firecrawl 超时，可增大 waitFor/timeout" };
  }
  if (status === 429) {
    return { code: "rate_limit", hint: "触发限流，降低并发或稍后重试" };
  }
  if (status >= 500) {
    return { code: "upstream", hint: "Firecrawl 上游异常，可稍后重试" };
  }
  return { code: "http", hint: "见 error 原文；部分站点（如 baafs）可能间歇失败" };
}

async function scrapeUrl(url, options = {}) {
  let res;
  try {
    res = await fetch(`${DEFAULT_BASE}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url,
        formats: options.formats || ["markdown"],
        onlyMainContent: options.onlyMainContent !== false,
        waitFor: options.waitFor || 1000,
        timeout: options.timeout || 90000,
        ...(options.skipTlsVerification === true ? { skipTlsVerification: true } : {})
      })
    });
  } catch (err) {
    const e = new Error(`Firecrawl 网络失败: ${err.message || err}`);
    e.code = "network";
    e.hint = "检查本机网络 / DNS / 代理";
    throw e;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const cls = classifyHttpError(res.status, data);
    const msg = data?.error || data?.message || res.statusText || "unknown";
    const e = new Error(`Firecrawl scrape ${res.status}: ${msg} （${cls.hint}）`);
    e.code = cls.code;
    e.hint = cls.hint;
    e.status = res.status;
    e.body = data;
    throw e;
  }
  return data;
}

/**
 * 不发起真实抓取：只校验密钥是否配置；可选 --live ping 一个轻量 scrape
 */
async function healthCheck(options = {}) {
  if (!hasApiKey()) {
    return {
      ok: false,
      configured: false,
      code: "missing_key",
      hint: "在 xiaoxing/.env 配置 FIRECRAWL_API_KEY"
    };
  }
  if (!options.live) {
    return { ok: true, configured: true, live: false };
  }
  const url = options.url || "https://example.com";
  try {
    const data = await scrapeUrl(url, {
      formats: ["markdown"],
      waitFor: 500,
      timeout: 30000
    });
    const md = data?.data?.markdown || data?.markdown || "";
    return {
      ok: true,
      configured: true,
      live: true,
      url,
      chars: md.length
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      live: true,
      url,
      code: err.code || "error",
      hint: err.hint || null,
      error: String(err.message || err)
    };
  }
}

module.exports = { scrapeUrl, getApiKey, hasApiKey, healthCheck, classifyHttpError };
