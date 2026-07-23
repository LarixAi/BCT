import { HttpError } from './http.ts'
import { admin } from './supabase.ts'
import { hasModule, resolvePlatformRole, type EntitlementSnapshot } from './entitlements.ts'

type Row = Record<string, unknown>

type ModuleContext = {
  entitlements?: EntitlementSnapshot | null
}

/** Load a row and ensure it belongs to the active company (IDOR guard). */
export async function assertCompanyScopedRow(
  table: string,
  id: string,
  companyId: string,
  select = 'id, company_id',
): Promise<Row> {
  const { data, error } = await admin.from(table).select(select).eq('id', id).maybeSingle()
  if (error) throw new HttpError(500, error.message, 'database_error')
  if (!data) throw new HttpError(404, 'Record not found', 'not_found')
  if (String((data as Row).company_id ?? '') !== companyId) {
    throw new HttpError(404, 'Record not found', 'not_found')
  }
  return data as Row
}

export async function assertCompanyScopedVehicle(id: string, companyId: string) {
  return assertCompanyScopedRow('vehicles', id, companyId)
}

export async function assertCompanyScopedDriver(id: string, companyId: string) {
  return assertCompanyScopedRow('drivers', id, companyId)
}

export async function assertCompanyScopedDuty(id: string, companyId: string) {
  return assertCompanyScopedRow('duties', id, companyId)
}

export async function assertCompanyScopedDefect(id: string, companyId: string) {
  return assertCompanyScopedRow('defects', id, companyId)
}

export async function assertCompanyScopedDepot(id: string, companyId: string) {
  return assertCompanyScopedRow('depots', id, companyId)
}

export function requireModule(context: ModuleContext, moduleKey: string): void {
  const snapshot = context.entitlements
  if (!snapshot) return
  if (!hasModule(snapshot.enabledModules, moduleKey)) {
    throw new HttpError(
      403,
      `Module "${moduleKey}" is not included in your plan`,
      'module_not_licensed',
    )
  }
}

/** Map API path prefixes → entitlement module. */
export function moduleForApiPath(path: string): string | null {
  const p = path.replace(/^\/+|\/+$/g, '')
  // Driver surface uses /driver/*; keep bootstrap/onboarding reachable for setup UX.
  if (
    p.startsWith('driver/') &&
    !p.startsWith('driver/bootstrap') &&
    !p.startsWith('driver/onboarding') &&
    !p.startsWith('driver/profile') &&
    !p.startsWith('driver/devices')
  ) {
    return 'workforce'
  }
  if (p.startsWith('maintenance') || p.startsWith('fleet-resources')) return 'maintenance'
  if (p.startsWith('yard')) return 'yard'
  if (
    p.startsWith('defects') ||
    p.startsWith('incidents') ||
    p.startsWith('inspections') ||
    p.startsWith('vehicle-checks') ||
    p.startsWith('vehicle-reports') ||
    p.startsWith('checks')
  ) {
    return 'safety'
  }
  if (p.startsWith('compliance')) return 'compliance'
  if (
    p.startsWith('drivers') ||
    p.startsWith('staff') ||
    p.startsWith('attendance') ||
    p.startsWith('time-off')
  ) {
    return 'workforce'
  }
  if (p.startsWith('vehicles') || p.startsWith('depots') || p.startsWith('vor')) return 'fleet'
  if (
    p.startsWith('customers') ||
    p.startsWith('schools') ||
    p.startsWith('contracts') ||
    p.startsWith('pricing') ||
    p.startsWith('passengers')
  ) {
    return 'customers'
  }
  if (
    p.startsWith('bookings') ||
    p.startsWith('dispatch') ||
    p.startsWith('trips') ||
    p.startsWith('runs') ||
    p.startsWith('schedule') ||
    p.startsWith('recurring') ||
    p.startsWith('duties') ||
    p.startsWith('exceptions') ||
    p.startsWith('live-operations') ||
    p === 'dashboard' ||
    p === '' ||
    p === 'overview'
  ) {
    return 'operations'
  }
  if (
    p.startsWith('messages') ||
    p.startsWith('announcements') ||
    p.startsWith('templates') ||
    p.startsWith('communication') ||
    p.startsWith('notifications')
  ) {
    return 'communications'
  }
  if (p.startsWith('reports') || p.startsWith('performance')) return 'reporting'
  if (p.startsWith('integrations')) return 'integrations'
  if (p.startsWith('audit')) return 'audit'
  return null
}

export async function requirePlatformRole(
  userId: string,
  allowed: string[] = ['platform_admin', 'platform_support', 'platform_billing'],
) {
  const role = await resolvePlatformRole(userId)
  if (!role || !allowed.includes(role)) {
    throw new HttpError(403, 'Veyvio platform access required', 'platform_forbidden')
  }
  return role
}

export async function writePlatformAudit(input: {
  actorUserId: string
  action: string
  targetCompanyId?: string | null
  detail?: Row
}) {
  await admin.from('platform_audit_logs').insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    target_company_id: input.targetCompanyId ?? null,
    detail: input.detail ?? {},
  })
}

export { resolvePlatformRole }
