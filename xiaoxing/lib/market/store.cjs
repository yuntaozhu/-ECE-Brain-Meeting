"use strict";

const fs = require("fs");
const path = require("path");
const {
  marketQuotesDir,
  marketSeedFile,
  marketB2bSeedFile,
  ensureDir
} = require("../knowledge/paths.cjs");
const { normalizeQuote, validateQuote } = require("./normalize.cjs");

function todayFile() {
  const d = new Date().toISOString().slice(0, 10);
  return path.join(marketQuotesDir(), `quotes_${d}.jsonl`);
}

function listQuoteFiles() {
  ensureDir(marketQuotesDir());
  return fs
    .readdirSync(marketQuotesDir())
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => path.join(marketQuotesDir(), f))
    .sort()
    .reverse();
}

function appendQuotes(quotes, file = todayFile()) {
  ensureDir(marketQuotesDir());
  const lines = [];
  const okList = [];
  for (const raw of quotes) {
    const q = normalizeQuote(raw);
    const v = validateQuote(q);
    if (!v.ok) continue;
    lines.push(JSON.stringify(q));
    okList.push(q);
  }
  if (lines.length) fs.appendFileSync(file, lines.join("\n") + "\n", "utf8");
  return { file, count: okList.length, quotes: okList };
}

function writeQuotesReplace(quotes, file = todayFile()) {
  ensureDir(marketQuotesDir());
  const okList = [];
  const lines = [];
  for (const raw of quotes) {
    const q = normalizeQuote(raw);
    const v = validateQuote(q);
    if (!v.ok) continue;
    lines.push(JSON.stringify(q));
    okList.push(q);
  }
  fs.writeFileSync(file, lines.join("\n") + (lines.length ? "\n" : ""), "utf8");
  return { file, count: okList.length, quotes: okList };
}

function loadAllQuotes({ limitFiles = 7 } = {}) {
  const files = listQuoteFiles().slice(0, limitFiles);
  const out = [];
  for (const f of files) {
    const raw = fs.readFileSync(f, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        out.push(JSON.parse(line));
      } catch (_) {}
    }
  }
  return out;
}

function loadSeedQuotes() {
  const p = marketSeedFile();
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadSeedB2bQuotes() {
  const p = marketB2bSeedFile();
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function ingestSeed({ replace = true } = {}) {
  const seed = loadSeedQuotes();
  if (replace) return writeQuotesReplace(seed);
  return appendQuotes(seed);
}

function ingestSeedB2b({ replace = false } = {}) {
  const seed = loadSeedB2bQuotes();
  if (replace) return writeQuotesReplace(seed);
  return appendQuotes(seed);
}

/** 批发种子 + B2B 地头种子合并入库（replace 日文件） */
function ingestSeedWithB2b() {
  const merged = [...loadSeedQuotes(), ...loadSeedB2bQuotes()];
  return writeQuotesReplace(merged);
}

module.exports = {
  todayFile,
  listQuoteFiles,
  appendQuotes,
  writeQuotesReplace,
  loadAllQuotes,
  loadSeedQuotes,
  loadSeedB2bQuotes,
  ingestSeed,
  ingestSeedB2b,
  ingestSeedWithB2b
};
