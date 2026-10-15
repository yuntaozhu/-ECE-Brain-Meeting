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

const { createMeetingSession } = require("../lib/meetingSession");
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
    need: /样板|开口|课件|落地|准备|开办|执行|四步|行事历|我在|这句我还没对上/,
    forbid: /后半句没听清|请再说具体一点，我结合资料答您/
  },
  // P0：闭题未命中时禁止经营万能句冒充
  {
    id: "diff-no-operate",
    q: "全园美语和其他课程有什么区别？",
    need: /这句我还没对上|区别|不是单一|生态|四端|体系/,
    forbid: /把美语做成家长看得见的选择理由|先护收费盘面再做增量/
  },
  {
    id: "confidence-no-operate",
    q: "我有信心办好吗？",
    need: /这句我还没对上|这句我没抓稳|请再说具体一点/,
    forbid: /把美语做成家长看得见的选择理由|先护收费盘面再做增量|样板班开口实拍/
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
    const r = await runMeetingAnalysis(`会场: ${c.q}`, DEFAULT_AGENDA, {
      agentState: state,
      meetingState: state,
      trigger: "wake",
      forceRule: true
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
  console.log(`[smoke-scene-faq] ${pass}/${cases.length}`);
  process.exit(pass === cases.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
