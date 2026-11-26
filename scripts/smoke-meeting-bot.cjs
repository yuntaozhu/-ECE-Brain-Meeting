#!/usr/bin/env node
/**
 * Vexa Bot 适配器 dry-run smoke（不需真实密钥）
 * 运行：VEXA_DRY_RUN=1 npx tsx scripts/smoke-meeting-bot-run.ts
 * 本文件用子进程调用 TS 入口，保证 Windows 兼容。
 */
"use strict";

const assert = require("assert");
const path = require("path");
const { spawnSync } = require("child_process");

const runner = path.join(__dirname, "smoke-meeting-bot-run.ts");
const env = { ...process.env, VEXA_DRY_RUN: "1", VEXA_API_KEY: "" };

const r = spawnSync(
  process.execPath,
  ["--import", "tsx", runner],
  { encoding: "utf8", cwd: path.join(__dirname, ".."), env }
);

if (r.status !== 0) {
  console.error(r.stderr || r.stdout || "smoke-meeting-bot failed");
  process.exit(r.status || 1);
}

const line = (r.stdout || "").trim().split("\n").filter(Boolean).pop();
const out = JSON.parse(line);
assert.equal(out.ok, true);
assert.equal(out.speakInMeeting, false);
assert.ok(out.create?.status === "joined");
assert.ok(out.transcripts?.rawCount >= 1);
assert.ok(out.stop?.status === "stopped");
console.log(JSON.stringify(out, null, 2));
