import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Executive BFF never references a service-role credential name", async () => {
  const session = await readFile(
    new URL("../app/security/veyvio-session.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(session, /SERVICE_ROLE|sb_secret_/u);
  assert.match(session, /VEYVIO_COMMAND_PUBLISHABLE_KEY|VEYVIO_COMMAND_ANON_KEY/u);
  assert.match(session, /commandPublicKey/u);
});

test("production build assertion and SBOM scripts are wired", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.match(packageJson.scripts.build, /assert-production-build/);
  assert.equal(packageJson.scripts.sbom, "node scripts/generate-sbom.mjs");
  assert.equal(packageJson.scripts["security:audit"], "node scripts/audit-dependencies.mjs");
  assert.equal(
    packageJson.scripts["security:rotate:dry-run"],
    "node scripts/rotate-session-secret-checklist.mjs",
  );
});

test("CI workflow requires secret scan, tests, audit and SBOM", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/ci.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /security:scan:source/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /security:audit/);
  assert.match(workflow, /npm run sbom/);
  assert.match(workflow, /VEYVIO_EXECUTIVE_PRODUCTION_BUILD:\s*"1"/);
});
