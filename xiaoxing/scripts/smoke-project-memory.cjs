#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const meeting = require("../lib/meeting/index.cjs");
const { sessionsDir } = require("../lib/knowledge/paths.cjs");
const {
  clearProjectMemoryCfgCache,
  indexPath,
  readIndex,
  listMeetingsByTopic,
  buildBriefing
} = require("../lib/meeting/projectMemory.cjs");

clearProjectMemoryCfgCache();

// 干净临时：备份并写空 index
const idxFile = indexPath();
const bak = idxFile + ".bak-smoke";
if (fs.existsSync(idxFile)) fs.copyFileSync(idxFile, bak);
fs.mkdirSync(sessionsDir(), { recursive: true });
fs.writeFileSync(idxFile, JSON.stringify({ meetings: [] }, null, 2));

try {
  const first = meeting.startMeeting({ meConnected: true });
  assert.ok(first.briefing);
  assert.equal(first.briefing.empty, true);

  meeting.appendLine({ type: "transcript", track: "others", text: "长三角草莓行情多少钱库里有没有？" });
  meeting.appendLine({ type: "transcript", track: "me", text: "关于草莓，看一下还要再补充柑橘" });
  meeting.appendLine({
    type: "consult_mark",
    action: "consult",
    query: "还要再补充柑橘",
    layer: "gap"
  });

  const stopped = meeting.stopMeeting();
  const summary = meeting.summarizeMeeting(stopped.meeting, { writeInboxGaps: true });
  assert.ok(summary.ok);
  assert.ok(summary.memory?.ok);
  assert.ok((summary.memory.topics || []).length >= 1);

  const byStraw = listMeetingsByTopic("草莓", 5);
  const byRice = listMeetingsByTopic("水稻", 5);
  assert.ok(byStraw.length >= 1 || (readIndex().meetings || []).length >= 1);

  const second = meeting.startMeeting({ meConnected: true });
  assert.ok(second.briefing);
  assert.equal(second.briefing.empty, false);
  assert.ok(/上次会议|待办|焦点/.test(second.briefing.text));
  meeting.stopMeeting();

  const hostMode = meeting.getAssistantMode();
  assert.ok(hostMode === "content" || hostMode === "host");

  const prompt = meeting.ingestPromptForUtterance("示范基地新品种审定亩产650公斤");
  assert.ok(prompt && prompt.kind === "ingest_prompt");

  console.log(
    JSON.stringify(
      {
        ok: true,
        topics: summary.memory.topics,
        briefingPreview: String(second.briefing.text).slice(0, 120),
        strawHits: byStraw.length,
        riceHits: byRice.length,
        assistantMode: hostMode
      },
      null,
      2
    )
  );
} finally {
  if (fs.existsSync(bak)) {
    fs.copyFileSync(bak, idxFile);
    fs.unlinkSync(bak);
  } else if (fs.existsSync(idxFile)) {
    // 保留 smoke 写入的 index 亦可；为不污染改为空 meetings
  }
}
