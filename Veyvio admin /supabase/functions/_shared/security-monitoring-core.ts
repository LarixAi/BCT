/**
 * Phase 9 — security event writers and alert evaluation (service role).
 */
import { admin } from './supabase.ts'
import { sanitizeSecurityMetadata } from './security-event-redaction.ts'
import {
  ALERT_THRESHOLDS,
  SECURITY_EVENT_CATALOG,
  isKnownSecurityEventType,
} from './security-monitoring-catalog.ts'

export {
  ALERT_THRESHOLDS,
  SECURITY_EVENT_CATALOG,
  isKnownSecurityEventType,
  securityTriageMatrix,
} from './security-monitoring-catalog.ts'

export async function evaluateSecurityAlertsForCompany(
  companyId: string,
  triggeringEventId?: string,
) {
  const alerts = []
  for (const threshold of Object.values(ALERT_THRESHOLDS)) {
    const since = new Date(
      Date.now() - threshold.windowMinutes * 60_000,
    ).toISOString()
    const { data: events, error } = await admin
      .from('security_events')
      .select('id, event_type, actor_user_id, occurred_at')
      .eq('company_id', companyId)
      .in('event_type', [...threshold.eventTypes])
      .gte('occurred_at', since)
      .order('occurred_at', { ascending: false })
      .limit(200)
    if (error) {
      console.error('security alert evaluation query failed', error)
      continue
    }
    const rows = events ?? []
    if (rows.length < threshold.count) continue

    const { data: existing } = await admin
      .from('security_alerts')
      .select('id')
      .eq('company_id', companyId)
      .eq('alert_code', threshold.code)
      .eq('status', 'open')
      .gte('created_at', since)
      .limit(1)
    if ((existing ?? []).length) continue

    const evidenceIds = rows.slice(0, threshold.count).map((row) => String(row.id))
    if (triggeringEventId && !evidenceIds.includes(triggeringEventId)) {
      evidenceIds.unshift(triggeringEventId)
    }
    const { data: alert, error: alertError } = await admin
      .from('security_alerts')
      .insert({
        company_id: companyId,
        alert_code: threshold.code,
        severity: threshold.severity,
        title: threshold.title,
        summary: `${rows.length} matching events in ${threshold.windowMinutes} minutes (threshold ${threshold.count}).`,
        status: 'open',
        threshold_key: threshold.code,
        evidence_event_ids: evidenceIds.slice(0, 40),
        metadata: sanitizeSecurityMetadata({
          windowMinutes: threshold.windowMinutes,
          thresholdCount: threshold.count,
          observedCount: rows.length,
          eventTypes: threshold.eventTypes,
        }) as Record<string, unknown>,
      })
      .select('id, alert_code, severity, status, created_at')
      .single()
    if (alertError) {
      console.error('security_alerts insert failed', alertError)
      continue
    }
    alerts.push(alert)
  }
  return alerts
}

export async function recordMonitoredSecurityEvent(input: {
  companyId?: string | null
  actorUserId?: string | null
  eventType: string
  message: string
  severity?: 'info' | 'attention' | 'critical'
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown>
  evaluateAlerts?: boolean
}) {
  const catalog = isKnownSecurityEventType(input.eventType)
    ? SECURITY_EVENT_CATALOG[input.eventType]
    : null
  const severity = input.severity ?? catalog?.defaultSeverity ?? 'info'
  const metadata = sanitizeSecurityMetadata(input.metadata ?? {}) as Record<
    string,
    unknown
  >

  const { data, error } = await admin
    .from('security_events')
    .insert({
      company_id: input.companyId ?? null,
      actor_user_id: input.actorUserId ?? null,
      event_type: input.eventType,
      severity,
      message: String(input.message).slice(0, 2_000),
      ip_address: input.ipAddress ? String(input.ipAddress).slice(0, 128) : null,
      user_agent: input.userAgent ? String(input.userAgent).slice(0, 512) : null,
      metadata,
    })
    .select('id, company_id, event_type, severity, occurred_at')
    .single()
  if (error || !data) {
    console.error('security_events insert failed', error)
    return null
  }

  if (input.evaluateAlerts !== false && input.companyId) {
    await evaluateSecurityAlertsForCompany(String(input.companyId), String(data.id))
  }
  return data
}
