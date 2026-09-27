/**
 * 用题目表验收语义检索前几条标题。
 * 用法：node scripts/eval-rag.cjs
 */
const fs = require("fs");
const path = require("path");

const rootEnv = path.join(__dirname, "..", "..", ".env");
const deskEnv = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: fs.existsSync(rootEnv) ? rootEnv : deskEnv });

const { retrieveSemantic, warmIndexFromDisk } = require("../lib/semanticRag.cjs");

async function main() {
  const file = path.join(__dirname, "..", "knowledge", "eval-questions.json");
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  const warm = warmIndexFromDisk();
  console.log("[eval-rag] 索引", warm);
  if (!warm.ok) {
    console.error("[eval-rag] 无本地索引，请先 npm run rag:index");
    process.exit(1);
  }
  let pass = 0;
  for (const row of rows) {
    const res = await retrieveSemantic(row.q, 4, { preferBiz: true });
    const titles = (res.hits || []).map((h) => h.title).join(" | ");
    const blob = (res.hits || [])
      .map((h) => `${h.title}\n${h.snippet || ""}`)
      .join("\n")
      .split("\n")
      .filter((line) => !/^\s*边界[:：]/.test(line))
      .join("\n");
    const hit = (res.hits || []).some((h) => String(h.title || "").includes(row.expectTitle));
    const forbidden = (row.forbid || []).filter((w) => blob.includes(w));
    const ok = hit && forbidden.length === 0 && res.mode === "semantic";
    if (ok) pass += 1;
    console.log(`${ok ? "PASS" : "FAIL"} ${row.q}`);
    console.log(`  mode=${res.mode} expect~${row.expectTitle} hit=${hit}`);
    console.log(`  titles: ${titles}`);
    if (forbidden.length) console.log(`  forbid: ${forbidden.join("、")}`);
  }
  console.log(`[eval-rag] ${pass}/${rows.length}`);
  process.exit(pass === rows.length ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});