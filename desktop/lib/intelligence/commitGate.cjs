/**
 * Wave R1 / R7 / R8b：本地定卡第二道闸（数值 + 受众帧 + askLane，无业务词）。
 * 弱后验、「低对齐 + 高 extra」、或问答受众帧不一致 → 不定卡，交 MeetingAgent。
 * soft/strategy 车道：有 Key 时优先放行 Agent（含 progress 等 KEEP），FAQ 仅作证据。
 * forceRule / 无 Key 不放行。
 */
const { load } = require("../knowledge/schemaStore.cjs");
const { evaluateFrameMatch, isBannedCard } = require("./frameGate.cjs");
const { isOpenIntelligenceLane, classifyAskLane } = require("./askLane.cjs");
const { resolveAskLane } = require("./laneArbiter.cjs");

const KEEP_REASONS = new Set(["carry", "progress", "card-switch", "chain-follow"]);

function commitCfg() {
  const h = load().hyper || {};
  return {
    enabled: h.agentReleaseOnWeakCommit !== false,
    commitPosteriorMin: Number(h.commitPosteriorMin),
    commitAlignMin: Number(h.commitAlignMin),
    releaseHighExtra: Number(h.releaseHighExtra),
    /** 高后验但对齐过低也放行 Agent（防「好处」类泛问秒答错卡） */
    commitAlignFloor: Number(h.commitAlignFloor)
  };
}

/**
 * @param {object|null|undefined} bayes decideSpeak 结果（或 shadow 软对象）
 * @param {{ forceRule?: boolean, hasKey?: boolean, askText?: string, state?: object }} [opts]
 * @returns {{ release: boolean, why: string }}
 */
function evaluateCommitRelease(bayes, opts = {}) {
  if (!bayes || bayes.action !== "answer") return { release: false, why: "" };
  if (opts.forceRule) return { release: false, why: "" };
  if (!opts.hasKey) return { release: false, why: "" };
  if (String(process.env.WAVE_R_COMMIT_GATE || "1").trim() === "0") {
    return { release: false, why: "" };
  }

  const cfg = commitCfg();
  if (!cfg.enabled) return { release: false, why: "" };

  const reason = String(bayes.reason || "");
  const laneInfo = opts.askText ? resolveAskLane(opts.askText) : null;
  const openLane =
    Boolean(opts.askText) &&
    (laneInfo
      ? laneInfo.lane === "soft" || laneInfo.lane === "strategy"
      : isOpenIntelligenceLane(opts.askText));

  // soft/strategy：突破 progress/carry 等粘滞，交给 Agent 用资料重组
  if (openLane && KEEP_REASONS.has(reason)) {
    const lane = (laneInfo && laneInfo.lane) || classifyAskLane(opts.askText).lane;
    return { release: true, why: `open_lane_${reason}:${lane}` };
  }
  if (KEEP_REASONS.has(reason)) return { release: false, why: "" };

  const title = String(bayes.title || "");
  if (opts.state && isBannedCard(opts.state, title)) {
    return { release: true, why: "banned_card" };
  }

  if (opts.askText) {
    const fr = evaluateFrameMatch(opts.askText, title, bayes.speak || "");
    if (!fr.ok) return { release: true, why: fr.why || "frame_mismatch" };
  }

  // soft/strategy 即便后验高，也优先 Agent（防邻卡假 committed）
  if (openLane) {
    const lane = (laneInfo && laneInfo.lane) || classifyAskLane(opts.askText).lane;
    return { release: true, why: `open_lane_prefer_agent:${lane}` };
  }

  const p = Number(bayes.posterior);
  const align =
    bayes.align != null
      ? Number(bayes.align)
      : bayes.shadow && bayes.shadow.align != null
        ? Number(bayes.shadow.align)
        : NaN;
  const extra =
    bayes.extra != null
      ? Number(bayes.extra)
      : bayes.shadow && bayes.shadow.extra != null
        ? Number(bayes.shadow.extra)
        : NaN;

  const pMin = Number.isFinite(cfg.commitPosteriorMin) ? cfg.commitPosteriorMin : 0.55;
  const aMin = Number.isFinite(cfg.commitAlignMin) ? cfg.commitAlignMin : 0.3;
  const aFloor = Number.isFinite(cfg.commitAlignFloor) ? cfg.commitAlignFloor : 0.45;
  const eHi = Number.isFinite(cfg.releaseHighExtra) ? cfg.releaseHighExtra : 0.5;

  if (Number.isFinite(p) && p < pMin) {
    return { release: true, why: "weak_posterior" };
  }
  if (Number.isFinite(align) && Number.isFinite(extra) && align < aMin && extra >= eHi) {
    return { release: true, why: "low_align_high_extra" };
  }
  // 后验虽高但对齐明显偏弱：仍可能是泛别名误吸，放行 Agent
  if (Number.isFinite(align) && align < aFloor && Number.isFinite(p) && p >= pMin) {
    return { release: true, why: "low_align_commit" };
  }
  return { release: false, why: "" };
}

module.exports = {
  evaluateCommitRelease,
  commitCfg,
  KEEP_REASONS
};
