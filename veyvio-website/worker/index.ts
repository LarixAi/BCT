import { demoErrorStatus, processDemoSubmission, validateSubmission } from "../server/demo-handler";
import { createKvLeadStore, createMemoryLeadStore } from "../server/demo-leads-store";

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  ENVIRONMENT?: string;
  CRM_PROVIDER?: string;
  HUBSPOT_ACCESS_TOKEN?: string;
  EMAIL_PROVIDER?: string;
  RESEND_API_KEY?: string;
  DEMO_FROM_EMAIL?: string;
  DEMO_NOTIFY_EMAIL?: string;
  SALES_EMAIL?: string;
  CALENDAR_BOOKING_URL?: string;
  /** Durable demo/waiting-list leads — required in production. */
  DEMO_LEADS?: KVNamespace;
}

const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
  ].join("; "),
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
};

/** Best-effort per-isolate rate limit for demo submissions. */
const demoHits = new Map<string, { count: number; resetAt: number }>();
const DEMO_RATE_LIMIT = 8;
const DEMO_RATE_WINDOW_MS = 60_000;

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function allowDemoRequest(request: Request): boolean {
  const key = clientIp(request);
  const now = Date.now();
  const current = demoHits.get(key);
  if (!current || current.resetAt <= now) {
    demoHits.set(key, { count: 1, resetAt: now + DEMO_RATE_WINDOW_MS });
    return true;
  }
  if (current.count >= DEMO_RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...securityHeaders,
      ...extraHeaders,
    },
  });
}

async function handleDemoPost(request: Request, env: Env) {
  try {
    const payload = validateSubmission(await request.json());
    // F-03 / TD-025: persist required. KV in production; memory only for non-prod without binding.
    const store = env.DEMO_LEADS
      ? createKvLeadStore(env.DEMO_LEADS)
      : env.ENVIRONMENT && env.ENVIRONMENT !== "production"
        ? createMemoryLeadStore()
        : null;
    if (!store) {
      return json(
        {
          ok: false,
          error: "Enquiry storage is not configured (DEMO_LEADS KV binding required).",
        },
        503,
      );
    }
    const result = await processDemoSubmission(payload, env, store);
    return json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Submission failed";
    return json({ ok: false, error: message }, demoErrorStatus(message));
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ ok: true, service: "veyvio-website", environment: env.ENVIRONMENT ?? "production" });
    }

    if (url.pathname === "/api/demo") {
      if (request.method === "POST") {
        if (!allowDemoRequest(request)) {
          return json({ ok: false, error: "Too many requests. Please try again shortly." }, 429);
        }
        return handleDemoPost(request, env);
      }
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            ...securityHeaders,
            "Access-Control-Allow-Origin": url.origin,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }
      return json({ error: "Method not allowed" }, 405);
    }

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(securityHeaders)) {
      headers.set(key, value);
    }

    if (env.ENVIRONMENT === "staging") {
      headers.set("X-Robots-Tag", "noindex, nofollow");
    }

    // SPA fallback for client-side routes
    if (response.status === 404 && request.method === "GET" && !url.pathname.includes(".")) {
      const index = await env.ASSETS.fetch(new Request(new URL("/index.html", url.origin)));
      return new Response(index.body, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...securityHeaders,
        },
      });
    }

    return new Response(response.body, { status: response.status, headers });
  },
};
