#!/usr/bin/env node
/**
 * Attach veyvio.com / veyvio.co.uk custom domains to Cloudflare Workers + Pages.
 * Requires: wrangler OAuth login, veyvio.com zone on Cloudflare (full NS delegation).
 *
 * Usage: node scripts/setup-veyvio-domains.mjs [--verify-only]
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ACCOUNT_ID = "c126f180cddd8b67777f107833bb992f";
const WEBSITE_WORKER = "veyvio-website";
const ADMIN_PAGES = "veyvio-admin";
const VERIFY_ONLY = process.argv.includes("--verify-only");

function getOAuthToken() {
  const configPath = join(homedir(), "Library/Preferences/.wrangler/config/default.toml");
  const config = readFileSync(configPath, "utf8");
  const match = config.match(/oauth_token\s*=\s*"([^"]+)"/);
  if (!match) throw new Error("Run `npx wrangler login` first.");
  return match[1];
}

async function cf(path, { method = "GET", body } = {}) {
  const token = getOAuthToken();
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) {
    const msg = data.errors?.map((e) => e.message).join("; ") || res.statusText;
    throw new Error(msg);
  }
  return data;
}

async function findZone(name) {
  const { result } = await cf(`/zones?name=${name}`);
  return result.find((z) => z.name === name && z.status === "active") ?? null;
}

async function attachWorkerDomain(hostname, zoneId) {
  try {
    const { result } = await cf(`/accounts/${ACCOUNT_ID}/workers/domains`, {
      method: "PUT",
      body: {
        hostname,
        service: WEBSITE_WORKER,
        environment: "production",
        zone_id: zoneId,
      },
    });
    return { hostname, status: "attached", id: result.id };
  } catch (err) {
    if (String(err.message).includes("already exists")) {
      return { hostname, status: "exists" };
    }
    throw err;
  }
}

async function attachPagesDomain(hostname, zoneId) {
  try {
    const { result } = await cf(`/accounts/${ACCOUNT_ID}/pages/projects/${ADMIN_PAGES}/domains`, {
      method: "POST",
      body: { name: hostname, zone_tag: zoneId },
    });
    return { hostname, status: result.status ?? "attached" };
  } catch (err) {
    const msg = String(err.message);
    if (msg.includes("already") || msg.includes("duplicate")) {
      return { hostname, status: "exists" };
    }
    throw err;
  }
}

async function verifyUrl(url) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(15000) });
    return { url, code: res.status, ok: res.ok };
  } catch {
    return { url, code: 0, ok: false };
  }
}

function printDomaindiscoverRecords() {
  console.log("\n--- DNS at domaindiscover.com (veyvio.com) ---\n");
  console.log("These work WITHOUT moving nameservers:\n");
  console.log("  Type   Host      Target");
  console.log("  CNAME  command   veyvio-admin.pages.dev");
  console.log("\nFor the marketing site on veyvio.com, add the zone to Cloudflare first:");
  console.log("  1. https://dash.cloudflare.com → Add site → veyvio.com → Free plan");
  console.log("  2. Replace nameservers at domaindiscover with the two Cloudflare nameservers shown");
  console.log("  3. Re-run: node scripts/setup-veyvio-domains.mjs");
  console.log("\nCloudflare will then auto-create DNS for veyvio.com + www → veyvio-website Worker.\n");
}

async function setupZone(zone) {
  console.log(`\n=== ${zone.name} (zone ${zone.id}) ===\n`);
  const hosts = [zone.name, `www.${zone.name}`];
  const commandHost = `command.${zone.name}`;

  if (!VERIFY_ONLY) {
    for (const host of hosts) {
      const r = await attachWorkerDomain(host, zone.id);
      console.log(`  Website  ${host}: ${r.status}`);
    }
    const r = await attachPagesDomain(commandHost, zone.id);
    console.log(`  Command  ${commandHost}: ${r.status}`);
  }

  const checks = [
    `https://${zone.name}/`,
    `https://www.${zone.name}/`,
    `https://${commandHost}/login`,
  ];
  console.log("\n  Verification:");
  for (const check of checks) {
    const v = await verifyUrl(check);
    const label = v.ok ? "OK" : "pending";
    console.log(`    [${label}] ${v.code || "—"} ${check}`);
  }
}

async function main() {
  console.log("Veyvio domain setup\n");

  const comZone = await findZone("veyvio.com");
  const coUkZone = await findZone("veyvio.co.uk");

  if (coUkZone) await setupZone(coUkZone);
  if (comZone) {
    await setupZone(comZone);
  } else {
    printDomaindiscoverRecords();
  }

  if (!comZone && !coUkZone) {
    console.error("No active Cloudflare zones found for veyvio.com or veyvio.co.uk.");
    process.exit(1);
  }

  console.log("\nWorkers.dev fallback: https://veyvio-website.larixai-veyvio.workers.dev");
  console.log("Command fallback:     https://veyvio-admin.pages.dev/login\n");
}

main().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});
