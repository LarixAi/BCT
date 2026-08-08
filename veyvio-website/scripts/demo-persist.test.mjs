/**
 * F-03 / TD-025 — stub CRM/email must not return success without persist.
 * Run: node scripts/demo-persist.test.mjs
 */
import assert from "node:assert/strict";
import { processDemoSubmission } from "../server/demo-handler.ts";
import { createMemoryLeadStore } from "../server/demo-leads-store.ts";

const payload = {
  name: "Alex Test",
  email: "alex@example.com",
  organisation: "Test Transport",
  serviceType: "Community transport",
  fleetSize: "11-25",
  consent: true,
};

const env = { CRM_PROVIDER: "stub", EMAIL_PROVIDER: "stub" };

{
  const store = createMemoryLeadStore();
  const result = await processDemoSubmission(payload, env, store);
  assert.equal(result.ok, true);
  assert.equal(result.persisted, true);
  assert.equal(result.emailDelivered, false);
  assert.equal(result.crmStatus, "skipped_stub");
  const rows = await store.list();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].email, payload.email);
  console.log("PASS persist + stub CRM/email still saves lead");
}

{
  await assert.rejects(
    () =>
      processDemoSubmission(payload, env, {
        async save() {
          throw new Error("disk full");
        },
      }),
    /could not be saved/,
  );
  console.log("PASS persist failure does not return ok");
}

console.log("demo-persist.test.mjs: PASS");
