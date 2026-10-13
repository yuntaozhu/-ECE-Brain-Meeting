/**
 * P0 长链路：开场 → 闭题连问 → 经营追问 → 占麦补充 → 停口 → 总结 → 散会
 * 总结/会末会等 Chat（各最多约 15s），其余为本地秒答。
 */
const { spawnSync } = require("child_process");
const path = require("path");

const r = spawnSync(
  process.execPath,
  [path.join(__dirname, "eval-dialog.cjs"), "--file", "knowledge/eval-p0-long.json"],
  { cwd: path.join(__dirname, ".."), stdio: "inherit", env: process.env }
);
process.exit(r.status == null ? 1 : r.status);
