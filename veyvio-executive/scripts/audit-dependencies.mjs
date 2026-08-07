/**
 * Dependency vulnerability scan wrapper for Executive CI and local checks.
 * Critical findings always fail. High findings fail unless they are on the
 * documented temporary allowlist awaiting a stable Next.js release outside the
 * current advisory range.
 */
import { spawnSync } from "node:child_process";

/** Temporary until a stable Next.js release clears GHSA ranges covering 16.2.x. */
const ALLOWED_HIGH_PACKAGES = new Map([
  [
    "next",
    "Pinned to latest stable 16.2.12; advisory range still includes 16.2.x until 16.3 stable.",
  ],
  [
    "postcss",
    "Transitive via next@16.2.12; cleared when Next ships a stable fix outside the advisory range.",
  ],
  [
    "sharp",
    "Transitive via next@16.2.12 image pipeline; cleared with the Next stable bump.",
  ],
]);

const result = spawnSync(
  "npm",
  ["audit", "--omit=dev", "--json"],
  { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
);

let report;
try {
  report = JSON.parse(result.stdout || "{}");
} catch {
  console.error("npm audit did not return JSON");
  console.error(result.stderr || result.stdout);
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities ?? {};
const metadata = report.metadata?.vulnerabilities ?? {};
const high = Number(metadata.high ?? 0);
const critical = Number(metadata.critical ?? 0);

const unexpectedHigh = [];
for (const [name, detail] of Object.entries(vulnerabilities)) {
  const severity = String(detail.severity ?? "");
  if (severity === "critical") {
    unexpectedHigh.push(`${name} (critical)`);
    continue;
  }
  if (severity === "high" && !ALLOWED_HIGH_PACKAGES.has(name)) {
    unexpectedHigh.push(`${name} (high)`);
  }
}

if (critical > 0 || unexpectedHigh.length > 0) {
  console.error(
    `Dependency audit failed: high=${high} critical=${critical}. Unexpected: ${unexpectedHigh.join(", ") || "none"}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `Dependency audit passed with documented residuals (high=${high}, critical=${critical}).`,
  );
  for (const [name, reason] of ALLOWED_HIGH_PACKAGES) {
    if (vulnerabilities[name]) {
      console.log(`- allowlisted high: ${name} — ${reason}`);
    }
  }
}
