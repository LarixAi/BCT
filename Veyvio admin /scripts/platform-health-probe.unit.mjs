#!/usr/bin/env node
/**
 * Unit checks for platform-health verdict builder.
 * Run: node scripts/platform-health-probe.unit.mjs
 */
import assert from 'node:assert/strict'
import { buildPlatformHealthVerdict } from './platform-health-probe.mjs'

assert.equal(
  buildPlatformHealthVerdict({
    commandStatus: 200,
    pitrSkipped: false,
    pitrExit: 0,
    gateABackupReady: false,
  }),
  'PLATFORM_HEALTH_OK_BACKUP_NOT_READY',
)
assert.equal(
  buildPlatformHealthVerdict({
    commandStatus: 200,
    pitrSkipped: false,
    pitrExit: 0,
    gateABackupReady: true,
  }),
  'PLATFORM_HEALTH_OK_BACKUP_READY',
)
assert.equal(
  buildPlatformHealthVerdict({
    commandStatus: 200,
    pitrSkipped: true,
    pitrExit: 0,
    gateABackupReady: false,
  }),
  'PLATFORM_HEALTH_OK_PITR_SKIPPED',
)
assert.equal(
  buildPlatformHealthVerdict({
    commandStatus: 503,
    pitrSkipped: true,
    pitrExit: 0,
    gateABackupReady: false,
  }),
  'PLATFORM_HEALTH_DEGRADED',
)
console.log('platform-health-probe.unit.mjs: ok')
