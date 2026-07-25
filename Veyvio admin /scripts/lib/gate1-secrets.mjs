import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
export const GATE1_SECRETS_RELATIVE = '.gate1-secrets.local.env'

export function gate1SecretsPath(repoRoot = join(scriptDir, '../../..')) {
  return join(repoRoot, GATE1_SECRETS_RELATIVE)
}

export function parseEnvFile(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

export function loadGate1Secrets(repoRoot) {
  return parseEnvFile(gate1SecretsPath(repoRoot))
}

export function applyGate1SecretsToProcess(repoRoot) {
  const secrets = loadGate1Secrets(repoRoot)
  for (const [key, value] of Object.entries(secrets)) {
    if (value) process.env[key] = value
  }
  return secrets
}

export function writeGate1Secrets(repoRoot, vars, { rotatedAt = new Date().toISOString() } = {}) {
  const path = gate1SecretsPath(repoRoot)
  const lines = [
    '# Gate 1 test credentials — gitignored; do not commit.',
    `# Rotated: ${rotatedAt}`,
    '',
  ]
  for (const [key, value] of Object.entries(vars)) {
    if (!value) continue
    const escaped = String(value).replace(/"/g, '\\"')
    lines.push(`${key}="${escaped}"`)
  }
  lines.push('')
  writeFileSync(path, lines.join('\n'), 'utf8')
  return path
}
