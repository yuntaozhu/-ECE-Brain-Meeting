/**
 * Agent 可观测事件（供 A2A / Agent 工作台展示）
 * 兼容旧字段 sender/target/action，并增加 role/summary/runId/detail。
 */

function newRunId() {
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * @param {object} opts
 * @param {string} opts.role MeetingAgent | KnowledgeTool | AudioBridge | Gate
 * @param {string} opts.action RUN_START|RETRIEVE|PLAN|COMPOSE|SPEAK|FALLBACK|RUN_END|…
 * detail 建议带上 tool、topScore、gate（faq|kb-script|clarify|compose|rewrite）、doubaoSpeak、riskRewrite。
 * @param {string} [opts.summary] 人话一行
 * @param {object} [opts.detail]
 * @param {string} [opts.runId]
 * @param {string} [opts.target] 兼容旧 UI
 */
function agentEvent(opts = {}) {
  const role = String(opts.role || "MeetingAgent");
  const action = String(opts.action || "NOTE");
  const target = String(opts.target || "HostAgent");
  return {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    runId: opts.runId || "",
    role,
    action,
    summary: String(opts.summary || "").slice(0, 160),
    detail: opts.detail && typeof opts.detail === "object" ? opts.detail : {},
    // 兼容旧 renderA2a
    sender: role,
    target,
    payload: opts.detail && typeof opts.detail === "object" ? opts.detail : {}
  };
}

function pushAgent(a2aTrace, opts) {
  if (!Array.isArray(a2aTrace)) return null;
  const ev = agentEvent(opts);
  a2aTrace.push(ev);
  return ev;
}

/** 从检索结果生成待办（替代模板三句） */
function todosFromRetrieval(retrieval, askText) {
  const hits = retrieval?.hits || [];
  const cites = hits
    .slice(0, 3)
    .map((h) => h.title || h.slug)
    .filter(Boolean);
  const todos = [];
  const { speakLine, speakFill, rx } = require("../../knowledge/schemaStore.cjs");
  if (cites.length) todos.push(speakFill("todoCite", { cites: cites.join("、") }));
  else todos.push(speakLine("todoWeak"));
  if (rx("faq", "todoMoney").test(String(askText || ""))) {
    todos.push(speakLine("todoMoney"));
  } else {
    todos.push(speakLine("todoDefault"));
  }
  todos.push(speakLine("todoFollow"));
  return todos;
}

module.exports = {
  newRunId,
  agentEvent,
  pushAgent,
  todosFromRetrieval
};
