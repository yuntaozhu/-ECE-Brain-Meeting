import {
  createMeetingEvent,
  pushMeetingEvent,
  listMeetingEvents,
  setMeetingEventPushHook
} from "../server/lib/meetingEvents";
import {
  auditFromMeetingEvent,
  deleteMeetingData,
  getCostSnapshot,
  listAudit,
  meetingControlHealth,
  resetMeetingOpsForTests
} from "../server/lib/meetingOps";

resetMeetingOpsForTests();
setMeetingEventPushHook(auditFromMeetingEvent);

const mid = "ops_smoke_room";
pushMeetingEvent(
  createMeetingEvent({
    meeting_id: mid,
    provider: "volc_rtc",
    type: "meeting.started",
    text: "敏感全文不应进审计"
  })
);
pushMeetingEvent(
  createMeetingEvent({
    meeting_id: "other_room",
    provider: "vexa",
    type: "bot.joined"
  })
);

const before = listMeetingEvents({ meeting_id: mid }).length;
const del = deleteMeetingData(mid);
const after = listMeetingEvents({ meeting_id: mid }).length;
const otherLeft = listMeetingEvents({ meeting_id: "other_room" }).length;
const audit = listAudit({ limit: 20 });
const hasFullText = audit.some((a) => JSON.stringify(a).includes("敏感全文不应进审计"));
const health = meetingControlHealth();
const cost = getCostSnapshot();

console.log(
  JSON.stringify({
    ok: true,
    before,
    deleted: del.deleted,
    after,
    otherLeft,
    auditSize: audit.length,
    textRedacted: !hasFullText,
    retentionHours: health.retentionHours,
    costEvents: cost.eventsAccepted
  })
);
