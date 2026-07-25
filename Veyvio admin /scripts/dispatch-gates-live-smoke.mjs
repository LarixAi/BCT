#!/usr/bin/env node
/**
 * F-06 live dispatch gate smoke — runs the dispatch/lifecycle checks from tenant-isolation-smoke.
 * Requires hosted Command API with latest seed-isolation + duty lifecycle gates deployed.
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(new URL('.', import.meta.url)))

const result = spawnSync('node', ['scripts/tenant-isolation-smoke.mjs'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})

process.exit(result.status ?? 1)
