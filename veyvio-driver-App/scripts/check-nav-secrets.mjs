#!/usr/bin/env node
/**
 * Phase-0 baseline check: verify the Supabase secrets the navigation engine
 * depends on are reachable. Reports without leaking the secret value.
 *
 * Usage:
 *   SUPABASE_PROJECT_REF=pyhlahefrribapcqlhuf node scripts/check-nav-secrets.mjs
 *
 * Why this exists: the driver nav stack falls back to OSRM when Routes API
 * key/quota is missing, which is silent on the device. This script catches
 * it before a real drive.
 */
import { execSync } from "node:child_process";

const REQUIRED = ["GOOGLE_ROUTES_API_KEY"];
const RECOMMENDED = [
  "GOOGLE_ROUTES_MONTHLY_LIMIT",
  "FCM_SERVICE_ACCOUNT_JSON",
  // Phase 4 — the snap-to-roads function falls back to GOOGLE_ROUTES_API_KEY
  // when these are absent, so they're informational only.
  "GOOGLE_ROADS_API_KEY",
  "GOOGLE_ROADS_MONTHLY_LIMIT",
];

const projectRef = process.env.SUPABASE_PROJECT_REF || "pyhlahefrribapcqlhuf";

function listSecrets() {
  try {
    const out = execSync(`supabase secrets list --project-ref ${projectRef}`, {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    return out;
  } catch (err) {
    console.error("✗ supabase CLI not available or not logged in.");
    console.error("  Install: brew install supabase/tap/supabase  (then `supabase login`)");
    console.error("");
    console.error(err?.stderr || err?.message);
    process.exit(2);
  }
}

const list = listSecrets();
// Match the secret name anywhere on a line — `supabase secrets list` indents
// each row, so anchoring to start-of-line gives false negatives.
const haveSecret = (name) => new RegExp(`\\b${name}\\b`).test(list);

let allRequiredOk = true;
console.log(`Supabase project: ${projectRef}`);
console.log("");
console.log("Required:");
for (const name of REQUIRED) {
  const ok = haveSecret(name);
  console.log(`  ${ok ? "✓" : "✗"} ${name}`);
  if (!ok) allRequiredOk = false;
}

console.log("");
console.log("Recommended:");
for (const name of RECOMMENDED) {
  const ok = haveSecret(name);
  console.log(`  ${ok ? "✓" : "•"} ${name}${ok ? "" : "  (optional)"}`);
}

console.log("");
if (allRequiredOk) {
  console.log("✓ All required secrets present — Routes API will be used when reachable.");
  process.exit(0);
}
console.log("✗ Missing required secrets — driver nav will fall back to OSRM (no traffic, no street names guaranteed).");
process.exit(1);
