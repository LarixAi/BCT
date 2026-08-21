import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assessCentrallyVerifiedJwt,
  assessExecutiveSessionStatus,
  executiveProjection,
  privateNoStoreHeaders,
  safeRequestId,
} from "../app/security/gateway-policy.mjs";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const MEMBERSHIP_ID = "33333333-3333-4333-8333-333333333333";
const SESSION_ID = "44444444-4444-4444-8444-444444444444";
const ISSUER = "https://identity.example.test/auth/v1";
const NOW = Date.parse("2026-07-30T12:00:00.000Z");

function strongSession(overrides = {}) {
  return {
    id: SESSION_ID,
    authStrength: "password_mfa",
    assuranceLevel: "aal2",
    createdAt: "2026-07-30T11:55:00.000Z",
    lastUsedAt: "2026-07-30T11:59:00.000Z",
    expiresAt: "2026-07-30T19:55:00.000Z",
    idleMinutes: 15,
    absoluteHours: 8,
    concurrentSessionLimit: 2,
    stepUpFresh: true,
    stepUpMinutes: 10,
    ...overrides,
  };
}

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function jwt(overrides = {}, header = { alg: "ES256", typ: "JWT" }) {
  const claims = {
    iss: ISSUER,
    aud: "authenticated",
    role: "authenticated",
    sub: USER_ID,
    session_id: SESSION_ID,
    iat: 1_000,
    exp: 2_000,
    aal: "aal1",
    ...overrides,
  };
  return `${base64url(header)}.${base64url(claims)}.central-signature`;
}

function assess(token) {
  return assessCentrallyVerifiedJwt(token, {
    expectedIssuer: ISSUER,
    expectedUserId: USER_ID,
    nowSeconds: 1_500,
  });
}

test("centrally verified tokens are independently bound to issuer, user and session", () => {
  assert.deepEqual(assess(jwt()), {
    allowed: true,
    code: "allowed",
    message: "The centrally verified session is bound to this request.",
    claims: {
      subject: USER_ID,
      sessionId: SESSION_ID,
      expiresAt: 2_000,
      assuranceLevel: "aal1",
    },
  });
});

test("unsafe algorithms and invalid security claims are rejected", () => {
  const cases = [
    [jwt({}, { alg: "none", typ: "JWT" }), "jwt_algorithm_rejected"],
    [jwt({ iss: "https://evil.example/auth/v1" }), "jwt_issuer_rejected"],
    [jwt({ aud: "public" }), "jwt_audience_rejected"],
    [jwt({ exp: 1_499 }), "jwt_expired"],
    [jwt({ iat: 1_700 }), "jwt_issued_at_rejected"],
    [
      jwt({ sub: "55555555-5555-4555-8555-555555555555" }),
      "jwt_subject_mismatch",
    ],
    [jwt({ session_id: null }), "jwt_session_required"],
  ];

  for (const [token, code] of cases) {
    const decision = assess(token);
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, code);
  }
});

test("only a current AAL2 session within Executive time limits is accepted", () => {
  assert.deepEqual(
    assessExecutiveSessionStatus(strongSession(), { nowMs: NOW }),
    {
      allowed: true,
      code: "allowed",
      message: "The Executive AAL2 session meets the required time limits.",
    },
  );

  for (const [session, expectedCode] of [
    [strongSession({ assuranceLevel: "aal1" }), "executive_aal2_required"],
    [strongSession({ authStrength: "password" }), "executive_aal2_required"],
    [
      strongSession({ lastUsedAt: "2026-07-30T11:44:59.000Z" }),
      "executive_session_window_rejected",
    ],
    [
      strongSession({ createdAt: "2026-07-30T03:59:59.000Z" }),
      "executive_session_window_rejected",
    ],
    [
      strongSession({ expiresAt: "2026-07-30T11:59:59.000Z" }),
      "executive_session_window_rejected",
    ],
    [strongSession({ idleMinutes: 16 }), "executive_session_policy_rejected"],
    [strongSession({ absoluteHours: 9 }), "executive_session_policy_rejected"],
    [
      strongSession({ concurrentSessionLimit: 3 }),
      "executive_session_policy_rejected",
    ],
  ]) {
    const decision = assessExecutiveSessionStatus(session, { nowMs: NOW });
    assert.equal(decision.allowed, false);
    assert.equal(decision.code, expectedCode);
  }
});

test("sensitive actions require MFA to have been completed in the last ten minutes", () => {
  assert.equal(
    assessExecutiveSessionStatus(strongSession(), {
      nowMs: NOW,
      requireRecentStepUp: true,
    }).allowed,
    true,
  );
  const old = assessExecutiveSessionStatus(
    strongSession({
      createdAt: "2026-07-30T11:49:59.000Z",
      stepUpFresh: false,
    }),
    { nowMs: NOW, requireRecentStepUp: true },
  );
  assert.equal(old.allowed, false);
  assert.equal(old.code, "executive_step_up_required");
});

test("the browser projection excludes tokens, emails and immutable database IDs", () => {
  const projection = executiveProjection({
    user: {
      id: USER_ID,
      email: "ceo@example.test",
      firstName: "Company",
      lastName: "Owner",
      activeCompanyId: COMPANY_ID,
      tenantName: "Veyvio CLG",
      roles: ["company_owner"],
    },
    access: {
      companyId: COMPANY_ID,
      membershipId: MEMBERSHIP_ID,
      roles: ["company_owner"],
      applications: ["EXECUTIVE"],
    },
  });

  assert.deepEqual(projection, {
    identity: {
      displayName: "Company Owner",
      role: "company_owner",
      companyName: "Veyvio CLG",
    },
    dataMode: "live",
  });
  const serialised = JSON.stringify(projection);
  assert.doesNotMatch(serialised, /ceo@example|11111111|22222222|33333333/u);
});

test("private responses disable browser, intermediary and CDN caching", () => {
  const headers = privateNoStoreHeaders("request-12345678");
  assert.match(headers["Cache-Control"], /private/u);
  assert.match(headers["Cache-Control"], /no-store/u);
  assert.equal(headers["CDN-Cache-Control"], "no-store");
  assert.equal(headers["Cloudflare-CDN-Cache-Control"], "no-store");
  assert.equal(headers["Surrogate-Control"], "no-store");
  assert.match(headers.Vary, /Cookie/u);
  assert.match(headers.Vary, /oai-authenticated-user-email/u);
  assert.equal(headers["X-Veyvio-Request-Id"], "request-12345678");
});

test("unsafe browser request IDs are replaced", () => {
  assert.equal(
    safeRequestId("attacker controlled\nlog", "safe-request-123"),
    "safe-request-123",
  );
});

test("client components contain no direct external data transport", async () => {
  const executiveSource = await readFile(
    new URL("../app/ExecutiveApp.tsx", import.meta.url),
    "utf8",
  );
  // Same-origin Executive BFF only — never Command/Supabase directly.
  assert.match(
    executiveSource,
    /fetch\(`\/api\/executive\/pages\/\$\{page\}`/u,
  );
  const fetchCount = [...executiveSource.matchAll(/\bfetch\s*\(/gu)].length;
  const sameOriginFetchCount = [
    ...executiveSource.matchAll(/\bfetch\s*\(\s*["`]\/api\//gu),
  ].length;
  assert.ok(fetchCount >= 1);
  assert.equal(sameOriginFetchCount, fetchCount);

  for (const path of [
    new URL("../app/ExecutiveApp.tsx", import.meta.url),
    new URL("../app/login/LoginForm.tsx", import.meta.url),
  ]) {
    const source = await readFile(path, "utf8");
    assert.match(source, /^"use client";/u);
    assert.doesNotMatch(source, /supabase|VEYVIO_COMMAND_API_URL|Authorization:/u);
    assert.doesNotMatch(source, /https?:\/\//u);
  }

  const loginSource = await readFile(
    new URL("../app/login/LoginForm.tsx", import.meta.url),
    "utf8",
  );
  assert.match(loginSource, /callAuth\("\/api\/auth\/login"/u);
  assert.match(loginSource, /callAuth\("\/api\/auth\/verify"/u);
  assert.match(loginSource, /callAuth\("\/api\/auth\/select-company"/u);
});
