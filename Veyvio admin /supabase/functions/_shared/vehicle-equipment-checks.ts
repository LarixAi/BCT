/**
 * Gate 2 — vehicle equipment confirmations (Driver → Command).
 *
 * Wave 3F UserScopedDb/RLS cutover 6: membership JWT writes `vehicle_equipment_checks`
 * through RLS (INSERT + SELECT). Support-grant sessions stay on company-scoped service-role.
 */
import { type RequestContext } from './supabase.ts'
import { companyScopedServiceDb, userScopedDb } from './db-authority.ts'

type Row = Record<string, unknown>

function equipmentChecksDb(context: RequestContext) {
  if (context.workspaceAuthority === 'support') {
    return companyScopedServiceDb(context, 'vehicle_equipment_checks_support_grant')
  }
  return userScopedDb(context, 'vehicle_equipment_checks')
}

export async function recordVehicleEquipmentCheck(
  context: RequestContext,
  input: { vehicleId: string; driverId: string; items: unknown; missingItems: unknown },
): Promise<Row> {
  const db = equipmentChecksDb(context)
  const { data, error } = await db
    .from('vehicle_equipment_checks')
    .insert({
      company_id: context.companyId,
      vehicle_id: input.vehicleId,
      driver_id: input.driverId,
      items: input.items,
      missing_items: input.missingItems,
      created_by: context.user.id,
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Equipment check could not be saved')
  return data as Row
}

export async function listVehicleEquipmentChecks(
  context: RequestContext,
  vehicleId: string,
): Promise<Row[]> {
  const db = equipmentChecksDb(context)
  const { data, error } = await db
    .from('vehicle_equipment_checks')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('vehicle_id', vehicleId)
    .order('checked_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(error.message)
  return (data ?? []) as Row[]
}
