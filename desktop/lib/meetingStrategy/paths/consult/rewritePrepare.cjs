/**
 * 问句改写 + 闲聊/残句过滤 + 经营粘滞判定
 * 成功时写入 ctx.askText / ctx.rw / ctx.useBiz
 */
const S = require("./kit.cjs");

/**
 * @returns {object|null} 早退结果，或 null 且 ctx 已填充 askText/rw/useBiz
 */
async function prepareAsk(ctx) {
  const { opts, state, a2aTrace, kbStatus, floors, cmd, qFp } = ctx;
  const lastFloor = ctx.lastFloor;
  const supplement = String(ctx.continuePayload || "").trim();
  const sayDoneSupplement =
    Boolean(cmd.sayDone) &&
    lastFloor.length >= 8 &&
    lastFloor !== String(cmd.text || "").trim();
  const keepFloor = Boolean(supplement) || sayDoneSupplement;

  const peeledAsk = keepFloor
    ? supplement || lastFloor
    : (cmd.named && cmd.payload && cmd.payload.length >= 2 && cmd.payload) ||
      S.peelWakePayload(lastFloor) ||
      lastFloor;
  const storeEarly = require("../../../knowledge/schemaStore.cjs");
  const lastCardTitle =
    state?.lastDesign?.type === "answer" ? String(state.lastDesign.hypothesisId || "") : "";
  const lastRealAsk = String(state?.lastRealAsk || "").trim();
  // 议程/主题问不当扩实体锚点（避免「怎么收费」→「会议主题怎么收费」）。
  const agendaLike = (t) => {
    const s = String(t || "");
    if (!s) return true;
    try {
      return storeEarly.rx("speak", "localAgenda").test(s);
    } catch (_) {
      return /会议主题|开什么会|今天主题/.test(s);
    }
  };
  const expandTitle = (() => {
    if (lastCardTitle && !agendaLike(lastCardTitle)) return lastCardTitle;
    if (lastRealAsk && !agendaLike(lastRealAsk)) return lastRealAsk;
    return "";
  })();
  const correctReask = storeEarly.rx("commands", "correctReask").test(lastFloor) ||
    storeEarly.rx("commands", "correctReask").test(peeledAsk);
  const rw = S.rewriteQueryRuleBased({
    lastFloor: peeledAsk,
    recentFloors: floors,
    lastHostAnswer: String(opts.lastHostSpeakText || ""),
    lastCardTitle: expandTitle,
    preferPeeled: !keepFloor,
    peeledPayload: keepFloor ? "" : cmd.payload || S.peelWakePayload(lastFloor),
    skipFollowGlue:
      Boolean(cmd.command === "STOP" || cmd.command === "INTERRUPT" || cmd.stop || cmd.interrupt) ||
      S.isCasualChitchat(lastFloor) ||
      S.isCasualChitchat(peeledAsk) ||
      correctReask
  });
  let askText = rw.rewritten || peeledAsk;
  if (correctReask && expandTitle) {
    const { expandEllipsis, rewriteStandalone } = require("../../query/rewrite.cjs");
    const ruleExpanded =
      expandEllipsis(peeledAsk, expandTitle) || expandEllipsis(lastFloor, expandTitle);
    if (ruleExpanded) askText = ruleExpanded;
    else if (!opts?.forceRule) {
      const drafted = await rewriteStandalone(peeledAsk, expandTitle);
      if (drafted) askText = drafted;
    }
  } else if (rw.ellipsis && expandTitle && !opts?.forceRule) {
    const { rewriteStandalone } = require("../../query/rewrite.cjs");
    const drafted = await rewriteStandalone(peeledAsk, expandTitle);
    if (drafted) askText = drafted;
  }
  const { pushAgent } = require("../../agent/events.cjs");
  pushAgent(a2aTrace, {
    role: "MeetingAgent",
    action: "QUERY_REWRITE",
    summary: `改写：${String(askText || "").slice(0, 36)}`,
    detail: {
      original: lastFloor.slice(0, 80),
      rewritten: askText.slice(0, 100),
      complex: rw.complex,
      closed: rw.closed,
      business: rw.business,
      residual: rw.residual,
      followUp: rw.followUp
    }
  });
  S.debugLog.info("Strategy", "问句改写", {
    original: lastFloor.slice(0, 60),
    rewritten: askText.slice(0, 80),
    complex: rw.complex,
    business: rw.business,
    residual: rw.residual,
    closed: rw.closed,
    choicePick: Boolean(rw.choicePick),
    choice: rw.choice || ""
  });

  if (S.isCasualChitchat(askText) || S.isCasualChitchat(lastFloor)) {
    S.setMode(state, S.INTERACTION_MODE.HA_ASK);
    return S.playAnswer(S.CHITCHAT_LINE, "WAKE_ANSWER", state, a2aTrace, kbStatus, qFp, "template");
  }

  const store = require("../../../knowledge/schemaStore.cjs");
  const actRaw = String(lastFloor || askText || "");
  const commitOrUrge =
    (store.rx("commands", "commitAct").test(actRaw) &&
      !store.rx("operators", "interrogative").test(actRaw)) ||
    store.rx("commands", "urgeAct").test(actRaw);
  if (
    !commitOrUrge &&
    !correctReask &&
    !rw.choicePick &&
    (rw.residual || S.isResidualUtterance(askText) || S.isResidualUtterance(lastFloor)) &&
    !cmd.named &&
    !cmd.command
  ) {
    S.debugLog.info("Strategy", "残句跳过", { text: askText.slice(0, 40) });
    return S.baseResult({
      reason: "RESIDUAL_SKIP",
      a2aTrace,
      agentMode: state.mode,
      kbStatus,
      wake: { lastFloor, residual: true }
    });
  }

  const haMode = S.classifyHaIntent(lastFloor, state.mode);
  const stickyBiz = state.mode === S.INTERACTION_MODE.HA_BIZ && Date.now() < (state.haLockedUntil || 0);
  const lastHost = String(opts.lastHostSpeakText || "");
  const hostLooksBiz = require("../../../knowledge/schemaStore.cjs").rx("classify", "hostLooksBiz").test(lastHost);
  const deicticFollow =
    (stickyBiz || hostLooksBiz) &&
    (S.isBizDeicticFollowUp(askText) || S.isBizDeicticFollowUp(lastFloor)) &&
    !S.isCasualChitchat(askText);
  const stickyFollow =
    stickyBiz &&
    (rw.followUp || deicticFollow) &&
    S.isBizStickyFollowUp(askText) &&
    !S.isCasualChitchat(askText);
  // 指代追问可越过「是什么」闭题误判，继续走经营顾问
  const useBiz =
    (!rw.closed || deicticFollow || stickyFollow) &&
    (deicticFollow || stickyFollow || !S.isClosedFaqQuestion(askText)) &&
    !S.isEnrollmentBenefitAsk(askText) &&
    !S.isCasualChitchat(askText) &&
    (rw.business || S.isBusinessIntent(askText) || stickyFollow || deicticFollow);

  if (useBiz) {
    S.setMode(state, S.INTERACTION_MODE.HA_BIZ);
  } else {
    S.setMode(state, haMode === "HA_TALK" ? S.INTERACTION_MODE.HA_TALK : S.INTERACTION_MODE.HA_ASK);
    if (stickyBiz && !stickyFollow && !deicticFollow) {
      S.debugLog.info("Strategy", "粘滞未续，回咨询", { text: askText.slice(0, 40) });
    }
  }
  state.haLockedUntil = Date.now() + 90000;

  ctx.askText = askText;
  ctx.rw = rw;
  ctx.useBiz = useBiz;
  return null;
}

module.exports = { prepareAsk };
