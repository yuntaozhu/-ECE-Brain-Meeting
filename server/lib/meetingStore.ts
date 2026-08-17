/**
 * Meeting + RAG store.
 * Production (Vercel / Railway) requires Upstash Redis.
 * In-memory Maps are local/dev only and must never be the multi-device source of truth.
 */

export interface MeetingState {
  currentTopic: string;
  agendaStage: string;
  agendas?: any[];
  transcript: Array<{ speaker: string; text: string; timestamp?: string | number | Date }>;
  mountedFiles: any[];
  tencentParticipants: any[];
  isMeetingActive: boolean;
  meetingStarted?: boolean;
  latestToDos?: string[];
  seq: number;
  updatedAt: number;
  phaseMode?: string;
  [key: string]: any;
}

export interface RagChunk {
  id: string;
  roomId: string;
  fileName: string;
  text: string;
  embedding: number[];
  createdAt: number;
}

export interface LiveEvent {
  seq: number;
  type: string;
  payload: any;
  timestamp: number;
}

type RedisLike = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<any>;
};

const memoryStates = new Map<string, MeetingState>();
const memoryRag = new Map<string, RagChunk[]>();
const memoryEvents = new Map<string, LiveEvent[]>();

let redisClient: RedisLike | null = null;
let redisInitAttempted = false;

function stateKey(roomId: string) {
  return `meeting:${roomId}:state`;
}
function ragKey(roomId: string) {
  return `meeting:${roomId}:rag`;
}
function eventsKey(roomId: string) {
  return `meeting:${roomId}:events`;
}

export function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
    Boolean(process.env.VERCEL)
  );
}

export function isPersistentRuntime(): boolean {
  if (process.env.VERCEL) return false;
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_STATIC_URL ||
      process.env.FORCE_PERSISTENT_SERVER
  );
}

export function detectRuntime(): "railway" | "vercel-serverless" | "local" {
  if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_STATIC_URL) return "railway";
  if (process.env.VERCEL) return "vercel-serverless";
  return "local";
}

async function getRedis(): Promise<RedisLike | null> {
  if (redisInitAttempted) return redisClient;
  redisInitAttempted = true;

  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.dadimeeting_KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.dadimeeting_KV_REST_API_TOKEN;

  if (url && token) {
    try {
      const { Redis } = await import("@upstash/redis");
      redisClient = new Redis({ url, token }) as unknown as RedisLike;
      console.log("[meetingStore] Upstash Redis connected");
      return redisClient;
    } catch (err: any) {
      console.warn("[meetingStore] Upstash init failed:", err?.message || err);
    }
  } else if (!isProductionRuntime()) {
    console.log("[meetingStore] No Upstash credentials — using in-memory store (local/dev only)");
  }
  return null;
}

export async function assertStoreReady(): Promise<void> {
  if (!isProductionRuntime()) return;
  const redis = await getRedis();
  if (!redis) {
    throw new Error(
      "Production meeting store requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_*)."
    );
  }
}

function defaultState(): MeetingState {
  return {
    currentTopic: "关于下一代幼儿教育数字化基础设施的规划",
    agendaStage: "IceBreaking",
    agendas: [],
    transcript: [],
    mountedFiles: [],
    tencentParticipants: [],
    isMeetingActive: false,
    meetingStarted: false,
    latestToDos: [],
    seq: 0,
    updatedAt: Date.now(),
    phaseMode: "phase1-text-sync"
  };
}

export function mergeTranscripts(existingList: any[] = [], incomingList: any[] = []) {
  const map = new Map<string, any>();

  for (const item of existingList) {
    if (!item) continue;
    const speaker = item.speaker || item.sender || "参会者";
    const text = (item.text || "").trim();
    if (!text) continue;
    map.set(`${speaker}_${text}`, { ...item, speaker, text });
  }

  for (const item of incomingList) {
    if (!item) continue;
    const speaker = item.speaker || item.sender || "参会者";
    const text = (item.text || "").trim();
    if (!text) continue;
    const key = `${speaker}_${text}`;
    if (!map.has(key)) {
      map.set(key, { ...item, speaker, text });
    }
  }

  return Array.from(map.values());
}

export async function getMeetingState(roomId: string): Promise<MeetingState | null> {
  await assertStoreReady();
  const redis = await getRedis();
  if (redis) {
    try {
      const raw = await redis.get(stateKey(roomId));
      if (!raw) return null;
      if (typeof raw === "object") return raw as MeetingState;
      return JSON.parse(String(raw)) as MeetingState;
    } catch (err: any) {
      console.warn("[meetingStore] getMeetingState redis error:", err?.message || err);
    }
  }
  return memoryStates.get(roomId) || null;
}

export async function setMeetingState(roomId: string, state: MeetingState): Promise<MeetingState> {
  await assertStoreReady();
  const next = { ...state, updatedAt: Date.now() };
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.set(stateKey(roomId), JSON.stringify(next));
    } catch (err: any) {
      console.warn("[meetingStore] setMeetingState redis error:", err?.message || err);
      memoryStates.set(roomId, next);
    }
  } else {
    memoryStates.set(roomId, next);
  }
  return next;
}

export async function getOrCreateMeetingState(roomId: string): Promise<MeetingState> {
  const existing = await getMeetingState(roomId);
  if (existing) return existing;
  const created = defaultState();
  return setMeetingState(roomId, created);
}

export async function patchMeetingState(
  roomId: string,
  incoming: Partial<MeetingState>
): Promise<MeetingState> {
  const existing = await getOrCreateMeetingState(roomId);
  const mergedTranscript = mergeTranscripts(existing.transcript || [], incoming.transcript || []);
  const nextSeq = Math.max(existing.seq || 0, 0) + 1;
  const updated: MeetingState = {
    ...existing,
    ...incoming,
    tencentParticipants: incoming.tencentParticipants || existing.tencentParticipants,
    transcript: mergedTranscript,
    seq: nextSeq,
    updatedAt: Date.now()
  };
  await setMeetingState(roomId, updated);
  await appendLiveEvent(roomId, "state_patch", { seq: nextSeq });
  return updated;
}

export async function saveChatMessageToServerState(
  roomId: string,
  sender: string,
  text: string
): Promise<MeetingState> {
  const existing = await getOrCreateMeetingState(roomId);
  const newEntry = { speaker: sender, text, timestamp: new Date().toISOString() };
  const updatedTranscript = mergeTranscripts(existing.transcript || [], [newEntry]);
  const nextSeq = (existing.seq || 0) + 1;
  const updated: MeetingState = {
    ...existing,
    transcript: updatedTranscript,
    seq: nextSeq,
    updatedAt: Date.now()
  };
  await setMeetingState(roomId, updated);
  await appendLiveEvent(roomId, "chat", { sender, text, seq: nextSeq });
  return updated;
}

export async function upsertParticipant(roomId: string, participant: any): Promise<MeetingState> {
  const existing = await getOrCreateMeetingState(roomId);
  const list = [...(existing.tencentParticipants || [])];
  const idx = list.findIndex(
    (p) => p.userId === participant.userId || p.userName === participant.userName
  );
  if (idx >= 0) list[idx] = { ...list[idx], ...participant };
  else list.push(participant);
  const nextSeq = (existing.seq || 0) + 1;
  const updated = {
    ...existing,
    tencentParticipants: list,
    seq: nextSeq,
    updatedAt: Date.now()
  };
  await setMeetingState(roomId, updated);
  await appendLiveEvent(roomId, "participant", { participant, seq: nextSeq });
  return updated;
}

export async function appendLiveEvent(
  roomId: string,
  type: string,
  payload: any
): Promise<LiveEvent> {
  const state = await getOrCreateMeetingState(roomId);
  const event: LiveEvent = {
    seq: state.seq || Date.now(),
    type,
    payload,
    timestamp: Date.now()
  };

  const redis = await getRedis();
  if (redis) {
    try {
      const raw = await redis.get(eventsKey(roomId));
      let list: LiveEvent[] = [];
      if (raw) {
        list = typeof raw === "object" ? (raw as LiveEvent[]) : JSON.parse(String(raw));
      }
      list.push(event);
      if (list.length > 500) list = list.slice(-500);
      await redis.set(eventsKey(roomId), JSON.stringify(list));
      return event;
    } catch (err: any) {
      console.warn("[meetingStore] appendLiveEvent redis error:", err?.message || err);
    }
  }

  const mem = memoryEvents.get(roomId) || [];
  mem.push(event);
  if (mem.length > 500) mem.splice(0, mem.length - 500);
  memoryEvents.set(roomId, mem);
  return event;
}

export async function listEventsSince(roomId: string, since: number): Promise<LiveEvent[]> {
  await assertStoreReady();
  const redis = await getRedis();
  if (redis) {
    try {
      const raw = await redis.get(eventsKey(roomId));
      if (!raw) return [];
      const list: LiveEvent[] =
        typeof raw === "object" ? (raw as LiveEvent[]) : JSON.parse(String(raw));
      return list.filter((e) => e.seq > since);
    } catch (err: any) {
      console.warn("[meetingStore] listEventsSince redis error:", err?.message || err);
    }
  }
  return (memoryEvents.get(roomId) || []).filter((e) => e.seq > since);
}

export async function addRagChunk(chunk: RagChunk): Promise<void> {
  await assertStoreReady();
  const redis = await getRedis();
  if (redis) {
    try {
      const raw = await redis.get(ragKey(chunk.roomId));
      let list: RagChunk[] = [];
      if (raw) {
        list = typeof raw === "object" ? (raw as RagChunk[]) : JSON.parse(String(raw));
      }
      list.push(chunk);
      await redis.set(ragKey(chunk.roomId), JSON.stringify(list));
      return;
    } catch (err: any) {
      console.warn("[meetingStore] addRagChunk redis error:", err?.message || err);
    }
  }
  const mem = memoryRag.get(chunk.roomId) || [];
  mem.push(chunk);
  memoryRag.set(chunk.roomId, mem);
}

export async function listRagChunks(roomId: string): Promise<RagChunk[]> {
  await assertStoreReady();
  const redis = await getRedis();
  if (redis) {
    try {
      const raw = await redis.get(ragKey(roomId));
      if (!raw) return [];
      return typeof raw === "object" ? (raw as RagChunk[]) : JSON.parse(String(raw));
    } catch (err: any) {
      console.warn("[meetingStore] listRagChunks redis error:", err?.message || err);
    }
  }
  return memoryRag.get(roomId) || [];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function searchRag(
  roomId: string,
  queryEmbedding: number[],
  topK = 5
): Promise<Array<{ fileName: string; snippet: string; similarity: number; text: string }>> {
  const chunks = await listRagChunks(roomId);
  const scored = chunks
    .map((c) => ({
      fileName: c.fileName,
      snippet: c.text.slice(0, 200),
      text: c.text,
      similarity: cosineSimilarity(queryEmbedding, c.embedding)
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
  return scored;
}

export async function getStoreBackend(): Promise<"upstash" | "memory"> {
  const redis = await getRedis();
  return redis ? "upstash" : "memory";
}
