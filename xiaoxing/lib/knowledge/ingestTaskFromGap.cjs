"use strict";

/**
 * 会场/咨询缺口 → 结构化补库任务（建议 crawl source_ids）
 */
const fs = require("fs");
const path = require("path");
const { schemaFile, ingestTasksDir, ensureDir } = require("./paths.cjs");
const { createTask, listTasks } = require("../followup/board.cjs");

function loadCrawlSources() {
  try {
    const raw = JSON.parse(fs.readFileSync(schemaFile("crawl-sources.json"), "utf8"));
    return raw.sources || [];
  } catch (_) {
    return [];
  }
}

function idsByBucket(bucket, tagsAny = []) {
  const srcs = loadCrawlSources();
  return srcs
    .filter((s) => {
      if (bucket && s.bucket !== bucket) return false;
      if (!tagsAny.length) return true;
      const tags = s.tags || [];
      return tagsAny.some((t) => tags.includes(t));
    })
    .map((s) => s.id);
}

function detectProduct(q) {
  if (/柑橘|柑桔|橘子|蜜桔|橙/.test(q)) return "柑橘";
  if (/水稻|粳稻|籼稻|机插稻|稻米|稻谷/.test(q)) return "水稻";
  if (/草莓/.test(q)) return "草莓";
  if (/梨/.test(q)) return "梨";
  if (/桃/.test(q) && !/葡萄/.test(q)) return "桃";
  if (/葡萄/.test(q)) return "葡萄";
  return null;
}

function detectRegion(q) {
  if (/长三角|江浙沪/.test(q)) return "长三角";
  if (/上海|沪郊|嘉定|青浦|松江|金山|奉贤|崇明/.test(q)) return "上海";
  if (/山东|潍坊|临沂/.test(q)) return "山东";
  if (/江苏/.test(q)) return "江苏";
  if (/浙江|建德/.test(q)) return "浙江";
  return null;
}

/**
 * @param {string} query
 * @param {{ meetingId?: string, layer?: string }} [opts]
 */
function parseGapToIngestTask(query, opts = {}) {
  const q = String(query || "").trim();
  const product = detectProduct(q);
  const region = detectRegion(q);
  let gap_kind = "unknown";
  let suggested_source_ids = [];
  let note = "";

  if (/拼多多|科技大赛|高校团队|产业进展|颁奖|时事|会前/.test(q)) {
    gap_kind = "industry_briefing";
    suggested_source_ids = [
      ...idsByBucket("xunbao", ["上海"]),
      ...idsByBucket(null, ["学会", "草莓"])
    ].slice(0, 6);
    note = "定向公开站抓产业时事摘要，禁图书全文";
  } else if (/行情|批发价|产地价|多少钱|销售价|出厂价|收购价/.test(q) || (/市场/.test(q) && /草莓|稻|米|柑橘/.test(q))) {
    gap_kind = "market_price";
    suggested_source_ids = [
      "xinfadi-price",
      "jnmarket",
      "pfsc-agri",
      "sgvindex",
      "grainmarket"
    ].filter((id) => loadCrawlSources().some((s) => s.id === id));
    if (region === "长三角" || region === "上海") {
      suggested_source_ids = ["xinfadi-price", "jnmarket", "pfsc-agri", "sh-nyncw-nyjs"].filter(
        (id) => loadCrawlSources().some((s) => s.id === id)
      );
    }
    note = product ? `补「${product}」公开行情；B2B 仅参考` : "补公开行情；品名硬门闩";
  } else if (/栽培技术意见|一种就管|机插稻育秧|农业技术栏目|技术意见/.test(q)) {
    gap_kind = "tech_doc";
    suggested_source_ids = ["sh-nyncw-nyjs", "dfcxb"].filter((id) =>
      loadCrawlSources().some((s) => s.id === id)
    );
    note = "抓市农委农业技术栏目历年网页版并归档";
  } else if (/东方城乡报|上农APP|沪郊动态|三农参考/.test(q)) {
    gap_kind = "media_clip";
    suggested_source_ids = ["dfcxb", "sh-nyncw-nyjs"].filter((id) =>
      loadCrawlSources().some((s) => s.id === id)
    );
    note = "按 ingest-keywords 过滤公开稿";
  } else if (/研究进展|品种志|丛书|书籍|译丛|能不能爬|下载全书/.test(q)) {
    gap_kind = "catalog_book";
    suggested_source_ids = [];
    note = "正版书目/授权摘录，禁止爬全文；见 book-catalog-rice-fruit.md";
  } else if (product === "柑橘" || (/补充|缺|还没有|骨架/.test(q) && product)) {
    gap_kind = "crop_bootstrap";
    suggested_source_ids = ["sh-nyncw-nyjs", "dfcxb", "saas"].filter((id) =>
      loadCrawlSources().some((s) => s.id === id)
    );
    note = `启动「${product || "新作物"}」公开入口与 FAQ 骨架`;
  } else if (/政策|补贴怎么查|一号文件/.test(q)) {
    gap_kind = "policy_doc";
    suggested_source_ids = ["sh-nyncw-nyjs", "dfcxb", "agri-cn"].filter((id) =>
      loadCrawlSources().some((s) => s.id === id)
    );
    note = "政策公开页；补贴金额不编造";
  }

  return {
    meeting_id: opts.meetingId || null,
    query: q,
    gap_kind,
    product,
    region,
    suggested_source_ids: [...new Set(suggested_source_ids)],
    status: "todo",
    note: note || opts.layer || "",
    layer: opts.layer || null
  };
}

function persistIngestTask(task, followupId) {
  ensureDir(ingestTasksDir());
  const id = task.id || `ing_${Date.now()}`;
  const row = {
    id,
    at: new Date().toISOString(),
    meeting_id: task.meeting_id,
    query: task.query,
    gap_kind: task.gap_kind,
    product: task.product,
    region: task.region,
    suggested_source_ids: task.suggested_source_ids || [],
    status: task.status || "todo",
    note: task.note || "",
    followup_id: followupId || null
  };
  const file = path.join(ingestTasksDir(), `${id}.json`);
  fs.writeFileSync(file, JSON.stringify(row, null, 2), "utf8");
  return { ...row, file };
}

/**
 * 缺口列表 → 补库任务文件 + 跟进看板（kind=ingest_task）
 */
function ingestGapsAsTasks(meeting, gaps = []) {
  const meetingId = meeting?.id || null;
  const existingFu = listTasks().filter((t) => t.meetingId === meetingId && t.kind === "ingest_task");
  const created = [];
  for (const g of gaps) {
    const q = String(g.query || "").trim();
    if (q.length < 4) continue;
    const parsed = parseGapToIngestTask(q, { meetingId, layer: g.layer });
    if (parsed.gap_kind === "unknown" && !parsed.product && !/缺|补|行情|柑橘|爬|资料/.test(q)) {
      continue;
    }
    const title = `补库：${parsed.gap_kind}${parsed.product ? "·" + parsed.product : ""}`.slice(0, 40);
    const dup = existingFu.some(
      (t) => t.sourceQuery === q || (t.meta && t.meta.query === q)
    );
    if (dup) continue;
    const srcNote =
      (parsed.suggested_source_ids || []).length > 0
        ? `建议源：${parsed.suggested_source_ids.join(", ")}`
        : parsed.note || "";
    const fu = createTask({
      title: `${title}｜${q}`.slice(0, 80),
      kind: "ingest_task",
      meetingId,
      sourceQuery: q,
      note: srcNote,
      meta: {
        gap_kind: parsed.gap_kind,
        product: parsed.product,
        region: parsed.region,
        suggested_source_ids: parsed.suggested_source_ids,
        query: q
      }
    });
    const saved = persistIngestTask(
      { ...parsed, id: `ing_${fu.id.replace(/^fu_/, "")}` },
      fu.id
    );
    created.push({ followup: fu, ingest: saved });
    existingFu.push(fu);
  }
  return { ok: true, created };
}

module.exports = {
  parseGapToIngestTask,
  persistIngestTask,
  ingestGapsAsTasks,
  detectProduct,
  detectRegion
};
