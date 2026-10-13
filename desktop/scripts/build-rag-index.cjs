/**
 * 离线预建语义 RAG 索引 → desktop/knowledge/.rag-index.json
 *
 * 用法（在 desktop/ 或仓库根目录）：
 *   node desktop/scripts/build-rag-index.cjs
 *   node desktop/scripts/build-rag-index.cjs --force
 *   npm run rag:index --prefix desktop
 */
const path = require("path");
const fs = require("fs");

const rootEnv = path.join(__dirname, "..", "..", ".env");
const deskEnv = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: fs.existsSync(rootEnv) ? rootEnv : deskEnv });

const {
  ensureIndex,
  resetEmbedGate,
  semanticStatus,
  INDEX_FILE
} = require("../lib/knowledge");

async function main() {
  const force = process.argv.includes("--force");
  resetEmbedGate();
  const before = semanticStatus();
  console.log("[rag:index] 开始", {
    force,
    model: before.model,
    endpoint: before.endpoint,
    multimodal: before.multimodal,
    out: INDEX_FILE
  });
  const t0 = Date.now();
  const idx = await ensureIndex({ force });
  const ms = Date.now() - t0;
  if (!idx?.chunks?.length) {
    console.error("[rag:index] 失败：未生成索引。请检查 DOUBAO_API_KEY / DOUBAO_EMBED_MODEL。");
    console.error("[rag:index] status", semanticStatus());
    process.exit(1);
  }
  const size = fs.existsSync(INDEX_FILE) ? fs.statSync(INDEX_FILE).size : 0;
  console.log("[rag:index] 完成", {
    chunks: idx.chunks.length,
    model: idx.model,
    ms,
    bytes: size,
    path: INDEX_FILE
  });
}

main().catch((err) => {
  console.error("[rag:index] 异常", err);
  process.exit(1);
});
