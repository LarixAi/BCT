#!/usr/bin/env node
/**
 * Gate 1 preflight — run before BCT (or any pilot) physical device test.
 * Fast static guards + optional live Command checks when VEYVIO_* env is set.
 *
 * Usage:
 *   npm run gate1:preflight
 *   npm run gate1:preflight -- --live   # require live API checks (fails if env missing)
 */
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAdminEnv } from "./load-admin-env.mjs";

const root = dirname(fileURLToPath(new URL(".", import.meta.url)));
const repoRoot = dirname(root);
const driverRoot = join(root, "veyvio-driver-App");
const adminRoot = join(root, "Veyvio admin ");

loadAdminEnv(repoRoot);

const requireLive = process.argv.includes("--live");
const skipBuild = process.env.GATE1_SKIP_BUILD === "1" || process.argv.includes("--skip-build");

const checks = [];

function pass(name, detail = "") {
  checks.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  checks.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function runStep(name, command, cwd, env = {}) {
  try {
    execSync(command, {
      cwd,
      stdio: "inherit",
      env: { ...process.env, ...env },
    });
    pass(name);
    return true;
  } catch {
    fail(name);
    return false;
  }
}

function hasLiveIsolationEnv() {
  return Boolean(process.env.VEYVIO_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY);
}

function hasLivePilotEnv() {
  const anon = process.env.VEYVIO_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(anon);
}

function pilotEnv() {
  const secretsEmail = process.env.VEYVIO_PILOT_EMAIL;
  const secretsPassword = process.env.VEYVIO_PILOT_PASSWORD;
  return {
    VEYVIO_PILOT_EMAIL: secretsEmail ?? "pilot-driver@veyvio.test",
    VEYVIO_PILOT_PASSWORD: secretsPassword ?? "VeyvioPilot1!",
  };
}

function main() {
  console.log("Gate 1 preflight — static guards\n");

  runStep("Secrets audit (F-04)", "npm run audit:secrets", root);

  runStep(
    "Yard production build guard",
    skipBuild ? "VERIFY_SKIP_BUILD=1 npm run verify:production-build" : "npm run verify:production-build",
    root,
  );

  runStep(
    "Driver Gate 1 static smoke",
    skipBuild
      ? "GATE1_SKIP_BUILD=1 node scripts/gate1-pilot-exit-smoke.mjs"
      : "node scripts/gate1-pilot-exit-smoke.mjs",
    driverRoot,
    {
      VITE_ENABLE_BASE44: "",
      VITE_ENABLE_PHV_MODULE: "",
      VITE_MOCK_API: "",
    },
  );

  runStep("Admin duty lifecycle gates", "node scripts/duty-lifecycle-gates.unit.mjs", adminRoot);
  runStep("Admin application scopes", "npx tsx scripts/application-scopes.unit.ts", adminRoot);
  runStep("Admin explicit application scopes", "npx tsx scripts/explicit-application-scopes.unit.ts", adminRoot);
  runStep("Admin membership access", "npx tsx scripts/membership-access.unit.ts", adminRoot);
  runStep("Admin yard permissions", "node scripts/yard-permissions.unit.mjs", adminRoot);
  runStep("Admin yard mutation inventory (P0-02)", "node scripts/yard-mutation-inventory.unit.mjs", adminRoot);
  runStep("Admin driver write guards", "npx tsx scripts/driver-write-guards.unit.ts", adminRoot);

  runStep("Yard unit tests", "npm test", root);
  runStep("Driver Gate 1 e2e (vitest)", "npm run test:gate1-exit", driverRoot, {
    VITE_ENABLE_BASE44: "",
    VITE_ENABLE_PHV_MODULE: "",
    VITE_MOCK_API: "",
  });

  const failed = checks.filter((c) => !c.ok);
  if (failed.length) {
    console.error(`\nGate 1 preflight failed (${failed.length} static step(s)).`);
    process.exit(1);
  }

  console.log("\nGate 1 preflight — optional live checks\n");

  if (hasLiveIsolationEnv()) {
    runStep("BCT pilot duty seed", "npm run gate1:bct-pilot-setup -- --seed-only", adminRoot);
    runStep(
      "Tenant isolation + dispatch gates (F-06)",
      "npm run test:dispatch-gates-live",
      adminRoot,
    );
    runStep("BCT operator readiness", "npm run gate1:bct-readiness", adminRoot);
    runStep("Yard live API smoke", "npm run test:yard-live", adminRoot);
  } else if (requireLive) {
    fail("Tenant isolation + dispatch gates", "set VEYVIO_ANON_KEY (and related isolation env)");
    fail("BCT operator readiness", "set VEYVIO_ANON_KEY in Admin .env or environment");
  } else {
    console.warn("Skipping tenant isolation — set VEYVIO_ANON_KEY to run dispatch gate live smoke.");
    console.warn("Skipping BCT readiness — set VEYVIO_ANON_KEY to verify BCT operator hub.");
  }

  if (hasLivePilotEnv()) {
    runStep(
      "BCT pilot driver live smoke",
      "npm run gate1:bct-pilot-setup -- --smoke-only",
      adminRoot,
      pilotEnv(),
    );
    runStep(
      "Driver device exit API (Android/iOS shared path)",
      "node scripts/gate1-device-exit.mjs --skip-build",
      driverRoot,
      pilotEnv(),
    );
  } else if (requireLive && process.env.VEYVIO_PILOT_REQUIRED === "1") {
    fail(
      "BCT pilot driver live smoke",
      "set VEYVIO_PILOT_EMAIL and VEYVIO_PILOT_PASSWORD (or omit VEYVIO_PILOT_REQUIRED)",
    );
  } else {
    console.warn(
      "Skipping pilot driver live smoke — set VEYVIO_PILOT_EMAIL and VEYVIO_PILOT_PASSWORD when pilot account exists.",
    );
  }

  const liveFailed = checks.filter((c) => !c.ok);
  if (liveFailed.length) {
    console.error(`\nGate 1 preflight failed (${liveFailed.length} live step(s)).`);
    process.exit(1);
  }

  console.log(`\nGate 1 preflight passed (${checks.length} checks).`);
  if (!checks.some((c) => c.name.includes("device exit"))) {
    console.log("Next: npm run gate1:device-exit (mobile web) or physical checklist in docs/plan/gate1-pilot-exit-test.md");
  }
}

main();
