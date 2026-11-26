#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");
const { spawnSync } = require("child_process");

const tsEntry = path.join(__dirname, "smoke-meeting-admin-run.ts");
const r = spawnSync(process.execPath, ["--import", "tsx", tsEntry], {
  encoding: "utf8",
  cwd: path.join(__dirname, ".."),
  env: { ...process.env }
});

if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  process.exit(r.status || 1);
}
const line = (r.stdout || "").trim().split("\n").filter(Boolean).pop();
const out = JSON.parse(line);
assert.equal(out.ok, true);
assert.ok(out.dazhiExperts >= 1);
assert.ok(out.xiaoxingExperts >= 1);
console.log(JSON.stringify(out, null, 2));
