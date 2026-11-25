"use strict";

const assert = require("assert");
const fs = require("fs");
const meeting = require("../lib/meeting/index.cjs");
const { correctAsrText, resetCorrectionCache } = require("../lib/asr/correct.cjs");

function main() {
  resetCorrectionCache();
  assert.equal(correctAsrText("宁雨草莓怎么样"), "宁玉草莓怎么样");
  assert.equal(correctAsrText("拓毒苗哪里买"), "脱毒苗哪里买");

  meeting.startMeeting({});
  meeting.handleMeetingUtterance({ track: "others", text: "宁雨什么时候定植？" });
  meeting.handleMeetingUtterance({ track: "me", text: "今天天气不错" });
  meeting.handleMeetingUtterance({ track: "me", text: "小星你好，宁玉有什么特点" });
  const stopped = meeting.stopMeeting();
  assert.ok(stopped.meeting?.file);
  const summary = meeting.summarizeMeeting(stopped.meeting, { writeInboxGaps: true });
  assert.ok(summary.ok);
  assert.ok(fs.existsSync(summary.summaryPath));
  const md = fs.readFileSync(summary.summaryPath, "utf8");
  assert.ok(md.includes("宁玉"));
  assert.ok(md.includes("补库任务"));
  assert.ok(summary.others >= 1);

  console.log(
    JSON.stringify(
      {
        ok: true,
        correct: true,
        summaryPath: summary.summaryPath,
        others: summary.others,
        gaps: summary.gaps,
        inbox: (summary.inboxFiles || []).length
      },
      null,
      2
    )
  );
}

main();
