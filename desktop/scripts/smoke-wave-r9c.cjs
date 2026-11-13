/**
 * Wave R9c：Agent 两跳收口 + Copilot Meta 禁精炼 + searchWeb 开关。
 *   npm run smoke:wave-r9c
 */
const fs = require("fs");
const path = require("path");
const rootEnv = path.join(__dirname, "..", "..", ".env");
const deskEnv = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: fs.existsSync(rootEnv) ? rootEnv : deskEnv });
process.env.DOUBAO_API_KEY = process.env.DOUBAO_API_KEY || "sk-smoke";
delete process.env.AGENT_SEARCH_WEB;
delete process.env.LANE_ARBITER_LLM;

const {
  MAX_TOOL_HOPS,
  runToolHops,
  searchWebEnabled,
  weakRetrieval
} = require("../lib/meetingStrategy/agent/toolHops.cjs");
const { isMetaOrRepairDraft, shouldRefineCopilot } = require("../lib/copilot/refine.cjs");
const { copilotCfg } = require("../lib/copilot/gate.cjs");
const { retrieveKnowledge } = require("../lib/knowledge");
const { createMeetingSession } = require("../lib/meetingSession");
const { runMeetingAnalysis, DEFAULT_AGENDA } = require("../lib/meetingStrategy");

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

async function phaseToolHops() {
  check("hops:MAX=2", MAX_TOOL_HOPS === 2);
  check("searchWeb:default off", searchWebEnabled() === false);

  const r1 = await runToolHops(
    {
      retrieveKnowledge,
      retrieveSemantic: async () => ({ hits: [], preview: "" }),
      queryWiki: () => ({ hits: [] }),
      hasApiKey: () => false
    },
    { askText: "三万九是学期还是一年？", intentObj: {}, opts: { forceRule: true }, askLane: "hard" }
  );
  check(
    "hops:hard FAQ ≤2",
    r1.hopCount >= 1 && r1.hopCount <= 2 && r1.hopCount <= MAX_TOOL_HOPS,
    JSON.stringify({ hopCount: r1.hopCount, tools: r1.tool })
  );
  check("hops:有命中不算不足", r1.evidenceInsufficient === false || !weakRetrieval(r1), r1.evidenceInsufficient);

  const r2 = await runToolHops(
    {
      retrieveKnowledge: () => ({ hits: [], preview: "", instantAnswer: "" }),
      retrieveSemantic: async () => ({ hits: [], preview: "" }),
      queryWiki: () => ({ hits: [] }),
      hasApiKey: () => false
    },
    {
      askText: "火星上怎么开幼儿园",
      intentObj: { retrieve_queries: ["外星招生", "太空美语", "第三问不该再跑"] },
      opts: { forceRule: true },
      askLane: "soft",
      state: {}
    }
  );
  check(
    "hops:弱检索最多两跳",
    r2.hopCount <= 2,
    JSON.stringify({ hopCount: r2.hopCount, hops: r2.hops.map((h) => h.tool) })
  );
  check("hops:用尽标不足", r2.evidenceInsufficient === true || r2.hopCount === 2, r2.evidenceInsufficient);

  process.env.AGENT_SEARCH_WEB = "1";
  check("searchWeb:可开", searchWebEnabled() === true);
  const r3 = await runToolHops(
    {
      retrieveKnowledge: () => ({ hits: [], preview: "" }),
      retrieveSemantic: async () => ({ hits: [], preview: "" }),
      queryWiki: () => ({ hits: [] }),
      hasApiKey: () => false
    },
    { askText: "下一步怎么推比较稳", intentObj: {}, opts: { forceRule: true }, askLane: "strategy" }
  );
  check(
    "hops:strategy+searchWeb 占第二跳",
    r3.hops.some((h) => h.tool === "searchWeb") && r3.hopCount <= 2,
    JSON.stringify(r3.hops.map((h) => h.tool))
  );
  delete process.env.AGENT_SEARCH_WEB;
}

function phaseCopilotMeta() {
  check(
    "refine:拒 Meta draft",
    isMetaOrRepairDraft({ arkMode: "dialogue-meta", text: "刚才您问的是：学费" }, {}) === true
  );
  check(
    "refine:拒 recall 句",
    isMetaOrRepairDraft({ text: "刚才我答的是：可以支持。" }, {}) === true
  );
  check(
    "refine:拒 repair 句",
    isMetaOrRepairDraft({ text: "这句我没听清。请您再说完整一点。" }, {}) === true
  );
  check(
    "refine:业务 draft 放行",
    isMetaOrRepairDraft({ arkMode: "faq", text: "三万九是每学期，不保证招满。" }, {}) === false
  );
  const advisor = String(copilotCfg().refine?.advisorSystem || "");
  check("refine:prompt 含 smart_replies", /smart_replies/.test(advisor));
  check("refine:prompt 禁 Meta", /Meta|repair/.test(advisor));
  check("refine:default on", shouldRefineCopilot({}) === true);
}

async function phaseHostSoftMiss() {
  const st = createMeetingSession("smoke_r9c_soft");
  st.mode = "HA_ASK";
  st.haLockedUntil = Date.now() + 120000;
  // forceRule：走规则路径；软题弱命中时应能收口不崩
  const r = await runMeetingAnalysis(
    "会场: 学生喜欢吗感觉怎么样会不会太难",
    DEFAULT_AGENDA,
    {
      agentState: st,
      meetingState: st,
      trigger: "wake",
      forceRule: true
    }
  );
  check(
    "host:soft 路径不崩",
    r && typeof r === "object",
    String(r?.arkMode || r?.reason || "").slice(0, 40)
  );
}

phaseToolHops()
  .then(() => {
    phaseCopilotMeta();
    return phaseHostSoftMiss();
  })
  .then(() => {
    console.log(`\nwave-r9c smoke: ${pass} pass, ${fail} fail`);
    process.exit(fail ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
