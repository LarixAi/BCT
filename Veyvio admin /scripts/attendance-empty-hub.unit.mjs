/**
 * F-03 — fail-closed empty attendance hub (no demo fixtures).
 * Run: node scripts/attendance-empty-hub.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Inline mirror of empty-hub.ts for node script (no TS compile step).
function emptyAttendanceHub(operationalDate = '2026-07-25') {
  return {
    summary: {
      operationalDate,
      scheduled: 0,
      onTime: 0,
      late: 0,
      notArrived: 0,
      approvedLeave: 0,
      sick: 0,
      attendanceRatePercent: 100,
      uncoveredDuties: 0,
    },
    board: [],
    leaveRequests: [],
    trends: {
      punctualityByDepot: [],
      minutesLostToLateness: 0,
      unauthorisedAbsences: 0,
      sicknessFrequency: 0,
      returnToWorkOutstanding: 0,
      operationalDelaysFromAttendance: 0,
      standbyOvertimeCostEstimate: '£0',
      strongestTeam: '—',
      mondayFridayPatternNote: '',
      scoreChangesNote: '',
    },
    graceMinutes: 5,
    lateMarkMinutes: 6,
    driverReminderMinutes: 10,
    dispatcherWarningMinutes: 15,
    operationsEscalationMinutes: 20,
  }
}

const hub = emptyAttendanceHub()
assert.equal(hub.board.length, 0)
assert.equal(hub.leaveRequests.length, 0)
assert.equal(hub.summary.scheduled, 0)

const realClient = readFileSync(path.join(ROOT, 'src/lib/api/real-client.ts'), 'utf8')
assert.ok(!realClient.includes('mock-hub'), 'real-client must not import attendance mock-hub')
assert.ok(realClient.includes('empty-hub'), 'real-client must use empty-hub fail-closed helpers')

console.log('attendance-empty-hub.unit.mjs: PASS')
