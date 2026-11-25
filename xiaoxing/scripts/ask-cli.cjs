#!/usr/bin/env node
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { ask, askAsync } = require("../lib/ask/index.cjs");

const args = process.argv.slice(2);
const syncOnly = args.includes("--sync");
const q = args.filter((a) => a !== "--sync").join(" ").trim();
if (!q) {
  console.error('用法: npm run ask -- "你的问题"   （默认 askAsync，可走 LLM）');
  console.error('      npm run ask -- --sync "你的问题"  （仅审定库，不调 LLM）');
  process.exit(1);
}

(async () => {
  const r = syncOnly ? ask(q) : await askAsync(q, { live: true, llm: true });
  console.log(JSON.stringify(r, null, 2));
  console.log("\n小星：" + r.reply);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
