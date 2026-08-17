#!/usr/bin/env node
/**
 * Wave 3F / FIX-P1-012 — static gate: bare service-role `admin` imports must be allowlisted.
 *
 * Run: node scripts/service-role-allowlist.unit.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SERVICE_ROLE_ADMIN_ALLOWLIST } from './service-role-admin-allowlist.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const adminRoot = path.resolve(__dirname, '..')
const functionsRoot = path.join(adminRoot, 'supabase/functions')

const ADMIN_IMPORT_RE =
  /import\s*\{[^}]*\badmin\b[^}]*\}\s*from\s*['"][^'"]*supabase[^'"]*['"]/
const LOCAL_SERVICE_ROLE_CLIENT_RE =
  /createClient\s*\([^)]*SUPABASE_SERVICE_ROLE_KEY|createClient\s*\([^)]*serviceRoleKey/

const VALID_CLASSES = new Set([
  'authority_core',
  'privileged',
  'company_scoped_service_role',
])

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(full, out)
    else if (/\.(ts|js|mjs)$/.test(ent.name)) out.push(full)
  }
  return out
}

function relPosix(abs) {
  return path.relative(adminRoot, abs).split(path.sep).join('/')
}

function usesServiceRoleClient(rel, text) {
  if (rel === 'supabase/functions/_shared/supabase.ts') return true
  if (ADMIN_IMPORT_RE.test(text)) return true
  if (LOCAL_SERVICE_ROLE_CLIENT_RE.test(text)) return true
  return false
}

const files = walk(functionsRoot)
const importers = []
for (const abs of files) {
  const text = fs.readFileSync(abs, 'utf8')
  const rel = relPosix(abs)
  if (usesServiceRoleClient(rel, text)) importers.push(rel)
}

const allowlistPaths = Object.keys(SERVICE_ROLE_ADMIN_ALLOWLIST)
const unknownClass = allowlistPaths.filter(
  (p) => !VALID_CLASSES.has(SERVICE_ROLE_ADMIN_ALLOWLIST[p]),
)
const missingFromDisk = allowlistPaths.filter(
  (p) => !fs.existsSync(path.join(adminRoot, p)),
)
const unlisted = importers.filter((p) => !(p in SERVICE_ROLE_ADMIN_ALLOWLIST))
const stale = allowlistPaths.filter((p) => !importers.includes(p))

let failed = false
function fail(msg) {
  failed = true
  console.error(`FAIL: ${msg}`)
}

if (unknownClass.length) {
  fail(`allowlist entries with invalid class: ${unknownClass.join(', ')}`)
}
if (missingFromDisk.length) {
  fail(`allowlist paths missing on disk: ${missingFromDisk.join(', ')}`)
}
if (unlisted.length) {
  fail(
    `new service-role admin imports not in allowlist (add with justification or use tenant-db):\n  - ${unlisted.join('\n  - ')}`,
  )
}
if (stale.length) {
  fail(
    `allowlist stale (file no longer imports admin — remove entry):\n  - ${stale.join('\n  - ')}`,
  )
}

if (failed) {
  console.error(
    `\nWave 3F gate: ${importers.length} admin importers; allowlist ${allowlistPaths.length}.`,
  )
  process.exit(1)
}

const byClass = {}
for (const p of allowlistPaths) {
  const c = SERVICE_ROLE_ADMIN_ALLOWLIST[p]
  byClass[c] = (byClass[c] || 0) + 1
}
console.log(
  `service-role-allowlist.unit.mjs: ok (${importers.length} importers; ${JSON.stringify(byClass)})`,
)
