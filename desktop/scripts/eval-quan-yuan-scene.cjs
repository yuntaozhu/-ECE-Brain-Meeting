/**
 * 园长追问场景：定义 → 准入与条件 → 师资与家长 → 合规 → 账与收费 → 支持
 *   npm run dialog:eval:scene
 *   npm run dialog:eval:scene -- --only S11-price
 */
const { spawnSync } = require("child_process");
const path = require("path");

const extra = process.argv.slice(2);
const r = spawnSync(
  process.execPath,
  [path.join(__dirname, "eval-dialog.cjs"), "--file", "knowledge/eval-quan-yuan-scene.json", ...extra],
  { cwd: path.join(__dirname, ".."), stdio: "inherit", env: process.env }
);
process.exit(r.status == null ? 1 : r.status);
