// Small fetch wrapper for the NestJS API. All requests go to /api (proxied in dev).
const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}
