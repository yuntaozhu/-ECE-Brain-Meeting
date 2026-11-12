/**
 * Wave P′：副驾驶试播 / Host 澄清后的对话链状态。
 */
const { extractOfferedChoices, matchOfferedChoice } = require("../meetingStrategy/query/offerExtract.cjs");
const { hp } = require("../knowledge/schemaStore.cjs");

/** @type {null | {
 *   id: string,
 *   source: string,
 *   offerText: string,
 *   choices: string[],
 *   focus: string,
 *   openedAt: number,
 *   expiresAt: number,
 *   turn: number
 * }} */
let thread = null;

function ttlMs() {
  try {
    return Number(hp("dialogueThreadTtlMs")) || 90000;
  } catch (_) {
    return 90000;
  }
}
function extendMs() {
  try {
    return Number(hp("dialogueThreadExtendMs")) || 60000;
  } catch (_) {
    return 60000;
  }
}
function maxMs() {
  try {
    return Number(hp("dialogueThreadMaxMs")) || 180000;
  } catch (_) {
    return 180000;
  }
}

function getActive() {
  if (!thread) return null;
  if (Date.now() > thread.expiresAt) {
    thread = null;
    return null;
  }
  return thread;
}

function snapshot() {
  const t = getActive();
  return t ? { ...t } : null;
}

/**
 * 从试播 / 澄清口播开链。抽不出选项则不开。
 * @param {string} offerText
 * @param {{ source?: string }} [opts]
 */
function openFromOffer(offerText, opts = {}) {
  const text = String(offerText || "").trim();
  const choices = extractOfferedChoices(text);
  if (!text || choices.length < 2) return null;
  const now = Date.now();
  thread = {
    id: `dt_${now}`,
    source: opts.source || "copilot-trial",
    offerText: text,
    choices,
    focus: "",
    openedAt: now,
    expiresAt: now + ttlMs(),
    turn: 0
  };
  return snapshot();
}

function noteChoice(choice) {
  const t = getActive();
  if (!t) return null;
  t.focus = String(choice || "").trim();
  t.turn += 1;
  const cap = t.openedAt + maxMs();
  t.expiresAt = Math.min(cap, Date.now() + extendMs());
  return snapshot();
}

function extendFollowUp() {
  const t = getActive();
  if (!t) return null;
  t.turn += 1;
  const cap = t.openedAt + maxMs();
  t.expiresAt = Math.min(cap, Date.now() + extendMs());
  return snapshot();
}

function close(_why) {
  thread = null;
  return null;
}

function matchFloor(floor) {
  const t = getActive();
  if (!t) return null;
  return matchOfferedChoice(floor, t.offerText, t.choices);
}

function isActive() {
  return Boolean(getActive());
}

module.exports = {
  openFromOffer,
  getActive,
  snapshot,
  noteChoice,
  extendFollowUp,
  close,
  matchFloor,
  isActive,
  extractOfferedChoices
};
