/**
 * Durable tyre inventory — Command write path for fit / remove / rotate (F-18 / TD-027).
 */
import { companyScopedServiceDbForCompany } from './db-authority.ts'
import { writeImmutableAudit } from './audit-service.ts'
import { HttpError } from './http.ts'
import {
  isUuid,
  mapTyreAssetRow,
  normalizeTyreStatus,
  tyreNeedsAttentionMapped,
  type TyreAssetStatus,
} from './tyre-assets.mapping.ts'

type Row = Record<string, unknown>

function tyreDb(companyId: string) {
  return companyScopedServiceDbForCompany(companyId, 'tyre_assets')
}

async function appendEvent(input: {
  companyId: string
  tyreId: string
  eventType: string
  actorUserId?: string | null
  actorName: string
  body?: string | null
  payload?: Record<string, unknown>
}) {
  const { error } = await tyreDb(input.companyId).from('tyre_asset_events').insert({
    company_id: input.companyId,
    tyre_id: input.tyreId,
    event_type: input.eventType,
    actor_user_id: input.actorUserId ?? null,
    actor_name: input.actorName,
    body: input.body ?? null,
    payload: input.payload ?? {},
  })
  if (error) throw new Error(error.message)
}

async function loadTyre(companyId: string, tyreId: string): Promise<Row | null> {
  if (!isUuid(tyreId)) return null
  const { data, error } = await tyreDb(companyId)
    .from('tyre_assets')
    .select('*, vehicles(registration), depots(name)')
    .eq('company_id', companyId)
    .eq('id', tyreId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as Row | null
}

function mapLoaded(row: Row) {
  const vehicle = (row.vehicles as Row | null) ?? null
  const depot = (row.depots as Row | null) ?? null
  return mapTyreAssetRow(row, {
    registrationNumber: vehicle?.registration ? String(vehicle.registration) : null,
    depotName: depot?.name ? String(depot.name) : null,
  })
}

export async function listTyreAssets(companyId: string) {
  const { data, error } = await tyreDb(companyId)
    .from('tyre_assets')
    .select('*, vehicles(registration), depots(name)')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })
    .limit(500)
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapLoaded(row as Row))
}

export async function getTyreAsset(companyId: string, tyreId: string) {
  const row = await loadTyre(companyId, tyreId)
  if (!row) return null
  return mapLoaded(row)
}

export async function createTyreAsset(input: {
  companyId: string
  actorUserId: string
  actorName: string
  internalId: string
  brand: string
  size: string
  dotCode?: string
  status?: string
  depotId?: string | null
  treadDepthMm?: number | null
  pressurePsi?: number | null
  unitCost?: number | null
}) {
  const companyId = input.companyId
  const internalId = String(input.internalId ?? '').trim()
  const brand = String(input.brand ?? '').trim()
  const size = String(input.size ?? '').trim()
  if (!internalId) throw new HttpError(400, 'internalId is required')
  if (!brand) throw new HttpError(400, 'brand is required')
  if (!size) throw new HttpError(400, 'size is required')

  const now = new Date().toISOString()
  const status: TyreAssetStatus = normalizeTyreStatus(input.status ?? 'in_stock')
  const insert: Row = {
    company_id: input.companyId,
    internal_id: internalId,
    brand,
    size,
    dot_code: String(input.dotCode ?? '').trim(),
    status,
    depot_id: input.depotId ? String(input.depotId) : null,
    tread_depth_mm: input.treadDepthMm ?? null,
    pressure_psi: input.pressurePsi ?? null,
    unit_cost: input.unitCost ?? null,
    created_by: input.actorUserId,
    created_at: now,
    updated_at: now,
  }

  const { data, error } = await tyreDb(companyId).from('tyre_assets').insert(insert).select('id').single()
  if (error) throw new Error(error.message)
  const id = String(data.id)

  await appendEvent({
    companyId: input.companyId,
    tyreId: id,
    eventType: 'created',
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    body: `Created tyre ${internalId}`,
  })

  await writeImmutableAudit({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    action: 'tyre.created',
    entityType: 'tyre_asset',
    entityId: id,
    afterSnapshot: insert,
  })

  return getTyreAsset(input.companyId, id)
}

export async function fitTyreAsset(input: {
  companyId: string
  actorUserId: string
  actorName: string
  tyreId: string
  vehicleId: string
  position: string
  positionLabel: string
  retorqueDueAt?: string | null
}) {
  const companyId = input.companyId
  const existing = await loadTyre(companyId, input.tyreId)
  if (!existing) throw new HttpError(404, 'Tyre asset not found')

  const vehicleId = String(input.vehicleId ?? '').trim()
  if (!vehicleId) throw new HttpError(400, 'vehicleId is required')
  const position = String(input.position ?? '').trim()
  const positionLabel = String(input.positionLabel ?? position).trim()
  if (!position) throw new HttpError(400, 'position is required')

  const { data: vehicle, error: vehicleError } = await tyreDb(companyId)
    .from('vehicles')
    .select('id, primary_depot_id')
    .eq('company_id', input.companyId)
    .eq('id', vehicleId)
    .maybeSingle()
  if (vehicleError) throw new Error(vehicleError.message)
  if (!vehicle) throw new HttpError(404, 'Vehicle not found')

  // One tyre per vehicle position.
  const { data: occupant } = await tyreDb(companyId)
    .from('tyre_assets')
    .select('id')
    .eq('company_id', input.companyId)
    .eq('vehicle_id', vehicleId)
    .eq('position', position)
    .eq('status', 'fitted')
    .neq('id', input.tyreId)
    .maybeSingle()
  if (occupant?.id) {
    throw new HttpError(409, `Position ${position} already has a fitted tyre`)
  }

  const now = new Date().toISOString()
  const patch: Row = {
    status: 'fitted',
    vehicle_id: vehicleId,
    position,
    position_label: positionLabel,
    depot_id: vehicle.primary_depot_id ? String(vehicle.primary_depot_id) : existing.depot_id,
    fitted_at: now,
    removed_at: null,
    retorque_due_at: input.retorqueDueAt ? String(input.retorqueDueAt) : null,
    updated_at: now,
  }

  const { error } = await tyreDb(companyId)
    .from('tyre_assets')
    .update(patch)
    .eq('company_id', input.companyId)
    .eq('id', input.tyreId)
  if (error) throw new Error(error.message)

  await appendEvent({
    companyId: input.companyId,
    tyreId: input.tyreId,
    eventType: 'fitted',
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    body: `Fitted to ${vehicleId} at ${positionLabel}`,
    payload: { vehicleId, position, positionLabel },
  })

  await writeImmutableAudit({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    action: 'tyre.fitted',
    entityType: 'tyre_asset',
    entityId: input.tyreId,
    beforeSnapshot: { vehicle_id: existing.vehicle_id, status: existing.status },
    afterSnapshot: patch,
  })

  return getTyreAsset(input.companyId, input.tyreId)
}

export async function removeTyreAsset(input: {
  companyId: string
  actorUserId: string
  actorName: string
  tyreId: string
  quarantine?: boolean
}) {
  const companyId = input.companyId
  const existing = await loadTyre(companyId, input.tyreId)
  if (!existing) throw new HttpError(404, 'Tyre asset not found')

  const now = new Date().toISOString()
  const status: TyreAssetStatus = input.quarantine ? 'quarantine' : 'removed'
  const patch: Row = {
    status,
    vehicle_id: null,
    position: null,
    position_label: null,
    fitted_at: existing.fitted_at ?? null,
    removed_at: now,
    updated_at: now,
  }

  const { error } = await tyreDb(companyId)
    .from('tyre_assets')
    .update(patch)
    .eq('company_id', input.companyId)
    .eq('id', input.tyreId)
  if (error) throw new Error(error.message)

  await appendEvent({
    companyId: input.companyId,
    tyreId: input.tyreId,
    eventType: 'removed',
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    body: input.quarantine ? 'Removed to quarantine' : 'Removed from vehicle',
    payload: { quarantine: Boolean(input.quarantine), fromVehicleId: existing.vehicle_id },
  })

  await writeImmutableAudit({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    action: input.quarantine ? 'tyre.quarantined' : 'tyre.removed',
    entityType: 'tyre_asset',
    entityId: input.tyreId,
    beforeSnapshot: { vehicle_id: existing.vehicle_id, status: existing.status },
    afterSnapshot: patch,
  })

  return getTyreAsset(input.companyId, input.tyreId)
}

export async function rotateTyreAssets(input: {
  companyId: string
  actorUserId: string
  actorName: string
  vehicleId: string
  aTyreId: string
  bTyreId: string
}) {
  const companyId = input.companyId
  const a = await loadTyre(companyId, input.aTyreId)
  const b = await loadTyre(companyId, input.bTyreId)
  if (!a || !b) throw new HttpError(404, 'Tyre asset not found')

  const vehicleId = String(input.vehicleId)
  if (String(a.vehicle_id ?? '') !== vehicleId || String(b.vehicle_id ?? '') !== vehicleId) {
    throw new HttpError(400, 'Both tyres must be fitted to the same vehicle')
  }
  if (normalizeTyreStatus(a.status) !== 'fitted' || normalizeTyreStatus(b.status) !== 'fitted') {
    throw new HttpError(400, 'Both tyres must be fitted before rotation')
  }

  const aPos = a.position ? String(a.position) : null
  const bPos = b.position ? String(b.position) : null
  const aLabel = a.position_label ? String(a.position_label) : aPos
  const bLabel = b.position_label ? String(b.position_label) : bPos
  if (!aPos || !bPos) throw new HttpError(400, 'Both tyres need positions to rotate')

  const now = new Date().toISOString()
  const { error: errA } = await tyreDb(companyId)
    .from('tyre_assets')
    .update({
      position: bPos,
      position_label: bLabel,
      updated_at: now,
    })
    .eq('company_id', input.companyId)
    .eq('id', input.aTyreId)
  if (errA) throw new Error(errA.message)

  const { error: errB } = await tyreDb(companyId)
    .from('tyre_assets')
    .update({
      position: aPos,
      position_label: aLabel,
      updated_at: now,
    })
    .eq('company_id', input.companyId)
    .eq('id', input.bTyreId)
  if (errB) throw new Error(errB.message)

  for (const tyreId of [input.aTyreId, input.bTyreId]) {
    await appendEvent({
      companyId: input.companyId,
      tyreId,
      eventType: 'rotated',
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      body: `Rotated on vehicle ${vehicleId}`,
      payload: { aTyreId: input.aTyreId, bTyreId: input.bTyreId },
    })
  }

  await writeImmutableAudit({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    action: 'tyre.rotated',
    entityType: 'tyre_asset',
    entityId: input.aTyreId,
    afterSnapshot: { aTyreId: input.aTyreId, bTyreId: input.bTyreId, vehicleId },
  })

  const [nextA, nextB] = await Promise.all([
    getTyreAsset(input.companyId, input.aTyreId),
    getTyreAsset(input.companyId, input.bTyreId),
  ])
  return [nextA, nextB].filter(Boolean)
}

export function countTyresNeedingAttention(
  tyres: ReturnType<typeof mapTyreAssetRow>[],
  minTread = 2,
): number {
  return tyres.filter((tyre) => tyreNeedsAttentionMapped(tyre, minTread)).length
}
