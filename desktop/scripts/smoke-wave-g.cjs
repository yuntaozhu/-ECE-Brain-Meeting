/**
 * Wave G 冒烟：lint 已另跑；本脚本验 retrieve 空命中、业务 sync、n-gram。
 */
"use strict";

const assert = require("assert");
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");
const {
  buildWiki2Index,
  retrieveWiki2,
  tokenize
} = require("../lib/wiki2/index.cjs");
const { buildCatchMeUp } = require("../lib/copilot/recap.cjs");
const { detectMermaidHint } = require("../lib/copilot/mermaidHint.cjs");

// 1) schema 驱动 recap / mermaid
const recap = buildCatchMeUp(
  "会场: 双通道方案有分歧，我反对混轨\n会场: 下一步要不要拍板 VAD",
  { windowMs: 10 * 60 * 1000 }
);
assert.ok(recap.disagreements?.length >= 1, "recap disagree from schema");
assert.ok(recap.pending_decisions?.length >= 1, "recap decision from schema");
assert.ok(detectMermaidHint("我们讨论双通道 ASR 流水线架构"), "mermaid schema");

// 2) n-gram：整句可切出子串
const toks = tokenize("桌面端双通道音频采集");
assert.ok(toks.includes("音频采集") || toks.includes("双通道"), `ngram toks=${toks.slice(0, 12)}`);

// 3) sync-domain
const sync = spawnSync(process.execPath, [path.join(__dirname, "wiki2-sync-domain.cjs")], {
  cwd: path.join(__dirname, ".."),
  encoding: "utf8"
});
assert.strictEqual(sync.status, 0, sync.stderr || sync.stdout);
const syncOut = JSON.parse(sync.stdout);
assert.ok(syncOut.synced >= 10, `synced=${syncOut.synced}`);

const idx = buildWiki2Index();
assert.ok(idx.page_count >= 15, `pages after sync=${idx.page_count}`);

const biz = retrieveWiki2("全园美语是什么", { topK: 3 });
assert.ok(biz.evidence?.length >= 1, "biz retrieve");
assert.ok(
  /全园美语|美语|ABCmouse|四端/i.test(biz.preview || ""),
  "biz preview has domain content"
);
assert.ok(
  (biz.evidence || []).some((e) => /biz_|business_concept|全园/i.test(`${e.id} ${e.title} ${e.type}`)),
  "hit biz entity"
);

const miss = retrieveWiki2("火星种菜XYZ9988无关词", { topK: 2 });
assert.strictEqual(miss.mode, "wiki2-empty");
assert.ok(!(miss.evidence || []).length);

const sample = path.join(
  __dirname,
  "..",
  "knowledge_wiki",
  "wiki",
  "entities",
  "biz_quan-yuan-meiyu.md"
);
assert.ok(fs.existsSync(sample), "biz page file");

console.log(
  JSON.stringify(
    {
      ok: true,
      synced: syncOut.synced,
      pages: idx.page_count,
      bizTitles: (biz.evidence || []).map((e) => e.title),
      missMode: miss.mode,
      ngramSample: toks.filter((t) => t.length <= 4).slice(0, 8)
    },
    null,
    2
  )
);
