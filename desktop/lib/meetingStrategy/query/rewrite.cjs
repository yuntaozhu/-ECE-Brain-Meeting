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
const { load, rx, words, hp, speakLine, speakFill } = require("../../knowledge/schemaStore.cjs");
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

function commitOnlyLine(text) {
  const t = String(text || "");
  return rx("commands", "commitAct").test(t) && !rx("operators", "interrogative").test(t);
}

function peelSkeleton(text) {
  let s = String(text || "");
  const tail = load().classify.patterns.peelTailMark;
  if (tail) s = s.replace(new RegExp(tail, "g"), "");
  const keys = [...words("operators", "dropWords"), ...words("operators", "topicDrop")]
    .filter((w) => w && String(w).length >= 2)
    .sort((a, b) => b.length - a.length);
  for (const w of keys) {
    if (s.includes(w)) s = s.split(w).join("");
  }
  return s.replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, "");
}

function dropGeneric(text) {
  let s = String(text || "");
  const max = hp("genericTopicMax");
  const list = [...words("operators", "genericTopic")].sort((a, b) => b.length - a.length);
  for (const g of list) {
    if (g.length < max && s.includes(g)) s = s.split(g).join("");
  }
  return s;
}

/** 疑问词留在谓语里；指代、弱尾、泛词从实体槽拿掉。 */
function entityFillers() {
  const inter = rx("operators", "interrogative");
  const bag = new Set();
  for (const name of ["dropWords", "topicDrop", "weakTail"]) {
    for (const w of words("operators", name)) {
      if (!w || String(w).length < 2 || inter.test(w)) continue;
      bag.add(w);
    }
  }
  return [...bag].sort((a, b) => b.length - a.length);
}

function stripEntityFillers(text) {
  let s = String(text || "");
  for (const w of entityFillers()) {
    if (s.includes(w)) s = s.split(w).join("");
  }
  return dropGeneric(s).replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, "");
}

/** 疑问骨架左边去掉指代/泛词/弱尾后不足两字，实体槽是空的。 */
function entitySlotEmpty(ask) {
  const bare = String(ask || "").replace(/[？?。！!\s]/g, "");
  const how = bare.match(rx("operators", "interrogative"));
  const left = how ? bare.slice(0, how.index) : bare;
  return stripEntityFillers(left).length < 2;
}

/** 从疑问骨架起保留谓语，并带上紧挨着的「有/是」。尾部再去掉指代和泛词。 */
function anchorFromTitle(title, fallback) {
  const cfg = load().faq || {};
  const generic = String(cfg.genericEntity || "");
  const hits = (cfg.entities || []).filter((e) => e && e !== generic && String(title).includes(e));
  hits.sort((a, b) => b.length - a.length);
  const specific = hits.find((e) => /[\u4e00-\u9fff]/.test(e));
  if (specific) return specific;
  if (generic && String(title).includes(generic)) return generic;
  return fallback();
}

function predicateTail(ask) {
  const bare = String(ask || "").replace(/[？?。！!\s]/g, "");
  const how = bare.match(rx("operators", "interrogative"));
  if (!how) return "";
  let start = how.index;
  if (start > 0 && (bare[start - 1] === "有" || bare[start - 1] === "是")) {
    if (stripEntityFillers(bare.slice(0, start - 1)).length < 2) start -= 1;
  }
  let tail = bare.slice(start);
  tail = dropGeneric(tail);
  const inter = rx("operators", "interrogative");
  const weak = words("operators", "weakTail");
  const noise = [...words("operators", "topicDrop"), ...words("operators", "dropWords")]
    .filter((w) => w && String(w).length >= 2 && !inter.test(w) && !weak.has(w))
    .sort((a, b) => b.length - a.length);
  for (const w of noise) {
    if (tail.includes(w)) tail = tail.split(w).join("");
  }
  return tail.replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, "");
}

/** 剥掉「我问的是 / 的是」纠正壳，再判实体槽与谓语。 */
function peelCorrectShell(ask) {
  let q = String(ask || "").trim();
  const peel = load().commands?.patterns?.correctPeel;
  if (peel) {
    try {
      q = q.replace(new RegExp(peel), "");
    } catch (_) {
      /* schema 坏了则保持原句 */
    }
  }
  q = q.replace(/^[的是]+/, "");
  return q.trim() || String(ask || "").trim();
}

/**
 * 上一张卡已答、本轮实体槽是空的：检索前把标题焦点接到本轮疑问尾。
 * 句中已有专名或已含该焦点则不改写。只改问句，不续播上一句口播。
 */
function isAgendaTitle(title) {
  const t = String(title || "");
  if (!t) return false;
  try {
    if (rx("speak", "localAgenda").test(t)) return true;
  } catch (_) {
    /* schema 未就绪 */
  }
  return /会议主题|开什么会|今天主题/.test(t);
}

function expandEllipsis(ask, lastTitle) {
  const title = String(lastTitle || "").trim();
  if (!title || title === "carry" || title === "probe") return "";
  // 议程/主题卡不是业务实体，接到「怎么收费」会变成「会议主题怎么收费」。
  if (isAgendaTitle(title)) return "";
  let q = peelCorrectShell(ask);
  if (!q) return "";
  if (commitOnlyLine(q)) return "";
  if (rx("commands", "urgeAct").test(q) || rx("commands", "dialogueControl").test(q)) return "";
  const { contentFocus, isTruncatedAsk } = require("../agent/relevance.cjs");
  if (!rx("operators", "interrogative").test(q) || isTruncatedAsk(q)) return "";
  if (!entitySlotEmpty(q)) return "";
  const head = title
    .replace(/^Q[:：]\s*/, "")
    .split(/[／/]/)[0]
    .trim();
  const titlePlain = peelSkeleton(head);
  if (titlePlain.length < 2) return "";
  const anchor = anchorFromTitle(title, () => contentFocus(titlePlain));
  if (!anchor || anchor.length < 2 || q.includes(anchor)) return "";
  if (isAgendaTitle(anchor) || /主题|会议/.test(anchor)) return "";
  if (definesOwnTopic(q, anchor) || namesOtherEntity(q, anchor)) return "";
  const tail = predicateTail(q);
  // 「怎么做」仅 3 字，纠正追问常见；门槛用 3。
  if (!tail || tail.length < 3 || tail.includes(anchor)) return "";
  const out = `${anchor}${tail}`.slice(0, 80);
  return /[？?]$/.test(out) ? out : `${out}？`;
}

/** 上一张资料卡标题里的专名。carry / probe / script 不是对话实体。 */
function dialogueAnchor(title) {
  const t = String(title || "").trim();
  if (!t || t === "carry" || t === "probe" || t === "script") return "";
  return anchorFromTitle(t, () => "");
}

/** 「什么是招生引擎」这类已经自带话题的问句，不再把上一张卡的实体接上去。 */
function definesOwnTopic(ask, anchor) {
  const bare = String(ask || "").replace(/[？?。！!\s]/g, "");
  const mark = load().classify.patterns.peelTailMark;
  if (!mark) return false;
  const hit = bare.match(new RegExp(mark));
  if (!hit) return false;
  const rest = stripEntityFillers(bare.slice(hit.index + hit[0].length));
  const before = stripEntityFillers(bare.slice(0, hit.index));
  const owned = rest.length >= 2 ? rest : before;
  if (owned.length < 2) return false;
  if (anchor && String(owned).includes(anchor)) return false;
  return true;
}

function namesOtherEntity(ask, anchor) {
  const generic = String(load().faq?.genericEntity || "");
  return (load().faq?.entities || []).some((name) => {
    if (!name || name === generic || name === anchor) return false;
    return String(ask || "").includes(name);
  });
}

function hasDoubaoKey() {
  return Boolean((process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY || "").trim());
}

/**
 * 实体槽为空时，豆包只补一句独立问句。失败则交给已经拼好的规则改写。
 * @returns {Promise<string>} 可用的独立问句；空字符串表示沿用规则结果
 */
async function rewriteStandalone(ask, lastTitle) {
  const rule = expandEllipsis(ask, lastTitle);
  const anchor = dialogueAnchor(lastTitle);
  if (!rule || !anchor || !hasDoubaoKey()) return "";
  const system = speakLine("rewriteAskSystem");
  const user = speakFill("rewriteAskUser", {
    entity: anchor,
    title: String(lastTitle || "").slice(0, 80),
    ask: String(ask || "").slice(0, 80)
  });
  if (!system || !user) return "";
  const ms = hp("rewriteAskMs");
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    const { arkChat } = require("../llm");
    const res = await arkChat(system, user, {
      fast: true,
      temperature: 0.2,
      signal: ac.signal,
      timeoutMs: ms
    });
    const draft = String(res?.content || "")
      .trim()
      .split(/\n/)[0]
      .replace(/^["「]|["」]$/g, "")
      .trim();
    if (!res?.ok || draft.length < 4 || draft.length > 80) return "";
    if (!draft.includes(anchor)) return "";
    if (rx("classify", "gluedTail").test(draft)) return "";
    return draft.slice(0, 80);
  } catch (_) {
    return "";
  } finally {
    clearTimeout(timer);
  }
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

  const held = Boolean(dialogueAnchor(opts.lastCardTitle));
  const expanded = expandEllipsis(cleaned, opts.lastCardTitle);
  if (expanded) cleaned = expanded;

  const residual =
    isResidualUtterance(cleaned) ||
    isResidualUtterance(lastFloor) ||
    isCasualChitchat(cleaned);
  const closed = !residual && isClosedFaqQuestion(cleaned);
  const hostLooksBiz = lastHost && pat("hostLooksBiz").test(lastHost);
  const deictic = !residual && isBizDeicticFollowUp(cleaned);
  const isFollow =
    !expanded &&
    !held &&
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

  const commitOnly = commitOnlyLine(cleaned);
  let contextHint = "";
  if (!commitOnly && isFollow) {
    const priorUser = [...recent]
      .reverse()
      .find(
        (l) =>
          l !== lastFloor &&
          !commitOnlyLine(l) &&
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
    !expanded &&
    !held &&
    !commitOnly &&
    !skipFollowGlue &&
    !residual &&
    cleaned.length < lim("followHostAltMax") &&
    (hostLooksBiz || pat("followUp").test(lastFloor)) &&
    (isBizStickyFollowUp(cleaned) || deictic) &&
    (recent.length || hostLooksBiz)
  ) {
    const priorUser = [...recent]
      .reverse()
      .find((l) => l !== lastFloor && !commitOnlyLine(l) && l.length >= lim("priorAltMin"));
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
    choice: "",
    ellipsis: Boolean(expanded)
  };
}

module.exports = {
  get CHOICE_INVITE_RE() {
    return choiceInviteRe();
  },
  extractOfferedChoices,
  matchOfferedChoice,
  stripEchoPrefix,
  expandEllipsis,
  peelCorrectShell,
  rewriteQueryRuleBased,
  rewriteStandalone
};
