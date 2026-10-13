/**
 * Wave 8 smoke — INTERACTION_MODE / createMeetingSession 命名
 */
const strategy = require("../lib/meetingStrategy");
const session = require("../lib/meetingSession");

if (!strategy.INTERACTION_MODE || strategy.INTERACTION_MODE !== strategy.AGENT_MODE) {
  throw new Error("INTERACTION_MODE alias broken");
}
if (session.INTERACTION_MODE !== session.AGENT_MODE) {
  throw new Error("session mode alias");
}
if (typeof session.createMeetingSession !== "function") {
  throw new Error("createMeetingSession missing");
}
if (session.createMeetingSession !== session.createAgentState) {
  throw new Error("createMeetingSession alias");
}
if (typeof session.detectMeetingCommand !== "function") {
  throw new Error("detectMeetingCommand missing");
}

const kit = require("../lib/meetingStrategy/internal/kit.cjs");
if (!kit.INTERACTION_MODE || kit.INTERACTION_MODE.HA_ASK !== "HA_ASK") {
  throw new Error("kit INTERACTION_MODE");
}
if (typeof kit.detectMeetingCommand !== "function") {
  throw new Error("kit detectMeetingCommand");
}

console.log("WAVE8_OK naming");
