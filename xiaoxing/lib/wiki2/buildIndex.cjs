"use strict";

const fs = require("fs");
const path = require("path");
const {
  wikiConceptsDir,
  wikiIndexFile,
  knowledgeRoot,
  ensureDir
} = require("../knowledge/paths.cjs");
const { parseConceptMarkdown } = require("../knowledge/parse.cjs");
const { tokenize, normalizeSlug } = require("./tokenize.cjs");

function wiki2IndexPath() {
  return path.join(knowledgeRoot(), "wiki", "wiki2-index.json");
}

function parseIndexAliases() {
  const file = wikiIndexFile();
  if (!fs.existsSync(file)) return new Map();
  const raw = fs.readFileSync(file, "utf8");
  const map = new Map();
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^-\s+([^|]+)\|([^|]*)\|(.*)$/);
    if (!m) continue;
    const slug = m[1].trim();
    const blurb = m[2].trim();
    const aliasesM = m[3].match(/aliases=([^|]*)/);
    const aliases = aliasesM
      ? aliasesM[1]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    map.set(slug, { blurb, aliases });
  }
  return map;
}

function buildWiki2Index() {
  const dir = wikiConceptsDir();
  const idxMap = parseIndexAliases();
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".md"))
    : [];
  const pages = [];
  for (const f of files) {
    const slug = f.replace(/\.md$/, "");
    const full = path.join(dir, f);
    const md = fs.readFileSync(full, "utf8");
    const parsed = parseConceptMarkdown(md);
    const idx = idxMap.get(slug) || { blurb: "", aliases: [] };
    const aliases = [...new Set([...(parsed.aliases || []), ...(idx.aliases || [])])];
    const search_text = [
      parsed.title,
      aliases.join(" "),
      parsed.speak,
      parsed.facts,
      parsed.bounds,
      idx.blurb
    ].join("\n");
    const tokens = tokenize(search_text);
    pages.push({
      id: `concept:${slug}`,
      slug,
      title: parsed.title || slug,
      type: "concept",
      status: "active",
      aliases,
      blurb: idx.blurb || "",
      speak: parsed.speak || "",
      snapshot: parsed.speak || idx.blurb || "",
      facts: parsed.facts || "",
      bounds: parsed.bounds || "",
      sources: parsed.sources || [],
      links_to: parsed.related || [],
      search_text,
      tokens
    });
  }

  const bySlug = {};
  for (const p of pages) {
    bySlug[normalizeSlug(p.slug)] = p.id;
    for (const a of p.aliases || []) {
      bySlug[normalizeSlug(a)] = p.id;
    }
  }

  const links = [];
  const backlinks = {};
  for (const p of pages) {
    for (const target of p.links_to || []) {
      const tid = bySlug[normalizeSlug(target)] || null;
      links.push({ from: p.id, to_slug: target, to_id: tid });
      if (tid) {
        if (!backlinks[tid]) backlinks[tid] = [];
        if (!backlinks[tid].includes(p.id)) backlinks[tid].push(p.id);
      }
    }
  }

  const df = {};
  for (const p of pages) {
    const uniq = new Set(p.tokens || []);
    for (const t of uniq) df[t] = (df[t] || 0) + 1;
  }

  const index = {
    version: 1,
    product: "xiaoxing",
    built_at: new Date().toISOString(),
    page_count: pages.length,
    n_docs: pages.length,
    pages: pages.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      type: p.type,
      status: p.status,
      aliases: p.aliases,
      blurb: p.blurb,
      speak: p.speak,
      snapshot: p.snapshot,
      facts: p.facts,
      bounds: p.bounds,
      sources: p.sources,
      links_to: p.links_to,
      search_text: p.search_text,
      tokens: p.tokens
    })),
    links,
    backlinks,
    df,
    bySlug
  };

  ensureDir(path.dirname(wiki2IndexPath()));
  fs.writeFileSync(wiki2IndexPath(), JSON.stringify(index), "utf8");
  return index;
}

let _mem = null;

function loadOrBuildIndex(opts = {}) {
  if (!opts.force && _mem) return _mem;
  const p = wiki2IndexPath();
  if (!opts.force && fs.existsSync(p)) {
    try {
      _mem = JSON.parse(fs.readFileSync(p, "utf8"));
      return _mem;
    } catch (_) {}
  }
  _mem = buildWiki2Index();
  return _mem;
}

function clearWiki2Cache() {
  _mem = null;
}

module.exports = {
  wiki2IndexPath,
  buildWiki2Index,
  loadOrBuildIndex,
  clearWiki2Cache,
  tokenize
};
