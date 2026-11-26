/**
 * 会议管理台：专家(顾问) / 议题 / 会场会话 · 按产品隔离落盘
 * product: dazhi | xiaoxing（禁止跨产品读写）
 */
import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";

export type AdminProduct = "dazhi" | "xiaoxing";

export type ExpertRecord = {
  id: string;
  name: string;
  category: string;
  intro: string;
  knowledgeBase: string;
  voice: string;
  enabled: boolean;
  createdBy?: string;
  updatedAt: string;
};

export type TopicRecord = {
  id: string;
  title: string;
  discussion: string;
  audiences: string[];
  projectTag: string;
  updatedAt: string;
};

export type MeetingSessionRecord = {
  id: string;
  title: string;
  meetingType: string;
  audiences: string[];
  expertId: string | null;
  topicIds: string[];
  openingPrompt: string;
  status: "prep" | "waiting" | "live" | "ended";
  agendaIndex: number;
  createdAt: string;
  updatedAt: string;
};

type ProductBundle = {
  experts: ExpertRecord[];
  topics: TopicRecord[];
  sessions: MeetingSessionRecord[];
};

const ROOT = path.join(process.cwd(), "server", "data", "meeting-admin");

function now() {
  return new Date().toISOString();
}

function nid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
}

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function productDir(product: AdminProduct) {
  return path.join(ROOT, product);
}

function fileOf(product: AdminProduct, name: string) {
  return path.join(productDir(product), name);
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function seedDazhi(): ProductBundle {
  const ts = now();
  return {
    experts: [
      {
        id: "exp_mgmt",
        name: "经营管理专家",
        category: "运营",
        intro: "从目标、运营、结构、组织推动参会讨论。",
        knowledgeBase: "Weknora 经营管理",
        voice: "zh_female_qinqianvsheng",
        enabled: true,
        createdBy: "系统",
        updatedAt: ts
      },
      {
        id: "exp_wecom",
        name: "企业微信",
        category: "其他",
        intro: "园所企业微信落地与沟通节奏。",
        knowledgeBase: "Weknora 企业微信",
        voice: "邻家女孩",
        enabled: true,
        updatedAt: ts
      },
      {
        id: "exp_media",
        name: "新媒体招生",
        category: "运营",
        intro: "聚焦幼儿园新媒体招生话术与渠道。",
        knowledgeBase: "Weknora 新媒体招生",
        voice: "邻家女孩",
        enabled: true,
        updatedAt: ts
      },
      {
        id: "exp_ai_kg",
        name: "AI 幼儿园",
        category: "课程",
        intro: "AI 与园所课程/传记项目协同。",
        knowledgeBase: "Weknora AI 幼儿园",
        voice: "开朗姐姐",
        enabled: true,
        updatedAt: ts
      }
    ],
    topics: [
      {
        id: "top_ai_bio_1",
        title: "AI传记（星火记）到底是什么？为什么要向家长推介",
        discussion: "",
        audiences: ["园长"],
        projectTag: "AI传记-星火记",
        updatedAt: ts
      },
      {
        id: "top_ai_bio_2",
        title: "园所可通过什么方式和途径向家长推介AI传记项目",
        discussion:
          "推介场合与优先级：家长会专题、开放日体验、班级群一次性告知、推送时一对一沟通。",
        audiences: ["执行校董", "园长"],
        projectTag: "AI传记-星火记",
        updatedAt: ts
      },
      {
        id: "top_eng_q",
        title: "美语质量提升",
        discussion: "课堂观察、家园共育与阶段目标对齐。",
        audiences: ["园长", "教学主任"],
        projectTag: "全国美语会议",
        updatedAt: ts
      }
    ],
    sessions: []
  };
}

function seedXiaoxing(): ProductBundle {
  const ts = now();
  return {
    experts: [
      {
        id: "adv_agri_ops",
        name: "农服经营顾问",
        category: "经营",
        intro: "种植计划、渠道与农服跟进口径（非人设包）。",
        knowledgeBase: "xiaoxing/knowledge FAQ+Wiki2",
        voice: "默认 TTS",
        enabled: true,
        updatedAt: ts
      },
      {
        id: "adv_crop",
        name: "作物与种苗顾问",
        category: "技术",
        intro: "品种特性、育苗与田间管理问答。",
        knowledgeBase: "xiaoxing crop FAQ",
        voice: "默认 TTS",
        enabled: true,
        updatedAt: ts
      },
      {
        id: "adv_market",
        name: "行情与批发顾问",
        category: "行情",
        intro: "批发/地头价差与跟进提示（只读行情）。",
        knowledgeBase: "xiaoxing market",
        voice: "默认 TTS",
        enabled: true,
        updatedAt: ts
      }
    ],
    topics: [
      {
        id: "xtop_seed",
        title: "本周种苗供应与渠道回访",
        discussion: "缺货、替代品种与农服待办。",
        audiences: ["站长", "技术员"],
        projectTag: "农服周会",
        updatedAt: ts
      },
      {
        id: "xtop_price",
        title: "行情波动与跟进策略",
        discussion: "近 7 日均价与价差告警进跟进列。",
        audiences: ["站长"],
        projectTag: "农服周会",
        updatedAt: ts
      }
    ],
    sessions: []
  };
}

function ensureProduct(product: AdminProduct): ProductBundle {
  ensureDir(productDir(product));
  const expertsFile = fileOf(product, "experts.json");
  const topicsFile = fileOf(product, "topics.json");
  const sessionsFile = fileOf(product, "sessions.json");
  if (!fs.existsSync(expertsFile) || !fs.existsSync(topicsFile)) {
    const seed = product === "xiaoxing" ? seedXiaoxing() : seedDazhi();
    writeJson(expertsFile, seed.experts);
    writeJson(topicsFile, seed.topics);
    writeJson(sessionsFile, seed.sessions);
    return seed;
  }
  return {
    experts: readJson(expertsFile, []),
    topics: readJson(topicsFile, []),
    sessions: readJson(sessionsFile, [])
  };
}

export function parseProduct(raw: unknown): AdminProduct | null {
  const p = String(raw || "").trim().toLowerCase();
  if (p === "dazhi" || p === "desktop") return "dazhi";
  if (p === "xiaoxing") return "xiaoxing";
  return null;
}

export function listExperts(product: AdminProduct) {
  return ensureProduct(product).experts;
}

export function upsertExpert(
  product: AdminProduct,
  body: Partial<ExpertRecord> & { name: string; knowledge_base?: string }
) {
  const bundle = ensureProduct(product);
  const ts = now();
  const id = String(body.id || "").trim() || nid("exp");
  const idx = bundle.experts.findIndex((e) => e.id === id);
  const row: ExpertRecord = {
    id,
    name: String(body.name || "").trim(),
    category: String(body.category || "其他").trim() || "其他",
    intro: String(body.intro || "").trim(),
    knowledgeBase: String(body.knowledgeBase || body.knowledge_base || "").trim(),
    voice: String(body.voice || "默认").trim() || "默认",
    enabled: body.enabled !== false,
    createdBy: body.createdBy,
    updatedAt: ts
  };
  if (idx >= 0) bundle.experts[idx] = { ...bundle.experts[idx], ...row, id };
  else bundle.experts.push(row);
  writeJson(fileOf(product, "experts.json"), bundle.experts);
  return row;
}

export function setExpertEnabled(product: AdminProduct, id: string, enabled: boolean) {
  const bundle = ensureProduct(product);
  const row = bundle.experts.find((e) => e.id === id);
  if (!row) return null;
  row.enabled = Boolean(enabled);
  row.updatedAt = now();
  writeJson(fileOf(product, "experts.json"), bundle.experts);
  return row;
}

export function listTopics(product: AdminProduct, opts?: { projectTag?: string; audience?: string }) {
  let list = ensureProduct(product).topics;
  const tag = String(opts?.projectTag || "").trim();
  const aud = String(opts?.audience || "").trim();
  if (tag) list = list.filter((t) => t.projectTag === tag);
  if (aud) list = list.filter((t) => t.audiences.includes(aud));
  return list;
}

export function upsertTopic(
  product: AdminProduct,
  body: Partial<TopicRecord> & { title: string; project_tag?: string; audiences?: string[] | string }
) {
  const bundle = ensureProduct(product);
  const ts = now();
  const id = String(body.id || "").trim() || nid("top");
  const audiences = Array.isArray(body.audiences)
    ? body.audiences.map((a) => String(a).trim()).filter(Boolean)
    : String(body.audiences || "")
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean);
  const row: TopicRecord = {
    id,
    title: String(body.title || "").trim(),
    discussion: String(body.discussion || "").trim(),
    audiences,
    projectTag: String(body.projectTag || body.project_tag || "默认").trim() || "默认",
    updatedAt: ts
  };
  const idx = bundle.topics.findIndex((t) => t.id === id);
  if (idx >= 0) bundle.topics[idx] = row;
  else bundle.topics.push(row);
  writeJson(fileOf(product, "topics.json"), bundle.topics);
  return row;
}

export function deleteTopic(product: AdminProduct, id: string) {
  const bundle = ensureProduct(product);
  const before = bundle.topics.length;
  bundle.topics = bundle.topics.filter((t) => t.id !== id);
  writeJson(fileOf(product, "topics.json"), bundle.topics);
  return { deleted: before - bundle.topics.length };
}

export function listSessions(product: AdminProduct) {
  return ensureProduct(product).sessions;
}

export function createSession(
  product: AdminProduct,
  body: {
    title: string;
    meetingType?: string;
    audiences?: string[];
    expertId?: string | null;
    topicIds?: string[];
    openingPrompt?: string;
  }
) {
  const bundle = ensureProduct(product);
  const ts = now();
  const expertId = body.expertId || null;
  const expert = expertId ? bundle.experts.find((e) => e.id === expertId) : null;
  const topicIds = Array.isArray(body.topicIds) ? body.topicIds : [];
  const topics = bundle.topics.filter((t) => topicIds.includes(t.id));
  const firstTitle = topics[0]?.title || "待定议题";
  const assistantName = product === "xiaoxing" ? "小星" : "小智";
  const opening =
    String(body.openingPrompt || "").trim() ||
    `大家好，我是${assistantName}${expert ? `，本场协同「${expert.name}」口径` : ""}。` +
      `今天围绕「${String(body.title || "").trim() || "本次会议"}」交流。` +
      `请大家按序发言，非发言时请静音。需要我回答或打断时，请叫我「${assistantName}」。` +
      `当前议题：1. ${firstTitle}。`;

  const row: MeetingSessionRecord = {
    id: nid("M"),
    title: String(body.title || "").trim() || `${product}-meeting`,
    meetingType: String(body.meetingType || "讨论会议").trim(),
    audiences: Array.isArray(body.audiences) ? body.audiences : [],
    expertId,
    topicIds,
    openingPrompt: opening,
    status: "waiting",
    agendaIndex: 0,
    createdAt: ts,
    updatedAt: ts
  };
  bundle.sessions.unshift(row);
  while (bundle.sessions.length > 80) bundle.sessions.pop();
  writeJson(fileOf(product, "sessions.json"), bundle.sessions);
  return row;
}

export function patchSession(
  product: AdminProduct,
  id: string,
  patch: Partial<Pick<MeetingSessionRecord, "status" | "agendaIndex" | "openingPrompt" | "title">>
) {
  const bundle = ensureProduct(product);
  const row = bundle.sessions.find((s) => s.id === id);
  if (!row) return null;
  if (patch.status) row.status = patch.status;
  if (typeof patch.agendaIndex === "number") row.agendaIndex = Math.max(0, patch.agendaIndex);
  if (patch.openingPrompt != null) row.openingPrompt = String(patch.openingPrompt);
  if (patch.title != null) row.title = String(patch.title);
  row.updatedAt = now();
  writeJson(fileOf(product, "sessions.json"), bundle.sessions);
  return row;
}

export function getSessionView(product: AdminProduct, id: string) {
  const bundle = ensureProduct(product);
  const session = bundle.sessions.find((s) => s.id === id);
  if (!session) return null;
  const expert = session.expertId
    ? bundle.experts.find((e) => e.id === session.expertId) || null
    : null;
  const topics = bundle.topics.filter((t) => session.topicIds.includes(t.id));
  const current = topics[session.agendaIndex] || topics[0] || null;
  return { session, expert, topics, currentTopic: current };
}

export function adminHealth(product: AdminProduct) {
  const b = ensureProduct(product);
  return {
    product,
    experts: b.experts.length,
    topics: b.topics.length,
    sessions: b.sessions.length,
    enabledExperts: b.experts.filter((e) => e.enabled).length
  };
}

/** 测试复位：删产品目录 */
export function resetAdminProductForTests(product: AdminProduct) {
  const dir = productDir(product);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  return ensureProduct(product);
}
