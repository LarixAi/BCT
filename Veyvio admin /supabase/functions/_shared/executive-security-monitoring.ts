/**
 * Phase 9 — Executive AAL2 read APIs for security events and alerts.
 */
import { HttpError } from './http.ts'
import type { RequestContext } from './supabase.ts'
import { admin } from './supabase.ts'
import { validateExecutiveUserSession } from './tenant-auth.ts'
import { decideExecutiveAuthorisation } from './executive-authorisation.ts'
import {
  ALERT_THRESHOLDS,
  SECURITY_EVENT_CATALOG,
  securityTriageMatrix,
} from './security-monitoring-catalog.ts'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function requireExecutiveAuditSession(
  context: RequestContext,
  request: Request,
) {
  const sessionId = request.headers.get('x-veyvio-session-id') ?? ''
  if (!UUID_PATTERN.test(sessionId)) {
    throw new HttpError(
      403,
      'Confirm your Executive session with multi-factor authentication',
      'executive_step_up_required',
    )
  }
  await validateExecutiveUserSession({
    sessionId,
    userId: context.user.id,
    companyId: context.companyId,
    membershipId: context.membershipId,
  })
  const decision = decideExecutiveAuthorisation({
    actorUserId: context.user.id,
    roleKeys: context.roleKeys,
    action: 'executive.audit.read',
    companyId: context.companyId,
    resourceCompanyId: context.companyId,
  })
  if (!decision.allowed) {
    throw new HttpError(403, decision.message, decision.code)
  }
}

export async function listExecutiveSecurityEvents(
  context: RequestContext,
  request: Request,
) {
  await requireExecutiveAuditSession(context, request)
  const { data, error } = await admin
    .from('security_events')
    .select(
      'id, event_type, severity, message, actor_user_id, ip_address, occurred_at, metadata',
    )
    .eq('company_id', context.companyId)
    .order('occurred_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return {
    catalog: SECURITY_EVENT_CATALOG,
    thresholds: ALERT_THRESHOLDS,
    triage: securityTriageMatrix(),
    events: data ?? [],
  }
}

export async function listExecutiveSecurityAlerts(
  context: RequestContext,
  request: Request,
) {
  await requireExecutiveAuditSession(context, request)
  const { data, error } = await admin
    .from('security_alerts')
    .select(
      'id, alert_code, severity, title, summary, status, threshold_key, evidence_event_ids, created_at, acknowledged_at, closed_at',
    )
    .eq('company_id', context.companyId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  return { alerts: data ?? [], thresholds: ALERT_THRESHOLDS, triage: securityTriageMatrix() }
}

export {
  ALERT_THRESHOLDS,
  SECURITY_EVENT_CATALOG,
  evaluateSecurityAlertsForCompany,
  recordMonitoredSecurityEvent,
  securityTriageMatrix,
} from './security-monitoring-core.ts'
