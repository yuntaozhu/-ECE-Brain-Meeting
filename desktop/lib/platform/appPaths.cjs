/**
 * 开发态：desktop/knowledge
 * 安装包：resources/knowledge（只读知识库）+ userData/knowledge（会话/新沉淀）
 */
const fs = require("fs");
const path = require("path");

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

function isPackagedApp() {
  const app = electronApp();
  return Boolean(app?.isPackaged);
}

/** 只读知识库（FAQ / 资料 / distilled / .rag-index） */
function knowledgeReadRoot() {
  if (isPackagedApp() && process.resourcesPath) {
    const bundled = path.join(process.resourcesPath, "knowledge");
    if (fs.existsSync(bundled)) return bundled;
  }
  return path.join(DESKTOP_ROOT, "knowledge");
}

/** 可写：会话、inbox、索引重写 */
function knowledgeWriteRoot() {
  if (isPackagedApp()) {
    const app = electronApp();
    const dir = path.join(app.getPath("userData"), "knowledge");
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (_) {}
    return dir;
  }
  return knowledgeReadRoot();
}

function envFileCandidates() {
  const list = [];
  if (isPackagedApp() && process.resourcesPath) {
    list.push(path.join(process.resourcesPath, ".env"));
  }
  list.push(path.join(DESKTOP_ROOT, "..", ".env"));
  list.push(path.join(DESKTOP_ROOT, ".env"));
  return list;
}

module.exports = {
  isPackagedApp,
  knowledgeReadRoot,
  knowledgeWriteRoot,
  envFileCandidates
};
