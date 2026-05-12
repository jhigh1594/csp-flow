/**
 * Railway/Docker: `apps/web/env.sh` substitutes the literal `KANEO_API_URL` in built JS at container start.
 * Local/dev: use `VITE_API_URL` from `.env`.
 *
 * Vercel + Railway: set `VITE_API_USE_SAME_ORIGIN=true` and proxy `/api/*` to Railway (see repo `middleware.ts`).
 * The browser then calls `https://your-app.vercel.app/api/...` so session cookies stay first-party.
 */
function resolveRawApiEnvString(): string {
  const sameOriginFlag = import.meta.env.VITE_API_USE_SAME_ORIGIN;
  const useSameOrigin = sameOriginFlag === "true" || sameOriginFlag === true;
  if (useSameOrigin && typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }
  const vite = import.meta.env.VITE_API_URL?.trim();
  if (vite) {
    return vite;
  }
  const injected = "KANEO_API_URL";
  return injected.startsWith("http") ? injected : "http://localhost:1337";
}

/** Origin only (protocol + host), no path — matches Better Auth `baseURL` shape. */
export function resolveApiOrigin(): string {
  const raw = resolveRawApiEnvString().replace(/\/+$/, "");
  const withoutApi = raw.replace(/\/api\/?$/, "");
  try {
    const url = new URL(withoutApi);
    return `${url.protocol}//${url.host}`;
  } catch {
    return withoutApi.split("/").slice(0, 3).join("/");
  }
}

/** Base URL including `/api` prefix for REST fetchers. */
export function resolveApiBaseUrl(): string {
  const trimmedBase = resolveRawApiEnvString().replace(/\/+$/, "");
  return trimmedBase.endsWith("/api") ? trimmedBase : `${trimmedBase}/api`;
}
