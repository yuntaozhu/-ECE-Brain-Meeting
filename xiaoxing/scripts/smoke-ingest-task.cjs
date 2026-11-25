"use strict";

/**
 * 补库任务解析冒烟
 * node scripts/smoke-ingest-task.cjs
 */
const assert = require("assert");
const fs = require("fs");
const meeting = require("../lib/meeting/index.cjs");
const {
  parseGapToIngestTask,
  ingestGapsAsTasks
} = require("../lib/knowledge/ingestTaskFromGap.cjs");
const followup = require("../lib/followup/board.cjs");

function main() {
  followup.resetFollowupCache();

  const m1 = parseGapToIngestTask("长三角的草莓销售市场行情库里没有，要去爬");
  assert.equal(m1.gap_kind, "market_price");
  assert.equal(m1.product, "草莓");
  assert.equal(m1.region, "长三角");
  assert.ok(m1.suggested_source_ids.includes("xinfadi-price"));

  const m2 = parseGapToIngestTask("关于草莓，看一下还要再补充柑橘");
  assert.equal(m2.gap_kind, "crop_bootstrap");
  assert.equal(m2.product, "柑橘");

  const m3 = parseGapToIngestTask("拼多多科技大赛草莓产业进展谁的技术");
  assert.equal(m3.gap_kind, "industry_briefing");

  const m4 = parseGapToIngestTask("上海市水稻栽培技术意见在哪看");
  assert.equal(m4.gap_kind, "tech_doc");
  assert.ok(m4.suggested_source_ids.includes("sh-nyncw-nyjs"));

  const batch = ingestGapsAsTasks(
    { id: "mtg_smoke_ingest" },
    [
      { query: "长三角的草莓销售市场行情库里没有", layer: "others_unanswered" },
      { query: "关于草莓还要再补充柑橘吗", layer: "gap" }
    ]
  );
  assert.ok(batch.created.length >= 2);
  assert.ok(batch.created.some((c) => c.ingest.gap_kind === "market_price"));
  assert.ok(batch.created.some((c) => c.ingest.gap_kind === "crop_bootstrap"));

  meeting.startMeeting({});
  meeting.handleMeetingUtterance({
    track: "others",
    text: "长三角草莓行情多少钱库里有没有？"
  });
  meeting.handleMeetingUtterance({
    track: "me",
    text: "关于草莓，看一下还要再补充柑橘"
  });
  const stopped = meeting.stopMeeting();
  const summary = meeting.summarizeMeeting(stopped.meeting, { writeInboxGaps: true });
  assert.ok(summary.ok);
  const md = fs.readFileSync(summary.summaryPath, "utf8");
  assert.ok(md.includes("补库任务"), "摘要应含补库任务节");
  assert.ok((summary.ingestTasks || []).length >= 1, "应生成补库任务");

  const board = followup.boardColumns();
  const ingestCards = (board.columns.todo || []).filter((t) => t.kind === "ingest_task");
  assert.ok(ingestCards.length >= 1);
  assert.equal(followup.kindLabel("ingest_task"), "补库任务");

  console.log(
    JSON.stringify(
      {
        ok: true,
        samples: {
          market: m1.suggested_source_ids,
          citrus: m2.gap_kind,
          briefing: m3.gap_kind,
          tech: m4.suggested_source_ids
        },
        ingestTasks: (summary.ingestTasks || []).map((c) => ({
          kind: c.ingest.gap_kind,
          sources: c.ingest.suggested_source_ids
        })),
        boardIngest: ingestCards.length
      },
      null,
      2
    )
  );
}

main();
