/**
 * 开发态：desktop/ 下业务知识；研发知识在仓库根 dev_knowledge/
 * 安装包：resources/ 只读种子 + userData/ 可写运行态
 */
const fs = require("fs");
const path = require("path");

/** desktop/ 根目录（本文件在 lib/platform/） */
const DESKTOP_ROOT = path.join(__dirname, "..", "..");
/** 仓库根（与 desktop 同级） */
const REPO_ROOT = path.join(DESKTOP_ROOT, "..");

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

function wiki2ReadRoot() {
  return wiki2BundledRoot();
}

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

/** 根目录全局研发知识库（只读查阅 / 打包种子） */
function devKnowledgeReadRoot() {
  if (isPackagedApp() && process.resourcesPath) {
    const bundled = path.join(process.resourcesPath, "dev_knowledge");
    if (fs.existsSync(bundled)) return bundled;
  }
  return path.join(REPO_ROOT, "dev_knowledge");
}

/** 大智专属热词（优先）；兼容旧打包路径 glossary/project_terms.json */
function glossaryPath() {
  const fromEnv = (process.env.ASR_GLOSSARY_PATH || "").trim();
  if (fromEnv) return path.resolve(fromEnv);
  const root = devKnowledgeReadRoot();
  const project = path.join(root, "projects", "desktop", "glossary", "project_terms.json");
  if (fs.existsSync(project)) return project;
  const legacy = path.join(root, "glossary", "project_terms.json");
  if (fs.existsSync(legacy)) return legacy;
  return project;
}

/** 跨项目通用技术热词 */
function sharedGlossaryPath() {
  return path.join(devKnowledgeReadRoot(), "shared", "glossary", "common_tech_terms.json");
}

/**
 * 会中速记 / bridge 等运行态日志（不在全局 dev_knowledge）
 * 开发态：desktop/knowledge/sessions；安装包：userData/knowledge/sessions
 */
function sessionLogsWriteDir() {
  const dir = path.join(knowledgeWriteRoot(), "sessions");
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (_) {}
  return dir;
}

function envFileCandidates() {
  const list = [];
  if (isPackagedApp() && process.resourcesPath) {
    list.push(path.join(process.resourcesPath, ".env"));
  }
  list.push(path.join(REPO_ROOT, ".env"));
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
  sharedGlossaryPath,
  sessionLogsWriteDir,
  envFileCandidates,
  DESKTOP_ROOT,
  REPO_ROOT
};
