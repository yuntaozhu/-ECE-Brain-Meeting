#!/usr/bin/env node
/**
 * 将 inbox 缺口追加到最相关 Wiki「常见问法」（不改事实/口播）
 * 默认只处理 status=ready；可用 --status=pending,ready
 * --dry 只打印；成功后标记 status=done
 */
const fs = require("fs");
const path = require("path");
const { listInboxItems, setInboxStatus } = require("../lib/knowledge/inbox.cjs");
const { scorePagesForQuery, clearWikiCache } = require("../lib/knowledge/wiki.cjs");
const { wikiConceptsDir } = require("../lib/knowledge/paths.cjs");

const dry = process.argv.includes("--dry");
const statusRaw = process.argv.find((a) => a.startsWith("--status="))?.slice(9) || "ready";
const allowed = new Set(
  statusRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

function appendAlias(slug, alias) {
  const file = path.join(wikiConceptsDir(), `${slug}.md`);
  let md = fs.readFileSync(file, "utf8");
  if (!/##\s*常见问法/i.test(md)) {
    md += `\n\n## 常见问法\n- ${alias}\n`;
  } else if (md.includes(alias)) {
    return false;
  } else {
    md = md.replace(/(##\s*常见问法\s*\n)/i, `$1- ${alias}\n`);
  }
  if (!dry) fs.writeFileSync(file, md, "utf8");
  return true;
}

let n = 0;
for (const item of listInboxItems()) {
  if (!allowed.has(item.status)) continue;
  if (item.reason === "boundary_refuse") continue;
  const q = String(item.query || "").trim();
  if (q.length < 4) continue;
  const pages = scorePagesForQuery(q, 1);
  const top = pages[0];
  if (!top || top.score < 8) {
    console.log(`skip (no page): [${item.status}] ${q}`);
    continue;
  }
  const ok = appendAlias(top.slug, q);
  console.log(`${ok ? "append" : "dup"} -> ${top.slug}: ${q}`);
  if (ok) n += 1;
  if (!dry) {
    try {
      setInboxStatus(item.id, "done");
    } catch (_) {
      /* ignore */
    }
  }
}
clearWikiCache();
console.log(`done ${n} (dry=${dry}, status=${[...allowed].join(",")})`);
