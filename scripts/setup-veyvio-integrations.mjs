#!/usr/bin/env node
/**
 * Push HubSpot / Resend secrets to the veyvio-website Worker and redeploy.
 *
 * 1. Copy veyvio-website/.env.integrations.example → veyvio-website/.env.integrations
 * 2. Fill in HUBSPOT_ACCESS_TOKEN and RESEND_API_KEY
 * 3. npm run setup:integrations
 */

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "veyvio-website");
const envPath = join(root, ".env.integrations");

function loadEnvFile(path) {
  if (!existsSync(path)) return null;
  const vars = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

function wranglerSecret(name, value) {
  const result = spawnSync(
    "npx",
    ["wrangler", "secret", "put", name, "--config", "./wrangler.toml", "--env="],
    {
      cwd: root,
      input: value,
      encoding: "utf8",
      stdio: ["pipe", "inherit", "inherit"],
    },
  );
  if (result.status !== 0) {
    throw new Error(`wrangler secret put ${name} failed`);
  }
}

function main() {
  const env = loadEnvFile(envPath);
  if (!env) {
    console.error("\nMissing veyvio-website/.env.integrations");
    console.error("Copy .env.integrations.example and add your API keys.\n");
    process.exit(1);
  }

  const required = ["HUBSPOT_ACCESS_TOKEN", "DEMO_FROM_EMAIL", "DEMO_NOTIFY_EMAIL"];
  const emailProvider = env.EMAIL_PROVIDER ?? "resend";
  if (emailProvider === "resend") {
    required.push("RESEND_API_KEY");
  }
  const missing = required.filter((k) => !env[k]);
  if (missing.length) {
    console.error("\nMissing in .env.integrations:", missing.join(", "));
    process.exit(1);
  }

  console.log("\nSetting Worker secrets…\n");
  const secrets = [
    "HUBSPOT_ACCESS_TOKEN",
    "DEMO_FROM_EMAIL",
    "DEMO_NOTIFY_EMAIL",
    ...(env.RESEND_API_KEY ? ["RESEND_API_KEY"] : []),
    ...(env.CALENDAR_BOOKING_URL ? ["CALENDAR_BOOKING_URL"] : []),
  ];
  for (const key of secrets) {
    if (env[key]) {
      console.log(`  ${key}`);
      wranglerSecret(key, env[key]);
    }
  }

  const crm = env.CRM_PROVIDER ?? "hubspot";
  const email = env.EMAIL_PROVIDER ?? "resend";

  const tomlPath = join(root, "wrangler.toml");
  let toml = readFileSync(tomlPath, "utf8");
  toml = toml.replace(/CRM_PROVIDER = "stub"/, `CRM_PROVIDER = "${crm}"`);
  if (email !== "stub") {
    toml = toml.replace(/EMAIL_PROVIDER = "stub"/, `EMAIL_PROVIDER = "${email}"`);
  }
  writeFileSync(tomlPath, toml);

  console.log("\nRedeploying with live providers…\n");
  const deploy = spawnSync(
    "npm",
    ["run", "deploy"],
    {
      cwd: root,
      encoding: "utf8",
      stdio: "inherit",
      env: {
        ...process.env,
        VITE_SITE_URL: "https://veyvio.co.uk",
        VITE_SALES_EMAIL: "info@veyvio.co.uk",
        VITE_SUPPORT_EMAIL: "support@veyvio.co.uk",
        VITE_SIGN_IN_URL: "https://veyvio-admin.pages.dev/login",
      },
    },
  );

  if (deploy.status !== 0) process.exit(deploy.status ?? 1);

  console.log("\nVerifying /api/demo…");
  const test = spawnSync(
    "curl",
    [
      "-s",
      "-X",
      "POST",
      "https://veyvio.co.uk/api/demo",
      "-H",
      "Content-Type: application/json",
      "-d",
      JSON.stringify({
        name: "Integration Test",
        email: "integration-test@example.com",
        organisation: "Veyvio Setup",
        serviceType: "community-transport",
        fleetSize: "1-10",
        consent: true,
      }),
    ],
    { encoding: "utf8" },
  );
  console.log(test.stdout || test.stderr);
  console.log("\nDone. Check HubSpot contacts and Resend delivery logs.\n");
}

main();
