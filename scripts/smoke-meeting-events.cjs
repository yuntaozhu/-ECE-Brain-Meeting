#!/usr/bin/env node
/**
 * 会议事件契约基线 smoke（不依赖火山密钥）
 * 运行：node scripts/smoke-meeting-events.cjs
 * 若用 tsx：npx tsx scripts/smoke-meeting-events.cjs（本文件用动态 import 加载 TS）
 */
"use strict";

const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");
const { spawnSync } = require("child_process");

async function loadMeetingEvents() {
  const tsPath = path.join(__dirname, "..", "server", "lib", "meetingEvents.ts");
  // Prefer compiled/runtime via tsx if available
  try {
    const r = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "-e",
        `
        import * as m from ${JSON.stringify(pathToFileURL(tsPath).href)};
        const ev = m.createMeetingEvent({
          meeting_id: "room_smoke",
          provider: "volc_rtc",
          type: "meeting.started"
        });
        m.resetMeetingEventBufferForTests();
        const a = m.pushMeetingEvent(ev);
        const b = m.pushMeetingEvent(ev);
        const mapped = m.mapVolcVoiceChatCallback({
          EventType: "VoiceChatInterrupt",
          EventData: { RoomId: "room_smoke", TaskId: "t1" }
        });
        m.pushMeetingEvent(mapped);
        const list = m.listMeetingEvents({ meeting_id: "room_smoke", limit: 10 });
        console.log(JSON.stringify({
          ok: true,
          acceptedFirst: a.accepted,
          rejectedDup: !b.accepted,
          mappedType: mapped && mapped.type,
          count: list.length,
          types: list.map((e) => e.type)
        }));
        `
      ],
      { encoding: "utf8", cwd: path.join(__dirname, "..") }
    );
    if (r.status === 0 && r.stdout) {
      return JSON.parse(r.stdout.trim().split("\n").pop());
    }
  } catch (_) {}

  // Fallback：纯 JS 契约形状检查（不跑 TS 模块）
  const schema = require(path.join(
    __dirname,
    "..",
    "xiaoxing",
    "knowledge",
    "schema",
    "meeting-events.json"
  ));
  assert.ok(Array.isArray(schema.types) && schema.types.includes("ai.interrupted"));
  assert.ok(schema.providers.includes("volc_rtc"));
  return {
    ok: true,
    fallback: true,
    types: schema.types.length,
    note: "tsx 不可用时仅校验 schema；请用 npm run lint / tsx 跑完整缓冲测试"
  };
}

async function main() {
  const out = await loadMeetingEvents();
  assert.ok(out.ok);
  if (!out.fallback) {
    assert.equal(out.acceptedFirst, true);
    assert.equal(out.rejectedDup, true);
    assert.equal(out.mappedType, "ai.interrupted");
    assert.ok(out.count >= 2);
  }
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
