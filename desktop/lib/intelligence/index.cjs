const contract = require("./contract.cjs");
const commitGate = require("./commitGate.cjs");
const draft = require("./draft.cjs");
const topicShift = require("./topicShift.cjs");
const evaluate = require("./evaluate.cjs");
const alignFromDraft = require("./alignFromDraft.cjs");
const observe = require("./observe.cjs");
const frameGate = require("./frameGate.cjs");
const askLane = require("./askLane.cjs");
const dialogueMeta = require("./dialogueMeta.cjs");
const memory = require("./memory.cjs");
const laneArbiter = require("./laneArbiter.cjs");

module.exports = {
  ...contract,
  ...commitGate,
  ...draft,
  ...topicShift,
  ...evaluate,
  ...alignFromDraft,
  ...observe,
  ...frameGate,
  ...askLane,
  ...dialogueMeta,
  ...memory,
  ...laneArbiter
};
