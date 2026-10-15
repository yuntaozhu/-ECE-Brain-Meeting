/** RAG 索引路径与 embedding 配置 */
const fs = require("fs");
const path = require("path");
const { knowledgeReadRoot, knowledgeWriteRoot } = require("../../platform/appPaths.cjs");
const { wikiMtimeKey } = require("../wiki");

function kbRoot() {
  return knowledgeReadRoot();
}
function indexReadCandidates() {
  const roots = [knowledgeReadRoot(), knowledgeWriteRoot()];
  const names = [".rag-index.json", "rag-index.json"];
  const out = [];
  for (const root of roots) {
    for (const name of names) out.push(path.join(root, name));
  }
  return [...new Set(out)];
}
function indexReadFile() {
  for (const f of indexReadCandidates()) {
    try {
      if (fs.existsSync(f)) return f;
    } catch (_) {}
  }
  return path.join(knowledgeReadRoot(), ".rag-index.json");
}
function indexWriteFile() {
  return path.join(knowledgeWriteRoot(), ".rag-index.json");
}
/** 临时：多模态向量接口（后续可切回 /embeddings） */
const EMBED_URL =
  (process.env.DOUBAO_EMBED_URL || "").trim() ||
  "https://ark.cn-beijing.volces.com/api/v3/embeddings/multimodal";

function apiKey() {
  return (process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim();
}

function embeddingModel() {
  // 优先 Endpoint ID；勿默认带版本后缀的旧模型名
  return (
    process.env.DOUBAO_EMBED_ENDPOINT ||
    process.env.DOUBAO_EMBEDDING_MODEL ||
    process.env.DOUBAO_EMBED_MODEL ||
    process.env.ARK_EMBEDDING_MODEL ||
    ""
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
    distilledMtimeKey() +
    "|" +
    wikiMtimeKey()
  );
}


module.exports = {
  kbRoot,
  indexReadCandidates,
  indexReadFile,
  indexWriteFile,
  EMBED_URL,
  apiKey,
  embeddingModel,
  useMultimodal,
  distilledMtimeKey,
  fileMtimeKey
};
