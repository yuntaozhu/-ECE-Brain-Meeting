/** 向量索引加载 / 构建 / 落盘 */
const fs = require("fs");
const path = require("path");
const { debugLog } = require("../../platform/debugLog.cjs");
const { getFaqRaw, getKnowledgeRaw } = require("../corpus.cjs");
const { getDistilledRaw } = require("../sink");
const { getWikiIndexChunks } = require("../wiki");
const { isPackagedApp } = require("../../platform/appPaths.cjs");
const state = require("./state.cjs");
const {
  EMBED_URL,
  indexReadCandidates,
  indexWriteFile,
  embeddingModel,
  fileMtimeKey,
  apiKey,
  useMultimodal
} = require("./paths.cjs");
const { splitChunks } = require("./chunks.cjs");
const { embedTexts } = require("./embed.cjs");

function loadIndexFromDisk(mtimeKey, model) {
  const files = indexReadCandidates();
  const packaged = isPackagedApp();
  for (const file of files) {
    try {
      if (!fs.existsSync(file)) continue;
      const j = JSON.parse(fs.readFileSync(file, "utf8"));
      if (j.model !== model || j.endpoint !== EMBED_URL) continue;
      if (!Array.isArray(j.chunks) || !j.chunks.length) continue;
      // 安装包知识库冻结：mtime 不一致仍可用；开发态严格校验
      if (!packaged && j.mtimeKey !== mtimeKey) continue;
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
  if (state.embedUnavailable && !opts.force) return null;
  const mtimeKey = fileMtimeKey();
  const model = embeddingModel();
  if (
    !opts.force &&
    state.memIndex &&
    state.memIndex.mtimeKey === mtimeKey &&
    state.memIndex.model === model &&
    state.memIndex.endpoint === EMBED_URL
  ) {
    return state.memIndex;
  }
  if (!opts.force) {
    const disk = loadIndexFromDisk(mtimeKey, model);
    if (disk) {
      state.memIndex = disk;
      return state.memIndex;
    }
  } else {
    state.memIndex = null;
  }
  if (state.buildPromise) return state.buildPromise;

  state.buildPromise = (async () => {
    // Wiki：每概念一页（整页口径）；FAQ 仍按节；raw/distilled 作缺口补全
    const wikiChunks = getWikiIndexChunks().map((c) => ({
      id: c.id,
      title: c.title,
      body: c.body,
      source: "wiki",
      slug: c.slug,
      speak: c.speak
    }));
    const faqChunks = splitChunks(getFaqRaw(), "faq", 520);
    const kbChunks = splitChunks(getKnowledgeRaw(), "kb", 700);
    const distilledChunks = splitChunks(getDistilledRaw(), "distilled", 520);
    const chunks = [...wikiChunks, ...faqChunks, ...distilledChunks, ...kbChunks];
    debugLog.info("SemanticRag", "开始构建索引", {
      chunks: chunks.length,
      wiki: wikiChunks.length,
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
      if (opts.signal?.aborted || state.embedUnavailable) break;
      const batch = chunks.slice(i, i + BATCH);
      const inputs = batch.map((c) => `${c.title}\n${c.body}`.slice(0, 1800));
      const vecs = await embedTexts(inputs, { signal: opts.signal, concurrency: 4 });
      if (!vecs || vecs.length !== batch.length) {
        debugLog.warn("SemanticRag", "批次 embed 失败，中止建索引", {
          at: i,
          unavailable: state.embedUnavailable,
          reason: state.embedFailReason
        });
        state.memIndex = null;
        return null;
      }
      for (let j = 0; j < batch.length; j++) {
        vectors.push({ ...batch[j], vec: vecs[j] });
      }
    }
    if (vectors.length < 3) {
      state.memIndex = null;
      return null;
    }
    const index = {
      model,
      endpoint: EMBED_URL,
      mtimeKey,
      builtAt: Date.now(),
      chunks: vectors
    };
    state.memIndex = index;
    saveIndexToDisk(index);
    debugLog.info("SemanticRag", "索引就绪", { chunks: vectors.length, model });
    return index;
  })().finally(() => {
    state.buildPromise = null;
  });

  return state.buildPromise;
}

module.exports = { loadIndexFromDisk, saveIndexToDisk, ensureIndex };
