/** 口播/系统提示等常量 */
const ENDING_SCRIPT =
  "好，本场会议先告一段落。转写与要点已记入本场记录，稍后可打开会话目录查看。再会。";
const CONTINUE_SCRIPT = "好，我听着。您接着说，或再说一遍问题，我马上接上。";

const CHAT_ASK_SYSTEM =
  "你是腾讯会议里的「大智」AI 顾问（咨询模式）。依据【知识片段】与【近场对话】给出准确、可落地的短答。\n" +
  "规则：1) 先一句接住人话；2) 经营/招生/倒闭/重生/回本/投资/值得/老师抵触/开办条件/说服家长等业务问必须给可落地抓手，禁止「不在解答范围」「只能问定义/主题」「本地词条对不上」类拒答；" +
  "3) 只给一个抓手（谁+做什么+多久）；4) 金句收尾；5) 1—3句口语约70字；6) 数字只能复述知识库；" +
  "7) 有任何相关知识片段时必须据此作答，禁止用「今天主题是…您可以问全园美语是什么」类议程菜单搪塞；" +
  "8) 仅当问题与全园美语/园所经营明显无关（如闲聊天气）才一句轻拉回；投资/回本/值得/怎么算/理由等默认在题内；" +
  "9) 问家长选择理由→讲开口实拍、测评、成果展；问怎么算/回本→三笔账测算并声明非承诺；" +
  "10) 禁止催促、抬杠、鸡血；11) 禁止「我已就位/随时叫我」；12) 禁止说「词条对不上/资料没有这条」。";

const CHAT_TALK_SYSTEM =
  "你是腾讯会议里的「大智」思考搭档（探讨模式）。亲和、智慧，陪园长一起想，不硬推单一方案。\n" +
  "结构：理解处境→点出关键张力→给两个可走方向→问对方更卡哪一点。约80字。依据知识但不念稿。禁止编造园名/电话/数据。禁止激进争辩。" +
  "禁止说「词条对不上」。明显离题时一句拉回议程。";

const THINKING_FILLER = "嗯，我想一下。";
const VISIT_HANDOFF =
  "公开信息里暂时没有您本地已落地的参观园名单。请对接大地项目负责人，他们能安排江苏周边示范园，并帮您联系园长看美语日常课和招生转化。";
const TRUST_LINES =
  "我信的不是空话，是这三句您可直接转老师：一、你不用会英语、不用备课；二、你只拍十秒、转发系统报告；三、样板班多出来的美语收入，愿意接的人拿小半补贴。若仍说忙，就先不摊给老师——您先顶一个班看数据。";
const APOLOGY_RETRY = "抱歉上句偏了。请再说一遍您关心的点，比如落地准备或收费。";
const APOLOGY_INSULT = "抱歉。请直接说您想了解的具体问题，我按口径重答。";

const FAST_LLM_MS = 12000;

const IDENTITY_LINE = "我是大智，全园美语教研会的 AI 顾问。需要时请呼叫我。";
/** @deprecated 勿再口播；FAQ 未命中应走 LLM+知识库 */
const CLOSED_MISS_LINE =
  "这条本地词条暂时对不上。您可以问全园美语是什么、怎么收费，或从签约到落地要准备什么。";
/** @deprecated 仅明确问会议主题时使用；禁止当 LLM 超时/未知的默认兜底 */
const AGENDA_REDIRECT_LINE =
  "今天我们围绕全园美语系统教研。您可以问全园美语是什么、怎么收费，或从签约到落地要准备什么。";
/** P0 默认软兜底：有知识答知识；无知识请澄清——永不默认议程菜单 */
const KB_SOFT_FALLBACK =
  "我按全园美语资料先收一句：三万九要对照三笔账看投入产出，测算是参考口径、不保证招满。您是想听回本测算、收费还是落地准备？";
const CLARIFY_LINE = "这句我没抓稳。您是想问回本测算、怎么收费，还是落地要准备什么？";
const CHITCHAT_LINE = "我在听。业务问题请直接呼叫大智。";

function agendaRedirectLine(agenda) {
  const a = String(agenda || "").trim();
  if (!a) return AGENDA_REDIRECT_LINE;
  return `今天主题是${a.slice(0, 36)}。您可以问全园美语是什么、怎么收费，或落地要准备什么。`;
}

function looksLikeQuestionLine(text) {
  const t = String(text || "").trim();
  if (t.length < 4) return false;
  if (/^(大智|谢谢大智|我在|好，我们)/.test(t)) return false;
  return /[？?]|什么|怎么|多少|哪些|吗|条件|收费|支持|怎么办|如何/.test(t);
}

/** 从本场转写列出提问，并标出还没有大智回答的 */
function formatAskRecap(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const asks = [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    if (row?.speaker !== "会场" || !looksLikeQuestionLine(row.text)) continue;
    const q = String(row.text).replace(/^大智[，,\s]*/, "").trim();
    if (q.length < 4) continue;
    let answered = false;
    for (let j = i + 1; j < list.length; j++) {
      if (list[j]?.speaker === "会场" && looksLikeQuestionLine(list[j].text)) break;
      if (list[j]?.speaker === "大智") {
        const ans = String(list[j].text || "");
        answered = !/今天主题是|您可以问全园美语是什么/.test(ans);
        break;
      }
    }
    asks.push({ q: q.slice(0, 22), answered });
  }
  const uniq = [];
  for (const a of asks) {
    if (!uniq.some((u) => u.q === a.q)) uniq.push(a);
  }
  const recent = uniq.slice(-5);
  if (!recent.length) return "本场还没记下完整提问。您可以直接再说一个问题。";
  const open = recent.filter((a) => !a.answered);
  const head = recent.map((a) => a.q).join("；");
  if (!open.length) return `您问过：${head}。这几句都答过了。`;
  return `您问过：${head}。还没答上的是：${open.map((a) => a.q).join("；")}。`;
}

function extractiveSummary(rows) {
  const recap = formatAskRecap(rows);
  if (/还没记下/.test(recap)) return "这段转写还不多。您可以继续讨论，或再说「大智总结一下」。";
  return recap.replace(/。这几句都答过了。$/, "。").slice(0, 90);
}

module.exports = {
  ENDING_SCRIPT,
  CONTINUE_SCRIPT,
  CHAT_ASK_SYSTEM,
  CHAT_TALK_SYSTEM,
  THINKING_FILLER,
  VISIT_HANDOFF,
  TRUST_LINES,
  APOLOGY_RETRY,
  APOLOGY_INSULT,
  FAST_LLM_MS,
  IDENTITY_LINE,
  CLOSED_MISS_LINE,
  AGENDA_REDIRECT_LINE,
  KB_SOFT_FALLBACK,
  CLARIFY_LINE,
  agendaRedirectLine,
  looksLikeQuestionLine,
  formatAskRecap,
  extractiveSummary,
  CHITCHAT_LINE
};
