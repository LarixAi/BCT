#!/usr/bin/env node
/**
 * Yard production build guard (Blueprint F-03 / Gate 1 P0-01).
 * Fails if release-profile env enables demo/mock paths.
 */
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const distDir = join(root, ".output", "public");

const forbiddenEnv = {
  VITE_USE_MOCK_API: "true",
  VITE_DEV_BYPASS_AUTH: "true",
  VITE_USE_MOCK_AUTH: "true",
};

for (const [key, value] of Object.entries(forbiddenEnv)) {
  if (process.env[key] === value) {
    console.error(`Production guard failed: ${key} must not be "${value}" in release builds.`);
    process.exit(1);
  }
}

console.log("Building Yard with production profile…");
if (!process.env.VERIFY_SKIP_BUILD && !process.argv.includes("--skip-build")) {
  execSync("npm run build", {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? "https://example.supabase.co",
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? "ci-anon-key",
    VITE_COMMAND_API_BASE_URL:
      process.env.VITE_COMMAND_API_BASE_URL ?? "https://example.supabase.co/functions/v1/command-api",
    VITE_USE_MOCK_API: "",
    VITE_DEV_BYPASS_AUTH: "",
    VITE_USE_MOCK_AUTH: "",
  },
  });
} else {
  console.log("Skipping build (VERIFY_SKIP_BUILD).");
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

if (!statSync(distDir, { throwIfNoEntry: false })) {
  console.error(`Production guard failed: expected build output at ${distDir}`);
  process.exit(1);
}

const jsFiles = walk(distDir).filter((f) => f.endsWith(".js"));
const forbiddenPatterns = [
  /VITE_USE_MOCK_API["']?\s*===\s*["']true["']/,
  /VITE_DEV_BYPASS_AUTH["']?\s*===\s*["']true["']/,
  /mode:\s*["']dev-stub["']/,
];

for (const file of jsFiles) {
  const source = readFileSync(file, "utf8");
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(source)) {
      console.error(`Production guard failed: ${file} matches ${pattern}`);
      process.exit(1);
    }
  }
}

console.log(`Yard production guard passed (${jsFiles.length} JS chunks scanned).`);
