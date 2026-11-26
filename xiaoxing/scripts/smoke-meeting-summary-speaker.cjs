#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const session = require("../lib/meeting/session.cjs");
const { handleMeetingUtterance } = require("../lib/meeting/handle.cjs");
const { summarizeMeeting } = require("../lib/meeting/summary.cjs");
const { resetCommandsCache } = require("../lib/meeting/commands.cjs");

function main() {
  resetCommandsCache();
  session.stopMeeting();
  const started = session.startMeeting({});
  assert.ok(started?.id || session.getMeeting()?.id);

  handleMeetingUtterance({
    track: "me",
    text: "小星你好，草莓什么时候定植",
    speaker: "me"
  });
  handleMeetingUtterance({
    track: "others",
    text: "下周基地有培训",
    speaker: "嘉宾甲",
    provider: "vexa"
  });
  handleMeetingUtterance({
    track: "others",
    text: "这条已人工核对",
    speaker: "嘉宾乙",
    provider: "vexa",
    confirmed: true
  });

  const mtg = session.getMeeting();
  const stopped = session.stopMeeting();
  const meeting = {
    id: mtg.id,
    file: stopped.file || mtg.file,
    startedAt: mtg.startedAt,
    lines: mtg.lines
  };
  // stopMeeting 可能清空 current；用文件路径
  if (!meeting.file || !fs.existsSync(meeting.file)) {
    // 回退：从 stop 返回
    meeting.file = stopped?.meeting?.file || meeting.file;
    meeting.id = stopped?.meeting?.id || meeting.id;
  }

  const sum = summarizeMeeting(
    {
      id: meeting.id,
      file: meeting.file,
      startedAt: meeting.startedAt
    },
    { writeInboxGaps: false }
  );
  assert.equal(sum.ok, true);
  assert.ok(sum.attributed >= 3, "应有带说话人行");
  assert.ok(sum.drafts >= 1);
  assert.ok(sum.confirmed >= 1);
  const md = fs.readFileSync(sum.summaryPath, "utf8");
  assert.ok(md.includes("[草稿]"));
  assert.ok(md.includes("[已确认]"));
  assert.ok(md.includes("嘉宾甲") || md.includes("嘉宾乙"));

  console.log(
    JSON.stringify(
      {
        ok: true,
        attributed: sum.attributed,
        drafts: sum.drafts,
        confirmed: sum.confirmed,
        summaryPath: sum.summaryPath
      },
      null,
      2
    )
  );
}

main();
