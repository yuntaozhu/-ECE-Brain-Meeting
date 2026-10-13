/** Wiki Ingest：追加常见问法 / 日志 / FAQ 块 */
const fs = require("fs");
const path = require("path");
const { debugLog } = require("../../platform/debugLog.cjs");
const {
  ensureWikiDirs,
  conceptsWriteDir,
  logWriteFile
} = require("./paths.cjs");
const { normalizeText } = require("./parse.cjs");
const { getPageBySlug } = require("./catalog.cjs");
const { matchConceptForQuestion } = require("./query.cjs");

function appendAliasToConcept(opts = {}) {
  ensureWikiDirs();
  const q = String(opts.question || "").trim().slice(0, 80);
  if (!q) return { ok: false, reason: "empty" };

  let page = opts.slug ? getPageBySlug(opts.slug) : matchConceptForQuestion(q);
  if (!page) return { ok: false, reason: "no_match" };

  const existing = new Set((page.aliases || []).map(normalizeText));
  if (existing.has(normalizeText(q))) {
    return { ok: true, skipped: true, slug: page.slug, reason: "alias_exists" };
  }

  if (opts.dry) {
    return { ok: true, dry: true, slug: page.slug, wouldAppend: q };
  }

  const writePath = path.join(conceptsWriteDir(), `${page.slug}.md`);
  let md = "";
  try {
    if (fs.existsSync(writePath)) {
      md = fs.readFileSync(writePath, "utf8");
    } else {
      md = page.body;
    }
  } catch (_) {
    md = page.body;
  }

  if (/##\s*常见问法/i.test(md)) {
    // 去掉「待沉淀」占位后追加
    md = md.replace(/(##\s*常见问法\s*\n)([\s\S]*?)$/i, (_, head, rest) => {
      let block = rest.replace(/^-?\s*（待沉淀）\s*\n?/gm, "");
      if (!block.endsWith("\n")) block += "\n";
      block += `- ${q}\n`;
      return head + block;
    });
  } else {
    md = md.trimEnd() + `\n\n## 常见问法\n- ${q}\n`;
  }

  try {
    fs.writeFileSync(writePath, md, "utf8");
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }

  appendWikiLog("ingest", `alias→${page.slug}`, q.slice(0, 40));
  debugLog.info("WikiKnowledge", "常见问法已追加", { slug: page.slug, q: q.slice(0, 40) });
  return { ok: true, slug: page.slug, file: writePath };
}

function appendWikiLog(op, title, detail) {
  ensureWikiDirs();
  const day = new Date().toISOString().slice(0, 10);
  const block = `\n## [${day}] ${op} | ${title}\n\n${detail || ""}\n`;
  try {
    if (!fs.existsSync(logWriteFile())) {
      fs.writeFileSync(logWriteFile(), `# Wiki 变更日志\n${block}`, "utf8");
    } else {
      fs.appendFileSync(logWriteFile(), block, "utf8");
    }
  } catch (_) {}
}

/**
 * 从页面口播生成 FAQ 条目（不覆盖已有问句）
 * @param {{ slug: string, question?: string }} opts
 */
function faqBlockFromPage(opts = {}) {
  const page = getPageBySlug(opts.slug);
  if (!page?.speak) return null;
  const q = String(opts.question || page.aliases?.[0] || page.title || "").trim().slice(0, 80);
  const a = page.speak.replace(/\s+/g, " ").trim().slice(0, 100);
  if (!q || a.length < 8) return null;
  return { q, a, block: `\n## Q: ${q}\n\nA: ${a}\n` };
}

function ingestInboxAliases(entries, opts = {}) {
  ensureWikiDirs();
  const results = [];
  for (const e of entries || []) {
    const q = String(e.q || e.rewritten || e.question || "").trim();
    if (!q) continue;
    const r = appendAliasToConcept({ question: q, dry: opts.dry });
    results.push({ q: q.slice(0, 40), ...r });
  }
  const appended = results.filter((r) => r.ok && !r.skipped && !r.dry).length;
  const skipped = results.filter((r) => r.skipped).length;
  const unmatched = results.filter((r) => r.reason === "no_match").length;
  if (!opts.dry && appended) {
    appendWikiLog("ingest", "inbox→aliases", `追加 ${appended}，跳过 ${skipped}，未匹配 ${unmatched}`);
  }
  return { ok: true, appended, skipped, unmatched, results };
}

module.exports = {
  appendAliasToConcept,
  appendWikiLog,
  faqBlockFromPage,
  ingestInboxAliases
};
