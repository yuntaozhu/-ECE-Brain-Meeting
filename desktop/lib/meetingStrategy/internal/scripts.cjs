/** 口播/系统提示等常量。正文只读 knowledge/schema/speak-lines.json。 */
const { speakLine, speakFill, speakHp, rx } = require("../../knowledge/schemaStore.cjs");

const ENDING_SCRIPT = speakLine("ending");
const CONTINUE_SCRIPT = speakLine("continue");
const CHAT_ASK_SYSTEM = speakLine("chatAskSystem");
const CHAT_TALK_SYSTEM = speakLine("chatTalkSystem");
const THINKING_FILLER = speakLine("thinkingFiller");
const VISIT_HANDOFF = speakLine("visitHandoff");
const TRUST_LINES = speakLine("trustLines");
const APOLOGY_RETRY = speakLine("apologyRetry");
const APOLOGY_INSULT = speakLine("apologyInsult");
const FAST_LLM_MS = speakHp("fastLlmMs");
const IDENTITY_LINE = speakLine("identity");
/** @deprecated 勿再口播；FAQ 未命中应走 LLM+知识库 */
const CLOSED_MISS_LINE = speakLine("closedMiss");
/** @deprecated 仅明确问会议主题时使用；禁止当 LLM 超时/未知的默认兜底 */
const AGENDA_REDIRECT_LINE = speakLine("agendaRedirect");
/** P0 默认软兜底：有知识答知识；无知识请澄清——永不默认议程菜单 */
const KB_SOFT_FALLBACK = speakLine("kbSoftFallback");
const CLARIFY_LINE = speakLine("clarify");
const CHITCHAT_LINE = speakLine("chitchat");

function agendaRedirectLine(agenda) {
  const a = String(agenda || "").trim();
  if (!a) return AGENDA_REDIRECT_LINE;
  return speakFill("agendaRedirectTpl", { agenda: a.slice(0, 36) });
}

function looksLikeQuestionLine(text) {
  const t = String(text || "").trim();
  if (t.length < 4) return false;
  if (rx("speak", "questionSkipHead").test(t)) return false;
  return rx("speak", "questionCue").test(t);
}

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
        answered = !rx("speak", "answeredNotAgenda").test(ans);
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
  if (!recent.length) return speakLine("askRecapEmpty");
  const open = recent.filter((a) => !a.answered);
  const head = recent.map((a) => a.q).join("；");
  if (!open.length) return speakFill("askRecapAllDone", { head });
  return speakFill("askRecapOpen", { head, open: open.map((a) => a.q).join("；") });
}

function extractiveSummary(rows) {
  const recap = formatAskRecap(rows);
  if (rx("speak", "summarySparseMark").test(recap)) return speakLine("summarySparse");
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
