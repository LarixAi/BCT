import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

function loadEnvFileIntoProcess(envPath) {
  if (!existsSync(envPath)) return false
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
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
    if (!process.env[key]) process.env[key] = value
  }
  return true
}

/** Load `Veyvio admin /.env` and `.gate1-secrets.local.env` when keys are unset. */
export function loadAdminEnv(repoRoot = dirname(fileURLToPath(new URL('.', import.meta.url)))) {
  const adminLoaded = loadEnvFileIntoProcess(join(repoRoot, 'Veyvio admin ', '.env'))
  const secretsLoaded = loadEnvFileIntoProcess(join(repoRoot, '.gate1-secrets.local.env'))
  return adminLoaded || secretsLoaded
}
