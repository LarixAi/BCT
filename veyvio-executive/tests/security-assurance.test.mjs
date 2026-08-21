/**
 * Phase 11 — assurance inventory + CDN cache policy invariants (SEC-1105/1107).
 * Run: node --test tests/security-assurance.test.mjs
 */
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildSecurityHeaders } from "../app/security/edge-protection.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(root, "..");

async function mustExist(relative) {
  await access(path.join(appRoot, relative));
}

test("Phase 11 assurance artefacts exist in monorepo docs", async () => {
  const docs = path.resolve(appRoot, "../docs/plan");
  for (const name of [
    "veyvio-executive-threat-model.md",
    "veyvio-executive-asvs-mapping.md",
    "veyvio-executive-penetration-test-pack.md",
    "veyvio-executive-risk-acceptance.md",
  ]) {
    await access(path.join(docs, name));
  }
});

test("CODEOWNERS and PR template enforce review path (SEC-1104)", async () => {
  await mustExist("CODEOWNERS");
  await mustExist(".github/pull_request_template.md");
  const owners = await readFile(path.join(appRoot, "CODEOWNERS"), "utf8");
  assert.match(owners, /app\/security\//);
  assert.match(owners, /app\/api\/auth\//);
  assert.match(owners, /worker\//);
});

test("CI runs secret scan, tests, dependency audit and SBOM (SEC-1106)", async () => {
  const ci = await readFile(path.join(appRoot, ".github/workflows/ci.yml"), "utf8");
  assert.match(ci, /security:scan:source/);
  assert.match(ci, /npm test/);
  assert.match(ci, /security:audit/);
  assert.match(ci, /sbom/);
});

test("authenticated responses forbid CDN/browser store (SEC-1107)", () => {
  const headers = buildSecurityHeaders({
    isHttps: true,
    includePrivateCache: true,
  });
  assert.match(headers["Cache-Control"], /private/u);
  assert.match(headers["Cache-Control"], /no-store/u);
  assert.equal(headers["CDN-Cache-Control"], "no-store");
  assert.equal(headers["Cloudflare-CDN-Cache-Control"], "no-store");
  assert.equal(headers["Surrogate-Control"], "no-store");
});

test("negative security suite files remain present (SEC-1105)", async () => {
  for (const name of [
    "edge-protection.test.mjs",
    "gateway-policy.test.mjs",
    "authorisation-boundary.test.mjs",
    "documents-boundary.test.mjs",
    "secret-scan.test.mjs",
    "rendered-html.test.mjs",
  ]) {
    await mustExist(path.join("tests", name));
  }
});
