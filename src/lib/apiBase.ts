/**
 * E1: browser calls may stay same-origin (Vercel rewrite → Railway)
 * or go directly to VITE_API_BASE when the SPA is split from the API.
 */
type ViteEnv = ImportMeta & { env?: Record<string, string | boolean | undefined> };

export function getApiBase(): string {
  const env = (import.meta as ViteEnv).env || {};
  const raw = String(env.VITE_API_BASE || "").trim();
  return raw.replace(/\/$/, "");
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBase();
  return `${base}${normalized}`;
}

export function wsUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBase();
  if (base) {
    const wsBase = base.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
    return `${wsBase}${normalized}`;
  }
  if (typeof window === "undefined") return normalized;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${normalized}`;
}

export function isPersistentApiHost(): boolean {
  const base = getApiBase();
  if (base.includes("railway.app") || base.includes("railway.internal")) return true;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname || "";
  return host.includes("railway.app") || host.includes("railway.internal");
}
