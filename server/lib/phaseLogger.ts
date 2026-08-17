/**
 * Compact, structured operational logs for the Phase-1 HTTP meeting flow.
 * Do not log participant content or credentials here.
 */
export type PhaseLogEvent =
  | "chat.received"
  | "chat.persisted"
  | "sync.poll"
  | "sync.state_patch"
  | "participant.joined"
  | "ai.start"
  | "ai.completed"
  | "ai.skipped"
  | "ai.failed"
  | "rag.embedded"
  | "rag.searched";

export function phaseLog(event: PhaseLogEvent, fields: Record<string, unknown> = {}) {
  console.log(`[phase1] ${JSON.stringify({ event, ...fields, at: new Date().toISOString() })}`);
}

export function phaseError(event: Extract<PhaseLogEvent, "ai.failed">, fields: Record<string, unknown> = {}) {
  console.error(`[phase1] ${JSON.stringify({ event, ...fields, at: new Date().toISOString() })}`);
}
