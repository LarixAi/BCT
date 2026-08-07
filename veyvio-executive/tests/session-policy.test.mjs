import assert from "node:assert/strict";
import test from "node:test";

import {
  EXECUTIVE_ABSOLUTE_LIFETIME_MS,
  EXECUTIVE_IDLE_TIMEOUT_MS,
  assessExecutiveSessionPolicy,
  nextExecutiveActivityBinding,
} from "../app/security/session-policy.mjs";

const NOW = 1_700_000_000_000;

function binding(overrides = {}) {
  return {
    kind: "executive_session",
    assuranceLevel: "aal2",
    authenticatedAt: NOW - 60_000,
    lastActivityAt: NOW - 30_000,
    ...overrides,
  };
}

test("aal2 sessions within idle and absolute windows are allowed", () => {
  const decision = assessExecutiveSessionPolicy(binding(), { now: NOW });
  assert.equal(decision.allowed, true);
  assert.equal(decision.code, "allowed");
});

test("password-only aal1 sessions cannot access Executive", () => {
  const decision = assessExecutiveSessionPolicy(
    binding({ assuranceLevel: "aal1" }),
    { now: NOW },
  );
  assert.equal(decision.allowed, false);
  assert.equal(decision.code, "executive_aal2_required");
});

test("missing assurance is treated as aal1 denial", () => {
  const decision = assessExecutiveSessionPolicy(
    binding({ assuranceLevel: undefined }),
    { now: NOW },
  );
  assert.equal(decision.allowed, false);
  assert.equal(decision.code, "executive_aal2_required");
});

test("idle timeout fails closed after 15 minutes", () => {
  const decision = assessExecutiveSessionPolicy(
    binding({
      lastActivityAt: NOW - EXECUTIVE_IDLE_TIMEOUT_MS - 1,
    }),
    { now: NOW },
  );
  assert.equal(decision.allowed, false);
  assert.equal(decision.code, "executive_session_idle");
});

test("absolute lifetime fails closed after 8 hours", () => {
  const decision = assessExecutiveSessionPolicy(
    binding({
      authenticatedAt: NOW - EXECUTIVE_ABSOLUTE_LIFETIME_MS - 1,
      lastActivityAt: NOW,
    }),
    { now: NOW },
  );
  assert.equal(decision.allowed, false);
  assert.equal(decision.code, "executive_session_expired");
});

test("activity touch updates lastActivityAt only", () => {
  const next = nextExecutiveActivityBinding(binding(), { now: NOW });
  assert.equal(next.lastActivityAt, NOW);
  assert.equal(next.assuranceLevel, "aal2");
  assert.equal(next.authenticatedAt, NOW - 60_000);
});
