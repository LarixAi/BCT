import assert from "node:assert/strict";
import test from "node:test";

import { scanText } from "../scripts/scan-production-secrets.mjs";

test("secret scanner accepts ordinary Executive application content", () => {
  const findings = scanText(
    "fixture.ts",
    "const status = 'Demonstration only'; const role = 'Chief Executive';",
  );
  assert.deepEqual(findings, []);
});

test("secret scanner detects a high-confidence live secret without printing it", () => {
  const fakeSecret = ["sk_", "live_", "1234567890abcdefghijkl"].join("");
  const findings = scanText("fixture.ts", `const key = "${fakeSecret}";`);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "Stripe live secret key");
  assert.doesNotMatch(findings[0].preview, /1234567890abcdefghijkl/);
});

test("secret scanner blocks secret-shaped public environment variables", () => {
  const unsafeName = ["NEXT", "_PUBLIC", "_CLIENT_SECRET"].join("");
  const findings = scanText("fixture.ts", `const name = "${unsafeName}";`);

  assert.equal(findings.length, 1);
  assert.equal(
    findings[0].rule,
    "secret exposed through a public environment variable",
  );
});

test("secret scanner blocks an Executive signing secret embedded in generated config", () => {
  const unsafeAssignment = [
    '"VEYVIO_EXECUTIVE_SESSION_',
    'SECRET":"test-only-value-123456789"',
  ].join("");
  const findings = scanText("dist/server/wrangler.json", unsafeAssignment);

  assert.equal(findings.length, 1);
  assert.equal(
    findings[0].rule,
    "Executive session signing secret embedded in generated configuration",
  );
  assert.doesNotMatch(findings[0].preview, /test-only-value-123456789/u);
});

test("secret scanner blocks service-role JWTs in browser bundles", () => {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url",
  );
  const payload = Buffer.from(
    JSON.stringify({ role: "service_role", sub: "service" }),
  ).toString("base64url");
  const token = `${header}.${payload}.signaturevalue`;
  const findings = scanText("dist/client/chunk.js", `const leaked = "${token}";`);
  assert.ok(
    findings.some((finding) => finding.rule === "service-role JWT leaked into browser bundle"),
  );
});

test("secret scanner blocks any identity JWT in browser bundles", () => {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url",
  );
  const payload = Buffer.from(JSON.stringify({ role: "anon", sub: "anon" })).toString(
    "base64url",
  );
  const token = `${header}.${payload}.signaturevalue`;
  const findings = scanText("dist/client/chunk.js", `const leaked = "${token}";`);
  assert.ok(
    findings.some((finding) => finding.rule === "identity JWT leaked into browser bundle"),
  );
});
