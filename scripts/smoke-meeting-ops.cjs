#!/usr/bin/env node
"use strict";

const assert = require("assert");
const path = require("path");
const { spawnSync } = require("child_process");
const { pathToFileURL } = require("url");

const tsEntry = path.join(__dirname, "smoke-meeting-ops-run.ts");
const r = spawnSync(process.execPath, ["--import", "tsx", tsEntry], {
  encoding: "utf8",
  cwd: path.join(__dirname, ".."),
  env: { ...process.env, VEXA_DRY_RUN: "1", VEXA_API_KEY: "" }
});

if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  process.exit(r.status || 1);
}
const line = (r.stdout || "").trim().split("\n").filter(Boolean).pop();
const out = JSON.parse(line);
assert.equal(out.ok, true);
assert.equal(out.deleted, 1);
assert.ok(out.auditSize >= 1);
assert.equal(out.textRedacted, true);
console.log(JSON.stringify(out, null, 2));
