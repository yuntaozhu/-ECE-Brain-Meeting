#!/usr/bin/env node
/**
 * 会议控制串联冒烟：events + bot + xiaoxing host + summary speaker
 */
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const steps = [
  ["node", ["scripts/smoke-meeting-events.cjs"], root],
  ["node", ["scripts/smoke-meeting-bot.cjs"], root, { VEXA_DRY_RUN: "1", VEXA_API_KEY: "" }],
  ["node", ["scripts/smoke-meeting-host.cjs"], path.join(root, "xiaoxing")],
  ["node", ["scripts/smoke-meeting-summary-speaker.cjs"], path.join(root, "xiaoxing")],
  ["node", ["scripts/smoke-meeting-ops.cjs"], root],
  ["node", ["scripts/smoke-meeting-admin.cjs"], root]
];

const results = [];
for (const [cmd, args, cwd, extraEnv] of steps) {
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...(extraEnv || {}) }
  });
  const name = args[args.length - 1];
  results.push({ name, ok: r.status === 0 });
  if (r.status !== 0) {
    console.error(r.stdout || "");
    console.error(r.stderr || "");
    console.log(JSON.stringify({ ok: false, results }, null, 2));
    process.exit(r.status || 1);
  }
}

console.log(JSON.stringify({ ok: true, results }, null, 2));
