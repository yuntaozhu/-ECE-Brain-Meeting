/**
 * Multi-turn follow-up against offline chains (forceRule).
 *   node scripts/smoke-chain-follow.cjs
 */
const fs = require("fs");
const path = require("path");
const rootEnv = path.join(__dirname, "..", "..", ".env");
const deskEnv = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: fs.existsSync(rootEnv) ? rootEnv : deskEnv });

process.env.DOUBAO_API_KEY = process.env.DOUBAO_API_KEY || "sk-smoke";
process.env.ARK_API_KEY = process.env.ARK_API_KEY || "";

const { createMeetingSession } = require("../lib/meetingSession");
const { runMeetingAnalysis, DEFAULT_AGENDA } = require("../lib/meetingStrategy");
const { clearChainCache } = require("../lib/knowledge/chains/match.cjs");

const dialogs = [
  {
    id: "def-chain",
    turns: [
      {
        q: "全园美语是什么？",
        need: /全园|四端|美语特色/,
        forbid: /这句我还没对上|后半句没听清/
      },
      {
        q: "全园美语怎么做？",
        need: /合作园|ABCmouse|四端|特色|行事历|落实|简讯|开课|整合|样板|开口/,
        forbid: /这句我还没对上|后半句没听清|^全园美语是面向大地合作园的全园型美语特色系统，不是单一英语课或账号采购$/
      },
      {
        q: "全园美语先做哪一步？",
        need: /整合|ABCmouse|四端|招生|落实|行事历|开课|简讯/,
        forbid: /这句我还没对上/
      }
    ]
  },
  {
    id: "family-chain",
    turns: [
      {
        q: "家园共育怎么做？",
        need: /家庭端|Family|回家延续|离园/,
        forbid: /这句我还没对上/
      },
      {
        q: "家庭端怎么做？",
        need: /Family|回家延续|离园|ABCmouse|家庭/,
        forbid: /这句我还没对上/
      },
      {
        q: "家庭端先做哪一步？",
        need: /Family|回家延续|离园|ABCmouse|家庭/,
        forbid: /这句我还没对上/
      }
    ]
  },
  {
    id: "campus-chain",
    turns: [
      {
        q: "校园经营怎么做？",
        need: /样板|开口|测评|成果|收费盘面|增量/,
        forbid: /这句我还没对上/
      },
      {
        q: "校园经营先做哪一步？",
        need: /收费盘面|增量|样板|开口|测评|成果|测算|投入|回报/,
        forbid: /这句我还没对上|今天主题是/
      },
      {
        q: "校园经营具体怎么开展？",
        need: /样板|开口|测评|成果|收费盘面|增量|测算|延伸|毕业生|社区/,
        forbid: /这句我还没对上|今天主题是/
      }
    ]
  },
  {
    id: "chain-miss-ok",
    turns: [
      {
        q: "全园美语是什么？",
        need: /全园|四端|美语特色/,
        forbid: /这句我还没对上/
      },
      {
        q: "火星上怎么开幼儿园？",
        need: /这句我还没对上|^$/,
        forbid: /把美语做成家长看得见的选择理由/
      }
    ]
  },
  {
    id: "topic-switch",
    turns: [
      {
        q: "全园美语是什么？",
        need: /全园|四端|美语特色/,
        forbid: /这句我还没对上/
      },
      {
        q: "家园共育怎么做？",
        need: /家庭端|Family|回家延续|离园/,
        forbid: /不是单一英语课|合作园的全园型|这句我还没对上/
      },
      {
        q: "家庭端先做哪一步？",
        need: /家庭端|Family|回家延续|离园|ABCmouse/,
        forbid: /不是单一英语课|合作园的全园型/
      }
    ]
  },
  {
    id: "how-do-not-def",
    turns: [
      {
        q: "全园美语是什么？",
        need: /全园|四端|美语特色/,
        forbid: /这句我还没对上/
      },
      {
        q: "全园美语怎么做？",
        need: /合作园|ABCmouse|四端|特色|落地|实施|样板|开口|行事历|整合/,
        forbid: /这句我还没对上|^全园美语是面向大地合作园的全园型美语特色系统，不是单一英语课或账号采购$/
      }
    ]
  },
  {
    id: "correct-reask-how",
    turns: [
      {
        q: "全园美语是什么？",
        need: /全园|四端|美语特色/,
        forbid: /这句我还没对上/
      },
      {
        q: "全园美语怎么做？",
        need: /./,
        forbid: /这句我还没对上/
      },
      {
        q: "的是怎么做？",
        need: /合作园|ABCmouse|四端|特色|落地|实施|样板|开口|行事历|整合|家庭|教师/,
        forbid: /这句我还没对上|^$/
      },
      {
        q: "我问的是怎么做。",
        need: /合作园|ABCmouse|四端|特色|落地|实施|样板|开口|行事历|整合|家庭|教师/,
        forbid: /这句我还没对上|^$/
      }
    ]
  }
];

async function runDialog(d) {
  clearChainCache();
  const state = createMeetingSession(`chain_${d.id}`);
  state.mode = "HA_ASK";
  state.haLockedUntil = Date.now() + 300000;
  const fails = [];
  for (let i = 0; i < d.turns.length; i += 1) {
    const t = d.turns[i];
    state.haLockedUntil = Date.now() + 300000;
    const r = await runMeetingAnalysis(`会场: ${t.q}`, DEFAULT_AGENDA, {
      agentState: state,
      meetingState: state,
      trigger: "wake",
      forceRule: true,
      lastHostSpeakText: String(state.lastHostSpeakText || "")
    });
    const answer = String(r.interventionText || r.fullAnswer || r.spokenPrefix || "");
    if (r.interventionText) state.lastHostSpeakText = answer;
    if (!t.need.test(answer)) fails.push(`t${i + 1} missing: ${answer.slice(0, 80)}`);
    if (t.forbid.test(answer)) fails.push(`t${i + 1} forbid: ${answer.slice(0, 80)}`);
  }
  return fails;
}

async function main() {
  let pass = 0;
  for (const d of dialogs) {
    const fails = await runDialog(d);
    if (fails.length) {
      console.log(`FAIL ${d.id}`);
      fails.forEach((f) => console.log(`  - ${f}`));
    } else {
      pass += 1;
      console.log(`OK   ${d.id}`);
    }
  }
  console.log(`chain-follow ${pass}/${dialogs.length} passed`);
  if (pass !== dialogs.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
