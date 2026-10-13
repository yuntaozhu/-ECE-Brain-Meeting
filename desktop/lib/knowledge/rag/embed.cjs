/** Embedding API */
const { debugLog } = require("../../platform/debugLog.cjs");
const state = require("./state.cjs");
const { EMBED_URL, apiKey, embeddingModel, useMultimodal } = require("./paths.cjs");
const { normalizeVec } = require("./chunks.cjs");

function parseEmbedResponse(data) {
  const payload = data?.data;
  if (!payload) return [];
  // multimodal 常见：data 为对象 { embedding }
  if (!Array.isArray(payload) && payload.embedding) {
    const v = normalizeVec(payload.embedding);
    return v ? [v] : [];
  }
  if (Array.isArray(payload)) {
    const rows = [...payload].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    return rows
      .map((r) => normalizeVec(r.embedding))
      .filter((v) => Array.isArray(v) && v.length > 0);
  }
  return [];
}

/**
 * 单条文本向量化（multimodal：每种 type 最多 1 个，故一次一条）
 * @param {string} text
 * @param {{ signal?: AbortSignal }} [opts]
 */
async function embedOneText(text, opts = {}) {
  const key = apiKey();
  const model = embeddingModel();
  const t = String(text || "").trim().slice(0, 1800);
  if (!key || !t) return null;

  const body = useMultimodal()
    ? {
        model,
        input: [{ type: "text", text: t }],
        encoding_format: "float"
      }
    : {
        model,
        input: [t],
        encoding_format: "float"
      };

  const response = await fetch(EMBED_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify(body),
    signal: opts.signal
  });
  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    const err = new Error(`embed HTTP ${response.status}`);
    err.status = response.status;
    err.body = errBody.slice(0, 200);
    throw err;
  }
  const data = await response.json();
  const vecs = parseEmbedResponse(data);
  return vecs[0] || null;
}

/**
 * @param {string[]} texts
 * @param {{ signal?: AbortSignal, concurrency?: number }} [opts]
 * @returns {Promise<number[][]|null>}
 */
async function embedTexts(texts, opts = {}) {
  if (state.embedUnavailable) return null;
  const key = apiKey();
  if (!key || !texts.length) return null;

  const list = texts.map((t) => String(t || "").trim()).filter(Boolean);
  if (!list.length) return null;

  // 非 multimodal：保留批量 input 字符串数组
  if (!useMultimodal()) {
    try {
      const response = await fetch(EMBED_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`
        },
        body: JSON.stringify({
          model: embeddingModel(),
          input: list,
          encoding_format: "float"
        }),
        signal: opts.signal
      });
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        debugLog.warn("SemanticRag", "embed HTTP 失败", {
          status: response.status,
          body: body.slice(0, 160),
          model: embeddingModel()
        });
        if (response.status === 404 || response.status === 401) {
          state.embedUnavailable = true;
          state.embedFailReason = `HTTP ${response.status}`;
        }
        return null;
      }
      return parseEmbedResponse(await response.json());
    } catch (err) {
      if (opts.signal?.aborted || err?.name === "AbortError") return null;
      debugLog.warn("SemanticRag", "embed 异常", { error: String(err?.message || err) });
      return null;
    }
  }

  // multimodal：并行单条（接口限制每种 type 最多 1）
  const concurrency = Math.max(1, Math.min(opts.concurrency || 4, 8));
  const out = new Array(list.length);
  let cursor = 0;
  let hardFail = null;

  async function worker() {
    while (cursor < list.length) {
      if (opts.signal?.aborted || state.embedUnavailable) return;
      const i = cursor++;
      try {
        out[i] = await embedOneText(list[i], { signal: opts.signal });
        if (!out[i]) hardFail = hardFail || new Error("empty vector");
      } catch (err) {
        if (opts.signal?.aborted || err?.name === "AbortError") return;
        hardFail = err;
        if (err.status === 404 || err.status === 401 || err.status === 403) {
          state.embedUnavailable = true;
          state.embedFailReason = String(err.body || err.message || err.status);
          debugLog.warn("SemanticRag", "embed 不可用，本进程改用关键词", {
            status: err.status,
            body: String(err.body || "").slice(0, 160),
            model: embeddingModel()
          });
          return;
        }
        debugLog.warn("SemanticRag", "单条 embed 失败", {
          i,
          error: String(err?.message || err),
          body: String(err.body || "").slice(0, 120)
        });
        out[i] = null;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  if (state.embedUnavailable) return null;
  if (out.some((v) => !v?.length)) {
    if (hardFail) {
      debugLog.warn("SemanticRag", "embed 批次不完整", {
        error: String(hardFail.message || hardFail)
      });
    }
    return null;
  }
  return out;
}

module.exports = { parseEmbedResponse, embedOneText, embedTexts };
