#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  listBriefingSources,
  extractHeadlines,
  buildDailyBriefing,
  readLatestBriefing
} = require("../lib/briefing/daily.cjs");
const { rawBriefingDir, ensureDir } = require("../lib/knowledge/paths.cjs");

async function main() {
  const sources = listBriefingSources();
  assert.ok(sources.length >= 4, "briefing 源应 ≥4");
  assert.ok(sources.every((s) => s.bucket === "briefing"));

  const heads = extractHeadlines(
    "# 标题甲某某某某\n\n## 水稻绿色防控进展报道\\\\\n- 上海农科院发布新品种动态新闻\\\\\n- 农业农村部召开种植业工作会议\n",
    5
  );
  assert.ok(heads.length >= 2, heads.join("|"));
  assert.ok(heads.every((h) => !/\\/.test(h)), "标题不应残留反斜杠: " + heads.join("|"));

  const noisy = extractHeadlines(
    [
      "# RAW · saas",
      "- 网站不支持您所使用的浏览器版本",
      "- Chrome",
      "- 新Edge",
      "- 360极速浏览器",
      "- 新时代农科精神",
      "- 我院召开体制机制改革推进会",
      "- 节水抗旱稻产业发展交流活动在安徽合肥举办"
    ].join("\n"),
    5
  );
  assert.ok(
    noisy.every((h) => !/浏览器|Chrome|Edge|360|农科精神/i.test(h)),
    "应过滤浏览器升级噪声: " + noisy.join("|")
  );
  assert.ok(noisy.some((h) => /改革推进会|节水抗旱稻/.test(h)), noisy.join("|"));

  ensureDir(rawBriefingDir());
  // 写入假快照保证离线可生成
  const snapDir = path.join(rawBriefingDir(), "snapshots");
  ensureDir(snapDir);
  fs.writeFileSync(
    path.join(snapDir, "brief-moa_smoke.md"),
    ["# RAW · smoke", "---", "", "## 种植业管理司发布主推技术目录", "- 全国农技中心病虫情报周报摘要"].join(
      "\n"
    ),
    "utf8"
  );

  const card = await buildDailyBriefing({ live: false });
  assert.ok(card.ok);
  assert.ok(card.mdPath && fs.existsSync(card.mdPath));
  assert.ok(card.speak);

  const latest = readLatestBriefing();
  assert.equal(latest.ok, true);
  assert.equal(latest.empty, false);
  assert.ok(latest.day);

  console.log(
    JSON.stringify(
      {
        ok: true,
        sources: sources.length,
        itemCount: card.itemCount,
        day: card.day,
        sample: (card.items || [])[0]?.headline || null
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
