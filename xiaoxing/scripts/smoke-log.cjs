"use strict";

/**
 * 小星系统日志冒烟
 * node scripts/smoke-log.cjs
 */
const assert = require("assert");
const fs = require("fs");
const { debugLog } = require("../lib/platform/debugLog.cjs");

function main() {
  debugLog.clearMemory();
  const info = debugLog.info("Smoke", "日志冒烟开始", { n: 1 });
  assert.ok(info && info.ts);
  assert.equal(info.level, "INFO");
  assert.equal(info.tag, "Smoke");

  debugLog.warn("Smoke", "带脱敏", {
    token: "should-hide",
    apiKey: "abc",
    note: "可见"
  });
  const lastWarn = debugLog.recent(5).find((e) => e.level === "WARN");
  assert.ok(lastWarn);
  assert.equal(lastWarn.detail.token, "***");
  assert.equal(lastWarn.detail.apiKey, "***");
  assert.equal(lastWarn.detail.note, "可见");

  debugLog.error("Smoke", "错误样例", new Error("boom"));

  // 限流：同 rateKey 短时只写一次
  debugLog.warn("Smoke", "限流1", null, { rateKey: "smoke-rate", rateMs: 60000 });
  const skipped = debugLog.warn("Smoke", "限流2", null, {
    rateKey: "smoke-rate",
    rateMs: 60000
  });
  assert.equal(skipped, null);

  const file = debugLog.getFilePath();
  const dir = debugLog.getDir();
  assert.ok(file && fs.existsSync(file), "日志文件应存在");
  assert.ok(dir && fs.existsSync(dir));
  const raw = fs.readFileSync(file, "utf8");
  assert.ok(raw.includes("日志冒烟开始"));
  assert.ok(raw.includes("[Smoke]"));
  assert.ok(!raw.includes("should-hide"), "密钥不得落盘明文");

  const recent = debugLog.recent(20);
  assert.ok(recent.length >= 3);

  console.log(
    JSON.stringify(
      {
        ok: true,
        file,
        dir,
        mirror: debugLog.getMirrorPath(),
        recent: recent.length,
        sample: recent.slice(-1)[0]?.message
      },
      null,
      2
    )
  );
}

main();
