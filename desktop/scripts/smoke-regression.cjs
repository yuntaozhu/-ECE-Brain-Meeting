/**
 * 统一回归：wave6–12 + 短对话 + P0 长链路
 * 用法：npm run smoke
 */
const { spawnSync } = require("child_process");
const path = require("path");

const steps = [
  "_wave6-smoke.cjs",
  "_wave7-smoke.cjs",
  "_wave8-smoke.cjs",
  "_wave9-smoke.cjs",
  "_wave11-smoke.cjs",
  "_wave12-smoke.cjs",
  "eval-dialog.cjs",
  "eval-p0-long.cjs"
];

let failed = 0;
for (const name of steps) {
  const file = path.join(__dirname, name);
  process.stdout.write(`\n── ${name} ──\n`);
  const r = spawnSync(process.execPath, [file], {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
    env: process.env
  });
  if (r.status !== 0) {
    failed += 1;
    console.error(`FAIL ${name} exit=${r.status}`);
  }
}

if (failed) {
  console.error(`\nSMOKE_FAIL ${failed}/${steps.length}`);
  process.exit(1);
}
console.log(`\nSMOKE_OK ${steps.length}/${steps.length}`);
