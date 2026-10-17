/**
 * 问句改写 + 闲聊/残句过滤 + 经营粘滞判定
 * 成功时写入 ctx.askText / ctx.rw / ctx.useBiz
 */
const S = require("./kit.cjs");

/**
 * @returns {object|null} 早退结果，或 null 且 ctx 已填充 askText/rw/useBiz
 */
function prepareAsk(ctx) {
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
  const rw = S.rewriteQueryRuleBased({
    lastFloor: peeledAsk,
    recentFloors: floors,
    lastHostAnswer: String(opts.lastHostSpeakText || ""),
    preferPeeled: !keepFloor,
    peeledPayload: keepFloor ? "" : cmd.payload || S.peelWakePayload(lastFloor),
    skipFollowGlue:
      Boolean(cmd.command === "STOP" || cmd.command === "INTERRUPT" || cmd.stop || cmd.interrupt) ||
      S.isCasualChitchat(lastFloor) ||
      S.isCasualChitchat(peeledAsk)
  });
  const askText = rw.rewritten || peeledAsk;
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

  if (
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
