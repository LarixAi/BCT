#!/usr/bin/env node
/**
 * Wave 3F-E CI gate — fresh DB + storage JWT isolation (separate from FIX-P1-048).
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ADMIN_ROOT = path.resolve(__dirname, '..')
const CONFIG_PATH = path.join(ADMIN_ROOT, 'supabase/config.toml')
const EVIDENCE_DIR = path.resolve(ADMIN_ROOT, '../docs/plan/evidence')

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: ADMIN_ROOT, ...opts })
}

function patchConfigRemoveCostControl() {
  const original = fs.readFileSync(CONFIG_PATH, 'utf8')
  const patched = original
    .replace(
      /schemas = \["public", "graphql_public", "cost_control"\]/,
      'schemas = ["public", "graphql_public"]',
    )
    .replace(
      /extra_search_path = \["public", "extensions", "cost_control"\]/,
      'extra_search_path = ["public", "extensions"]',
    )
  fs.writeFileSync(CONFIG_PATH, patched)
  return original
}

async function main() {
  const env = { ...process.env, VYVIO_3FE_OUT: EVIDENCE_DIR }
  let restoredConfig = null
  try {
    restoredConfig = patchConfigRemoveCostControl()
    run('supabase start')
    run('supabase db reset')
  } finally {
    if (restoredConfig) fs.writeFileSync(CONFIG_PATH, restoredConfig)
  }
  run('supabase stop')
  run('supabase start')
  run('node scripts/wave3f-storage-isolation.unit.mjs', { env })
  console.log('\nWave 3F-E storage isolation gate: PASS')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
