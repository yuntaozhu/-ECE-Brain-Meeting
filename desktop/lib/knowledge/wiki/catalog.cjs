/** 概念页目录 / 索引 / mtime */
const fs = require("fs");
const path = require("path");
const {
  conceptsReadDirs,
  indexReadFile,
  indexWriteFile
} = require("./paths.cjs");
const { parseConceptMarkdown } = require("./parse.cjs");

function listConceptPages() {
  const seen = new Set();
  const out = [];
  for (const dir of conceptsReadDirs()) {
    let files = [];
    try {
      files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
    } catch (_) {
      continue;
    }
    for (const f of files.sort()) {
      const slug = f.replace(/\.md$/i, "");
      if (seen.has(slug)) continue;
      seen.add(slug);
      let raw = "";
      try {
        raw = fs.readFileSync(path.join(dir, f), "utf8");
      } catch (_) {
        continue;
      }
      const parsed = parseConceptMarkdown(raw);
      if (!parsed.title && raw.trim().length < 40) continue;
      const title = parsed.title || slug;
      const summary = [title, parsed.speak, ...(parsed.aliases || [])]
        .filter(Boolean)
        .join("\n")
        .slice(0, 800);
      out.push({
        slug,
        title,
        speak: parsed.speak,
        facts: parsed.facts,
        bounds: parsed.bounds,
        related: parsed.related,
        sources: parsed.sources,
        aliases: parsed.aliases,
        body: parsed.body,
        summary,
        file: path.join(dir, f)
      });
    }
  }
  return out;
}

/**
 * 解析 index.md 目录行
 * @returns {Array<{ slug: string, blurb: string, type: string, aliases: string[] }>}
 */
function parseIndexEntries() {
  let raw = "";
  try {
    raw = fs.readFileSync(indexReadFile(), "utf8");
  } catch (_) {
    try {
      raw = fs.readFileSync(indexWriteFile(), "utf8");
    } catch (__) {
      return [];
    }
  }
  const out = [];
  for (const line of raw.split("\n")) {
    const m = line.match(
      /^\s*-\s+([a-z0-9\-]+)\s*\|\s*([^|]+?)(?:\s*\|\s*type=(\w+))?(?:\s*\|\s*aliases=(.+))?$/i
    );
    if (!m) continue;
    out.push({
      slug: m[1].trim(),
      blurb: m[2].trim(),
      type: (m[3] || "concept").trim(),
      aliases: (m[4] || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    });
  }
  return out;
}

function wikiMtimeKey() {
  let max = 0;
  let count = 0;
  for (const dir of conceptsReadDirs()) {
    try {
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
      count += files.length;
      for (const f of files) {
        try {
          max = Math.max(max, fs.statSync(path.join(dir, f)).mtimeMs);
        } catch (_) {}
      }
    } catch (_) {}
  }
  try {
    max = Math.max(max, fs.statSync(indexReadFile()).mtimeMs);
  } catch (_) {}
  return `wiki:${count}:${max}`;
}

function getPageBySlug(slug) {
  return listConceptPages().find((p) => p.slug === slug) || null;
}

module.exports = {
  listConceptPages,
  parseIndexEntries,
  wikiMtimeKey,
  getPageBySlug
};
