import assert from "node:assert/strict";
import test from "node:test";

import {
  assessExecutiveAccess,
  safeAppReturnPath,
  safeRelativeReturnPath,
  signPayload,
  verifySignedPayload,
} from "../app/security/auth-policy.mjs";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const MEMBERSHIP_ID = "33333333-3333-4333-8333-333333333333";

test("Executive authorisation requires immutable IDs and the explicit app grant", () => {
  assert.deepEqual(
    assessExecutiveAccess({
      userId: USER_ID,
      companyId: COMPANY_ID,
      membershipId: MEMBERSHIP_ID,
      applications: ["EXECUTIVE"],
    }),
    {
      allowed: true,
      code: "allowed",
      message: "Veyvio Executive access confirmed.",
    },
  );
});

test("Command, Finance, HR, Driver and Yard-only users are denied", () => {
  for (const application of ["COMMAND", "FINANCE", "HR", "DRIVER", "YARD"]) {
    const result = assessExecutiveAccess({
      userId: USER_ID,
      companyId: COMPANY_ID,
      membershipId: MEMBERSHIP_ID,
      applications: [application],
    });
    assert.equal(result.allowed, false);
    assert.equal(result.code, "executive_access_required");
  }
});

test("an email address cannot replace immutable Veyvio identity", () => {
  const result = assessExecutiveAccess({
    userId: "owner@example.test",
    companyId: COMPANY_ID,
    membershipId: MEMBERSHIP_ID,
    applications: ["EXECUTIVE"],
  });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "immutable_identity_required");
});

test("return paths reject external, protocol-relative and auth-loop redirects", () => {
  assert.equal(safeRelativeReturnPath("https://evil.example"), "/");
  assert.equal(safeRelativeReturnPath("//evil.example"), "/");
  assert.equal(safeRelativeReturnPath("/callback"), "/");
  assert.equal(safeAppReturnPath("/api/auth/logout"), "/");
  assert.equal(safeAppReturnPath("/login"), "/");
  assert.equal(safeAppReturnPath("/?view=security"), "/?view=security");
});

test("signed session bindings reject tampering", async () => {
  const secret = "a-secure-test-secret-that-is-longer-than-32-characters";
  const signed = await signPayload(
    { outerEmail: "owner@example.test", userId: USER_ID },
    secret,
  );
  assert.deepEqual(await verifySignedPayload(signed, secret), {
    outerEmail: "owner@example.test",
    userId: USER_ID,
  });

  const tampered = `${signed.slice(0, -1)}${signed.endsWith("a") ? "b" : "a"}`;
  assert.equal(await verifySignedPayload(tampered, secret), null);
});
