"use strict";

const fs = require("fs");
const path = require("path");
const { sessionsDir, ensureDir } = require("../knowledge/paths.cjs");
const { clearFocus, getFocus } = require("./focus.cjs");

/** @type {null | {
 *   id: string,
 *   startedAt: string,
 *   phase: 'idle'|'listening'|'armed'|'speaking',
 *   armed: boolean,
 *   speaking: boolean,
 *   file: string,
 *   othersConnected: boolean,
 *   meConnected: boolean,
 *   lines: number
 * }} */
let current = null;

function meetingId() {
  return `mtg_${Date.now()}`;
}

function startMeeting(opts = {}) {
  if (current && current.phase !== "idle") {
    let briefing = null;
    try {
      const { buildBriefing, getAssistantMode } = require("./projectMemory.cjs");
      briefing = buildBriefing({
        topic: opts.topic || null,
        assistantMode: opts.assistantMode || getAssistantMode()
      });
    } catch (_) {}
    return { ok: true, reused: true, meeting: snapshot(), briefing };
  }
  ensureDir(sessionsDir());
  const id = meetingId();
  const file = path.join(sessionsDir(), `${id}.jsonl`);
  // 默认武装：Me 说完即问；opts.requireWake / armed:false 可恢复「需唤醒」
  let armed = true;
  if (typeof opts.armed === "boolean") armed = opts.armed;
  else if (opts.requireWake === true) armed = false;
  else {
    try {
      const { loadCommands } = require("./commands.cjs");
      const cfg = loadCommands();
      if (cfg && cfg.defaultArmed === false) armed = false;
    } catch (_) {}
  }
  current = {
    id,
    startedAt: new Date().toISOString(),
    phase: armed ? "armed" : "listening",
    armed,
    speaking: false,
    file,
    othersConnected: Boolean(opts.othersConnected),
    meConnected: Boolean(opts.meConnected),
    lines: 0
  };
  clearFocus();
  let briefing = null;
  try {
    const { buildBriefing, getAssistantMode } = require("./projectMemory.cjs");
    briefing = buildBriefing({
      topic: opts.topic || null,
      assistantMode: opts.assistantMode || getAssistantMode()
    });
  } catch (_) {}
  appendLine({
    type: "meeting_start",
    phase: current.phase,
    armed: current.armed,
    meta: opts,
    briefing: briefing
      ? {
          empty: Boolean(briefing.empty),
          previousMeetingId: briefing.card?.previousMeetingId || null,
          text: briefing.text
        }
      : null
  });
  return { ok: true, reused: false, meeting: snapshot(), briefing };
}

function stopMeeting() {
  if (!current) return { ok: true, meeting: null };
  const focus = getFocus();
  if (focus) appendLine({ type: "focus_snapshot", focus });
  appendLine({ type: "meeting_stop", phase: "idle" });
  const snap = snapshot();
  current = null;
  clearFocus();
  return { ok: true, meeting: snap };
}

function snapshot() {
  if (!current) return null;
  const focus = getFocus();
  return {
    id: current.id,
    startedAt: current.startedAt,
    phase: current.phase,
    armed: current.armed,
    speaking: current.speaking,
    file: current.file,
    othersConnected: current.othersConnected,
    meConnected: current.meConnected,
    lines: current.lines,
    focus: focus
      ? { query: focus.query, status: focus.status, source: focus.source }
      : null
  };
}

function setTracks(flags = {}) {
  if (!current) return snapshot();
  if (typeof flags.othersConnected === "boolean") current.othersConnected = flags.othersConnected;
  if (typeof flags.meConnected === "boolean") current.meConnected = flags.meConnected;
  return snapshot();
}

function setArmed(on) {
  if (!current) return snapshot();
  current.armed = Boolean(on);
  current.phase = current.speaking ? "speaking" : current.armed ? "armed" : "listening";
  appendLine({ type: "arm", armed: current.armed, phase: current.phase });
  return snapshot();
}

function setSpeaking(on) {
  if (!current) return snapshot();
  current.speaking = Boolean(on);
  current.phase = current.speaking ? "speaking" : current.armed ? "armed" : "listening";
  return snapshot();
}

function appendLine(row) {
  if (!current) return null;
  ensureDir(sessionsDir());
  const line = {
    at: new Date().toISOString(),
    meetingId: current.id,
    ...row
  };
  fs.appendFileSync(current.file, JSON.stringify(line) + "\n", "utf8");
  current.lines += 1;
  return line;
}

function getMeeting() {
  return snapshot();
}

module.exports = {
  startMeeting,
  stopMeeting,
  getMeeting,
  setTracks,
  setArmed,
  setSpeaking,
  appendLine,
  snapshot
};
