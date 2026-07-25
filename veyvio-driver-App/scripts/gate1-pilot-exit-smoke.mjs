#!/usr/bin/env node
/**
 * Gate 1 pilot exit smoke — static production guards + optional live Command checks.
 * Physical device steps remain in docs/plan/gate1-pilot-exit-test.md.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveCommandApiEnv } from "../../Veyvio admin /scripts/lib/command-api-env.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const { api: apiBase, supabase: supabaseUrl, anon: anonKey } = resolveCommandApiEnv();
const email = process.env.VEYVIO_PILOT_EMAIL;
const password = process.env.VEYVIO_PILOT_PASSWORD;

const checks = [];

function pass(name, detail = "") {
  checks.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  checks.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function assertPassed() {
  const failed = checks.filter((c) => !c.ok);
  if (failed.length) process.exit(1);
}

function runStaticChecks() {
  if (process.env.VITE_ENABLE_PHV_MODULE === "true" || process.env.VITE_ENABLE_BASE44 === "true") {
    fail("PHV/Base44 env profile", "VITE_ENABLE_PHV_MODULE and VITE_ENABLE_BASE44 must be unset for Gate 1 exit");
  } else {
    pass("PHV module default off", "legacy flags unset in smoke profile");
  }

  const viteConfig = readFileSync(join(root, "vite.config.js"), "utf8");
  if (!viteConfig.includes("useLegacyBase44") || !viteConfig.includes("base44Client.stub.js")) {
    fail("Base44 fail-closed alias", "vite.config must alias @/api/base44Client to stub when PHV off");
  } else {
    pass("Base44 fail-closed alias", "vite.config wires base44Client.stub.js");
  }

  if (!viteConfig.includes("base44-sdk.stub.js")) {
    fail("Base44 SDK stub alias", "vite.config must alias @base44/sdk to stub when PHV off");
  } else {
    pass("Base44 SDK stub alias");
  }

  try {
    execSync("npm run test:gate1-exit", { cwd: root, stdio: "inherit" });
    pass("Gate 1 exit automated tests");
  } catch {
    fail("Gate 1 exit automated tests");
    assertPassed();
  }

  try {
    const verifyEnv = {
      ...process.env,
      VITE_ENABLE_BASE44: "",
      VITE_ENABLE_PHV_MODULE: "",
      VITE_MOCK_API: "",
    };
    if (process.env.GATE1_SKIP_BUILD === "1" || process.argv.includes("--skip-build")) {
      verifyEnv.VERIFY_SKIP_BUILD = "1";
    }
    execSync("node scripts/verify-production-build.mjs", {
      cwd: root,
      stdio: "inherit",
      env: verifyEnv,
    });
    pass("Production build guard", "no Base44/PHV/mock paths in release bundle");
  } catch {
    fail("Production build guard");
    assertPassed();
  }
}

async function runLiveChecks() {
  const signIn = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!signIn.ok) {
    fail("Pilot driver sign-in", `HTTP ${signIn.status}`);
    return;
  }
  const session = await signIn.json();
  const token = session.access_token;
  pass("Pilot driver sign-in");

  const bootstrapRes = await fetch(`${apiBase}/driver/bootstrap`, {
    headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
  });
  if (!bootstrapRes.ok) {
    fail("Driver bootstrap", `HTTP ${bootstrapRes.status}`);
    return;
  }
  const bootstrap = await bootstrapRes.json();
  pass("Driver bootstrap", `schema v${bootstrap.schemaVersion ?? "?"}`);

  if (bootstrap.eligibility && Array.isArray(bootstrap.eligibility.blockers)) {
    pass("Bootstrap eligibility blockers exposed", `${bootstrap.eligibility.blockers.length} blocker(s)`);
  } else {
    fail("Bootstrap eligibility blockers exposed");
  }

  const vehicleId =
    bootstrap.duties?.[0]?.vehicle?.id ??
    bootstrap.legacy?.homeSummary?.vehicleAssignment?.vehicleId ??
    null;
  if (vehicleId) {
    const readinessRes = await fetch(`${apiBase}/driver/vehicle-readiness?vehicleId=${vehicleId}`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
    });
    if (readinessRes.ok) pass("Vehicle readiness endpoint", vehicleId);
    else fail("Vehicle readiness endpoint", `HTTP ${readinessRes.status}`);

    const timelineRes = await fetch(`${apiBase}/driver/vehicle-timeline?vehicleId=${vehicleId}`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
    });
    if (timelineRes.ok) pass("Vehicle timeline endpoint", vehicleId);
    else fail("Vehicle timeline endpoint", `HTTP ${timelineRes.status}`);
  } else {
    console.warn("No assigned vehicle on bootstrap — skipping vehicle readiness/timeline live checks.");
  }

  const notificationsRes = await fetch(`${apiBase}/notifications`, {
    headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
  });
  if (notificationsRes.ok) {
    const notifications = await notificationsRes.json();
    const count = Array.isArray(notifications) ? notifications.length : 0;
    pass("Driver notifications endpoint", `${count} notification(s)`);
  } else {
    fail("Driver notifications endpoint", `HTTP ${notificationsRes.status}`);
  }

  const publishedDuty = (bootstrap.duties ?? []).find(
    (duty) => !duty.actualSignOnAt && !duty.actual_sign_on_at,
  );
  if (publishedDuty?.id) {
    const dutyId = publishedDuty.id;
    const signOnWithoutAck = await fetch(`${apiBase}/driver/duties/${dutyId}/sign-on`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deviceId: "gate1-pilot-smoke" }),
    });
    const signOnBody = await signOnWithoutAck.json().catch(() => ({}));
    if (signOnWithoutAck.status === 409 && signOnBody.code === "acknowledgement_required") {
      pass("Sign-on blocked until duty acknowledged", dutyId);
    } else if (signOnWithoutAck.status === 409 && signOnBody.code === "dispatch_blocked") {
      pass("Sign-on blocked by dispatch gate", signOnBody.message ?? signOnBody.code);
    } else {
      fail(
        "Sign-on blocked until duty acknowledged",
        `expected acknowledgement_required or dispatch_blocked, got ${signOnWithoutAck.status} ${JSON.stringify(signOnBody)}`,
      );
    }

    const ackRes = await fetch(`${apiBase}/driver/duties/${dutyId}/acknowledge`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deviceId: "gate1-pilot-smoke" }),
    });
    if (ackRes.ok) {
      pass("Duty acknowledgement accepted", dutyId);
    } else {
      const ackBody = await ackRes.json().catch(() => ({}));
      fail("Duty acknowledgement accepted", `HTTP ${ackRes.status} ${JSON.stringify(ackBody)}`);
    }
  } else {
    console.warn("No open published duty on bootstrap — skipping acknowledgement lifecycle checks.");
  }
}

async function main() {
  console.log("Gate 1 pilot exit — static checks");
  runStaticChecks();

  if (!apiBase || !anonKey || !email || !password) {
    console.warn(
      "Skipping live Command pilot checks — set VEYVIO_API_URL, VEYVIO_ANON_KEY, VEYVIO_PILOT_EMAIL, VEYVIO_PILOT_PASSWORD.",
    );
    console.log(`Gate 1 pilot smoke passed (${checks.length} static checks).`);
    return;
  }

  console.log("Gate 1 pilot exit — live Command checks");
  await runLiveChecks();
  assertPassed();
  console.log(`Gate 1 pilot smoke passed (${checks.length} checks).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
