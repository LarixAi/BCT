/**
 * Gate 2 — fuel refill / purchase records.
 */
import { type RequestContext } from './supabase.ts'
import { companyScopedServiceDb } from './db-authority.ts'
import { apiError, json, readJson, toCamelCase } from './http.ts'
import { emitDomainEvent } from './domain-events.ts'
import { writeImmutableAudit } from './audit-service.ts'

export async function recordFuelRefill(context: RequestContext, request: Request) {
  const input = await readJson<{
    vehicleId?: string
    litres?: number
    odometer?: number
    fuelType?: string
    notes?: string
    clientId?: string
    driverId?: string
  }>(request)

  const db = companyScopedServiceDb(context, 'fuel_records')

  const vehicleId = String(input.vehicleId ?? '')
  if (!vehicleId) return apiError(400, 'vehicleId is required', 'invalid_input')

  const { data: vehicle } = await db
    .from('vehicles')
    .select('id, depot_id')
    .eq('company_id', context.companyId)
    .eq('id', vehicleId)
    .maybeSingle()
  if (!vehicle) return apiError(404, 'Vehicle not found', 'not_found')

  if (input.clientId) {
    const { data: existing } = await db
      .from('fuel_records')
      .select('*')
      .eq('company_id', context.companyId)
      .eq('client_id', input.clientId)
      .maybeSingle()
    if (existing) return json(toCamelCase(existing))
  }

  const { data, error } = await db
    .from('fuel_records')
    .insert({
      company_id: context.companyId,
      vehicle_id: vehicleId,
      driver_id: input.driverId ?? null,
      depot_id: vehicle.depot_id ?? null,
      litres: input.litres ?? null,
      odometer: input.odometer ?? null,
      fuel_type: input.fuelType ?? 'diesel',
      notes: input.notes ?? null,
      client_id: input.clientId ?? null,
      created_by: context.user.id,
    })
    .select('*')
    .single()

  if (error || !data) return apiError(500, error?.message ?? 'Fuel refill could not be recorded')

  // Also mirror into vehicle_reports timeline spine as fuel_purchase.
  await db.from('vehicle_reports').insert({
    company_id: context.companyId,
    depot_id: vehicle.depot_id ?? null,
    vehicle_id: vehicleId,
    reference: `FUEL-${String(data.id).slice(0, 8).toUpperCase()}`,
    report_type: 'other',
    report_category: 'fuel_purchase',
    severity: 'observation',
    stage: 'closed',
    status: 'closed',
    title: 'Fuel refill',
    description: input.notes ?? `Fuel refill${input.litres != null ? ` — ${input.litres} L` : ''}`,
    reported_by: context.user.email ?? 'driver',
    reported_by_role: 'driver',
    mileage: input.odometer ?? null,
    closed_at: new Date().toISOString(),
    created_by: context.user.id,
    updated_by: context.user.id,
  }).catch(() => undefined)

  await writeImmutableAudit({
    companyId: context.companyId,
    actorUserId: context.user.id,
    action: 'fuel.refill',
    entityType: 'vehicle',
    entityId: vehicleId,
    afterSnapshot: { fuelRecordId: data.id, litres: input.litres },
  }).catch(() => undefined)

  await emitDomainEvent({
    companyId: context.companyId,
    eventType: 'fuel.refill',
    entityType: 'vehicle',
    entityId: vehicleId,
    actorUserId: context.user.id,
    payload: { fuelRecordId: data.id, litres: input.litres },
  }).catch(() => undefined)

  return json(toCamelCase(data), 201)
}

export async function listFuelRecords(context: RequestContext, request: Request) {
  const db = companyScopedServiceDb(context, 'fuel_records')
  const url = new URL(request.url)
  const vehicleId = url.searchParams.get('vehicleId')
  let query = db
    .from('fuel_records')
    .select('*')
    .eq('company_id', context.companyId)
    .order('recorded_at', { ascending: false })
    .limit(50)
  if (vehicleId) query = query.eq('vehicle_id', vehicleId)
  const { data, error } = await query
  if (error) return apiError(500, error.message)
  return json((data ?? []).map((row) => toCamelCase(row)))
}
