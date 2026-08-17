/**
 * Phase-1 realtime channel: HTTP poll on Vercel/serverless, native WS only on persistent Node.
 */

export type RealtimeMode = "poll" | "ws";

export function isServerlessRealtime(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname || "";
  if (host === "localhost" || host === "127.0.0.1") return false;
  if (host.includes("railway.app") || host.includes("railway.internal")) return false;
  if (host.includes("vercel.app") || host.includes("dadimeeting") || host.includes("minervaedu")) {
    return true;
  }
  const viteProd = Boolean((import.meta as ImportMeta & { env?: { PROD?: boolean } }).env?.PROD);
  return viteProd;
}

export function shouldUseNativeWebSocket(): boolean {
  return !isServerlessRealtime();
}

export function detectRealtimeMode(): RealtimeMode {
  return shouldUseNativeWebSocket() ? "ws" : "poll";
}

export async function sendMeetingChat(params: {
  roomId: string;
  sender: string;
  text: string;
  msgId?: string;
}): Promise<{ success?: boolean; state?: any; error?: string }> {
  const res = await fetch("/api/meeting/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });
  return res.json();
}
