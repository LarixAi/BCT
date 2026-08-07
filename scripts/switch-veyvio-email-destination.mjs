#!/usr/bin/env node
/**
 * Switch all veyvio.co.uk email forwarding rules to veyvio@outlook.com.
 * Requires: destination verified in Cloudflare Email Routing first.
 *
 * Usage: node scripts/switch-veyvio-email-destination.mjs
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ACCOUNT_ID = "c126f180cddd8b67777f107833bb992f";
const ZONE_ID = "6e2010ae6985186ccd550a589828eeed";
const NEW_DEST = "veyvio@outlook.com";
const OLD_DEST = "adataintelligence@gmail.com";

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

async function main() {
  const { result: addresses } = await cf(`/accounts/${ACCOUNT_ID}/email/routing/addresses`);
  const dest = addresses.find((a) => a.email === NEW_DEST);
  if (!dest?.verified) {
    console.error(`\n${NEW_DEST} is not verified yet.`);
    console.error("1. Check Outlook inbox and junk for Cloudflare verification email");
    console.error("2. Click Verify email address");
    console.error("3. Re-run: node scripts/switch-veyvio-email-destination.mjs\n");
    process.exit(1);
  }

  const { result: rules } = await cf(`/zones/${ZONE_ID}/email/routing/rules`);
  const forwardRules = rules.filter((r) => r.actions?.[0]?.type === "forward");

  let updated = 0;
  for (const rule of forwardRules) {
    const matcher = rule.matchers?.[0];
    if (!matcher?.value) continue;
    if (rule.actions[0].value?.[0] === NEW_DEST) {
      console.log(`  skip ${matcher.value} (already ${NEW_DEST})`);
      continue;
    }
    await cf(`/zones/${ZONE_ID}/email/routing/rules/${rule.id}`, {
      method: "PUT",
      body: {
        name: rule.name,
        enabled: true,
        matchers: rule.matchers,
        actions: [{ type: "forward", value: [NEW_DEST] }],
      },
    });
    console.log(`  updated ${matcher.value} -> ${NEW_DEST}`);
    updated++;
  }

  console.log(`\nDone. ${updated} rule(s) now forward to ${NEW_DEST}.`);
  if (updated > 0) {
    console.log(`Old destination ${OLD_DEST} can be removed in Cloudflare → Email Routing → Destination addresses.\n`);
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
