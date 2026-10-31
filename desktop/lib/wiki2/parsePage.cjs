"use strict";

const fs = require("fs");
const path = require("path");

function parseFrontmatter(raw) {
  const m = String(raw || "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: String(raw || "") };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith("[") && v.endsWith("]")) {
      try {
        meta[kv[1]] = JSON.parse(v);
      } catch (_) {
        meta[kv[1]] = v
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^"|"$/g, "").replace(/^'|'$/g, ""))
          .filter(Boolean);
      }
    } else if (/^\d+(\.\d+)?$/.test(v)) {
      meta[kv[1]] = Number(v);
    } else {
      meta[kv[1]] = v.replace(/^"|"$/g, "");
    }
  }
  return { meta, body: m[2] || "" };
}

function sliceSection(body, marker) {
  const src = String(body || "");
  const start = src.search(new RegExp(`##\\s*\\[[^\\]]+\\][^\\n]*${marker}`, "i"));
  if (start < 0) return "";
  const rest = src.slice(start);
  const next = rest.slice(1).search(/\n##\s*\[/);
  return next < 0 ? rest.trim() : rest.slice(0, next + 1).trim();
}

function extractSnapshot(body) {
  const sec = sliceSection(body, "AI-First Snapshot") || sliceSection(body, "AI-First");
  if (!sec) return "";
  return sec
    .replace(/^##[^\n]*\n/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

function parseClaimBlocks(sectionText, kind) {
  const out = [];
  const re =
    kind === "superseded"
      ? /-\s*~~\*\*\[(SUPERSEDED-\d+)\]\*\*\s*([\s\S]*?)~~\s*([\s\S]*?)(?=\n-\s*~~\*\*\[SUPERSEDED-|\n##\s|$)/gi
      : /-\s*\*\*\[(CLAIM-\d+)\]\*\*\s*([\s\S]*?)(?=\n-\s*\*\*\[CLAIM-|\n##\s|$)/gi;
  let m;
  while ((m = re.exec(String(sectionText || "")))) {
    const id = m[1].toUpperCase();
    const statementPart = kind === "superseded" ? m[2] || "" : "";
    const block = kind === "superseded" ? m[3] || "" : m[2] || "";
    const firstLine =
      kind === "superseded"
        ? statementPart.split(/\r?\n/)[0] || ""
        : (block.split(/\r?\n/)[0] || "");
    const statement = firstLine
      .replace(/^~~|~~$/g, "")
      .replace(/\*\*/g, "")
      .trim()
      .slice(0, 220);
    if (!statement || /Failure Paths|Active Claims|AI-First/i.test(statement)) continue;
    const validFrom = (block.match(/valid_from`?:\s*([^\s|]+)/i) || [])[1] || null;
    const invalidAtRaw = (block.match(/invalid_at`?:\s*([^\s|]+)/i) || [])[1] || null;
    const invalidAt = !invalidAtRaw || invalidAtRaw === "null" ? null : invalidAtRaw;
    const confidence = Number((block.match(/confidence`?:\s*([0-9.]+)/i) || [])[1]) || null;
    const reason = ((block.match(/reason_for_rejection`?:\s*(.+)/i) || [])[1] || "").trim();
    const supersededBy = ((block.match(/superseded_by`?:\s*(.+)/i) || [])[1] || "").trim();
    out.push({
      id,
      kind: /SUPERSEDED/i.test(id) ? "superseded" : "active",
      statement,
      valid_from: validFrom,
      invalid_at: invalidAt,
      confidence,
      reason_for_rejection: reason || null,
      superseded_by: supersededBy || null
    });
  }
  return out;
}

function extractClaims(body, kind) {
  if (kind === "superseded") {
    return parseClaimBlocks(sliceSection(body, "Superseded"), "superseded");
  }
  return parseClaimBlocks(sliceSection(body, "Active Claims"), "active");
}

function extractWikilinks(text) {
  const set = new Set();
  const re = /\[\[([^\]]+)\]\]/g;
  let m;
  while ((m = re.exec(String(text || "")))) {
    set.add(m[1].trim());
  }
  return [...set];
}

function normalizeSlug(s) {
  return String(s || "")
    .replace(/^\[\[|\]\]$/g, "")
    .replace(/^ent_|^dec_|^theme_/i, "")
    .replace(/\.md$/i, "")
    .trim()
    .toLowerCase();
}

function parseWikiFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { meta, body } = parseFrontmatter(raw);
  const base = path.basename(filePath, ".md");
  const folder = path.basename(path.dirname(filePath));
  const id =
    meta.id || `${folder === "entities" ? "ent" : folder === "themes" ? "theme" : "dec"}_${base}`;
  const snapshot = extractSnapshot(body);
  const active = extractClaims(body, "active");
  const superseded = extractClaims(body, "superseded");
  const aliases = Array.isArray(meta.aliases) ? meta.aliases.map(String) : [];
  const linksMeta = Array.isArray(meta.links_to) ? meta.links_to.map(String) : [];
  const links = [
    ...new Set([...linksMeta, ...extractWikilinks(body)].map(normalizeSlug).filter(Boolean))
  ];
  return {
    id,
    slug: normalizeSlug(String(id).replace(/^(ent|dec|theme)_/i, "") || base),
    file: filePath.replace(/\\/g, "/"),
    path: filePath,
    title: meta.title || base,
    type: meta.type || folder,
    status: meta.status || "active",
    confidence: meta.confidence != null ? Number(meta.confidence) : null,
    last_updated: meta.last_updated || null,
    aliases,
    links_to: links,
    snapshot,
    active_claims: active,
    superseded_claims: superseded,
    search_text: [meta.title, ...aliases, snapshot, ...active.map((c) => c.statement)]
      .filter(Boolean)
      .join("\n")
  };
}

module.exports = {
  parseFrontmatter,
  parseWikiFile,
  extractSnapshot,
  extractClaims,
  extractWikilinks,
  normalizeSlug
};
