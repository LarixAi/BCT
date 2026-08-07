/** Cloudflare Worker entry point for Veyvio Executive. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import {
  assessAuthRateLimit,
  assessCorsRequest,
  assessExecutiveHost,
  buildSecurityHeaders,
  clientAbuseKey,
  isAuthAbusePath,
} from "../app/security/edge-protection.mjs";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

function appendVary(headers: Headers, value: string) {
  const current = headers.get("Vary");
  const values = new Set(
    `${current ?? ""},${value}`
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
  headers.set("Vary", [...values].join(", "));
}

function isPrivateApplicationPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/api/")
  );
}

function applyEdgeHeaders(
  response: Response,
  request: Request,
  pathname: string,
  requestId: string,
) {
  const responseHeaders = new Headers(response.headers);
  const isHttps = new URL(request.url).protocol === "https:";
  const security = buildSecurityHeaders({
    requestId,
    isHttps,
    includePrivateCache: isPrivateApplicationPath(pathname),
    hostname: new URL(request.url).hostname,
  });

  for (const [name, value] of Object.entries(security)) {
    responseHeaders.set(name, value);
  }

  // Never advertise cross-origin API access.
  responseHeaders.delete("Access-Control-Allow-Origin");
  responseHeaders.delete("Access-Control-Allow-Credentials");
  responseHeaders.delete("Access-Control-Allow-Headers");
  responseHeaders.delete("Access-Control-Allow-Methods");

  if (isPrivateApplicationPath(pathname)) {
    appendVary(responseHeaders, "Cookie");
    appendVary(responseHeaders, "oai-authenticated-user-email");
    appendVary(responseHeaders, "Origin");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

function jsonEdgeError(
  request: Request,
  requestId: string,
  status: number,
  code: string,
  message: string,
) {
  const headers = new Headers(
    buildSecurityHeaders({
      requestId,
      isHttps: new URL(request.url).protocol === "https:",
      includePrivateCache: true,
    }),
  );
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.delete("Access-Control-Allow-Origin");
  return new Response(JSON.stringify({ ok: false, code, message }), {
    status,
    headers,
  });
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const imageResponse = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return applyEdgeHeaders(imageResponse, request, url.pathname, requestId);
    }

    const hostCheck = assessExecutiveHost(url.hostname);
    if (!hostCheck.allowed && process.env.VEYVIO_EXECUTIVE_ENFORCE_HOST === "1") {
      return jsonEdgeError(
        request,
        requestId,
        421,
        hostCheck.code,
        hostCheck.message,
      );
    }

    const cors = assessCorsRequest(request);
    if (!cors.allowed) {
      return jsonEdgeError(request, requestId, 403, cors.code, cors.message);
    }

    if (
      request.method !== "GET" &&
      request.method !== "HEAD" &&
      isAuthAbusePath(url.pathname)
    ) {
      const rate = assessAuthRateLimit({ key: clientAbuseKey(request) });
      if (!rate.allowed) {
        return jsonEdgeError(request, requestId, 429, rate.code, rate.message);
      }
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-veyvio-request-id", requestId);
    const gatewayRequest = new Request(request, { headers: requestHeaders });
    const response = await handler.fetch(gatewayRequest, env, ctx);
    return applyEdgeHeaders(response, request, url.pathname, requestId);
  },
};

export default worker;
