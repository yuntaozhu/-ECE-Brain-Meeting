/**
 * 通用 Webhook：POST JSON { query | text | content } → ask 结果
 */
function extractQuery(body) {
  if (!body || typeof body !== "object") return "";
  return String(body.query || body.text || body.content || body.Content || "").trim();
}

function handleWebhookAsk(body, askFn) {
  const query = extractQuery(body);
  if (!query) {
    return { ok: false, error: "missing query", reply: "请提供 query 字段。" };
  }
  const result = askFn(query);
  return {
    ok: true,
    channel: "webhook",
    query,
    ...result
  };
}

module.exports = { extractQuery, handleWebhookAsk };
