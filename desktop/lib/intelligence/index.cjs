const contract = require("./contract.cjs");
const commitGate = require("./commitGate.cjs");
const draft = require("./draft.cjs");
const topicShift = require("./topicShift.cjs");
const evaluate = require("./evaluate.cjs");
const alignFromDraft = require("./alignFromDraft.cjs");
const observe = require("./observe.cjs");
const frameGate = require("./frameGate.cjs");

module.exports = {
  ...contract,
  ...commitGate,
  ...draft,
  ...topicShift,
  ...evaluate,
  ...alignFromDraft,
  ...observe,
  ...frameGate
};
