"use strict";

/**
 * 农服跟进看板冒烟
 * node scripts/smoke-followup.cjs
 */
const assert = require("assert");
const fs = require("fs");
const meeting = require("../lib/meeting/index.cjs");
const followup = require("../lib/followup/board.cjs");

function main() {
  followup.resetFollowupCache();
  const manual = followup.createTask({ title: "回访宁玉种苗渠道", kind: "manual" });
  assert.ok(manual.id);
  assert.equal(manual.status, "todo");
  followup.setTaskStatus(manual.id, "doing");
  const board = followup.boardColumns();
  assert.ok(board.columns.doing.some((t) => t.id === manual.id));
  const doing = board.columns.doing.find((t) => t.id === manual.id);
  assert.equal(doing.kind_label, "手建");
  assert.equal(followup.kindLabel("market_watch"), "跨市价差");
  assert.equal(followup.kindLabel("b2b_spread"), "地头价差");
  assert.equal(followup.kindLabel("ingest_task"), "补库任务");

  const spread = followup.createTask({
    title: "行情价差：草莓 测试",
    kind: "market_watch"
  });
  const board2 = followup.boardColumns();
  const spreadRow = board2.columns.todo.find((t) => t.id === spread.id);
  assert.ok(spreadRow);
  assert.equal(spreadRow.kind_label, "跨市价差");

  meeting.startMeeting({});
  meeting.handleMeetingUtterance({
    track: "others",
    text: "脱毒苗哪里可以买到？"
  });
  const stopped = meeting.stopMeeting();
  const summary = meeting.summarizeMeeting(stopped.meeting, { writeInboxGaps: true });
  assert.ok(summary.ok);
  assert.ok((summary.followups || []).length >= 1, "散会应生成跟进");
  assert.ok(fs.existsSync(summary.summaryPath));
  const md = fs.readFileSync(summary.summaryPath, "utf8");
  assert.ok(md.includes("农服跟进"));

  console.log(
    JSON.stringify(
      {
        ok: true,
        manual: manual.id,
        kindLabels: board.kindLabels,
        followups: (summary.followups || []).map((t) => t.title),
        boardCounts: Object.fromEntries(
          Object.entries(board2.columns).map(([k, v]) => [k, v.length])
        )
      },
      null,
      2
    )
  );
}

main();
