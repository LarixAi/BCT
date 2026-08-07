import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const MAX_TEXT_FILE_BYTES = 5 * 1024 * 1024;

const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".vinext",
  ".wrangler",
  "coverage",
  "node_modules",
  "outputs",
  "work",
]);

function isGitIgnored(relativePath) {
  const result = spawnSync(
    "git",
    ["check-ignore", "-q", "--", relativePath],
    { cwd: PROJECT_ROOT, stdio: "ignore" },
  );
  return result.status === 0;
}

const SECRET_PATTERNS = [
  {
    name: "private key material",
    expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    name: "AWS access key",
    expression: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    name: "GitHub access token",
    expression: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g,
  },
  {
    name: "Slack access token",
    expression: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g,
  },
  {
    name: "Stripe live secret key",
    expression: /\bsk_live_[A-Za-z0-9]{16,}\b/g,
  },
  {
    name: "OpenAI secret key",
    expression: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    name: "Supabase secret key",
    expression: /\bsb_secret_[A-Za-z0-9_-]{16,}\b/g,
  },
  {
    name: "Supabase personal access token",
    expression: /\bsbp_[A-Za-z0-9]{20,}\b/g,
  },
  {
    name: "Google API key",
    expression: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    name: "high-risk credential assignment",
    expression:
      /\b(?:DATABASE_URL|SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|CLIENT_SECRET|API_SECRET|PRIVATE_KEY)\s*[:=]\s*["'][^"'\s]{8,}["']/g,
  },
  {
    name: "Executive session signing secret embedded in generated configuration",
    expression:
      /\bVEYVIO_EXECUTIVE_SESSION_SECRET["']?\s*[:=]\s*["'][^"'\s]{8,}["']/g,
  },
  {
    name: "secret exposed through a public environment variable",
    expression:
      /\b(?:VITE|NEXT_PUBLIC|PUBLIC)_[A-Z0-9_]*(?:SECRET|PRIVATE|SERVICE_ROLE|DATABASE_URL|PASSWORD|CREDENTIAL|ACCESS_TOKEN)[A-Z0-9_]*\b/g,
  },
  {
    name: "Command or Supabase credential embedded in generated configuration",
    expression:
      /\b(?:VEYVIO_COMMAND_ANON_KEY|VEYVIO_COMMAND_PUBLISHABLE_KEY|VEYVIO_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY)\b["']?\s*[:=]\s*["'][^"'\s]{8,}["']/g,
  },
];

const JWT_PATTERN =
  /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(padded), (character) => character.charCodeAt(0)),
      ),
    );
  } catch {
    return null;
  }
}

function isBrowserBundlePath(relativePath) {
  const normalised = relativePath.replaceAll("\\", "/");
  return (
    normalised.includes("dist/client/") ||
    normalised.startsWith("dist/assets/")
  );
}

export function scanBrowserCredentialLeak(relativePath, content) {
  const findings = [];
  if (!isBrowserBundlePath(relativePath)) return findings;

  JWT_PATTERN.lastIndex = 0;
  for (const match of content.matchAll(JWT_PATTERN)) {
    const payload = decodeJwtPayload(match[0]);
    const role = String(payload?.role ?? "");
    const prefix = content.slice(0, match.index);
    const line = prefix.split("\n").length;
    if (role === "service_role" || role === "supabase_admin") {
      findings.push({
        file: relativePath,
        line,
        rule: "service-role JWT leaked into browser bundle",
        preview: maskMatch(match[0]),
      });
      continue;
    }
    findings.push({
      file: relativePath,
      line,
      rule: "identity JWT leaked into browser bundle",
      preview: maskMatch(match[0]),
    });
  }

  if (/\bsb_secret_[A-Za-z0-9_-]{8,}\b/u.test(content)) {
    findings.push({
      file: relativePath,
      line: 1,
      rule: "Supabase secret key leaked into browser bundle",
      preview: "[redacted]",
    });
  }

  return findings;
}

const FORBIDDEN_CREDENTIAL_EXTENSIONS = new Set([
  ".key",
  ".p12",
  ".pfx",
  ".pem",
]);

function maskMatch(value) {
  if (value.length <= 10) return "[redacted]";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function scanText(relativePath, content) {
  const findings = [];

  for (const pattern of SECRET_PATTERNS) {
    pattern.expression.lastIndex = 0;
    for (const match of content.matchAll(pattern.expression)) {
      const prefix = content.slice(0, match.index);
      const line = prefix.split("\n").length;
      findings.push({
        file: relativePath,
        line,
        rule: pattern.name,
        preview: maskMatch(match[0]),
      });
    }
  }

  findings.push(...scanBrowserCredentialLeak(relativePath, content));
  return findings;
}

function isForbiddenCredentialFile(relativePath) {
  const basename = path.basename(relativePath);
  // Local gitignored env files are expected on developer machines; only
  // committed credential files fail the scan (rule text: "committed").
  // Checked-in *.example templates are allowed.
  if (basename.startsWith(".env")) {
    if (basename.endsWith(".example")) return false;
    return !isGitIgnored(relativePath);
  }
  return FORBIDDEN_CREDENTIAL_EXTENSIONS.has(path.extname(basename).toLowerCase());
}

async function collectFiles(targetPath) {
  const files = [];
  const stat = await fs.lstat(targetPath);

  if (stat.isSymbolicLink()) return files;
  if (stat.isFile()) return [targetPath];
  if (!stat.isDirectory()) return files;

  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue;
    const entryPath = path.join(targetPath, entry.name);
    files.push(...(await collectFiles(entryPath)));
  }
  return files;
}

async function scanFiles(targets) {
  const findings = [];

  for (const target of targets) {
    const files = await collectFiles(target);
    for (const file of files) {
      const relativePath = path.relative(PROJECT_ROOT, file);

      if (isForbiddenCredentialFile(relativePath)) {
        findings.push({
          file: relativePath,
          line: 1,
          rule: "credential file committed to the application",
          preview: "[filename redacted]",
        });
        continue;
      }

      const stat = await fs.stat(file);
      if (stat.size > MAX_TEXT_FILE_BYTES) continue;

      const buffer = await fs.readFile(file);
      if (buffer.includes(0)) continue;

      findings.push(...scanText(relativePath, buffer.toString("utf8")));
    }
  }

  return findings;
}

function parseTargets(argumentsList) {
  const sourceRequested = argumentsList.includes("--source");
  const buildRequested = argumentsList.includes("--build");
  const useDefaults = !sourceRequested && !buildRequested;
  const targets = [];

  if (sourceRequested || useDefaults) targets.push(PROJECT_ROOT);
  if (buildRequested || useDefaults) targets.push(path.join(PROJECT_ROOT, "dist"));

  return [...new Set(targets)];
}

async function main() {
  const targets = parseTargets(process.argv.slice(2));
  const missingTargets = [];

  for (const target of targets) {
    try {
      await fs.access(target);
    } catch {
      missingTargets.push(path.relative(PROJECT_ROOT, target) || ".");
    }
  }

  if (missingTargets.length > 0) {
    console.error(`Security scan could not find: ${missingTargets.join(", ")}`);
    process.exitCode = 2;
    return;
  }

  const findings = await scanFiles(targets);
  if (findings.length > 0) {
    console.error(`Security scan failed with ${findings.length} finding(s):`);
    for (const finding of findings) {
      console.error(
        `- ${finding.file}:${finding.line} — ${finding.rule} (${finding.preview})`,
      );
    }
    process.exitCode = 1;
    return;
  }

  const labels = targets.map((target) => path.relative(PROJECT_ROOT, target) || ".");
  console.log(`Security scan passed: ${labels.join(", ")}`);
}

const invokedDirectly =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  await main();
}
