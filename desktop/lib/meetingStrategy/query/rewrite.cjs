/**
 * 规则改写：去回灌、选题、多轮追问粘连。
 * 句式只读 knowledge/schema/query-classify.json。
 */
const { isQuestionForm } = require("../../duplex");
const {
  normalizeDazhiAliases,
  isCasualChitchat,
  isBizStickyFollowUp,
  isBizDeicticFollowUp,
  peelWakePayload
} = require("../../meetingSession");
const { load, rx } = require("../../knowledge/schemaStore.cjs");
const {
  peelClosedFaqCore,
  isResidualUtterance,
  isClosedFaqQuestion,
  isComplexQuestion,
  isBusinessIntent
} = require("./classify.cjs");

function lim(name) {
  const value = load().classify.limits[name];
  if (value == null) throw new Error("missing classify limit " + name);
  return value;
}

function pat(name) {
  return rx("classify", name);
}

function choiceInviteRe() {
  return pat("choiceInvite");
}

function extractOfferedChoices(hostText) {
  const h = String(hostText || "").trim();
  if (!h || !choiceInviteRe().test(h)) return [];
  let chunk = "";
  const colon = h.match(pat("choiceColon"));
  if (colon) chunk = colon[1];
  else {
    const idx = h.search(choiceInviteRe());
    if (idx > 4) chunk = h.slice(Math.max(0, idx - lim("choiceLookback")), idx);
  }
  chunk = chunk.replace(/与/g, "、");
  const parts = chunk
    .split(/[、，,/／]/)
    .map((s) =>
      String(s || "")
        .replace(pat("choiceNoisePrefix"), "")
        .replace(/[的呢啊哦呀\s]/g, "")
        .trim()
    )
    .filter((s) => s.length >= lim("choicePartMin") && s.length <= lim("choicePartMax"))
    .filter((s) => !pat("choiceNoiseFilter").test(s));
  return [...new Set(parts)];
}

function rewriteChoiceLabel(cb) {
  for (const row of load().classify.choiceRewrite || []) {
    if (row && row.test && new RegExp(row.test).test(cb)) return row.rewritten;
  }
  return `${cb}是什么`;
}

/**
 * 会场短句是否在选上一答给出的选项。命中则改写成可秒答问句。
 */
function matchOfferedChoice(floor, lastHostAnswer) {
  const raw = normalizeDazhiAliases(String(floor || "").trim());
  const bare = raw.replace(/[，,。．.!！？?\s]/g, "");
  if (!bare || bare.length < lim("choiceBareMin") || bare.length > lim("choiceBareMax")) return null;
  if (pat("choiceCommand").test(bare)) return null;
  const choices = extractOfferedChoices(lastHostAnswer);
  if (!choices.length) return null;
  for (const c of choices) {
    const cb = String(c || "").replace(/\s+/g, "");
    if (!cb) continue;
    if (bare === cb || bare.includes(cb) || cb.includes(bare)) {
      return { choice: cb, rewritten: rewriteChoiceLabel(cb) };
    }
  }
  return null;
}

function stripEchoPrefix(text, lastHostAnswer) {
  let t = String(text || "").trim();
  if (!t) return "";
  const host = String(lastHostAnswer || "").replace(/\s+/g, "");
  if (host.length >= lim("echoHostMin")) {
    const tn = t.replace(/\s+/g, "");
    for (
      let len = Math.min(lim("echoOverlapMax"), Math.floor(host.length / 2));
      len >= lim("echoOverlapMin");
      len -= 2
    ) {
      const tail = host.slice(-len);
      if (tn.startsWith(tail)) {
        t = t.replace(/\s+/g, "").slice(len);
        break;
      }
      const idx = tn.indexOf(tail);
      if (idx >= 0 && idx < lim("echoFuzzyIdxMax") && tn.length - idx > lim("echoAfterMin")) {
        const after = tn.slice(idx + len);
        if (pat("echoAfterCue").test(after) || /[？?]/.test(text)) {
          t = after;
          break;
        }
      }
    }
  }
  t = t.replace(/^[，,。.\s]+/, "");
  t = t.replace(/^(面|看|对|用|再|把)[，,、]?\s*/, (m) =>
    pat("echoLeadKeep").test(t.slice(m.length)) ? "" : m
  );
  return normalizeDazhiAliases(t).trim() || String(text || "").trim();
}

function rewriteQueryRuleBased(opts = {}) {
  const lastFloor = String(opts.lastFloor || "").trim();
  const recent = (opts.recentFloors || []).map((x) => String(x || "").trim()).filter(Boolean);
  const lastHost = String(opts.lastHostAnswer || "").trim();
  const skipFollowGlue =
    opts.skipFollowGlue === true ||
    isCasualChitchat(lastFloor) ||
    pat("skipFollowGlue").test(lastFloor);
  let cleaned = stripEchoPrefix(lastFloor, lastHost);
  cleaned = normalizeDazhiAliases(cleaned);
  if (opts.preferPeeled && opts.peeledPayload) {
    const peeled = normalizeDazhiAliases(String(opts.peeledPayload || "").trim());
    if (peeled.length >= lim("peelPreferMin")) cleaned = peeled;
  } else if (cleaned.length > lim("peelWakeLen") && /大智/.test(cleaned)) {
    const peeled = peelWakePayload(cleaned);
    if (peeled.length >= lim("peelPreferMin") && peeled.length < cleaned.length) cleaned = peeled;
  }

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

  const closedCore = peelClosedFaqCore(cleaned) || peelClosedFaqCore(lastFloor);
  if (closedCore) cleaned = closedCore;
  if (cleaned.length > lim("splitLongMin")) {
    const parts = cleaned.split(/[。！？!?；;]/).map((p) => p.trim()).filter(Boolean);
    const last = parts[parts.length - 1] || cleaned.slice(-lim("splitLongMin"));
    if (isQuestionForm(last) || pat("closedFaq").test(last) || last.length >= lim("splitLastMin")) {
      cleaned = last;
    }
  }
  cleaned = cleaned.replace(pat("whoToWhat"), "是什么$1");

  const residual =
    isResidualUtterance(cleaned) ||
    isResidualUtterance(lastFloor) ||
    isCasualChitchat(cleaned);
  const closed = !residual && isClosedFaqQuestion(cleaned);
  const hostLooksBiz = lastHost && pat("hostLooksBiz").test(lastHost);
  const deictic = !residual && isBizDeicticFollowUp(cleaned);
  const isFollow =
    !skipFollowGlue &&
    !residual &&
    (!closed || deictic) &&
    isBizStickyFollowUp(cleaned) &&
    (pat("followUp").test(cleaned) ||
      deictic ||
      (isQuestionForm(cleaned) &&
        cleaned.length < lim("followShortMax") &&
        pat("followShortCue").test(cleaned) &&
        !pat("followShortBlock").test(cleaned)));

  let contextHint = "";
  if (isFollow) {
    const priorUser = [...recent]
      .reverse()
      .find(
        (l) =>
          l !== lastFloor &&
          (pat("priorUserCue").test(l) || l.length >= lim("priorUserMin"))
      );
    if (priorUser) {
      contextHint = priorUser.slice(0, 80);
      if (
        cleaned.length < lim("followGlueShort") ||
        deictic ||
        pat("followGlueCue").test(cleaned)
      ) {
        cleaned = `${contextHint}。追问：${cleaned}`;
      }
    } else if (hostLooksBiz) {
      cleaned = `针对上一答「${lastHost.slice(0, 48)}」：${cleaned}`;
    }
  } else if (
    !skipFollowGlue &&
    !residual &&
    cleaned.length < lim("followHostAltMax") &&
    (hostLooksBiz || pat("followUp").test(lastFloor)) &&
    (isBizStickyFollowUp(cleaned) || deictic) &&
    (recent.length || hostLooksBiz)
  ) {
    const priorUser = [...recent]
      .reverse()
      .find((l) => l !== lastFloor && l.length >= lim("priorAltMin"));
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
  get CHOICE_INVITE_RE() {
    return choiceInviteRe();
  },
  extractOfferedChoices,
  matchOfferedChoice,
  stripEchoPrefix,
  rewriteQueryRuleBased
};
