/**
 * Fail closed when a production-marked Executive build embeds demo mode or
 * server credentials in generated Worker configuration.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRANGLER_CANDIDATES = [
  path.join(PROJECT_ROOT, "dist/server/wrangler.json"),
  path.join(PROJECT_ROOT, "dist/wrangler.json"),
];

function isProductionMarked() {
  return (
    process.env.VEYVIO_EXECUTIVE_PRODUCTION_BUILD === "1" ||
    process.env.CI === "true" ||
    process.env.GITHUB_ACTIONS === "true"
  );
}

async function main() {
  const findings = [];
  for (const candidate of WRANGLER_CANDIDATES) {
    try {
      const raw = await fs.readFile(candidate, "utf8");
      const relative = path.relative(PROJECT_ROOT, candidate);
      if (/VEYVIO_EXECUTIVE_SESSION_SECRET|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/u.test(raw)) {
        findings.push(`${relative}: server secret material present in generated Worker config`);
      }
      if (/VEYVIO_COMMAND_ANON_KEY|VEYVIO_COMMAND_PUBLISHABLE_KEY/u.test(raw)) {
        findings.push(`${relative}: Command public key embedded in generated Worker config`);
      }

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
      const vars = parsed?.vars ?? {};
      if (String(vars.VEYVIO_EXECUTIVE_LOCAL_DEMO ?? "") === "1" && isProductionMarked()) {
        findings.push(
          `${relative}: VEYVIO_EXECUTIVE_LOCAL_DEMO must be 0 for production/CI builds`,
        );
      }
    } catch {
      // Candidate may not exist for every build layout.
    }
  }

  if (findings.length) {
    console.error("Production build assertion failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exitCode = 1;
    return;
  }

  console.log("Production build assertion passed");
}

await main();
