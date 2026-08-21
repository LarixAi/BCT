/**
 * Durable purchase requests — Command write path (F-18 / TD-027).
 *
 * Wave 3F UserScopedDb/RLS cutover 11: membership JWT reads/writes
 * `purchase_requests` through RLS (SELECT/INSERT/UPDATE). Support-grant
 * sessions stay on company-scoped service-role. Hub projections without a
 * membership JWT stay on company-scoped service-role. Vehicle/depot display
 * lookups stay service-role. writeImmutableAudit stays privileged.
 */
import { companyScopedServiceDb, resolveTenantDb, userScopedDb } from './db-authority.ts'
import { writeImmutableAudit } from './audit-service.ts'
import { HttpError } from './http.ts'
import {
  canApprovePurchaseRequest,
  isUuid,
  mapPurchaseRequestRow,
  normalizePurchaseUrgency,
} from './purchase-requests.mapping.ts'
import type { RequestContext } from './supabase.ts'

type Row = Record<string, unknown>

type PurchaseScope = {
  companyId: string
  context?: RequestContext
}

function purchaseTenantDb(scope: PurchaseScope) {
  const companyId = scope.context?.companyId ?? scope.companyId
  if (scope.context?.workspaceAuthority === 'support') {
    return companyScopedServiceDb(scope.context, 'purchase_requests_support_grant')
  }
  if (scope.context) {
    return userScopedDb(scope.context, 'purchase_requests')
  }
  return resolveTenantDb(companyId, 'purchase_requests')
}

function purchaseLookupDb(scope: PurchaseScope) {
  if (scope.context) {
    return companyScopedServiceDb(scope.context, 'purchase_requests_lookups')
  }
  return resolveTenantDb(scope.companyId, 'purchase_requests_lookups')
}

function scopeFrom(input: { context?: RequestContext; companyId: string }): PurchaseScope {
  return { companyId: input.context?.companyId ?? input.companyId, context: input.context }
}

async function loadPurchase(scope: PurchaseScope, purchaseId: string): Promise<Row | null> {
  if (!isUuid(purchaseId)) return null
  const companyId = scope.companyId
  const { data, error } = await purchaseTenantDb(scope)
    .from('purchase_requests')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', purchaseId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return enrichPurchase(scope, data as Row)
}

async function enrichPurchase(scope: PurchaseScope, row: Row): Promise<Row> {
  const companyId = scope.companyId
  const lookups = purchaseLookupDb(scope)
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
  return mapPurchaseRequestRow(row, {
    registrationNumber: vehicle?.registration ? String(vehicle.registration) : null,
    depotName: depot?.name ? String(depot.name) : null,
  })
}

export async function listPurchaseRequests(companyId: string, context?: RequestContext) {
  const scope = scopeFrom({ companyId, context })
  const { data, error } = await purchaseTenantDb(scope)
    .from('purchase_requests')
    .select('*')
    .eq('company_id', scope.companyId)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw new Error(error.message)
  const rows = await Promise.all((data ?? []).map((row) => enrichPurchase(scope, row as Row)))
  return rows.map((row) => mapLoaded(row))
}

export async function createPurchaseRequest(input: {
  context?: RequestContext
  companyId: string
  actorUserId: string
  actorName: string
  resourceName: string
  quantity: number
  unit?: string
  estimatedCost: number
  vehicleId?: string | null
  depotId?: string | null
  reason?: string
  urgency?: string
  neededBy?: string | null
}) {
  const scope = scopeFrom(input)
  const resourceName = String(input.resourceName ?? '').trim()
  if (!resourceName) throw new HttpError(400, 'resourceName is required')
  const quantity = Number(input.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) throw new HttpError(400, 'quantity must be > 0')
  const estimatedCost = Number(input.estimatedCost)
  if (!Number.isFinite(estimatedCost) || estimatedCost < 0) {
    throw new HttpError(400, 'estimatedCost must be >= 0')
  }

  const now = new Date().toISOString()
  const insert: Row = {
    company_id: scope.companyId,
    resource_name: resourceName,
    quantity,
    unit: String(input.unit ?? 'each').trim() || 'each',
    estimated_cost: estimatedCost,
    vehicle_id: input.vehicleId && isUuid(input.vehicleId) ? input.vehicleId : null,
    depot_id: input.depotId && isUuid(input.depotId) ? input.depotId : null,
    reason: String(input.reason ?? '').trim(),
    urgency: normalizePurchaseUrgency(input.urgency),
    status: 'pending',
    requested_by_user_id: input.actorUserId,
    requested_by_name: String(input.actorName ?? '').trim() || 'Command',
    needed_by: input.neededBy ? String(input.neededBy).slice(0, 10) : null,
    created_at: now,
    updated_at: now,
  }

  const { data, error } = await purchaseTenantDb(scope).from('purchase_requests').insert(insert).select('id').single()
  if (error || !data) throw new Error(error?.message ?? 'Purchase request create failed')

  await writeImmutableAudit({
    companyId: scope.companyId,
    actorUserId: input.actorUserId,
    action: 'purchase_request.created',
    entityType: 'purchase_request',
    entityId: String(data.id),
    afterSnapshot: { resourceName, quantity, estimatedCost },
  })

  const row = await loadPurchase(scope, String(data.id))
  if (!row) throw new Error('Purchase request created but not readable')
  return mapLoaded(row)
}

export async function approvePurchaseRequest(input: {
  context?: RequestContext
  companyId: string
  actorUserId: string
  actorName: string
  purchaseId: string
}) {
  const scope = scopeFrom(input)
  const row = await loadPurchase(scope, input.purchaseId)
  if (!row) throw new HttpError(404, 'Purchase request not found')

  const mapped = mapLoaded(row)
  const gate = canApprovePurchaseRequest({
    status: mapped.status,
    requestedByUserId: mapped.requestedByUserId,
    requestedByName: mapped.requestedBy,
    actorUserId: input.actorUserId,
    actorName: input.actorName,
  })
  if (!gate.ok) throw new HttpError(403, gate.reason)

  const now = new Date().toISOString()
  const { error } = await purchaseTenantDb(scope)
    .from('purchase_requests')
    .update({
      status: 'approved',
      approved_by_user_id: input.actorUserId,
      approved_by_name: String(input.actorName ?? '').trim() || 'Command',
      approved_at: now,
      updated_at: now,
    })
    .eq('company_id', scope.companyId)
    .eq('id', input.purchaseId)
  if (error) throw new Error(error.message)

  await writeImmutableAudit({
    companyId: scope.companyId,
    actorUserId: input.actorUserId,
    action: 'purchase_request.approved',
    entityType: 'purchase_request',
    entityId: input.purchaseId,
    beforeSnapshot: { status: mapped.status },
    afterSnapshot: { status: 'approved' },
  })

  const next = await loadPurchase(scope, input.purchaseId)
  if (!next) throw new Error('Purchase request approved but not readable')
  return mapLoaded(next)
}
