/**
 * 兼容层：Others → trackBridge
 */
"use strict";

const {
  startTrackAsr,
  stopTrackAsr,
  pushTrackPcmBase64,
  trackAsrStatus,
  asrConfigured
} = require("./trackBridge.cjs");

async function startOthersAsr(handlers = {}) {
  return startTrackAsr("others", {
    onFinal: (text) => handlers.onFinal?.(text),
    onPartial: (text) => handlers.onPartial?.(text),
    onError: (e) => handlers.onError?.(e),
    onStatus: (st) => handlers.onStatus?.(st),
    hotwords: handlers.hotwords
  });
}

function pushOthersPcmBase64(b64) {
  return pushTrackPcmBase64("others", b64);
}

function stopOthersAsr() {
  return stopTrackAsr("others");
}

function othersAsrStatus() {
  return trackAsrStatus("others");
}

module.exports = {
  startOthersAsr,
  stopOthersAsr,
  pushOthersPcmBase64,
  othersAsrStatus,
  asrConfigured
};
