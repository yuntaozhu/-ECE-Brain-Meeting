/**
 * Vexa dry-run 逻辑（由 smoke-meeting-bot.cjs 调用）
 */
import { getVexaAdapter, vexaConfigStatus } from "../server/lib/meetingBot/vexaAdapter";
import { listMeetingEvents, resetMeetingEventBufferForTests } from "../server/lib/meetingEvents";

async function main() {
  process.env.VEXA_DRY_RUN = "1";
  process.env.VEXA_API_KEY = "";
  resetMeetingEventBufferForTests();
  const adapter = getVexaAdapter();
  const st = vexaConfigStatus();
  const created = await adapter.createBot({
    platform: "google_meet",
    nativeMeetingId: "dry-meet-abc-defg",
    botName: "SmokeBot"
  });
  const pulled = await adapter.pullTranscripts({
    platform: "google_meet",
    nativeMeetingId: "dry-meet-abc-defg"
  });
  const bots = await adapter.getStatus({ platform: "google_meet" });
  const stopped = await adapter.stopBot({
    platform: "google_meet",
    nativeMeetingId: "dry-meet-abc-defg"
  });
  const events = listMeetingEvents({ meeting_id: created.meetingId, limit: 20 });
  console.log(
    JSON.stringify({
      ok: true,
      speakInMeeting: false,
      dryRun: st.dryRun,
      create: created,
      transcripts: { rawCount: pulled.rawCount, eventTypes: pulled.events.map((e) => e.type) },
      botsRunning: bots.filter((b) => b.running).length,
      stop: stopped,
      eventTypes: events.map((e) => e.type)
    })
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
