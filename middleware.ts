/**
 * Vercel Edge: forwards `/api/*` to Railway so the browser uses same-origin `/api` (first-party cookies).
 *
 * Set `VERCEL_API_PROXY_ORIGIN` on the Vercel project to your API origin with no path suffix, e.g.
 * `https://csp-flow-api-production.up.railway.app`
 *
 * Railway API must set `KANEO_AUTH_PUBLIC_ORIGIN` to the deployed web origin (e.g. `https://csp-tasks.vercel.app`).
 * Web build must use `VITE_API_USE_SAME_ORIGIN=true`.
 */

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

/**
 * Edge runtimes fold multiple `Set-Cookie` into one broken header when cloning
 * `fetch` Response headers. Better Auth sets several cookies; browsers then
 * ignore them and every authenticated call returns 401.
 */
function buildProxiedResponseHeaders(upstream: Response): Headers {
  const out = new Headers();
  for (const [key, value] of upstream.headers.entries()) {
    if (key.toLowerCase() === "set-cookie") continue;
    out.append(key, value);
  }

  const getSetCookie = upstream.headers.getSetCookie?.bind(upstream.headers);
  const cookies = typeof getSetCookie === "function" ? getSetCookie() : [];
  if (cookies.length > 0) {
    for (const cookie of cookies) {
      out.append("Set-Cookie", cookie);
    }
  } else {
    const folded = upstream.headers.get("set-cookie");
    if (folded) {
      out.append("Set-Cookie", folded);
    }
  }

  return out;
}

export const config = {
  matcher: "/api/:path*",
};

export default async function middleware(request: Request): Promise<Response> {
  const apiOrigin = process.env.VERCEL_API_PROXY_ORIGIN?.trim();
  if (!apiOrigin) {
    return new Response(
      "VERCEL_API_PROXY_ORIGIN is not set (required for /api proxy)",
      { status: 502 },
    );
  }

  const incoming = new URL(request.url);
  const target = `${apiOrigin.replace(/\/$/, "")}${incoming.pathname}${incoming.search}`;

  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) continue;
    if (lower === "host") continue;
    headers.set(key, value);
  }

  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", incoming.protocol.replace(/:$/, ""));
  const xfwd = request.headers.get("x-forwarded-for");
  if (xfwd && !headers.has("x-forwarded-for")) {
    headers.set("x-forwarded-for", xfwd);
  }

  const init: RequestInit & { duplex?: string } = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  const upstream = await fetch(target, init);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: buildProxiedResponseHeaders(upstream),
  });
}
