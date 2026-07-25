/**
 * Unit checks for defect ↔ damage-case linking rules (no network).
 */
import assert from 'node:assert/strict'

function mapDefectSeverityToDamageSeverity(severity) {
  const normalized = String(severity ?? 'major').toLowerCase()
  if (normalized === 'critical' || normalized === 'dangerous') return 'critical'
  if (normalized === 'minor' || normalized === 'attention') return 'minor_operational'
  return 'major'
}

function isBodyworkDefectCategory(category) {
  const value = String(category ?? '').toLowerCase()
  return value === 'bodywork' || value === 'driver_reported'
}

assert.equal(mapDefectSeverityToDamageSeverity('critical'), 'critical')
assert.equal(mapDefectSeverityToDamageSeverity('attention'), 'minor_operational')
assert.equal(mapDefectSeverityToDamageSeverity('major'), 'major')
assert.equal(isBodyworkDefectCategory('bodywork'), true)
assert.equal(isBodyworkDefectCategory('driver_reported'), true)
assert.equal(isBodyworkDefectCategory('mechanical'), false)

console.log('defect-damage-link.unit: ok')
