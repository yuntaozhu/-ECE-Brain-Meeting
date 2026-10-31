/**
 * 本场场景 FAQ 冒烟（离线 forceRule）
 *   node scripts/smoke-scene-faq.cjs
 */
const fs = require("fs");
const path = require("path");
const rootEnv = path.join(__dirname, "..", "..", ".env");
const deskEnv = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: fs.existsSync(rootEnv) ? rootEnv : deskEnv });

// 离线：仍测 FAQ 秒答路径（有 Key 时 localAnswer 也必须秒答）
process.env.DOUBAO_API_KEY = process.env.DOUBAO_API_KEY || "sk-smoke";
process.env.ARK_API_KEY = process.env.ARK_API_KEY || "";

const { createMeetingSession, detectAgentCommand } = require("../lib/meetingSession");
const { runMeetingAnalysis, DEFAULT_AGENDA } = require("../lib/meetingStrategy");
const { isTruncatedAsk } = require("../lib/meetingStrategy/agent/relevance.cjs");

const cases = [
  {
    id: "puhui",
    q: "我园是一家普惠幼儿园，可以做全园美语吗？",
    need: /普惠|外校园|四万九|执行/,
    forbid: /请再说具体一点，我结合资料答您|不是单一英语课或账号采购/
  },
  {
    id: "conditions",
    q: "大智，我园要具备什么条件才能使用这个课程？",
    need: /条件|老师|账号|执行|专业|培训/,
    forbid: /请再说具体一点，我结合资料答您|不是单一英语课或账号采购/
  },
  {
    id: "koukai",
    q: "开口，家长怎么认可？",
    need: /开口|家长|实拍|测评|成果|Teacher说|看得见/,
    forbid: /请再说具体一点，我结合资料答您|不是单一英语课或账号采购/
  },
  {
    id: "pricing",
    q: "全园美语，你们是如何收费的？",
    need: /三万九|收费|39000|学期|服务/,
    forbid: /请再说具体一点，我结合资料答您|不是单一英语课或账号采购/
  },
  {
    id: "how-do",
    q: "你如何做？",
    need: /样板|开口|课件|落地|准备|开办|执行|四步|行事历|我在|这句我还没对上|你是在问/,
    forbid: /后半句没听清|请再说具体一点，我结合资料答您/
  },
  // P0：闭题未命中时禁止经营万能句冒充
  {
    id: "diff-no-operate",
    q: "全园美语和其他课程有什么区别？",
    need: /这句我还没对上|你是在问|区别|不是单一|生态|四端|体系/,
    forbid: /把美语做成家长看得见的选择理由|先护收费盘面再做增量/
  },
  {
    id: "confidence-no-operate",
    q: "我有信心办好吗？",
    need: /这句我还没对上|你是在问|这句我没抓稳|请再说具体一点|信心|行事历|意愿|样板班/,
    forbid: /把美语做成家长看得见的选择理由|先护收费盘面再做增量|样板班开口实拍/
  },
  {
    id: "when-earn",
    q: "引入课程后多久可以赚钱？",
    need: /个月|不保证/,
    forbid: /后半句没听清|引入后盈利算三笔账/
  },
  {
    id: "when-profit",
    q: "我花39,000引入课程后，多久可以盈利？",
    need: /个月|不保证/,
    forbid: /后半句没听清|引入后盈利算三笔账/
  },
  {
    id: "how-turnaround",
    q: "如何扭亏为盈？",
    need: /三笔账|测算|一点八/,
    forbid: /后半句没听清|一到两个月|三到六个月/
  },
  {
    id: "statement-turnaround",
    q: "课程让我的园所扭亏为盈！",
    need: /听到了|怎么做|请把问题说完整/,
    forbid: /引入后盈利算三笔账|三笔账是延伸|样板班开口实拍/
  },
  {
    id: "roi-confirm",
    q: "能回本吗？",
    need: /不保证|回本|参考测算/,
    forbid: /引入后盈利算三笔账|一到两个月/
  },
  {
    id: "show-how",
    q: "如何做学期成果展？",
    need: /成果展|开放日|开口|家长/,
    forbid: /后半句没听清/
  },
  {
    id: "show-form",
    q: "学期成果展示个什么形式？",
    need: /成果展|开放日|开口|家长/,
    forbid: /后半句没听清/
  },
  {
    id: "visible",
    q: "怎么做可以让家长看得见？",
    need: /看得见|开口|测评|成果展/,
    forbid: /写死的标准|先对齐/
  },
  {
    id: "month-assess",
    q: "月度测评如何实施？",
    need: /测评|报告|机试/,
    forbid: /定班|0到1|写死的标准/
  },
  {
    id: "open-video",
    q: "第一次开口视频怎么做？",
    need: /十秒|开口/,
    forbid: /写死的标准/
  },
  {
    id: "ability-probe",
    q: "他不具备这个能力怎么办？",
    need: /^$/,
    forbid: /写死的标准|拍十秒|定班|你是在问|你想先听|能力怎么办/
  },
  {
    id: "join-conditions",
    q: "我们校园想要加入全园美语系统，要有什么条件？",
    need: /投影|园长|训练/,
    forbid: /怎么收费|你是说/
  },
  {
    id: "too-expensive",
    q: "太贵了，我们现在经营都困难，都没什么生源了，一下子要我付39000，我感觉很困难，有什么好办法没有？",
    need: /收益保障|每学期/,
    forbid: /家长看得见的选择理由/
  },
  {
    id: "too-expensive-benefit",
    q: "39,000有些贵，我们园所的效益不好，怎么办？",
    need: /收益保障|每学期|三万九/,
    forbid: /家长看得见的选择理由|^$/
  },
  // 换卡 carry：收费口播后，无问号异议陈述句须念太贵卡，禁续收费卡后半句
  {
    id: "card-switch-expensive",
    q: "一年3万九，太贵了，经营困难，我们付不起。",
    lastHost:
      "大地合作园项目服务价是三万九千元每学期；外校园价四万九。按「一套校园美语系统」计费，不以在籍人数乘单价。",
    need: /收益保障|每学期|一半|退差额/,
    forbid: /不以在籍人数乘单价|一套校园美语系统计费/
  }
];

async function main() {
  if (isTruncatedAsk("你如何做？")) {
    console.error("FAIL isTruncatedAsk still traps 你如何做");
    process.exit(1);
  }
  console.log("OK   isTruncatedAsk skips 你如何做");

  let pass = 0;
  for (const c of cases) {
    const state = createMeetingSession(`smoke_${c.id}`);
    state.mode = "HA_ASK";
    state.haLockedUntil = Date.now() + 120000;
    if (c.lastHost) {
      state.lastHostSpeakText = c.lastHost;
      state.lastDesign = {
        type: "answer",
        hypothesisId:
          "Q: 39000 / 3900 / 三万九是什么意思？ / 三万九买的是什么？ / 项目多少钱？ / 怎么收费？",
        segments: [],
        depth: "final"
      };
    }
    const r = await runMeetingAnalysis(`会场: ${c.q}`, DEFAULT_AGENDA, {
      agentState: state,
      meetingState: state,
      trigger: "wake",
      forceRule: true,
      lastHostSpeakText: c.lastHost || ""
    });
    const answer = String(r.interventionText || r.fullAnswer || r.spokenPrefix || "");
    const fails = [];
    if (!c.need.test(answer)) fails.push(`missing anchors: ${answer.slice(0, 70)}`);
    if (c.forbid.test(answer)) fails.push(`hit forbid: ${answer.slice(0, 70)}`);
    if (fails.length) {
      console.log(`FAIL ${c.id} ark=${r.arkMode}`);
      fails.forEach((f) => console.log(`  - ${f}`));
    } else {
      pass += 1;
      console.log(`OK   ${c.id} [${r.arkMode}] :: ${answer.slice(0, 56)}`);
    }
  }

  const follow = createMeetingSession("smoke_ability_follow");
  follow.mode = "HA_ASK";
  follow.haLockedUntil = Date.now() + 120000;
  await runMeetingAnalysis("会场: 他不具备这个能力怎么办？", DEFAULT_AGENDA, {
    agentState: follow,
    meetingState: follow,
    trigger: "wake",
    forceRule: true
  });
  const r2 = await runMeetingAnalysis("会场: 不会做阅读测评", DEFAULT_AGENDA, {
    agentState: follow,
    meetingState: follow,
    trigger: "wake",
    forceRule: true
  });
  const second = String(r2.interventionText || r2.fullAnswer || r2.spokenPrefix || "");
  const followOk = /报告|机试|十秒|系统出/.test(second) && !/写死的标准|不定场次|你是在问/.test(second);
  if (followOk) {
    pass += 1;
    console.log(`OK   ability-follow [${r2.arkMode}] :: ${second.slice(0, 56)}`);
  } else {
    console.log(`FAIL ability-follow :: ${second.slice(0, 80)}`);
  }

  const listen = detectAgentCommand("听我说。");
  if (listen.command === "INTERRUPT") {
    pass += 1;
    console.log("OK   bare-listen-cmd");
  } else {
    console.log(`FAIL bare-listen-cmd :: ${listen.command}`);
  }

  const reaskState = createMeetingSession("smoke_reask");
  reaskState.mode = "HA_ASK";
  reaskState.haLockedUntil = Date.now() + 120000;
  reaskState.lastOpenAsk = "一年39000太贵了，我们现在经营困难，付不起这么多钱。";
  reaskState.lastOpenAskAt = Date.now();
  const reask = await runMeetingAnalysis("会场: 大智回复我刚才的问题。", DEFAULT_AGENDA, {
    agentState: reaskState,
    meetingState: reaskState,
    trigger: "wake",
    forceRule: true
  });
  const reaskText = String(reask.interventionText || reask.fullAnswer || "");
  if (/收益保障|每学期/.test(reaskText) && !/你想先听哪一步/.test(reaskText)) {
    pass += 1;
    console.log(`OK   reask-expensive :: ${reaskText.slice(0, 56)}`);
  } else {
    console.log(`FAIL reask-expensive :: ${reaskText.slice(0, 80)}`);
  }

  const total = cases.length + 3;
  console.log(`[smoke-scene-faq] ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
