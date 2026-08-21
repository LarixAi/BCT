import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  approvedAuthCallbackPaths,
  approvedExecutiveHosts,
  assessAuthRateLimit,
  assessCorsRequest,
  assessExecutiveHost,
  assessSameOriginMutation,
  buildContentSecurityPolicy,
  buildSecurityHeaders,
  cloudflareAccessEvaluation,
  resetAuthRateLimitStoreForTests,
  scanSecurityHeaders,
} from "../app/security/edge-protection.mjs";

test("CSP is strict: no script unsafe-inline or unsafe-eval, frame-ancestors none", () => {
  const csp = buildContentSecurityPolicy();
  assert.match(csp, /script-src 'self'/);
  assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/);
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /connect-src 'self'/);
  assert.match(csp, /style-src-attr 'unsafe-inline'/);
});

test("local Vinext bootstrap CSP allows inline scripts required for hydration", () => {
  const csp = buildContentSecurityPolicy({
    allowInlineBootstrap: true,
    upgradeInsecureRequests: false,
  });
  assert.match(csp, /script-src 'self' 'unsafe-inline'/);
  assert.match(csp, /style-src 'self' 'unsafe-inline'/);
  assert.doesNotMatch(csp, /upgrade-insecure-requests/);
});

test("security headers enable Vinext bootstrap on local HTTP demo hosts", async () => {
  const { buildSecurityHeaders } = await import(
    "../app/security/edge-protection.mjs"
  );
  const previous = process.env.VEYVIO_EXECUTIVE_LOCAL_DEMO;
  process.env.VEYVIO_EXECUTIVE_LOCAL_DEMO = "1";
  try {
    const headers = buildSecurityHeaders({
      isHttps: false,
      hostname: "localhost",
    });
    assert.match(
      headers["Content-Security-Policy"],
      /script-src 'self' 'unsafe-inline'/,
    );
  } finally {
    if (previous === undefined) delete process.env.VEYVIO_EXECUTIVE_LOCAL_DEMO;
    else process.env.VEYVIO_EXECUTIVE_LOCAL_DEMO = previous;
  }
});

test("CSP can attach a script nonce without broadening script-src", () => {
  const csp = buildContentSecurityPolicy({ nonce: "abc123" });
  assert.match(csp, /script-src 'self' 'nonce-abc123'/);
  assert.doesNotMatch(csp, /unsafe-eval/);
});

test("security header pack covers Phase 6 browser controls", () => {
  const headers = buildSecurityHeaders({
    requestId: "req-test-1",
    isHttps: true,
  });
  const findings = scanSecurityHeaders(headers);
  assert.deepEqual(findings, []);
  assert.equal(headers["Referrer-Policy"], "no-referrer");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.match(headers["Strict-Transport-Security"], /max-age=31536000/);
  assert.match(headers["Permissions-Policy"], /camera=\(\)/);
});

test("same-origin mutation CSRF checks reject foreign and cross-site posts", () => {
  const allowed = assessSameOriginMutation(
    new Request("https://veyvio-executive.adataintelligence.chatgpt.site/api/auth/login", {
      method: "POST",
      headers: {
        origin: "https://veyvio-executive.adataintelligence.chatgpt.site",
        "sec-fetch-site": "same-origin",
      },
    }),
  );
  assert.equal(allowed.allowed, true);

  const foreign = assessSameOriginMutation(
    new Request("https://veyvio-executive.adataintelligence.chatgpt.site/api/auth/login", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "sec-fetch-site": "cross-site",
      },
    }),
  );
  assert.equal(foreign.allowed, false);
  assert.equal(foreign.code, "origin_check_failed");

  const crossSite = assessSameOriginMutation(
    new Request("https://veyvio-executive.adataintelligence.chatgpt.site/api/auth/login", {
      method: "POST",
      headers: {
        origin: "https://veyvio-executive.adataintelligence.chatgpt.site",
        "sec-fetch-site": "cross-site",
      },
    }),
  );
  assert.equal(crossSite.allowed, false);
  assert.equal(crossSite.code, "sec_fetch_site_rejected");
});

test("CORS rejects foreign origins and never implies public API access", () => {
  const same = assessCorsRequest(
    new Request("https://veyvio-executive.adataintelligence.chatgpt.site/api/executive/session", {
      headers: { origin: "https://veyvio-executive.adataintelligence.chatgpt.site" },
    }),
  );
  assert.equal(same.allowed, true);

  const foreign = assessCorsRequest(
    new Request("https://veyvio-executive.adataintelligence.chatgpt.site/api/executive/session", {
      headers: { origin: "https://evil.example" },
    }),
  );
  assert.equal(foreign.allowed, false);
  assert.equal(foreign.code, "cors_origin_rejected");
});

test("auth rate limit fails closed after the attempt budget without revealing accounts", () => {
  resetAuthRateLimitStoreForTests();
  const store = new Map();
  for (let index = 0; index < 20; index += 1) {
    const result = assessAuthRateLimit({
      key: "ip:203.0.113.10",
      store,
      nowMs: 1_000,
    });
    assert.equal(result.allowed, true, `attempt ${index + 1}`);
  }
  const blocked = assessAuthRateLimit({
    key: "ip:203.0.113.10",
    store,
    nowMs: 1_000,
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.code, "auth_rate_limited");
  assert.doesNotMatch(blocked.message, /account|user|email/i);
});

test("production host and callback allowlists are explicit", () => {
  assert.ok(
    approvedExecutiveHosts({ includeLocal: false }).includes(
      "veyvio-executive.adataintelligence.chatgpt.site",
    ),
  );
  assert.equal(
    assessExecutiveHost("veyvio-executive.adataintelligence.chatgpt.site").allowed,
    true,
  );
  assert.equal(assessExecutiveHost("evil.example").allowed, false);
  assert.ok(approvedAuthCallbackPaths().includes("/login"));
  assert.ok(approvedAuthCallbackPaths().includes("/callback"));
});

test("Cloudflare Access evaluation is recorded as deferred behind Sites outer gate", () => {
  const evaluation = cloudflareAccessEvaluation();
  assert.equal(evaluation.decision, "deferred");
  assert.match(evaluation.rationale, /Sites owner-only/i);
});

test("Worker and documents mutation route enforce edge and CSRF controls", async () => {
  const worker = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");
  assert.match(worker, /buildSecurityHeaders/);
  assert.match(worker, /assessCorsRequest/);
  assert.match(worker, /assessAuthRateLimit/);
  assert.match(worker, /Access-Control-Allow-Origin/);

  const documents = await readFile(
    new URL("../app/api/executive/documents/[kind]/[id]/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(documents, /assertSameOrigin\(request\)/);
});
