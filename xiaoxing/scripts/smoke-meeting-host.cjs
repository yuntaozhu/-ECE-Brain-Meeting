#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { resetCommandsCache, classifyUtterance } = require("../lib/meeting/commands.cjs");
const session = require("../lib/meeting/session.cjs");
const { handleMeetingUtterance } = require("../lib/meeting/handle.cjs");

function main() {
  resetCommandsCache();
  session.stopMeeting();
  session.startMeeting({});

  assert.equal(classifyUtterance("小星停一下").kind, "interrupt");
  assert.equal(classifyUtterance("下一议程").kind, "next_agenda");
  assert.equal(classifyUtterance("提醒一下进度").kind, "host_wrap");

  session.setSpeaking(true);
  const inter = handleMeetingUtterance({ track: "me", text: "小星停一下" });
  assert.equal(inter.action, "interrupt");
  assert.ok(inter.reply);
  assert.equal(session.getMeeting()?.speaking, false);

  const next = handleMeetingUtterance({ track: "me", text: "进入下一项" });
  assert.equal(next.action, "next_agenda");
  assert.ok(next.reply);

  const wrap = handleMeetingUtterance({ track: "me", text: "今天议程到哪了" });
  assert.equal(wrap.action, "host_wrap");
  assert.ok(wrap.reply);

  console.log(
    JSON.stringify(
      {
        ok: true,
        interrupt: inter.action,
        nextAgenda: next.action,
        hostWrap: wrap.action
      },
      null,
      2
    )
  );
}

main();
