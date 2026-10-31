"use strict";

const fs = require("fs");
const path = require("path");
const {
  ensureWiki2Dirs,
  decisionsDir,
  entitiesDir,
  themesDir,
  indexPath,
  graphIndexDir
} = require("./paths.cjs");
const { parseWikiFile, normalizeSlug } = require("./parsePage.cjs");

function listMd(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !/^TEMPLATE/i.test(f))
    .map((f) => path.join(dir, f));
}

function tokenize(text) {
  const s = String(text || "").toLowerCase();
  const cn = s.match(/[\u4e00-\u9fff]{2,}/g) || [];
  const en = s.match(/[a-z0-9_]{2,}/g) || [];
  return [...cn, ...en];
}

function buildWiki2Index() {
  ensureWiki2Dirs();
  const files = [
    ...listMd(decisionsDir()),
    ...listMd(entitiesDir()),
    ...listMd(themesDir())
  ];
  const pages = [];
  for (const f of files) {
    try {
      pages.push(parseWikiFile(f));
    } catch (err) {
      pages.push({
        id: path.basename(f),
        error: String(err?.message || err),
        path: f
      });
    }
  }
  const bySlug = {};
  const byId = {};
  for (const p of pages) {
    if (p.error) continue;
    bySlug[p.slug] = p.id;
    byId[p.id] = p;
    for (const a of p.aliases || []) {
      bySlug[normalizeSlug(a)] = p.id;
    }
  }

  const links = [];
  const backlinks = {};
  for (const p of pages) {
    if (p.error) continue;
    for (const target of p.links_to || []) {
      const tid = bySlug[normalizeSlug(target)] || bySlug[target] || null;
      links.push({ from: p.id, to_slug: target, to_id: tid });
      if (tid) {
        if (!backlinks[tid]) backlinks[tid] = [];
        if (!backlinks[tid].includes(p.id)) backlinks[tid].push(p.id);
      }
    }
  }

  const df = {};
  for (const p of pages) {
    if (p.error) continue;
    const toks = new Set(tokenize(p.search_text));
    for (const t of toks) df[t] = (df[t] || 0) + 1;
  }

  const index = {
    version: 1,
    built_at: new Date().toISOString(),
    page_count: pages.filter((p) => !p.error).length,
    pages: pages.filter((p) => !p.error).map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      type: p.type,
      status: p.status,
      confidence: p.confidence,
      aliases: p.aliases,
      links_to: p.links_to,
      snapshot: p.snapshot,
      active_claims: p.active_claims,
      superseded_claims: p.superseded_claims,
      search_text: p.search_text,
      tokens: tokenize(p.search_text)
    })),
    links,
    backlinks,
    df,
    n_docs: pages.filter((p) => !p.error).length
  };

  fs.mkdirSync(graphIndexDir(), { recursive: true });
  fs.writeFileSync(indexPath(), JSON.stringify(index, null, 2), "utf8");
  return index;
}

function loadWiki2Index() {
  const p = indexPath();
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (_) {
    return null;
  }
}

function loadOrBuildIndex() {
  const existing = loadWiki2Index();
  if (existing?.pages?.length) return existing;
  return buildWiki2Index();
}

module.exports = {
  buildWiki2Index,
  loadWiki2Index,
  loadOrBuildIndex,
  tokenize
};
