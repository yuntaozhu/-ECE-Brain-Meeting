/**
 * 语义 RAG：火山方舟多模态 Embeddings（临时）+ 本地余弦检索
 * 接口：POST /api/v3/embeddings/multimodal
 * 模型默认：doubao-embedding-vision-251215（可用 DOUBAO_EMBED_MODEL 覆盖）
 * Key：复用 DOUBAO_API_KEY / ARK_API_KEY（勿把 Key 写进代码）
 * 失败时降级 knowledge.retrieveKnowledge，并短路避免反复建索引
 */
const fs = require("fs");
const path = require("path");
const { debugLog } = require("./debugLog.cjs");
const {
  getFaqRaw,
  getKnowledgeRaw,
  retrieveKnowledge,
  extractFaqSpeakText
} = require("./knowledge.cjs");
const { getDistilledRaw } = require("./knowledgeSink.cjs");
const { knowledgeReadRoot, knowledgeWriteRoot } = require("./appPaths.cjs");

function kbRoot() {
  return knowledgeReadRoot();
}
function indexReadFile() {
  return path.join(knowledgeReadRoot(), ".rag-index.json");
}
function indexWriteFile() {
  return path.join(knowledgeWriteRoot(), ".rag-index.json");
}
/** 临时：多模态向量接口（后续可切回 /embeddings） */
const EMBED_URL =
  (process.env.DOUBAO_EMBED_URL || "").trim() ||
  "https://ark.cn-beijing.volces.com/api/v3/embeddings/multimodal";

/** @type {{ model: string, mtimeKey: string, chunks: Array<{id:string,title:string,body:string,source:string,vec:number[]}> }|null} */
let memIndex = null;
let buildPromise = null;
/** 连续失败后本进程内跳过 embedding，避免每问都 404/重试 */
let embedUnavailable = false;
let embedFailReason = "";

function apiKey() {
  return (process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim();
}

function embeddingModel() {
  return (
    process.env.DOUBAO_EMBEDDING_MODEL ||
    process.env.DOUBAO_EMBED_MODEL ||
    process.env.ARK_EMBEDDING_MODEL ||
    "doubao-embedding-vision-251215"
  );
}

function useMultimodal() {
  return /embeddings\/multimodal/i.test(EMBED_URL);
}

function distilledMtimeKey() {
  const dir = path.join(kbRoot(), "distilled");
  try {
    const files = fs.readdirSync(dir).filter((f) => /\.(md|txt)$/i.test(f));
    let max = 0;
    for (const f of files) {
      try {
        max = Math.max(max, fs.statSync(path.join(dir, f)).mtimeMs);
      } catch (_) {}
    }
    return `distilled:${files.length}:${max}`;
  } catch (_) {
    return "distilled:0:0";
  }
}

function fileMtimeKey() {
  const files = [
    path.join(kbRoot(), "faq-meeting.txt"),
    path.join(kbRoot(), "quan-yuan-meiyu.txt")
  ];
  return (
    files
      .map((f) => {
        try {
          return `${path.basename(f)}:${fs.statSync(f).mtimeMs}`;
        } catch (_) {
          return `${path.basename(f)}:0`;
        }
      })
      .join("|") +
    "|" +
    distilledMtimeKey()
  );
}

/** 按句号切开；单行列表保持整行，避免从句子中间截断。 */
function splitSentences(body) {
  const sentences = [];
  for (const line of String(body || "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/(?<=[。！？!?])/);
    for (const part of parts) {
      const s = part.trim();
      if (s) sentences.push(s);
    }
  }
  return sentences;
}

/**
 * 以标题为一块；超长再按句打包。每块正文带上标题。
 * @param {string} raw
 * @param {string} source
 * @param {number} maxBody
 */
function splitChunks(raw, source, maxBody = 700) {
  const text = String(raw || "").replace(/\r\n/g, "\n");
  if (!text.trim()) return [];
  const parts = text.split(/\n(?=#{1,3}\s)/);
  const out = [];
  let i = 0;
  const push = (title, body) => {
    const b = String(body || "").trim();
    if (b.length < 24) return;
    out.push({
      id: `${source}_${i++}`,
      title: String(title || "资料").slice(0, 100),
      body: b.slice(0, 1800),
      source
    });
  };
  for (const p of parts) {
    const t = p.trim();
    if (t.length < 30) continue;
    const lines = t.split("\n");
    const title = (lines[0] || "").replace(/^#+\s*/, "").slice(0, 100) || "资料";
    const rest = lines.slice(1).join("\n").trim();
    const whole = rest ? `${title}\n${rest}` : title;
    if (whole.length <= maxBody) {
      push(title, whole);
      continue;
    }
    const sentences = splitSentences(rest || t);
    let buf = [];
    let len = title.length + 1;
    const flush = () => {
      if (!buf.length) return;
      push(title, `${title}\n${buf.join("\n")}`);
      buf = [];
      len = title.length + 1;
    };
    for (const sentence of sentences) {
      if (sentence.length > maxBody) {
        flush();
        push(title, `${title}\n${sentence}`);
        continue;
      }
      if (len + sentence.length + 1 > maxBody && buf.length) flush();
      buf.push(sentence);
      len += sentence.length + 1;
    }
    flush();
  }
  return out;
}

function titleOverlapBoost(query, title) {
  const q = String(query || "").replace(/\s+/g, "").toLowerCase();
  const t = String(title || "").replace(/\s+/g, "").toLowerCase();
  if (!q || !t) return 0;
  let bonus = 0;
  const keys = ["teacher说", "family说", "行事历", "收益保障", "一园两制", "三笔账", "四端"];
  for (const k of keys) {
    if (q.includes(k) && t.includes(k)) bonus += 0.05;
  }
  if ((q.includes("teacher") || q.includes("老师")) && t.includes("teacher说")) bonus += 0.06;
  if (q.includes("落地") && t.includes("行事历")) bonus += 0.08;
  return Math.min(0.12, bonus);
}

function cosine(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** 展平 embedding：有的版本返回 number[]，有的返回 [[...]] */
function normalizeVec(raw) {
  if (!raw) return null;
  if (Array.isArray(raw) && typeof raw[0] === "number") return raw;
  if (Array.isArray(raw) && Array.isArray(raw[0])) return raw[0];
  return null;
}

/**
 * 解析 multimodal / 标准 embeddings 响应
 * @param {any} data
 * @returns {number[][]}
 */
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
  if (embedUnavailable) return null;
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
          embedUnavailable = true;
          embedFailReason = `HTTP ${response.status}`;
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
      if (opts.signal?.aborted || embedUnavailable) return;
      const i = cursor++;
      try {
        out[i] = await embedOneText(list[i], { signal: opts.signal });
        if (!out[i]) hardFail = hardFail || new Error("empty vector");
      } catch (err) {
        if (opts.signal?.aborted || err?.name === "AbortError") return;
        hardFail = err;
        if (err.status === 404 || err.status === 401 || err.status === 403) {
          embedUnavailable = true;
          embedFailReason = String(err.body || err.message || err.status);
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
  if (embedUnavailable) return null;
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

function loadIndexFromDisk(mtimeKey, model) {
  const files = [indexWriteFile()];
  if (indexReadFile() !== indexWriteFile()) files.push(indexReadFile());
  for (const file of files) {
    try {
      if (!fs.existsSync(file)) continue;
      const j = JSON.parse(fs.readFileSync(file, "utf8"));
      if (j.mtimeKey !== mtimeKey || j.model !== model || j.endpoint !== EMBED_URL) continue;
      if (!Array.isArray(j.chunks) || !j.chunks.length) continue;
      return j;
    } catch (_) {}
  }
  return null;
}

function saveIndexToDisk(index) {
  try {
    const file = indexWriteFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(index), "utf8");
  } catch (err) {
    debugLog.warn("SemanticRag", "写索引失败", { error: String(err?.message || err) });
  }
}

/**
 * 构建/加载向量索引
 * @param {{ signal?: AbortSignal, force?: boolean }} [opts]
 */
async function ensureIndex(opts = {}) {
  if (embedUnavailable && !opts.force) return null;
  const mtimeKey = fileMtimeKey();
  const model = embeddingModel();
  if (
    !opts.force &&
    memIndex &&
    memIndex.mtimeKey === mtimeKey &&
    memIndex.model === model &&
    memIndex.endpoint === EMBED_URL
  ) {
    return memIndex;
  }
  if (!opts.force) {
    const disk = loadIndexFromDisk(mtimeKey, model);
    if (disk) {
      memIndex = disk;
      return memIndex;
    }
  } else {
    memIndex = null;
  }
  if (buildPromise) return buildPromise;

  buildPromise = (async () => {
    const faqChunks = splitChunks(getFaqRaw(), "faq", 520);
    const kbChunks = splitChunks(getKnowledgeRaw(), "kb", 520);
    const distilledChunks = splitChunks(getDistilledRaw(), "distilled", 520);
    const chunks = [...faqChunks, ...distilledChunks, ...kbChunks];
    debugLog.info("SemanticRag", "开始构建索引", {
      chunks: chunks.length,
      faq: faqChunks.length,
      distilled: distilledChunks.length,
      kb: kbChunks.length,
      model,
      endpoint: EMBED_URL,
      multimodal: useMultimodal()
    });

    const vectors = [];
    const BATCH = useMultimodal() ? 6 : 16;
    for (let i = 0; i < chunks.length; i += BATCH) {
      if (opts.signal?.aborted || embedUnavailable) break;
      const batch = chunks.slice(i, i + BATCH);
      const inputs = batch.map((c) => `${c.title}\n${c.body}`.slice(0, 1800));
      const vecs = await embedTexts(inputs, { signal: opts.signal, concurrency: 4 });
      if (!vecs || vecs.length !== batch.length) {
        debugLog.warn("SemanticRag", "批次 embed 失败，中止建索引", {
          at: i,
          unavailable: embedUnavailable,
          reason: embedFailReason
        });
        memIndex = null;
        return null;
      }
      for (let j = 0; j < batch.length; j++) {
        vectors.push({ ...batch[j], vec: vecs[j] });
      }
    }
    if (vectors.length < 3) {
      memIndex = null;
      return null;
    }
    const index = {
      model,
      endpoint: EMBED_URL,
      mtimeKey,
      builtAt: Date.now(),
      chunks: vectors
    };
    memIndex = index;
    saveIndexToDisk(index);
    debugLog.info("SemanticRag", "索引就绪", { chunks: vectors.length, model });
    return index;
  })().finally(() => {
    buildPromise = null;
  });

  return buildPromise;
}

/**
 * 语义检索；失败降级关键词。
 * @param {string} query
 * @param {number} [topK]
 * @param {{ signal?: AbortSignal, preferBiz?: boolean, waitIndex?: boolean }} [opts]
 */
async function retrieveSemantic(query, topK = 4, opts = {}) {
  const q = String(query || "").trim();
  if (!q) return { hits: [], preview: "", fromFaq: false, mode: "empty" };

  if (embedUnavailable) {
    const fb = retrieveKnowledge(q, topK);
    return { ...fb, mode: "keyword-fallback", embedUnavailable: true, embedFailReason };
  }

  // 优先同步读本地预建索引，避免每次提问触发「开始构建索引」
  let index =
    memIndex && memIndex.model === embeddingModel() && memIndex.endpoint === EMBED_URL
      ? memIndex
      : null;
  if (!index) {
    warmIndexFromDisk();
    index =
      memIndex && memIndex.model === embeddingModel() && memIndex.endpoint === EMBED_URL
        ? memIndex
        : null;
  }
  if (!index) {
    if (!buildPromise && !embedUnavailable) {
      ensureIndex({ signal: opts.signal }).catch(() => {});
    }
    if (opts.waitIndex === true && buildPromise) {
      index = await ensureIndex({ signal: opts.signal });
    }
  }
  if (!index?.chunks?.length) {
    const fb = retrieveKnowledge(q, topK);
    return {
      ...fb,
      mode: "keyword-fallback",
      indexing: Boolean(buildPromise),
      embedUnavailable,
      embedFailReason
    };
  }

  const qVecs = await embedTexts([q.slice(0, 1200)], { signal: opts.signal, concurrency: 1 });
  const qVec = qVecs?.[0];
  if (!qVec?.length) {
    const fb = retrieveKnowledge(q, topK);
    return { ...fb, mode: "keyword-fallback" };
  }

  let scored = index.chunks.map((c) => {
    let score = cosine(qVec, c.vec);
    if (
      opts.preferBiz &&
      /(招生|经营|样板|落地|收费|倒闭|重生|非教|增量|权益|行事历|一园两制|三笔账|Teacher|菲教)/.test(
        c.title + c.body.slice(0, 120)
      )
    ) {
      score += 0.03;
    }
    score += titleOverlapBoost(q, c.title);
    return { ...c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  scored = scored.slice(0, Math.max(1, topK));

  const fromFaq = scored.some((h) => h.source === "faq");
  const preview = scored
    .map((h, i) => {
      const tag = h.source === "faq" ? "FAQ" : "资料";
      return `【${tag}${i + 1}·${h.title}】\n${h.body.slice(0, 700)}`;
    })
    .join("\n\n")
    .slice(0, 3200);

  const top = scored[0];
  const instantAnswer =
    top?.source === "faq" && (top.score || 0) >= 0.72 ? extractFaqSpeakText(top.body) : "";

  return {
    hits: scored.map((h) => ({
      title: h.title,
      score: Math.round((h.score || 0) * 1000) / 1000,
      snippet: h.body.slice(0, 400),
      source: h.source
    })),
    preview,
    fromFaq,
    instantAnswer,
    mode: "semantic"
  };
}

function semanticStatus() {
  return {
    indexReady: Boolean(memIndex?.chunks?.length),
    chunks: memIndex?.chunks?.length || 0,
    model: embeddingModel(),
    endpoint: EMBED_URL,
    multimodal: useMultimodal(),
    embedUnavailable,
    embedFailReason,
    indexPath: indexReadFile()
  };
}

/** 仅从磁盘加载索引（听会启动预热，不触发在线重建） */
function warmIndexFromDisk() {
  const mtimeKey = fileMtimeKey();
  const model = embeddingModel();
  if (
    memIndex &&
    memIndex.mtimeKey === mtimeKey &&
    memIndex.model === model &&
    memIndex.endpoint === EMBED_URL
  ) {
    return { ok: true, source: "memory", chunks: memIndex.chunks.length };
  }
  const disk = loadIndexFromDisk(mtimeKey, model);
  if (disk) {
    memIndex = disk;
    debugLog.info("SemanticRag", "已从本地加载索引", {
      chunks: disk.chunks.length,
      model,
      builtAt: disk.builtAt
    });
    return { ok: true, source: "disk", chunks: disk.chunks.length };
  }
  debugLog.info("SemanticRag", "本地无可用索引（请先 npm run rag:index）", {
    model,
    indexPath: indexReadFile()
  });
  return { ok: false, source: "none", chunks: 0 };
}

/** 测试用：重置短路状态 */
function resetEmbedGate() {
  embedUnavailable = false;
  embedFailReason = "";
}

module.exports = {
  splitChunks,
  retrieveSemantic,
  ensureIndex,
  warmIndexFromDisk,
  embedTexts,
  embedOneText,
  semanticStatus,
  resetEmbedGate,
  get INDEX_FILE() {
    return indexReadFile();
  }
};
