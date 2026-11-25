const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const KNOWLEDGE = path.join(ROOT, "knowledge");

function knowledgeRoot() {
  return KNOWLEDGE;
}

function faqFile() {
  return path.join(KNOWLEDGE, "faq-strawberry.txt");
}

/** 全部 L1 FAQ：knowledge/faq-*.txt（按文件名排序） */
function faqFiles() {
  if (!fs.existsSync(KNOWLEDGE)) return [faqFile()];
  const names = fs
    .readdirSync(KNOWLEDGE)
    .filter((n) => /^faq-.+\.txt$/i.test(n))
    .sort();
  if (!names.length) return [faqFile()];
  return names.map((n) => path.join(KNOWLEDGE, n));
}

function wikiConceptsDir() {
  return path.join(KNOWLEDGE, "wiki", "concepts");
}

function wikiIndexFile() {
  return path.join(KNOWLEDGE, "wiki", "index.md");
}

function schemaFile(name) {
  return path.join(KNOWLEDGE, "schema", name);
}

function inboxDir() {
  return path.join(KNOWLEDGE, "inbox");
}

function followupsDir() {
  return path.join(KNOWLEDGE, "followups");
}

function ingestTasksDir() {
  return path.join(KNOWLEDGE, "ingest_tasks");
}

function marketQuotesDir() {
  return path.join(KNOWLEDGE, "market", "quotes");
}

function marketRawDir() {
  return path.join(KNOWLEDGE, "raw", "market");
}

function marketSeedFile() {
  return path.join(KNOWLEDGE, "market", "seed-quotes.json");
}

function marketB2bSeedFile() {
  return path.join(KNOWLEDGE, "market", "seed-b2b-quotes.json");
}

function sessionsDir() {
  return path.join(KNOWLEDGE, "sessions");
}

function rawFirecrawlDir() {
  return path.join(KNOWLEDGE, "raw", "firecrawl");
}

function rawXunbaoDir() {
  return path.join(KNOWLEDGE, "raw", "xunbao", "snapshots");
}

function rawBriefingDir() {
  return path.join(KNOWLEDGE, "raw", "briefing");
}

function rawBriefingSnapshotsDir() {
  return path.join(rawBriefingDir(), "snapshots");
}

function rawBucketDir(bucket) {
  if (bucket === "xunbao") return rawXunbaoDir();
  if (bucket === "market") return marketRawDir();
  if (bucket === "briefing") return rawBriefingSnapshotsDir();
  if (bucket === "rice") return path.join(KNOWLEDGE, "raw", "rice");
  return rawFirecrawlDir();
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

module.exports = {
  ROOT,
  knowledgeRoot,
  faqFile,
  faqFiles,
  wikiConceptsDir,
  wikiIndexFile,
  schemaFile,
  inboxDir,
  followupsDir,
  ingestTasksDir,
  marketQuotesDir,
  marketRawDir,
  marketSeedFile,
  marketB2bSeedFile,
  sessionsDir,
  rawFirecrawlDir,
  rawXunbaoDir,
  rawBriefingDir,
  rawBriefingSnapshotsDir,
  rawBucketDir,
  ensureDir
};
