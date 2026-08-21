#!/usr/bin/env node
/**
 * Add Resend DNS records to Cloudflare for veyvio.co.uk
 *
 * Your Resend API key is "Sending access" only — it cannot list domains.
 * Get DNS values from Resend → Domains → veyvio.co.uk → DNS Records,
 * save as resend-dns.json (see resend-dns.example.json), then:
 *
 *   node scripts/setup-resend-dns.mjs
 *
 * Optional: RESEND_API_KEY with Full access can auto-fetch records:
 *   RESEND_API_KEY=re_full_... node scripts/setup-resend-dns.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ZONE_ID = "6e2010ae6985186ccd550a589828eeed";
const DOMAIN = "veyvio.co.uk";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function getOAuthToken() {
  const configPath = join(homedir(), "Library/Preferences/.wrangler/config/default.toml");
  const config = readFileSync(configPath, "utf8");
  const match = config.match(/oauth_token\s*=\s*"([^"]+)"/);
  if (!match) throw new Error("Run `npx wrangler login` first.");
  return match[1];
}

async function cf(path, { method = "GET", body } = {}) {
  const token = process.env.CLOUDFLARE_API_TOKEN ?? getOAuthToken();
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { data, ok: data.success, status: res.status };
}

async function fetchResendRecords(apiKey) {
  const list = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const listData = await list.json();
  if (!list.ok) {
    throw new Error(listData.message ?? "Resend domains list failed — use Full access API key or resend-dns.json");
  }
  const domain = listData.data?.find((d) => d.name === DOMAIN);
  if (!domain) throw new Error(`Domain ${DOMAIN} not found in Resend — add it in the dashboard first.`);
  const detail = await fetch(`https://api.resend.com/domains/${domain.id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const detailData = await detail.json();
  if (!detail.ok) throw new Error(detailData.message ?? "Resend domain fetch failed");
  return detailData.records ?? [];
}

function loadRecordsFromFile() {
  const path = join(root, "resend-dns.json");
  if (!existsSync(path)) return null;
  const records = JSON.parse(readFileSync(path, "utf8"));
  return Array.isArray(records) ? records : records.records;
}

function fqdn(name) {
  if (!name || name === "@") return DOMAIN;
  if (name.endsWith(`.${DOMAIN}`)) return name;
  return `${name}.${DOMAIN}`;
}

async function listExisting() {
  const { data, ok } = await cf(`/zones/${ZONE_ID}/dns_records?per_page=100`);
  if (!ok) return null;
  return data.result ?? [];
}

async function createRecord(record) {
  const name = fqdn(record.name);
  const payload = {
    type: record.type,
    name,
    content: record.value,
    ttl: 1,
    proxied: false,
  };
  if (record.type === "MX" && record.priority != null) {
    payload.priority = record.priority;
  }
  const { data, ok, status } = await cf(`/zones/${ZONE_ID}/dns_records`, {
    method: "POST",
    body: payload,
  });
  if (!ok) {
    const msg = data.errors?.map((e) => e.message).join("; ") ?? `HTTP ${status}`;
    if (msg.includes("already exists") || msg.includes("Record already exists")) {
      return { name, status: "exists" };
    }
    throw new Error(`${name} (${record.type}): ${msg}`);
  }
  return { name, status: "created", id: data.result?.id };
}

async function verifyResend(apiKey) {
  const list = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const listData = await list.json();
  const domain = listData.data?.find((d) => d.name === DOMAIN);
  if (!domain) return;
  await fetch(`https://api.resend.com/domains/${domain.id}/verify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

async function main() {
  console.log(`\nResend DNS setup for ${DOMAIN}\n`);

  let records = loadRecordsFromFile();
  const resendKey =
    process.env.RESEND_API_KEY ??
    (existsSync(join(root, "veyvio-website/.env.integrations"))
      ? readFileSync(join(root, "veyvio-website/.env.integrations"), "utf8")
          .match(/RESEND_API_KEY=(.+)/)?.[1]
          ?.trim()
      : undefined);

  if (!records && resendKey) {
    try {
      console.log("Fetching DNS records from Resend API…");
      records = await fetchResendRecords(resendKey);
    } catch (err) {
      console.warn(String(err.message));
      console.warn("\nCreate resend-dns.json from the Resend dashboard (see resend-dns.example.json)\n");
    }
  }

  if (!records?.length) {
    console.error("No DNS records found.");
    console.error("1. Resend → Domains → veyvio.co.uk → copy DNS records");
    console.error("2. Save as resend-dns.json in repo root");
    console.error("3. Re-run: node scripts/setup-resend-dns.mjs");
    console.error("\nOr create a Full access Resend API key and set RESEND_API_KEY.\n");
    process.exit(1);
  }

  const existing = await listExisting();
  if (!existing) {
    console.error("Cloudflare DNS API unavailable with current token.");
    console.error("Add these records manually in Cloudflare → veyvio.co.uk → DNS:\n");
    for (const r of records) {
      console.log(`  ${r.type}  ${fqdn(r.name)}  →  ${r.value}${r.priority ? ` (priority ${r.priority})` : ""}`);
    }
    process.exit(1);
  }

  for (const record of records) {
    if (record.record === "Tracking" || record.type === "CNAME" && record.name?.includes("links")) {
      console.log(`  skip ${record.name} (tracking — optional)`);
      continue;
    }
    const result = await createRecord(record);
    console.log(`  ${result.status}: ${result.name} (${record.type})`);
  }

  if (resendKey) {
    try {
      await verifyResend(resendKey);
      console.log("\nTriggered Resend domain verification. Check Resend dashboard in 2–5 minutes.\n");
    } catch {
      console.log("\nClick Verify in Resend dashboard after DNS propagates.\n");
    }
  } else {
    console.log("\nClick Verify in Resend → Domains → veyvio.co.uk\n");
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
