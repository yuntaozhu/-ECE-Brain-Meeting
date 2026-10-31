/**
 * Barge-in / wake shorts for 谢谢大智 · 大智听我说 · 大智唤醒
 *   node scripts/smoke-barge-stop.cjs
 */
const {
  looksLikeBargeInCommand,
  looksLikeStopBargeHint,
  looksLikeWakeCommand,
  looksLikeCleanWakeBarge,
  looksLikeSpeakEcho,
  extractBargeCommandText,
  detectAgentCommand
} = require("../lib/meetingSession");

const shouldStop = [
  "谢谢大智",
  "谢谢大智。",
  "嗯，谢谢大智",
  "谢谢大致",
  "谢谢大",
  "停止大智",
  "停止大",
  "谢了大智",
  "大智休息",
  "大智听我说",
  "听我说"
];

const stickyStop =
  "全员美语是面向大地合作园的全员型美语特色系统，不是单一英语课或账号采购整合。用四端联动把美语做成校园特色和招生引擎。谢谢大智。";

const shouldWake = ["大智", "大智。", "大智你好", "大智，怎么收费？", "大致，全园美语是什么"];

const shouldMissStop = ["谢谢大家", "全园美语是什么？", "怎么收费", "大"];

let pass = 0;
let fail = 0;

for (const t of shouldStop) {
  const ok = looksLikeBargeInCommand(t) || looksLikeStopBargeHint(t);
  if (!ok) {
    console.log(`FAIL stop ${t}  cmd=${detectAgentCommand(t).command}`);
    fail += 1;
  } else {
    console.log(`OK   stop ${t}`);
    pass += 1;
  }
}

if (!looksLikeBargeInCommand(stickyStop) && !looksLikeStopBargeHint(stickyStop)) {
  console.log("FAIL sticky stop");
  fail += 1;
} else {
  console.log("OK   sticky stop");
  pass += 1;
}

const extracted = extractBargeCommandText(stickyStop);
if (!/谢谢大智/.test(extracted) || extracted.length > 20) {
  console.log(`FAIL extract got ${extracted}`);
  fail += 1;
} else {
  console.log(`OK   extract ${extracted}`);
  pass += 1;
}

const partialUp = extractBargeCommandText("……招生引擎。谢谢大");
if (partialUp !== "谢谢大智") {
  console.log(`FAIL partial upgrade got ${partialUp}`);
  fail += 1;
} else {
  console.log("OK   partial upgrade 谢谢大→谢谢大智");
  pass += 1;
}

for (const t of shouldWake) {
  const ok = looksLikeWakeCommand(t);
  if (!ok) {
    console.log(`FAIL wake ${t}  cmd=${detectAgentCommand(t).command}`);
    fail += 1;
  } else {
    console.log(`OK   wake ${t}`);
    pass += 1;
  }
}

const greet = "我是大智，正在旁听记录。需要时请呼叫大智；人与人讨论时我会轻量拉回议程。";
for (const echo of ["我是大智", "我是大智。", "我是大致。"]) {
  if (!looksLikeSpeakEcho(echo, greet)) {
    console.log(`FAIL echo wake guard ${echo}`);
    fail += 1;
  } else {
    console.log(`OK   echo wake guard ${echo}`);
    pass += 1;
  }
}
// 短叫名不当回灌（否则永远唤不醒）
if (looksLikeSpeakEcho("大智", greet)) {
  console.log("FAIL short wake blocked as echo");
  fail += 1;
} else {
  console.log("OK   short wake not echo");
  pass += 1;
}
// 粘连回灌+句尾打断：不当纯回灌，便于短路
const stickyEchoStop = `${greet}谢谢大智。`;
if (looksLikeSpeakEcho(stickyEchoStop, greet)) {
  console.log("FAIL sticky+stop still echo");
  fail += 1;
} else {
  console.log("OK   sticky+stop not pure echo");
  pass += 1;
}

const faqSpeak =
  "全园美语是面向大地合作园的全园型美语特色系统，不是单一英语课或账号采购；整合 ABCmouse、ABC说、菲教、Teacher说、Family说、AI测评等，用四端联动把美语做成校园特色和招生引擎。";
// 线缆听花夹名：不得干净唤醒，须当回灌
for (const garbled of ["整合 a 区大智", "整合a区大智说非教"]) {
  if (looksLikeCleanWakeBarge(garbled)) {
    console.log(`FAIL clean-wake ${garbled}`);
    fail += 1;
  } else {
    console.log(`OK   not clean-wake ${garbled}`);
    pass += 1;
  }
  if (!looksLikeSpeakEcho(garbled, faqSpeak)) {
    console.log(`FAIL garbled echo ${garbled}`);
    fail += 1;
  } else {
    console.log(`OK   garbled as echo ${garbled}`);
    pass += 1;
  }
}
for (const clean of ["大智", "大智。", "大智，怎么收费？", "大智什么是全园美语课程？"]) {
  if (!looksLikeCleanWakeBarge(clean)) {
    console.log(`FAIL expect clean-wake ${clean}`);
    fail += 1;
  } else {
    console.log(`OK   clean-wake ${clean}`);
    pass += 1;
  }
}

for (const t of shouldMissStop) {
  if (looksLikeStopBargeHint(t)) {
    console.log(`FAIL miss ${t}`);
    fail += 1;
  } else {
    console.log(`OK   miss ${t}`);
    pass += 1;
  }
}

const full = detectAgentCommand("谢谢大智。");
if (full.command === "STOP" && full.stop) {
  console.log("OK   detect STOP");
  pass += 1;
} else {
  console.log(`FAIL detect STOP got ${full.command}`);
  fail += 1;
}

const irq = detectAgentCommand("大智听我说");
if (irq.command === "INTERRUPT" || irq.interrupt) {
  console.log("OK   detect INTERRUPT");
  pass += 1;
} else {
  console.log(`FAIL detect INTERRUPT got ${irq.command}`);
  fail += 1;
}

console.log(`barge-stop ${pass}/${pass + fail}`);
if (fail) process.exit(1);
