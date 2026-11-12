/**
 * Wave R8a：问句车道分流（规则来自 schema/ask-lane.json，无业务字面量进本文件）。
 * hard = 翻卡秒答；soft/strategy = 后续放行 Agent / 顾问精炼。
 */
const { load, rx } = require("../knowledge/schemaStore.cjs");

const LANES = Object.freeze({
  HARD: "hard",
  SOFT: "soft",
  STRATEGY: "strategy"
});

function laneRx(name) {
  try {
    return rx("askLane", name);
  } catch (_) {
    return /$a/;
  }
}

function laneCfg() {
  const bag = (load().askLane && load().askLane) || {};
  const lim = bag.limits || {};
  return {
    defaultLane: String(bag.defaultLane || LANES.HARD),
    topicMaxLen: Number(lim.topicMaxLen) || 18,
    priority: Array.isArray(bag.priority) && bag.priority.length
      ? bag.priority.map(String)
      : [LANES.HARD, LANES.SOFT, LANES.STRATEGY]
  };
}

/**
 * @param {string} text
 * @returns {{ lane: "hard"|"soft"|"strategy", why: string, hits: string[] }}
 */
function classifyAskLane(text) {
  const t = String(text || "").trim();
  const cfg = laneCfg();
  if (!t) return { lane: cfg.defaultLane, why: "empty", hits: [] };

  const hardHits = [];
  if (laneRx("hardPrice").test(t)) hardHits.push("hardPrice");
  if (laneRx("hardProcess").test(t)) hardHits.push("hardProcess");
  if (laneRx("hardDefinition").test(t)) hardHits.push("hardDefinition");
  if (laneRx("hardContact").test(t)) hardHits.push("hardContact");

  const softHits = [];
  if (laneRx("softPreference").test(t)) softHits.push("softPreference");
  if (laneRx("softReputation").test(t)) softHits.push("softReputation");
  if (laneRx("softFeel").test(t)) softHits.push("softFeel");

  const strategyHits = [];
  if (laneRx("strategyOperate").test(t)) strategyHits.push("strategyOperate");
  if (laneRx("strategyWorth").test(t)) strategyHits.push("strategyWorth");
  if (laneRx("strategyPush").test(t)) strategyHits.push("strategyPush");
  if (laneRx("strategyTradeoff").test(t)) strategyHits.push("strategyTradeoff");

  const byLane = {
    [LANES.HARD]: hardHits,
    [LANES.SOFT]: softHits,
    [LANES.STRATEGY]: strategyHits
  };

  for (const lane of cfg.priority) {
    const hits = byLane[lane] || [];
    if (hits.length) {
      return { lane, why: hits[0], hits };
    }
  }
  return { lane: cfg.defaultLane, why: "default", hits: [] };
}

/**
 * 是否应走软/策略智能通道（口播放行 Agent、副驾驶顾问精炼）。
 * @param {string|"hard"|"soft"|"strategy"} laneOrText
 */
function isOpenIntelligenceLane(laneOrText) {
  const lane =
    laneOrText === LANES.SOFT ||
    laneOrText === LANES.STRATEGY ||
    laneOrText === LANES.HARD
      ? laneOrText
      : classifyAskLane(laneOrText).lane;
  return lane === LANES.SOFT || lane === LANES.STRATEGY;
}

/**
 * 从片段压短主题（供副驾驶模板 {topic}，避免整句 ASR）。
 * 规则长度上限来自 schema；剥离口令前缀也读 copilot schema。
 * @param {string} text
 * @param {string} [fallback]
 */
function shortAskTopic(text, fallback) {
  const cfg = laneCfg();
  let t = String(text || "").replace(/\s+/g, "").trim();
  try {
    const strip = load().copilot?.topicExtract?.stripWake;
    if (strip) t = t.replace(new RegExp(strip), "");
  } catch (_) {}
  t = t.replace(/[？?。.!！，,、]+$/g, "");
  const max = cfg.topicMaxLen;
  if (t.length > max) t = t.slice(0, max);
  if (!t) return String(fallback || "这一点").slice(0, max);
  return t;
}

module.exports = {
  LANES,
  classifyAskLane,
  isOpenIntelligenceLane,
  shortAskTopic,
  laneCfg
};
