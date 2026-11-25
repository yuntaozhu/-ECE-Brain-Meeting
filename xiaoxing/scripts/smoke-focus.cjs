"use strict";

/**
 * Session Focus 冒烟：写槽 / 回想 / 催答 / 短粘合
 * node scripts/smoke-focus.cjs
 */
const assert = require("assert");
const meeting = require("../lib/meeting/index.cjs");

function main() {
  meeting.resetFocusCache && meeting.resetFocusCache();
  meeting.resetCommandsCache && meeting.resetCommandsCache();
  meeting.startMeeting({});

  const wake = meeting.handleMeetingUtterance({
    track: "me",
    text: "小星你好，宁玉有什么特点"
  });
  assert.equal(wake.action, "consult");
  assert.ok(wake.focus?.query);
  assert.ok(String(wake.focus.query).includes("宁玉"));

  const recall = meeting.handleMeetingUtterance({
    track: "me",
    text: "我刚刚问了什么"
  });
  assert.equal(recall.action, "focus_recall");
  assert.ok(String(recall.reply).includes("宁玉"));

  // 短追问粘合（武装后）
  const glue = meeting.handleMeetingUtterance({
    track: "me",
    text: "口感呢"
  });
  assert.equal(glue.action, "consult");
  assert.ok(String(glue.query).includes("宁玉"));
  assert.ok(String(glue.query).includes("口感"));

  const others = meeting.handleMeetingUtterance({
    track: "others",
    text: "脱毒苗哪里买？"
  });
  assert.equal(others.action, "log_others");
  assert.ok(others.focus?.query);

  const urge = meeting.handleMeetingUtterance({
    track: "me",
    text: "请回答"
  });
  assert.equal(urge.action, "consult");
  assert.ok(String(urge.query).includes("脱毒苗"), "催答应对准会场 Focus");

  meeting.stopMeeting();
  meeting.startMeeting({});
  // 新会清空 Focus
  const gap = meeting.handleMeetingUtterance({
    track: "me",
    text: "请回答"
  });
  assert.equal(gap.action, "focus_gap");

  meeting.stopMeeting();
  console.log(
    JSON.stringify(
      {
        ok: true,
        wakeFocus: wake.focus.query,
        recall: recall.reply,
        glued: glue.query,
        urgeQuery: urge.query,
        gap: gap.action
      },
      null,
      2
    )
  );
}

main();
