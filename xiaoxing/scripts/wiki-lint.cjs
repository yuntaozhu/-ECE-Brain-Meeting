#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { listConceptPages, parseIndexEntries } = require("../lib/knowledge/wiki.cjs");
const { loadFaqCards } = require("../lib/knowledge/faq.cjs");
const { wikiConceptsDir } = require("../lib/knowledge/paths.cjs");

const issues = [];
const pages = listConceptPages();
const index = parseIndexEntries();
const indexSlugs = new Set(index.map((e) => e.slug));
const pageSlugs = new Set(pages.map((p) => p.slug));

for (const e of index) {
  if (!pageSlugs.has(e.slug)) issues.push(`index 有缺页: ${e.slug}`);
}
for (const p of pages) {
  if (!indexSlugs.has(p.slug)) issues.push(`概念页未入 index: ${p.slug}`);
  if (!p.speak) issues.push(`${p.slug} 缺少口播`);
  if (!p.facts) issues.push(`${p.slug} 缺少事实`);
  if (!(p.sources || []).length) issues.push(`${p.slug} 缺少出处`);
  for (const r of p.related || []) {
    const file = path.join(wikiConceptsDir(), `${r}.md`);
    if (!fs.existsSync(file)) issues.push(`${p.slug} 断链 [[${r}]]`);
  }
}

const faqs = loadFaqCards();
if (faqs.length < 5) issues.push(`FAQ 条目过少: ${faqs.length}`);

if (issues.length) {
  console.error("lint FAIL");
  for (const i of issues) console.error(" -", i);
  process.exit(1);
}
console.log(`lint OK · pages=${pages.length} faq=${faqs.length}`);
