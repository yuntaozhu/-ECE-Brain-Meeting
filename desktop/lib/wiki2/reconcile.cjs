"use strict";

const fs = require("fs");
const path = require("path");
const { wiki2Root, changelogDir, ensureWiki2Dirs } = require("./paths.cjs");
const { parseWikiFile, parseFrontmatter } = require("./parsePage.cjs");
const { buildWiki2Index } = require("./buildIndex.cjs");

/**
 * 最小 Reconciler：把新 claim 追加到 Active；若标记 replaces，则把匹配旧 claim 移到 Superseded。
 * @param {{ target_wiki_page: string, statement: string, replaces_or_contradicts_topic?: string|null, reason_for_change?: string|null, valid_from?: string, confidence?: number, source_citation?: string }} claim
 * @param {{ dry?: boolean }} [opts]
 */
function reconcileClaim(claim, opts = {}) {
  ensureWiki2Dirs();
  const rel = String(claim?.target_wiki_page || "").replace(/^\/+/, "");
  if (!rel) return { ok: false, error: "missing_target" };
  const abs = path.isAbsolute(rel) ? rel : path.join(wiki2Root(), rel);
  if (!fs.existsSync(abs)) return { ok: false, error: `missing_page:${rel}` };

  const raw = fs.readFileSync(abs, "utf8");
  const parsed = parseWikiFile(abs);
  const now = claim.valid_from || new Date().toISOString();
  const nextIdNum =
    (parsed.active_claims || []).reduce((m, c) => {
      const n = Number(String(c.id || "").replace(/\D/g, "")) || 0;
      return Math.max(m, n);
    }, 0) + 1;
  const claimId = `CLAIM-${String(nextIdNum).padStart(2, "0")}`;

  let bodyRaw = raw;
  const fm = parseFrontmatter(raw);
  let body = fm.body;
  const topic = String(claim.replaces_or_contradicts_topic || "").trim();
  const supersededMoved = [];

  if (topic) {
    const activeSecRe =
      /(##\s*\[2\][^\n]*Active Claims[\s\S]*?)(?=\n##\s*\[3\]|\n##\s|$)/i;
    const m = body.match(activeSecRe);
    if (m) {
      let activeSec = m[1];
      const claimBlockRe =
        /(- \*\*\[CLAIM-\d+\]\*\*[\s\S]*?)(?=\n- \*\*\[CLAIM-|\n##\s|$)/gi;
      activeSec = activeSec.replace(claimBlockRe, (block) => {
        const st = block.split("\n")[0] || "";
        if (topic && st.includes(topic.slice(0, Math.min(8, topic.length)))) {
          supersededMoved.push(block.trim());
          return "";
        }
        // 宽松：关键词重叠
        const toks = topic.split(/\s+/).filter((t) => t.length >= 2);
        if (toks.some((t) => st.includes(t))) {
          supersededMoved.push(block.trim());
          return "";
        }
        return block;
      });
      body = body.replace(activeSecRe, activeSec.replace(/\n{3,}/g, "\n\n"));
    }
  }

  const newBlock = [
    `- **[${claimId}]** ${String(claim.statement || "").trim()}`,
    `  - \`valid_from\`: ${now} | \`invalid_at\`: null | \`confidence\`: ${
      claim.confidence != null ? claim.confidence : 0.7
    }`,
    `  - \`source\`: ${claim.source_citation || "[[raw/episodes/unknown]]"}`
  ].join("\n");

  if (/##\s*\[2\][^\n]*Active Claims/i.test(body)) {
    body = body.replace(
      /(##\s*\[2\][^\n]*Active Claims[^\n]*\n)/i,
      `$1${newBlock}\n`
    );
  } else {
    body += `\n\n## [2] Active Claims (当前有效事实)\n${newBlock}\n`;
  }

  if (supersededMoved.length) {
    const movedMd = supersededMoved
      .map((block, i) => {
        const oldId = (block.match(/\[CLAIM-(\d+)\]/) || [])[1] || String(i + 1);
        const first = block.split("\n")[0].replace(/^- \*\*\[CLAIM-\d+\]\*\*\s*/, "");
        return [
          `- ~~**[SUPERSEDED-${oldId}]** ${first}~~`,
          `  - \`valid_from\`: unknown | \`invalid_at\`: ${now}`,
          `  - \`superseded_by\`: \`[${claimId}]\``,
          `  - \`reason_for_rejection\`: ${
            claim.reason_for_change || claim.replaces_or_contradicts_topic || "被新断言取代"
          }`
        ].join("\n");
      })
      .join("\n");
    if (/##\s*\[3\][^\n]*Superseded/i.test(body)) {
      body = body.replace(
        /(##\s*\[3\][^\n]*Superseded[^\n]*\n)/i,
        `$1${movedMd}\n`
      );
    } else {
      body += `\n\n## [3] Superseded & Failure Paths\n${movedMd}\n`;
    }
  }

  // 刷新 snapshot 第一行（轻量）
  body = body.replace(
    /(##\s*\[1\][^\n]*Snapshot[^\n]*\n)([\s\S]*?)(?=\n##\s*\[2\]|$)/i,
    (all, head) => {
      const line = `- **当前生效结论**：${String(claim.statement || "").slice(0, 80)}\n- **核心红线**：见 Active Claims 与历史 Superseded。\n`;
      return head + line;
    }
  );

  const metaLines = Object.entries({
    ...fm.meta,
    last_updated: now
  })
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: ${JSON.stringify(v)}`;
      return `${k}: ${v}`;
    })
    .join("\n");

  const nextMd = `---\n${metaLines}\n---\n\n${body.trim()}\n`;
  const log = {
    page_uri: rel,
    added_claims: [`[${claimId}] ${String(claim.statement || "").slice(0, 80)}`],
    superseded_claims: supersededMoved.map((b) => b.split("\n")[0].slice(0, 100)),
    unresolved_ambiguities: [],
    at: now
  };

  if (!opts.dry) {
    fs.writeFileSync(abs, nextMd, "utf8");
    const logFile = path.join(
      changelogDir(),
      `recon_${Date.now().toString(36)}.json`
    );
    fs.writeFileSync(logFile, JSON.stringify(log, null, 2), "utf8");
    try {
      buildWiki2Index();
    } catch (_) {}
  }

  return { ok: true, dry: Boolean(opts.dry), claim_id: claimId, log, path: abs };
}

/**
 * 批量合入 ingest 产出的 extracted_claims。
 */
function reconcileClaims(claims, opts = {}) {
  const list = Array.isArray(claims) ? claims : [];
  const results = [];
  for (const c of list) {
    results.push(reconcileClaim(c, opts));
  }
  return {
    ok: results.every((r) => r.ok),
    results,
    applied: results.filter((r) => r.ok).length
  };
}

module.exports = {
  reconcileClaim,
  reconcileClaims
};
