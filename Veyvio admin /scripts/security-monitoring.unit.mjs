/**
 * Phase 9 — security metadata redaction + threshold catalogue invariants.
 * Run: npx tsx "scripts/security-monitoring.unit.mjs"
 */
import assert from 'node:assert/strict'
import { sanitizeSecurityMetadata } from '../supabase/functions/_shared/security-event-redaction.ts'
import {
  ALERT_THRESHOLDS,
  SECURITY_EVENT_CATALOG,
  isKnownSecurityEventType,
  securityTriageMatrix,
} from '../supabase/functions/_shared/security-monitoring-catalog.ts'

const cleaned = sanitizeSecurityMetadata({
  password: 'Sheanda-04!!',
  refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb',
  cookie: 'session=abc',
  recoveryCode: 'ABCD-EFGH',
  documentBody: 'SECRET BOARD MINUTES',
  contentBase64: 'aaaa',
  signedUrl: 'https://example/signed',
  purpose: 'board_pack_review',
  nested: { apiKey: 'sk_live_x', ok: true },
  long: 'x'.repeat(600),
})

assert.equal(cleaned.password, '[redacted]')
assert.equal(cleaned.refresh_token, '[redacted]')
assert.equal(cleaned.cookie, '[redacted]')
assert.equal(cleaned.recoveryCode, '[redacted]')
assert.equal(cleaned.documentBody, '[redacted]')
assert.equal(cleaned.contentBase64, '[redacted]')
assert.equal(cleaned.signedUrl, '[redacted]')
assert.equal(cleaned.purpose, 'board_pack_review')
assert.equal(cleaned.nested.apiKey, '[redacted]')
assert.equal(cleaned.nested.ok, true)
assert.match(String(cleaned.long), /redacted_length=600/)

assert.equal(isKnownSecurityEventType('auth.login_failed'), true)
assert.equal(isKnownSecurityEventType('not.a.real.event'), false)
assert.ok(SECURITY_EVENT_CATALOG['executive.export_fulfilled'].defaultSeverity === 'critical')
assert.ok(ALERT_THRESHOLDS.repeated_login_failures.count === 8)
assert.ok(ALERT_THRESHOLDS.bulk_document_downloads.count === 20)
assert.ok(ALERT_THRESHOLDS.privilege_escalation_burst.count === 3)

const triage = securityTriageMatrix()
assert.equal(triage.severities.length, 3)
assert.equal(triage.severities[0].severity, 'critical')
assert.equal(triage.severities[0].responseMinutes, 30)

console.log('security-monitoring.unit.mjs: ok')
