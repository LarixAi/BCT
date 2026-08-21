/**
 * Durable tyre inventory — Command write path for fit / remove / rotate (F-18 / TD-027).
 *
 * Wave 3F UserScopedDb/RLS cutover 13: membership JWT reads/writes
 * `tyre_assets` through RLS (SELECT/INSERT/UPDATE). Support-grant sessions
 * and hub lists without a membership JWT stay on company-scoped service-role.
 * Membership JWT also appends `tyre_asset_events` (SELECT/INSERT). Vehicle/depot
 * lookups stay service-role. writeImmutableAudit stays privileged.
 */
import { companyScopedServiceDb, resolveTenantDb, userScopedDb } from './db-authority.ts'
import { writeImmutableAudit } from './audit-service.ts'
import { HttpError } from './http.ts'
import {
  isUuid,
  mapTyreAssetRow,
  normalizeTyreStatus,
  tyreNeedsAttentionMapped,
  type TyreAssetStatus,
} from './tyre-assets.mapping.ts'
import type { RequestContext } from './supabase.ts'

type Row = Record<string, unknown>

type TyreScope = {
  companyId: string
  context?: RequestContext
}

function tyreTenantDb(scope: TyreScope) {
  const companyId = scope.context?.companyId ?? scope.companyId
  if (scope.context?.workspaceAuthority === 'support') {
    return companyScopedServiceDb(scope.context, 'tyre_assets_support_grant')
  }
  if (scope.context) {
    return userScopedDb(scope.context, 'tyre_assets')
  }
  return resolveTenantDb(companyId, 'tyre_assets')
}

function tyreSideEffectsDb(scope: TyreScope) {
  if (scope.context) {
    return companyScopedServiceDb(scope.context, 'tyre_assets_side_effects')
  }
  return resolveTenantDb(scope.companyId, 'tyre_assets_side_effects')
}

function scopeFrom(input: { context?: RequestContext; companyId: string }): TyreScope {
  return { companyId: input.context?.companyId ?? input.companyId, context: input.context }
}

async function appendEvent(input: {
  scope: TyreScope
  tyreId: string
  eventType: string
  actorUserId?: string | null
  actorName: string
  body?: string | null
  payload?: Record<string, unknown>
}) {
  const { error } = await tyreTenantDb(input.scope).from('tyre_asset_events').insert({
    company_id: input.scope.companyId,
    tyre_id: input.tyreId,
    event_type: input.eventType,
    actor_user_id: input.actorUserId ?? null,
    actor_name: input.actorName,
    body: input.body ?? null,
    payload: input.payload ?? {},
  })
  if (error) throw new Error(error.message)
}

async function loadTyre(scope: TyreScope, tyreId: string): Promise<Row | null> {
  if (!isUuid(tyreId)) return null
  const companyId = scope.companyId
  const { data, error } = await tyreTenantDb(scope)
    .from('tyre_assets')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', tyreId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return enrichTyre(scope, data as Row)
}

async function enrichTyre(scope: TyreScope, row: Row): Promise<Row> {
  const companyId = scope.companyId
  const lookups = tyreSideEffectsDb(scope)
  const [{ data: vehicle }, { data: depot }] = await Promise.all([
    row.vehicle_id
      ? lookups
          .from('vehicles')
          .select('registration')
          .eq('company_id', companyId)
          .eq('id', String(row.vehicle_id))
          .maybeSingle()
      : Promise.resolve({ data: null }),
    row.depot_id
      ? lookups
          .from('depots')
          .select('name')
          .eq('company_id', companyId)
          .eq('id', String(row.depot_id))
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  return { ...row, vehicles: vehicle, depots: depot }
}

function mapLoaded(row: Row) {
  const vehicle = (row.vehicles as Row | null) ?? null
  const depot = (row.depots as Row | null) ?? null
  return mapTyreAssetRow(row, {
    registrationNumber: vehicle?.registration ? String(vehicle.registration) : null,
    depotName: depot?.name ? String(depot.name) : null,
  })
}

export async function listTyreAssets(companyId: string, context?: RequestContext) {
  const scope = scopeFrom({ companyId, context })
  const { data, error } = await tyreTenantDb(scope)
    .from('tyre_assets')
    .select('*')
    .eq('company_id', scope.companyId)
    .order('updated_at', { ascending: false })
    .limit(500)
  if (error) throw new Error(error.message)
  const rows = await Promise.all((data ?? []).map((row) => enrichTyre(scope, row as Row)))
  return rows.map((row) => mapLoaded(row))
}

export async function getTyreAsset(companyId: string, tyreId: string, context?: RequestContext) {
  const row = await loadTyre(scopeFrom({ companyId, context }), tyreId)
  if (!row) return null
  return mapLoaded(row)
}

export async function createTyreAsset(input: {
  context?: RequestContext
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
  const scope = scopeFrom(input)
  const internalId = String(input.internalId ?? '').trim()
  const brand = String(input.brand ?? '').trim()
  const size = String(input.size ?? '').trim()
  if (!internalId) throw new HttpError(400, 'internalId is required')
  if (!brand) throw new HttpError(400, 'brand is required')
  if (!size) throw new HttpError(400, 'size is required')

  const now = new Date().toISOString()
  const status: TyreAssetStatus = normalizeTyreStatus(input.status ?? 'in_stock')
  const insert: Row = {
    company_id: scope.companyId,
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

  const { data, error } = await tyreTenantDb(scope).from('tyre_assets').insert(insert).select('id').single()
  if (error) throw new Error(error.message)
  const id = String(data.id)

  await appendEvent({
    scope,
    tyreId: id,
    eventType: 'created',
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    body: `Created tyre ${internalId}`,
  })

  await writeImmutableAudit({
    companyId: scope.companyId,
    actorUserId: input.actorUserId,
    action: 'tyre.created',
    entityType: 'tyre_asset',
    entityId: id,
    afterSnapshot: insert,
  })

  return getTyreAsset(scope.companyId, id, input.context)
}

export async function fitTyreAsset(input: {
  context?: RequestContext
  companyId: string
  actorUserId: string
  actorName: string
  tyreId: string
  vehicleId: string
  position: string
  positionLabel: string
  retorqueDueAt?: string | null
}) {
  const scope = scopeFrom(input)
  const existing = await loadTyre(scope, input.tyreId)
  if (!existing) throw new HttpError(404, 'Tyre asset not found')

  const vehicleId = String(input.vehicleId ?? '').trim()
  if (!vehicleId) throw new HttpError(400, 'vehicleId is required')
  const position = String(input.position ?? '').trim()
  const positionLabel = String(input.positionLabel ?? position).trim()
  if (!position) throw new HttpError(400, 'position is required')

  const { data: vehicle, error: vehicleError } = await tyreSideEffectsDb(scope)
    .from('vehicles')
    .select('id, primary_depot_id')
    .eq('company_id', scope.companyId)
    .eq('id', vehicleId)
    .maybeSingle()
  if (vehicleError) throw new Error(vehicleError.message)
  if (!vehicle) throw new HttpError(404, 'Vehicle not found')

  const { data: occupant } = await tyreTenantDb(scope)
    .from('tyre_assets')
    .select('id')
    .eq('company_id', scope.companyId)
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

  const { error } = await tyreTenantDb(scope)
    .from('tyre_assets')
    .update(patch)
    .eq('company_id', scope.companyId)
    .eq('id', input.tyreId)
  if (error) throw new Error(error.message)

  await appendEvent({
    scope,
    tyreId: input.tyreId,
    eventType: 'fitted',
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    body: `Fitted to ${vehicleId} at ${positionLabel}`,
    payload: { vehicleId, position, positionLabel },
  })

  await writeImmutableAudit({
    companyId: scope.companyId,
    actorUserId: input.actorUserId,
    action: 'tyre.fitted',
    entityType: 'tyre_asset',
    entityId: input.tyreId,
    beforeSnapshot: { vehicle_id: existing.vehicle_id, status: existing.status },
    afterSnapshot: patch,
  })

  return getTyreAsset(scope.companyId, input.tyreId, input.context)
}

export async function removeTyreAsset(input: {
  context?: RequestContext
  companyId: string
  actorUserId: string
  actorName: string
  tyreId: string
  quarantine?: boolean
}) {
  const scope = scopeFrom(input)
  const existing = await loadTyre(scope, input.tyreId)
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

  const { error } = await tyreTenantDb(scope)
    .from('tyre_assets')
    .update(patch)
    .eq('company_id', scope.companyId)
    .eq('id', input.tyreId)
  if (error) throw new Error(error.message)

  await appendEvent({
    scope,
    tyreId: input.tyreId,
    eventType: 'removed',
    actorUserId: input.actorUserId,
    actorName: input.actorName,
    body: input.quarantine ? 'Removed to quarantine' : 'Removed from vehicle',
    payload: { quarantine: Boolean(input.quarantine), fromVehicleId: existing.vehicle_id },
  })

  await writeImmutableAudit({
    companyId: scope.companyId,
    actorUserId: input.actorUserId,
    action: input.quarantine ? 'tyre.quarantined' : 'tyre.removed',
    entityType: 'tyre_asset',
    entityId: input.tyreId,
    beforeSnapshot: { vehicle_id: existing.vehicle_id, status: existing.status },
    afterSnapshot: patch,
  })

  return getTyreAsset(scope.companyId, input.tyreId, input.context)
}

export async function rotateTyreAssets(input: {
  context?: RequestContext
  companyId: string
  actorUserId: string
  actorName: string
  vehicleId: string
  aTyreId: string
  bTyreId: string
}) {
  const scope = scopeFrom(input)
  const a = await loadTyre(scope, input.aTyreId)
  const b = await loadTyre(scope, input.bTyreId)
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
  const { error: errA } = await tyreTenantDb(scope)
    .from('tyre_assets')
    .update({
      position: bPos,
      position_label: bLabel,
      updated_at: now,
    })
    .eq('company_id', scope.companyId)
    .eq('id', input.aTyreId)
  if (errA) throw new Error(errA.message)

  const { error: errB } = await tyreTenantDb(scope)
    .from('tyre_assets')
    .update({
      position: aPos,
      position_label: aLabel,
      updated_at: now,
    })
    .eq('company_id', scope.companyId)
    .eq('id', input.bTyreId)
  if (errB) throw new Error(errB.message)

  for (const tyreId of [input.aTyreId, input.bTyreId]) {
    await appendEvent({
      scope,
      tyreId,
      eventType: 'rotated',
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      body: `Rotated on vehicle ${vehicleId}`,
      payload: { aTyreId: input.aTyreId, bTyreId: input.bTyreId },
    })
  }

  await writeImmutableAudit({
    companyId: scope.companyId,
    actorUserId: input.actorUserId,
    action: 'tyre.rotated',
    entityType: 'tyre_asset',
    entityId: input.aTyreId,
    afterSnapshot: { aTyreId: input.aTyreId, bTyreId: input.bTyreId, vehicleId },
  })

  const [nextA, nextB] = await Promise.all([
    getTyreAsset(scope.companyId, input.aTyreId, input.context),
    getTyreAsset(scope.companyId, input.bTyreId, input.context),
  ])
  return [nextA, nextB].filter(Boolean)
}

export function countTyresNeedingAttention(
  tyres: ReturnType<typeof mapTyreAssetRow>[],
  minTread = 2,
): number {
  return tyres.filter((tyre) => tyreNeedsAttentionMapped(tyre, minTread)).length
}
