/**
 * 会议会话 — 互动姿态 / 生命周期常量
 * 与半双工 PHASE（IDLE/SPEAKING/COOLDOWN）正交。
 */
const { wakeRe, hp, rx, load } = require("../knowledge/schemaStore.cjs");

/** @deprecated 语义上请用 INTERACTION_MODE；值相同 */
const AGENT_MODE = {
  HH: "HH",
  HH_SUM: "HH_SUM",
  HH_TOPIC: "HH_TOPIC",
  HA_ASK: "HA_ASK",
  HA_TALK: "HA_TALK",
  HA_BIZ: "HA_BIZ",
  PAUSED: "PAUSED",
  IDLE_LISTEN: "IDLE_LISTEN"
};

const INTERACTION_MODE = AGENT_MODE;

const MEETING_LIFE = {
  OFF: "OFF",
  OPENING: "OPENING",
  SILENT: "SILENT",
  CONSULT: "CONSULT",
  HOLD: "HOLD",
  SUMMARY: "SUMMARY",
  CLOSING: "CLOSING"
};

const MODE_LABEL = {
  HH: "人—人旁听",
  HH_SUM: "总结中",
  HH_TOPIC: "抛题",
  HA_ASK: "咨询中",
  HA_TALK: "探讨中",
  HA_BIZ: load().session.modeLabelBiz,
  PAUSED: "暂停记录",
  IDLE_LISTEN: "静默监听"
};

const INTERACTION_MODE_LABEL = MODE_LABEL;

const LIFE_LABEL = {
  OFF: "未开会",
  OPENING: "开场中",
  SILENT: "静默",
  CONSULT: "咨询中",
  HOLD: "占麦中",
  SUMMARY: "总结中",
  CLOSING: "收尾中"
};

/** 咨询粘滞，时长在 schema/engine-hyperparams.json */
const HA_STICKY_MS = hp("stickyMs");

const DAZHI_RE = wakeRe();

const STEER_MAX_PER_SEGMENT = 2;
const STEER_COOLDOWN_MS = 20000;

module.exports = {
  AGENT_MODE,
  INTERACTION_MODE,
  MEETING_LIFE,
  MODE_LABEL,
  INTERACTION_MODE_LABEL,
  LIFE_LABEL,
  HA_STICKY_MS,
  DAZHI_RE,
  get OFF_TOPIC_RE() {
    return rx("session", "offTopic");
  },
  STEER_MAX_PER_SEGMENT,
  STEER_COOLDOWN_MS
};
