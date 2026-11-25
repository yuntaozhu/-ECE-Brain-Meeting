"use strict";

/**
 * 旁路建议冒烟：Others 问句出卡，不占麦、不写 consult
 * node scripts/smoke-suggest.cjs
 */
const assert = require("assert");
const meeting = require("../lib/meeting/index.cjs");

function main() {
  meeting.resetSuggestGateCache && meeting.resetSuggestGateCache();
  // 旁路断言：Others 出卡不占麦；Me 用 requireWake 验证未武装旁听
  meeting.startMeeting({ requireWake: true });

  const q = meeting.handleMeetingUtterance({
    track: "others",
    text: "宁玉草莓有什么特点？"
  });
  assert.equal(q.action, "log_others");
  assert.ok(q.suggest, "期望出建议卡");
  assert.ok(q.suggest.reply && q.suggest.reply.length > 4);
  assert.ok(["faq", "wiki", "wiki2", "refuse"].includes(q.suggest.layer));

  const stmt = meeting.handleMeetingUtterance({
    track: "others",
    text: "今天会议议程如下"
  });
  assert.equal(stmt.action, "log_others");
  assert.equal(stmt.suggest, null, "陈述句不应出建议卡");

  const me = meeting.handleMeetingUtterance({
    track: "me",
    text: "宁玉有什么特点"
  });
  assert.equal(me.action, "listen_only", "requireWake 时未唤醒 Me 不应 consult");

  meeting.stopMeeting();
  console.log(
    JSON.stringify(
      {
        ok: true,
        suggestLayer: q.suggest.layer,
        suggestScore: q.suggest.score,
        replyPreview: String(q.suggest.reply).slice(0, 48)
      },
      null,
      2
    )
  );
}

main();
