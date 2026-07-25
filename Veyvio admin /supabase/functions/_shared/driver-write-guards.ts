/**
 * Driver write-path guards (Blueprint F-12) — tenant + assignment boundaries.
 */
import { projectPublishedDutiesForDriver } from './duty-publication.ts'
import { HttpError } from './http.ts'
import { admin } from './supabase.ts'

type Row = Record<string, unknown>

export function assertRequestCompanyId(bodyCompanyId: unknown, contextCompanyId: string): void {
  const raw = String(bodyCompanyId ?? '').trim()
  if (raw && raw !== contextCompanyId) {
    throw new HttpError(403, 'Company mismatch — sign in to the correct operator', 'company_mismatch')
  }
}

export async function resolveDriverAssignedVehicleIds(input: {
  companyId: string
  driverId: string
  depotId?: string | null
}): Promise<Set<string>> {
  const duties = await projectPublishedDutiesForDriver({
    companyId: input.companyId,
    driverId: input.driverId,
    depotId: String(input.depotId ?? ''),
  }).catch(() => [] as Row[])

  const ids = new Set<string>()
  for (const duty of duties) {
    const vehicle = duty.vehicle as Row | undefined
    if (vehicle?.id) ids.add(String(vehicle.id))
  }
  return ids
}

export async function assertDriverAssignedVehicle(input: {
  companyId: string
  driverId: string
  vehicleId: string
  depotId?: string | null
}): Promise<void> {
  const allowed = await resolveDriverAssignedVehicleIds(input)
  if (!allowed.has(input.vehicleId)) {
    throw new HttpError(
      403,
      'That vehicle is not assigned to you on a published duty',
      'vehicle_not_assigned',
    )
  }
}

export async function assertDriverAssignedDuty(input: {
  companyId: string
  driverId: string
  dutyId: string
  depotId?: string | null
}): Promise<void> {
  const duties = await projectPublishedDutiesForDriver({
    companyId: input.companyId,
    driverId: input.driverId,
    depotId: String(input.depotId ?? ''),
  }).catch(() => [] as Row[])

  if (!duties.some((duty) => String(duty.id) === input.dutyId)) {
    throw new HttpError(403, 'That duty is not assigned to you', 'duty_not_assigned')
  }
}

/** Company id in body (when present) plus optional assigned duty / vehicle checks. */
export async function guardDriverScopedWrite(input: {
  companyId: string
  driverId: string
  body?: Row | null
  vehicleId?: string | null
  dutyId?: string | null
  depotId?: string | null
}): Promise<void> {
  if (input.body) {
    assertRequestCompanyId(input.body.companyId ?? input.body.company_id, input.companyId)
  }
  const dutyId = input.dutyId ? String(input.dutyId).trim() : ''
  const vehicleId = input.vehicleId ? String(input.vehicleId).trim() : ''
  if (dutyId) {
    await assertDriverAssignedDuty({
      companyId: input.companyId,
      driverId: input.driverId,
      dutyId,
      depotId: input.depotId,
    })
  }
  if (vehicleId) {
    await assertDriverAssignedVehicle({
      companyId: input.companyId,
      driverId: input.driverId,
      vehicleId,
      depotId: input.depotId,
    })
  }
}

export async function assertDriverConversation(input: {
  companyId: string
  driverId: string
  conversationId: string
}): Promise<void> {
  const { data } = await admin
    .from('messages')
    .select('id')
    .eq('company_id', input.companyId)
    .eq('driver_id', input.driverId)
    .eq('conversation_id', input.conversationId)
    .limit(1)
    .maybeSingle()

  if (!data?.id) {
    throw new HttpError(404, 'Conversation not found', 'not_found')
  }
}
