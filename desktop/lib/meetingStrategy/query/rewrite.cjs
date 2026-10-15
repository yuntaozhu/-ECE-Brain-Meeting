/**
 * 规则改写：去回灌、选题、多轮追问粘连。
 */
const { isQuestionForm } = require("../../duplex");
const {
  normalizeDazhiAliases,
  isCasualChitchat,
  isBizStickyFollowUp,
  isBizDeicticFollowUp,
  peelWakePayload
} = require("../../meetingSession");
const {
  CLOSED_FAQ_RE,
  FOLLOW_UP_RE,
  peelClosedFaqCore,
  isResidualUtterance,
  isClosedFaqQuestion,
  isComplexQuestion,
  isBusinessIntent
} = require("./classify.cjs");

/** 上一答在让用户选题（「想先听哪一块」） */
const CHOICE_INVITE_RE = /想先听|先听哪|听哪一块|哪一块|先说哪|选哪|听哪一/;

function extractOfferedChoices(hostText) {
  const h = String(hostText || "").trim();
  if (!h || !CHOICE_INVITE_RE.test(h)) return [];
  let chunk = "";
  const colon = h.match(/[：:]([^。！？?\n]{4,80})/);
  if (colon) chunk = colon[1];
  else {
    const idx = h.search(CHOICE_INVITE_RE);
    if (idx > 4) chunk = h.slice(Math.max(0, idx - 48), idx);
  }
  chunk = chunk.replace(/与/g, "、");
  const parts = chunk
    .split(/[、，,/／]/)
    .map((s) =>
      String(s || "")
        .replace(/^(今天主题是|本场围绕|全园美语系统教研)/, "")
        .replace(/[的呢啊哦呀\s]/g, "")
        .trim()
    )
    .filter((s) => s.length >= 2 && s.length <= 12)
    .filter((s) => !/系统教研|今天主题|想先听|哪一块/.test(s));
  return [...new Set(parts)];
}

/**
 * 会场短句是否在选上一答给出的选项。命中则改写成可秒答问句。
 * @param {string} floor
 * @param {string} lastHostAnswer
 * @returns {{ choice: string, rewritten: string } | null}
 */
function matchOfferedChoice(floor, lastHostAnswer) {
  const raw = normalizeDazhiAliases(String(floor || "").trim());
  const bare = raw.replace(/[，,。．.!！？?\s]/g, "");
  if (!bare || bare.length < 2 || bare.length > 14) return null;
  if (/(大智|谢谢|会议开始|会议结束|听我说|我说完了)/.test(bare)) return null;
  const choices = extractOfferedChoices(lastHostAnswer);
  if (!choices.length) return null;
  for (const c of choices) {
    const cb = String(c || "").replace(/\s+/g, "");
    if (!cb) continue;
    if (bare === cb || bare.includes(cb) || cb.includes(bare)) {
      let rewritten = `${cb}是什么`;
      if (/家园共育|家庭端|Family说/.test(cb)) rewritten = "家园共育怎么做";
      else if (/校园经营|园所经营|经营/.test(cb)) rewritten = "校园经营怎么做";
      else if (/四端/.test(cb)) rewritten = "四端联动是什么";
      return { choice: cb, rewritten };
    }
  }
  return null;
}

/**
 * 去掉回灌半句前缀（Host 尾句粘连）。
 * @param {string} text
 * @param {string} [lastHostAnswer]
 */
function stripEchoPrefix(text, lastHostAnswer) {
  let t = String(text || "").trim();
  if (!t) return "";
  const host = String(lastHostAnswer || "").replace(/\s+/g, "");
  if (host.length >= 12) {
    // 若问句前半与 Host 尾部重叠，裁掉重叠前缀
    const tn = t.replace(/\s+/g, "");
    for (let len = Math.min(40, Math.floor(host.length / 2)); len >= 8; len -= 2) {
      const tail = host.slice(-len);
      if (tn.startsWith(tail)) {
        t = t.replace(/\s+/g, "").slice(len);
        break;
      }
      // 模糊：问句开头像 Host 中间碎片
      const idx = tn.indexOf(tail);
      if (idx >= 0 && idx < 8 && tn.length - idx > 10) {
        const after = tn.slice(idx + len);
        if (/(还有|其他|怎么|如何|第一步|怎么办)/.test(after) || /[？?]/.test(text)) {
          t = after;
          break;
        }
      }
    }
  }
  // 常见回灌碎片开头
  t = t.replace(/^[，,。.\s]+/, "");
  t = t.replace(/^(面|看|对|用|再|把)[，,、]?\s*/, (m) =>
    /还有|其他|怎么|如何/.test(t.slice(m.length)) ? "" : m
  );
  return normalizeDazhiAliases(t).trim() || String(text || "").trim();
}

/**
 * 规则改写：清洗 + 多轮继承（不强制调 LLM，降低延迟）。
 * @param {{ lastFloor: string, recentFloors?: string[], lastHostAnswer?: string }} opts
 */
function rewriteQueryRuleBased(opts = {}) {
  const lastFloor = String(opts.lastFloor || "").trim();
  const recent = (opts.recentFloors || []).map((x) => String(x || "").trim()).filter(Boolean);
  const lastHost = String(opts.lastHostAnswer || "").trim();
  // 口令/闲聊：禁止「针对上一答…追问」污染
  const skipFollowGlue =
    opts.skipFollowGlue === true ||
    isCasualChitchat(lastFloor) ||
    /谢谢大智|停止大智|听我说|请继续/.test(lastFloor);
  let cleaned = stripEchoPrefix(lastFloor, lastHost);
  cleaned = normalizeDazhiAliases(cleaned);
  // 长粘连：优先用 peel 后的唤醒正文
  if (opts.preferPeeled && opts.peeledPayload) {
    const peeled = normalizeDazhiAliases(String(opts.peeledPayload || "").trim());
    if (peeled.length >= 4) cleaned = peeled;
  } else if (cleaned.length > 60 && /大智/.test(cleaned)) {
    const peeled = peelWakePayload(cleaned);
    if (peeled.length >= 4 && peeled.length < cleaned.length) cleaned = peeled;
  }

  // 上一答「想先听哪一块」→ 用户只回选项名，直接改写成可秒答问句
  const choiceHit = matchOfferedChoice(cleaned, lastHost) || matchOfferedChoice(lastFloor, lastHost);
  if (choiceHit) {
    return {
      rewritten: choiceHit.rewritten.slice(0, 200),
      original: lastFloor,
      contextHint: choiceHit.choice,
      complex: false,
      closed: true,
      business: false,
      residual: false,
      followUp: true,
      choicePick: true,
      choice: choiceHit.choice
    };
  }

  // 闭题优先：从粘连句抠出「XXX是什么 / 什么是XXX」
  const closedCore = peelClosedFaqCore(cleaned) || peelClosedFaqCore(lastFloor);
  if (closedCore) cleaned = closedCore;
  if (cleaned.length > 80) {
    const parts = cleaned.split(/[。！？!?；;]/).map((p) => p.trim()).filter(Boolean);
    const last = parts[parts.length - 1] || cleaned.slice(-80);
    if (isQuestionForm(last) || CLOSED_FAQ_RE.test(last) || last.length >= 8) {
      cleaned = last;
    }
  }
  // 「是谁」按定义闭题处理，便于命中 FAQ
  cleaned = cleaned.replace(/是谁([？?]?)\s*$/, "是什么$1");

  const residual =
    isResidualUtterance(cleaned) ||
    isResidualUtterance(lastFloor) ||
    isCasualChitchat(cleaned);
  const closed = !residual && isClosedFaqQuestion(cleaned);
  const hostLooksBiz =
    lastHost &&
    /(三笔账|一点八|五点四|三万九|盈利|样板|招生|收费|非教|美语|延时|分层|测算)/.test(lastHost);
  const deictic = !residual && isBizDeicticFollowUp(cleaned);
  const isFollow =
    !skipFollowGlue &&
    !residual &&
    (!closed || deictic) &&
    isBizStickyFollowUp(cleaned) &&
    (FOLLOW_UP_RE.test(cleaned) ||
      deictic ||
      (isQuestionForm(cleaned) &&
        cleaned.length < 28 &&
        /(方案|步骤|怎么走|下一步|具体点|计算|测算|理由)/.test(cleaned) &&
        !/(开展|实施|倒闭|重生|起死回生|多少钱|全园美语课程)/.test(cleaned)));

  let contextHint = "";
  if (isFollow) {
    const priorUser = [...recent]
      .reverse()
      .find(
        (l) =>
          l !== lastFloor &&
          (/(倒闭|重生|起死回生|招生|实施|开展|美语|经营|盈利|赚钱)/.test(l) || l.length >= 16)
      );
    if (priorUser) {
      contextHint = priorUser.slice(0, 80);
      if (
        cleaned.length < 40 ||
        deictic ||
        /还有|其他方案|第一步|怎么走|0.?1|怎么算|计算|理由/.test(cleaned)
      ) {
        cleaned = `${contextHint}。追问：${cleaned}`;
      }
    } else if (hostLooksBiz) {
      cleaned = `针对上一答「${lastHost.slice(0, 48)}」：${cleaned}`;
    }
  } else if (
    !skipFollowGlue &&
    !residual &&
    cleaned.length < 32 &&
    (hostLooksBiz || FOLLOW_UP_RE.test(lastFloor)) &&
    (isBizStickyFollowUp(cleaned) || deictic) &&
    (recent.length || hostLooksBiz)
  ) {
    const priorUser = [...recent].reverse().find((l) => l !== lastFloor && l.length >= 12);
    if (priorUser) {
      contextHint = priorUser.slice(0, 80);
      cleaned = `${contextHint}。追问：${cleaned}`;
    } else if (hostLooksBiz) {
      cleaned = `针对上一答「${lastHost.slice(0, 48)}」：${cleaned}`;
    }
  }

  const complex =
    !closed && !residual && (isComplexQuestion(cleaned) || isComplexQuestion(lastFloor));
  const business =
    !closed &&
    !residual &&
    !isCasualChitchat(cleaned) &&
    (isBusinessIntent(cleaned) || isBusinessIntent(lastFloor));

  return {
    rewritten: cleaned.slice(0, 200),
    original: lastFloor,
    contextHint,
    complex,
    closed,
    business,
    residual,
    followUp: Boolean(isFollow),
    choicePick: false,
    choice: ""
  };
}

module.exports = {
  CHOICE_INVITE_RE,
  extractOfferedChoices,
  matchOfferedChoice,
  stripEchoPrefix,
  rewriteQueryRuleBased
};
