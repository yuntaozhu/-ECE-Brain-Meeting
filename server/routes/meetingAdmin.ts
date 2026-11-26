/**
 * 会议管理台 API：专家/议题/会场（按 product 隔离）
 */
import { Router } from "express";
import {
  adminHealth,
  createSession,
  deleteTopic,
  getSessionView,
  listExperts,
  listSessions,
  listTopics,
  parseProduct,
  patchSession,
  setExpertEnabled,
  upsertExpert,
  upsertTopic
} from "../lib/meetingAdminStore";

const router = Router();

function requireProduct(req: { query: Record<string, unknown>; body?: Record<string, unknown>; params?: Record<string, unknown> }, res: any) {
  const raw = req.query.product ?? req.body?.product ?? req.params?.product;
  const product = parseProduct(raw);
  if (!product) {
    res.status(400).json({ success: false, error: "product 必填：dazhi | xiaoxing" });
    return null;
  }
  return product;
}

router.get("/api/meeting-admin/health", (req, res) => {
  const product = requireProduct(req as any, res);
  if (!product) return;
  res.json({ success: true, ...adminHealth(product) });
});

router.get("/api/meeting-admin/experts", (req, res) => {
  const product = requireProduct(req as any, res);
  if (!product) return;
  res.json({ success: true, product, experts: listExperts(product) });
});

router.post("/api/meeting-admin/experts", (req, res) => {
  const product = requireProduct(req as any, res);
  if (!product) return;
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ success: false, error: "name 必填" });
  const expert = upsertExpert(product, req.body);
  res.json({ success: true, expert });
});

router.patch("/api/meeting-admin/experts/:id/enabled", (req, res) => {
  const product = requireProduct(req as any, res);
  if (!product) return;
  const enabled = req.body?.enabled !== false && req.body?.enabled !== "0";
  const expert = setExpertEnabled(product, req.params.id, enabled);
  if (!expert) return res.status(404).json({ success: false, error: "专家不存在" });
  res.json({ success: true, expert });
});

router.get("/api/meeting-admin/topics", (req, res) => {
  const product = requireProduct(req as any, res);
  if (!product) return;
  const topics = listTopics(product, {
    projectTag: String(req.query.projectTag || ""),
    audience: String(req.query.audience || "")
  });
  res.json({ success: true, product, topics });
});

router.post("/api/meeting-admin/topics", (req, res) => {
  const product = requireProduct(req as any, res);
  if (!product) return;
  const title = String(req.body?.title || "").trim();
  if (!title) return res.status(400).json({ success: false, error: "title 必填" });
  const topic = upsertTopic(product, req.body);
  res.json({ success: true, topic });
});

router.delete("/api/meeting-admin/topics/:id", (req, res) => {
  const product = requireProduct(req as any, res);
  if (!product) return;
  const result = deleteTopic(product, req.params.id);
  res.json({ success: true, ...result });
});

router.get("/api/meeting-admin/sessions", (req, res) => {
  const product = requireProduct(req as any, res);
  if (!product) return;
  res.json({ success: true, product, sessions: listSessions(product) });
});

router.post("/api/meeting-admin/sessions", (req, res) => {
  const product = requireProduct(req as any, res);
  if (!product) return;
  const title = String(req.body?.title || "").trim();
  if (!title) return res.status(400).json({ success: false, error: "title 必填" });
  const session = createSession(product, req.body);
  res.json({ success: true, session, view: getSessionView(product, session.id) });
});

router.get("/api/meeting-admin/sessions/:id", (req, res) => {
  const product = requireProduct(req as any, res);
  if (!product) return;
  const view = getSessionView(product, req.params.id);
  if (!view) return res.status(404).json({ success: false, error: "会话不存在" });
  res.json({ success: true, ...view });
});

router.patch("/api/meeting-admin/sessions/:id", (req, res) => {
  const product = requireProduct(req as any, res);
  if (!product) return;
  const session = patchSession(product, req.params.id, req.body || {});
  if (!session) return res.status(404).json({ success: false, error: "会话不存在" });
  res.json({ success: true, session, view: getSessionView(product, session.id) });
});

export default router;
