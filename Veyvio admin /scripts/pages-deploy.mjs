#!/usr/bin/env node
/**
 * Deploy Command Admin + Pages Functions BFF to production.
 * Temporarily moves a parent-repo Yard wrangler deploy config that conflicts
 * when both projects share a workspace tree.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const adminRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const conflict = path.resolve(adminRoot, '../.wrangler/deploy/config.json')
const backup = `${conflict}.yard-bak`

let moved = false
if (fs.existsSync(conflict)) {
  fs.renameSync(conflict, backup)
  moved = true
}

try {
  const host =
    process.env.EXPECTED_SUPABASE_HOST ||
    process.env.VITE_SUPABASE_URL?.replace(/^https?:\/\//, '').replace(/\/.*$/, '') ||
    ''
  if (!host) {
    console.error('pages-deploy: EXPECTED_SUPABASE_HOST or VITE_SUPABASE_URL required for release assert')
    process.exit(1)
  }
  const assert = spawnSync(
    process.execPath,
    [path.join(adminRoot, 'scripts/assert-release-config.mjs'), '--dist', 'dist', '--expected-supabase-host', host],
    { cwd: adminRoot, stdio: 'inherit' },
  )
  if (assert.status !== 0) process.exit(assert.status ?? 1)

  const result = spawnSync(
    'npx',
    [
      'wrangler',
      'pages',
      'deploy',
      'dist',
      '--project-name=veyvio-admin',
      '--branch',
      'main',
      '--commit-dirty=true',
    ],
    { cwd: adminRoot, stdio: 'inherit', shell: process.platform === 'win32' },
  )
  process.exit(result.status ?? 1)
} finally {
  if (moved && fs.existsSync(backup)) {
    fs.renameSync(backup, conflict)
  }
}
