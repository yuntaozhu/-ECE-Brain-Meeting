"use strict";

/**
 * 小星会议主路径冒烟（无 Electron / 无麦）
 * 听会默认 armed：Me 说完即问；休眠后旁听直至再唤醒
 * node scripts/smoke-meeting.cjs
 */
const assert = require("assert");
const meeting = require("../lib/meeting/index.cjs");

function main() {
  meeting.resetCommandsCache && meeting.resetCommandsCache();

  const started = meeting.startMeeting({ meConnected: true });
  assert.ok(started.ok);
  assert.equal(started.meeting.armed, true, "听会默认武装");
  assert.equal(started.meeting.phase, "armed");

  const others = meeting.handleMeetingUtterance({
    track: "others",
    text: "今年草莓育苗什么时候开始？"
  });
  assert.equal(others.action, "log_others");

  const askNow = meeting.handleMeetingUtterance({
    track: "me",
    text: "宁玉有什么特点"
  });
  assert.equal(askNow.action, "consult", "默认说完即问");
  assert.ok(askNow.ask?.reply);

  const sleep = meeting.handleMeetingUtterance({
    track: "me",
    text: "谢谢小星"
  });
  assert.equal(sleep.action, "sleep");
  assert.equal(meeting.getMeeting().armed, false);

  const listen = meeting.handleMeetingUtterance({
    track: "me",
    text: "今天天气不错"
  });
  assert.equal(listen.action, "listen_only", "休眠后旁听");

  const wake = meeting.handleMeetingUtterance({
    track: "me",
    text: "小星你好，宁玉有什么特点"
  });
  assert.equal(wake.action, "consult");
  assert.ok(wake.ask?.reply);
  assert.ok(meeting.getMeeting().armed);

  const stopped = meeting.stopMeeting();
  assert.ok(stopped.ok);
  assert.equal(meeting.getMeeting(), null);

  // requireWake 可恢复旧行为
  const legacy = meeting.startMeeting({ requireWake: true });
  assert.equal(legacy.meeting.armed, false);
  const gated = meeting.handleMeetingUtterance({
    track: "me",
    text: "宁玉有什么特点"
  });
  assert.equal(gated.action, "listen_only");
  meeting.stopMeeting();

  console.log(
    JSON.stringify(
      {
        ok: true,
        actions: [others.action, askNow.action, sleep.action, listen.action, wake.action],
        wakeLayer: wake.ask.layer,
        lines: stopped.meeting.lines,
        legacyGated: gated.action
      },
      null,
      2
    )
  );
}

main();
