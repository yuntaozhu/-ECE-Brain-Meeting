/**
 * 将 knowledge/wiki/concepts/*.md 桥接到 knowledge_wiki/wiki/entities/biz_*.md
 * 口播→Snapshot；事实→Active Claims；边界→Superseded（禁止承诺/误区口径）
 *
 *   node scripts/wiki2-sync-domain.cjs
 *   node scripts/wiki2-sync-domain.cjs --dry
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { parseConceptMarkdown } = require("../lib/knowledge/wiki/parse.cjs");
const { entitiesDir, ensureWiki2Dirs } = require("../lib/wiki2/paths.cjs");
const { buildWiki2Index } = require("../lib/wiki2/buildIndex.cjs");
const { normalizeSlug } = require("../lib/wiki2/parsePage.cjs");

const ROOT = path.join(__dirname, "..");
const CONCEPTS = path.join(ROOT, "knowledge", "wiki", "concepts");
const dry = process.argv.includes("--dry");

function escYaml(s) {
  return String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

function factLines(facts) {
  return String(facts || "")
    .split(/\n+/)
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter((l) => l && l.length > 2);
}

function boundLines(bounds) {
  return String(bounds || "")
    .split(/\n+/)
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter((l) => l && l.length > 2);
}

function conceptToBizPage(slug, parsed) {
  const now = new Date().toISOString();
  const id = `biz_${normalizeSlug(slug).replace(/-/g, "_")}`;
  const title = parsed.title || slug;
  const speak = String(parsed.speak || "").trim().slice(0, 100);
  const facts = factLines(parsed.facts).slice(0, 6);
  const bounds = boundLines(parsed.bounds).slice(0, 6);
  const aliases = (parsed.aliases || []).slice(0, 12);
  const related = (parsed.related || []).map((r) => `biz_${normalizeSlug(r).replace(/-/g, "_")}`);

  const claims = facts.map((f, i) => {
    const n = String(i + 1).padStart(2, "0");
    return [
      `- **[CLAIM-${n}]** ${f.slice(0, 200)}`,
      `  - \`valid_from\`: ${now} | \`invalid_at\`: null | \`confidence\`: 0.85`,
      `  - \`source\`: [[knowledge/wiki/concepts/${slug}]]`
    ].join("\n");
  });

  const supers = bounds.map((b, i) => {
    const n = String(i + 1).padStart(2, "0");
    return [
      `- ~~**[SUPERSEDED-${n}]** ${b.slice(0, 180)}~~`,
      `  - \`valid_from\`: ${now} | \`invalid_at\`: ${now}`,
      `  - \`superseded_by\`: \`[CLAIM-01]\``,
      `  - \`reason_for_rejection\`: 业务边界/禁止承诺口径（来自概念页「边界」）`
    ].join("\n");
  });

  const aliasJson = JSON.stringify(aliases);
  const linksJson = JSON.stringify(related.map((r) => `[[${r}]]`));

  return {
    id,
    file: path.join(entitiesDir(), `biz_${normalizeSlug(slug)}.md`),
    md: [
      `---`,
      `id: ${id}`,
      `title: "${escYaml(title)}"`,
      `type: business_concept`,
      `status: active`,
      `confidence: 0.85`,
      `last_updated: ${now}`,
      `aliases: ${aliasJson}`,
      `links_to: ${linksJson}`,
      `source_concept: ${slug}`,
      `---`,
      ``,
      `## [1] AI-First Snapshot (会中实时注入区 - 严控 100 字内)`,
      `- **当前生效结论**：${speak || title}`,
      `- **核心红线**：见 Superseded 中的边界口径；口播勿越界承诺。`,
      ``,
      `## [2] Active Claims (当前有效事实)`,
      claims.length ? claims.join("\n") : `- **[CLAIM-01]** ${title}`,
      ``,
      `## [3] Superseded & Failure Paths (已淘汰方案 - 严禁直接删除)`,
      supers.length
        ? supers.join("\n")
        : `- ~~**[SUPERSEDED-01]** （无显式边界条，待补）~~\n  - \`valid_from\`: ${now} | \`invalid_at\`: ${now}\n  - \`superseded_by\`: \`[CLAIM-01]\`\n  - \`reason_for_rejection\`: placeholder`,
      ``
    ].join("\n")
  };
}

function main() {
  ensureWiki2Dirs();
  if (!fs.existsSync(CONCEPTS)) {
    console.error("[wiki2-sync-domain] missing", CONCEPTS);
    process.exit(1);
  }
  const files = fs
    .readdirSync(CONCEPTS)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"));
  const written = [];
  for (const f of files) {
    const slug = f.replace(/\.md$/i, "");
    const raw = fs.readFileSync(path.join(CONCEPTS, f), "utf8");
    const parsed = parseConceptMarkdown(raw);
    const page = conceptToBizPage(slug, parsed);
    written.push({ slug, id: page.id, file: page.file });
    if (!dry) fs.writeFileSync(page.file, page.md, "utf8");
  }
  let index = null;
  if (!dry) {
    index = buildWiki2Index();
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        dry,
        synced: written.length,
        pages: written.map((w) => w.id),
        index_pages: index?.page_count ?? null
      },
      null,
      2
    )
  );
}

main();
