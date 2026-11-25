"use strict";

module.exports = {
  ...require("./cloudAsr.cjs"),
  ...require("./trackBridge.cjs"),
  ...require("./othersBridge.cjs"),
  ...require("./hotwords.cjs"),
  ...require("./correct.cjs"),
  ...require("./circuit.cjs"),
  protocol: require("./protocol.cjs")
};
