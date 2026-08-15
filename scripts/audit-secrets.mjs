#!/usr/bin/env node
/**
 * Blueprint F-04 — scan tracked source for committed secrets and unsafe env files.
 * Does not print matched secret values.
 */
import { execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("..", import.meta.url).pathname;

const TRACKED_ENV_DENY = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.production.local",
  ".env.staging",
];

const SKIP_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".svg",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".pdf",
  ".zip",
  ".apk",
  ".jar",
  ".bin",
  ".docx",
  ".mp4",
  ".webm",
]);

const SKIP_PATH_PARTS = [
  "/node_modules/",
  "/dist/",
  "/.output/",
  "/android/app/build/",
  "/playwright-report/",
  "/test-results/",
  "/coverage/",
  "/package-lock.json",
  "/pnpm-lock.yaml",
  "/yarn.lock",
];

const ALLOWLIST_PATH_PARTS = [
  "/.env.example",
  "/scripts/audit-secrets.mjs",
  "/scripts/audit-secrets.unit.mjs",
  "/scripts/set-github-ci-secrets.mjs",
  "/scripts/check-nav-secrets.mjs",
  "/supabase/functions/_shared/supabase.ts",
  "/google-services.json", // Firebase Android client config — package-restricted, not a server secret
];

const SECRET_PATTERNS = [
  { name: "supabase_service_role_jwt", re: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]?eyJ[a-zA-Z0-9_-]{20,}/ },
  { name: "supabase_service_role_literal", re: /service_role['"]?\s*:\s*['"]eyJ[a-zA-Z0-9_-]{20,}/i },
  { name: "stripe_live_key", re: /\bsk_live_[0-9a-zA-Z]{16,}\b/ },
  { name: "aws_access_key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "google_api_key_literal", re: /AIza[0-9A-Za-z_-]{20,}/ },
  { name: "github_pat", re: /\bghp_[0-9a-zA-Z]{20,}\b/ },
  { name: "github_fine_grained_pat", re: /\bgithub_pat_[0-9a-zA-Z_]{20,}\b/ },
];

const PEM_BEGIN = /-----BEGIN ((?:RSA |EC |OPENSSH )?PRIVATE KEY)-----/g;

/**
 * Fail only on plausible PEM material (BEGIN + substantial base64 body).
 * Parser/source markers and dummy ABC fixtures must not trip the scanner.
 */
export function sourceContainsPrivateKeyMaterial(source) {
  const text = String(source ?? "");
  PEM_BEGIN.lastIndex = 0;
  let match;
  while ((match = PEM_BEGIN.exec(text))) {
    const after = text.slice(match.index + match[0].length);
    const endAt = after.search(/-----END /);
    const body = (endAt === -1 ? after.slice(0, 800) : after.slice(0, endAt))
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "");
    const b64 = body.replace(/[^A-Za-z0-9+/=]/g, "");
    if (b64.length >= 64) return true;
  }
  return false;
}

function listTrackedFiles() {
  const out = execSync("git ls-files -z", { cwd: root, encoding: "buffer" });
  return out
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

function shouldScan(file) {
  if (SKIP_PATH_PARTS.some((part) => file.includes(part))) return false;
  if (ALLOWLIST_PATH_PARTS.some((part) => file.endsWith(part) || file.includes(part))) return false;
  const ext = extname(file).toLowerCase();
  if (SKIP_EXTENSIONS.has(ext)) return false;
  return true;
}

function relativePath(file) {
  return file.startsWith(root) ? file.slice(root.length + 1) : file;
}

function runSecretsAudit() {
  const failures = [];

  for (const envFile of TRACKED_ENV_DENY) {
    const tracked = listTrackedFiles().filter((file) => file === envFile || file.endsWith(`/${envFile}`));
    if (tracked.length) {
      failures.push(`Tracked env file must not be committed: ${tracked.join(", ")}`);
    }
  }

  for (const file of listTrackedFiles()) {
    if (!shouldScan(file)) continue;
    const abs = join(root, file);
    let source = "";
    try {
      if (!statSync(abs).isFile()) continue;
      source = readFileSync(abs, "utf8");
    } catch {
      continue;
    }

    for (const pattern of SECRET_PATTERNS) {
      if (pattern.re.test(source)) {
        failures.push(`${relativePath(abs)} matches ${pattern.name}`);
        break;
      }
    }
    if (sourceContainsPrivateKeyMaterial(source)) {
      failures.push(`${relativePath(abs)} matches private_key_block`);
    }
  }

  if (failures.length) {
    console.error("Secrets audit failed:");
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    process.exit(1);
  }

  console.log("Secrets audit passed (tracked files scanned, no committed secrets detected).");
}

const isMain =
  Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) runSecretsAudit();
