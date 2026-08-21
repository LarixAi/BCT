/**
 * Veyvio Executive browser / Worker / edge protection policy.
 * Pure helpers so the Worker, BFF responses and unit tests share one source.
 */

const APPROVED_PRODUCTION_HOSTS = Object.freeze([
  "veyvio-executive.adataintelligence.chatgpt.site",
]);

const LOCAL_DEV_HOSTS = Object.freeze(["localhost", "127.0.0.1"]);

/** Authentication callback and return paths the Executive BFF may honour. */
const APPROVED_AUTH_CALLBACK_PATHS = Object.freeze([
  "/",
  "/login",
  "/signin-with-chatgpt",
  "/signout-with-chatgpt",
  "/callback",
]);

const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_RATE_LIMIT_MAX_ATTEMPTS = 20;

/** @type {Map<string, { count: number, resetAt: number }>} */
const authRateBuckets = new Map();

function deny(code, message) {
  return { allowed: false, code, message };
}

export function approvedExecutiveHosts({ includeLocal = true } = {}) {
  return includeLocal
    ? [...APPROVED_PRODUCTION_HOSTS, ...LOCAL_DEV_HOSTS]
    : [...APPROVED_PRODUCTION_HOSTS];
}

export function approvedAuthCallbackPaths() {
  return [...APPROVED_AUTH_CALLBACK_PATHS];
}

export function assessExecutiveHost(hostname) {
  const host = String(hostname ?? "")
    .trim()
    .toLowerCase()
    .replace(/:\d+$/u, "");
  if (!host) {
    return deny("host_missing", "The Executive host could not be verified.");
  }
  if (approvedExecutiveHosts().includes(host)) {
    return {
      allowed: true,
      code: "allowed",
      message: "The Executive host is on the approved allowlist.",
      host,
    };
  }
  return deny(
    "host_not_allowlisted",
    "This Executive deployment host is not on the approved allowlist.",
  );
}

/**
 * Strict CSP without script unsafe-inline / unsafe-eval.
 * style-src-attr allows React/CSS-in-JS attribute styles without permitting
 * inline <style> or script injection.
 *
 * `allowInlineBootstrap`: Vinext/RSC local HTML embeds inline bootstrap scripts.
 * Those are required for client hydration. Keep false for production HTML once
 * nonced Vinext bootstrap is available; local demo must enable this or login
 * and every interactive page stay dead (CSP blocks hydration).
 */
export function buildContentSecurityPolicy({
  nonce,
  allowInlineBootstrap = false,
  upgradeInsecureRequests = true,
} = {}) {
  let scriptSrc;
  if (nonce) {
    scriptSrc = allowInlineBootstrap
      ? `script-src 'self' 'nonce-${nonce}' 'unsafe-inline'`
      : `script-src 'self' 'nonce-${nonce}'`;
  } else if (allowInlineBootstrap) {
    scriptSrc = "script-src 'self' 'unsafe-inline'";
  } else {
    scriptSrc = "script-src 'self'";
  }

  const styleSrc = allowInlineBootstrap
    ? "style-src 'self' 'unsafe-inline'"
    : "style-src 'self'";

  const directives = [
    "default-src 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    scriptSrc,
    styleSrc,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "media-src 'none'",
    "child-src 'none'",
    "frame-src 'none'",
  ];
  if (upgradeInsecureRequests) {
    directives.push("upgrade-insecure-requests");
  }
  return directives.join("; ");
}

export function buildPermissionsPolicy() {
  return [
    "accelerometer=()",
    "autoplay=()",
    "bluetooth=()",
    "camera=()",
    "display-capture=()",
    "geolocation=()",
    "gyroscope=()",
    "hid=()",
    "microphone=()",
    "midi=()",
    "payment=()",
    "usb=()",
    "interest-cohort=()",
  ].join(", ");
}

function localDemoEnabled() {
  const flag = String(process.env.VEYVIO_EXECUTIVE_LOCAL_DEMO ?? "")
    .trim()
    .toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

export function buildSecurityHeaders({
  requestId,
  nonce,
  isHttps = true,
  includePrivateCache = true,
  allowInlineBootstrap,
  hostname,
} = {}) {
  const loopback =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]";
  const inlineBootstrap =
    allowInlineBootstrap ?? (localDemoEnabled() && loopback && !isHttps);

  const headers = {
    "Content-Security-Policy": buildContentSecurityPolicy({
      nonce,
      allowInlineBootstrap: inlineBootstrap,
      upgradeInsecureRequests: isHttps,
    }),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": buildPermissionsPolicy(),
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-DNS-Prefetch-Control": "off",
  };

  if (isHttps) {
    // Rollout without preload submission until the dedicated production
    // hostname and certificate chain are permanently settled.
    headers["Strict-Transport-Security"] =
      "max-age=31536000; includeSubDomains";
  }

  if (includePrivateCache) {
    headers["Cache-Control"] =
      "private, no-store, max-age=0, must-revalidate";
    headers["CDN-Cache-Control"] = "no-store";
    headers["Cloudflare-CDN-Cache-Control"] = "no-store";
    headers.Pragma = "no-cache";
    headers["Surrogate-Control"] = "no-store";
  }

  if (requestId) {
    headers["X-Veyvio-Request-Id"] = String(requestId);
  }

  return headers;
}

export function assessSameOriginMutation(request) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (!origin || origin !== url.origin) {
    return deny(
      "origin_check_failed",
      "The request origin could not be verified.",
    );
  }

  const site = request.headers.get("sec-fetch-site");
  if (site && !["same-origin", "none"].includes(site)) {
    return deny(
      "sec_fetch_site_rejected",
      "Cross-site state-changing requests are not allowed.",
    );
  }

  return {
    allowed: true,
    code: "allowed",
    message: "Same-origin mutation checks passed.",
  };
}

export function assessCorsRequest(request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return {
      allowed: true,
      code: "allowed",
      message: "No cross-origin header present.",
      allowOrigin: null,
    };
  }

  const requestUrl = new URL(request.url);
  if (origin === requestUrl.origin) {
    return {
      allowed: true,
      code: "allowed",
      message: "Same-origin request.",
      allowOrigin: origin,
    };
  }

  // Opaque Origin ("null") can appear on accidental navigational POSTs in
  // local Brave/privacy modes. Allow only on loopback during local demo so
  // auth routes can redirect back to /login instead of a bare Forbidden page.
  const localDemo = String(process.env.VEYVIO_EXECUTIVE_LOCAL_DEMO ?? "")
    .trim()
    .toLowerCase();
  const localDemoEnabled =
    localDemo === "1" || localDemo === "true" || localDemo === "yes";
  const loopback =
    requestUrl.hostname === "localhost" ||
    requestUrl.hostname === "127.0.0.1" ||
    requestUrl.hostname === "[::1]";
  if (origin === "null" && localDemoEnabled && loopback) {
    return {
      allowed: true,
      code: "allowed",
      message: "Local-demo opaque origin accepted on loopback.",
      allowOrigin: null,
    };
  }

  return deny(
    "cors_origin_rejected",
    "Cross-origin browser access to Executive is not permitted.",
  );
}

export function isAuthAbusePath(pathname) {
  return (
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/verify" ||
    pathname === "/api/auth/enroll" ||
    pathname === "/api/auth/mfa/begin" ||
    pathname === "/api/auth/mfa/confirm" ||
    pathname === "/api/auth/select-company"
  );
}

export function clientAbuseKey(request) {
  const forwarded = request.headers.get("cf-connecting-ip");
  if (forwarded && forwarded.trim()) return `ip:${forwarded.trim()}`;
  const realIp = request.headers.get("x-real-ip");
  if (realIp && realIp.trim()) return `ip:${realIp.trim()}`;
  return `ua:${request.headers.get("user-agent") ?? "unknown"}`;
}

/**
 * Best-effort Worker isolate rate limit. Durable WAF limits remain required
 * in front of production; this fails closed for obvious credential stuffing.
 */
export function assessAuthRateLimit({
  key,
  nowMs = Date.now(),
  limit = AUTH_RATE_LIMIT_MAX_ATTEMPTS,
  windowMs = AUTH_RATE_LIMIT_WINDOW_MS,
  store = authRateBuckets,
} = {}) {
  const bucketKey = String(key ?? "").trim() || "unknown";
  const current = store.get(bucketKey);
  if (!current || current.resetAt <= nowMs) {
    store.set(bucketKey, { count: 1, resetAt: nowMs + windowMs });
    return {
      allowed: true,
      code: "allowed",
      message: "Authentication attempt accepted.",
      remaining: limit - 1,
    };
  }

  if (current.count >= limit) {
    return deny(
      "auth_rate_limited",
      "Too many sign-in attempts. Try again later.",
    );
  }

  current.count += 1;
  store.set(bucketKey, current);
  return {
    allowed: true,
    code: "allowed",
    message: "Authentication attempt accepted.",
    remaining: Math.max(0, limit - current.count),
  };
}

export function resetAuthRateLimitStoreForTests(store = authRateBuckets) {
  store.clear();
}

export function cloudflareAccessEvaluation() {
  return {
    decision: "deferred",
    rationale:
      "ChatGPT Sites owner-only identity already provides the outer approved-user gate for the current Executive release. Cloudflare Access remains an optional second gate after a dedicated production hostname is cut over outside Sites.",
  };
}

export function scanSecurityHeaders(headerMap) {
  const findings = [];
  const get = (name) => {
    for (const [key, value] of Object.entries(headerMap ?? {})) {
      if (key.toLowerCase() === name.toLowerCase()) return String(value);
    }
    return "";
  };

  const csp = get("Content-Security-Policy");
  if (!csp) findings.push("missing Content-Security-Policy");
  if (/unsafe-eval/i.test(csp)) findings.push("CSP allows unsafe-eval");
  if (/script-src[^;]*unsafe-inline/i.test(csp)) {
    findings.push("CSP script-src allows unsafe-inline");
  }
  if (!/frame-ancestors\s+'none'/i.test(csp)) {
    findings.push("CSP missing frame-ancestors 'none'");
  }

  if (get("X-Content-Type-Options").toLowerCase() !== "nosniff") {
    findings.push("missing X-Content-Type-Options: nosniff");
  }
  if (!/^no-referrer$/i.test(get("Referrer-Policy"))) {
    findings.push("missing Referrer-Policy: no-referrer");
  }
  if (!/^deny$/i.test(get("X-Frame-Options"))) {
    findings.push("missing X-Frame-Options: DENY");
  }
  if (!get("Permissions-Policy")) findings.push("missing Permissions-Policy");
  if (!/max-age=\d+/i.test(get("Strict-Transport-Security"))) {
    findings.push("missing Strict-Transport-Security");
  }

  return findings;
}
