/**
 * 开发态：desktop/ 下各知识目录
 * 安装包：resources/ 只读种子 + userData/ 可写运行态
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

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    const st = fs.statSync(from);
    if (st.isDirectory()) copyDirRecursive(from, to);
    else if (!fs.existsSync(to)) fs.copyFileSync(from, to);
  }
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

function wiki2BundledRoot() {
  if (isPackagedApp() && process.resourcesPath) {
    const bundled = path.join(process.resourcesPath, "knowledge_wiki");
    if (fs.existsSync(bundled)) return bundled;
  }
  return path.join(DESKTOP_ROOT, "knowledge_wiki");
}

/** 只读 Wiki2 种子（安装包 resources） */
function wiki2ReadRoot() {
  return wiki2BundledRoot();
}

/**
 * 可写 Wiki2（episodes / changelog / .graph_index）。
 * 安装包：userData/knowledge_wiki，首次从 resources 拷贝 wiki/ 种子。
 */
function wiki2WriteRoot() {
  if (isPackagedApp()) {
    const app = electronApp();
    const dir = path.join(app.getPath("userData"), "knowledge_wiki");
    try {
      fs.mkdirSync(dir, { recursive: true });
      const seeded = path.join(dir, "wiki");
      if (!fs.existsSync(seeded)) {
        copyDirRecursive(path.join(wiki2BundledRoot(), "wiki"), seeded);
      }
    } catch (_) {}
    return dir;
  }
  return wiki2BundledRoot();
}

function devKnowledgeReadRoot() {
  if (isPackagedApp() && process.resourcesPath) {
    const bundled = path.join(process.resourcesPath, "dev_knowledge");
    if (fs.existsSync(bundled)) return bundled;
  }
  return path.join(DESKTOP_ROOT, "dev_knowledge");
}

function glossaryPath() {
  const fromEnv = (process.env.ASR_GLOSSARY_PATH || "").trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(devKnowledgeReadRoot(), "glossary", "project_terms.json");
}

function sessionLogsWriteDir() {
  if (isPackagedApp()) {
    const app = electronApp();
    const dir = path.join(app.getPath("userData"), "dev_knowledge", "session_logs");
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (_) {}
    return dir;
  }
  return path.join(DESKTOP_ROOT, "dev_knowledge", "session_logs");
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
  wiki2ReadRoot,
  wiki2WriteRoot,
  wiki2BundledRoot,
  devKnowledgeReadRoot,
  glossaryPath,
  sessionLogsWriteDir,
  envFileCandidates,
  DESKTOP_ROOT
};
