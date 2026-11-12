/**
 * Wave Q：Copilot topic/fact 净化 + 总结噪声过滤 + 总结完了吗短答。
 *   node scripts/smoke-wave-q.cjs
 */
const {
  classifyCopilotIntent,
  buildCopilotPacket,
  extractCopilotTopic,
  classifySegmentKind,
  isUsableFact
} = require("../lib/copilot/index.cjs");
const { detectAgentCommand } = require("../lib/meetingSession/commands/detectCommand.cjs");
const { formatAskRecap, isSummaryNoiseAsk } = require("../lib/meetingStrategy/internal/scripts.cjs");

let pass = 0;
let fail = 0;

function check(name, ok, detail) {
  if (ok) {
    pass += 1;
    console.log("PASS", name, detail || "");
  } else {
    fail += 1;
    console.log("FAIL", name, detail || "");
  }
}

// topic 不取整句脏 ASR
check(
  "topic strips 总结完了吗",
  extractCopilotTopic("大智，你总结完了吗？") === "" &&
    classifySegmentKind("大智，你总结完了吗？") === "SUMMARY_DONE",
  extractCopilotTopic("大智，你总结完了吗？")
);
check(
  "topic rejects 反应速度残片",
  extractCopilotTopic("反应速度基本上能够接受，就是") === "" ||
    classifySegmentKind("反应速度基本上能够接受，就是") === "NOISE",
  {
    topic: extractCopilotTopic("反应速度基本上能够接受，就是"),
    kind: classifySegmentKind("反应速度基本上能够接受，就是")
  }
);
check(
  "ack suppresses card",
  classifyCopilotIntent("好的，知道了。").should_trigger === false &&
    classifyCopilotIntent("好的，知道了。").category === "ACK"
);
check(
  "biz ask keeps topic",
  /美语|喜欢|学生/.test(extractCopilotTopic("什么样的美语课学生最喜欢？")),
  extractCopilotTopic("什么样的美语课学生最喜欢？")
);

// fact 禁开场白
check("ban intro fact", isUsableFact("我是大智，正在旁听记录。需要时请呼叫大智") === false);
check(
  "allow faq fact",
  isUsableFact(
    "不要只把三万九当成本。三笔账是延伸服务、特色增值，以及招生：参考是新增一名幼儿约一年一点八万。"
  ) === true
);

// 脏 segment 不出「按现有口径推进：开场白」
const pktNoise = buildCopilotPacket("大智，你总结完了吗？", { skipPrefetch: true });
check(
  "summary-done no dirty card",
  pktNoise.should_trigger === false,
  { cat: pktNoise.category, kind: pktNoise.segment_kind }
);

const pktBiz = buildCopilotPacket("全园美语是什么？", { skipPrefetch: true });
check(
  "biz card ok and no 对方",
  pktBiz.should_trigger &&
    pktBiz.suggestions &&
    !/对方|我是大智，正在旁听/.test(JSON.stringify(pktBiz.suggestions)),
  pktBiz.suggestions
);
check(
  "biz topic cleaned",
  pktBiz.target_topic && !/^大智/.test(pktBiz.target_topic),
  pktBiz.target_topic
);

const pktSpeed = buildCopilotPacket("反应速度基本上能够接受，就是", {
  skipPrefetch: true,
  force: true
});
check(
  "force noise uses generic not raw topic",
  !/反应速度基本上能够接受/.test(pktSpeed.suggestions?.push_back || "") &&
    !/反应速度基本上能够接受/.test(pktSpeed.suggestions?.counter_inquiry || ""),
  pktSpeed.suggestions
);

// 总结命令
const doneCmd = detectAgentCommand("大智，你总结完了吗？");
check("cmd SUMMARY_STATUS", doneCmd.command === "SUMMARY_STATUS", doneCmd.command);
const sumCmd = detectAgentCommand("大智，帮我做总结");
check("cmd SUMMARY for 帮我做总结", sumCmd.command === "SUMMARY", sumCmd.command);
const repeatCmd = detectAgentCommand("大智再总结一次");
check(
  "force repeat is SUMMARY not STATUS",
  repeatCmd.command === "SUMMARY",
  repeatCmd.command
);

// 回顾过滤噪声
check("noise ask filter weather", isSummaryNoiseAsk("珠海天气怎么样？") === true);
check("noise ask filter mic", isSummaryNoiseAsk("他这个有没有收到我的声音？") === true);
const recap = formatAskRecap([
  { speaker: "会场", text: "珠海天气怎么样？" },
  { speaker: "会场", text: "他不说话。他这个有没有收到我的声音？" },
  { speaker: "会场", text: "我们当地教育局不允许幼儿园开英语课程怎么办？" },
  { speaker: "大智", text: "资料没有写可以绕过教育局。" }
]);
check(
  "recap drops weather/mic keeps edu",
  !/天气|听得到|收到我的声音/.test(recap) && /教育局|英语/.test(recap),
  recap
);

console.log(`\nwave-q smoke: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
