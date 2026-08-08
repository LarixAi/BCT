/**
 * Durable purchase requests — Command write path (F-18 / TD-027).
 */
import { admin } from './supabase.ts'
import { writeImmutableAudit } from './audit-service.ts'
import { HttpError } from './http.ts'
import {
  canApprovePurchaseRequest,
  isUuid,
  mapPurchaseRequestRow,
  normalizePurchaseUrgency,
} from './purchase-requests.mapping.ts'

type Row = Record<string, unknown>

async function loadPurchase(companyId: string, purchaseId: string): Promise<Row | null> {
  if (!isUuid(purchaseId)) return null
  const { data, error } = await admin
    .from('purchase_requests')
    .select('*, vehicles(registration), depots(name)')
    .eq('company_id', companyId)
    .eq('id', purchaseId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as Row | null
}

function mapLoaded(row: Row) {
  const vehicle = (row.vehicles as Row | null) ?? null
  const depot = (row.depots as Row | null) ?? null
  return mapPurchaseRequestRow(row, {
    registrationNumber: vehicle?.registration ? String(vehicle.registration) : null,
    depotName: depot?.name ? String(depot.name) : null,
  })
}

export async function listPurchaseRequests(companyId: string) {
  const { data, error } = await admin
    .from('purchase_requests')
    .select('*, vehicles(registration), depots(name)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapLoaded(row as Row))
}

export async function createPurchaseRequest(input: {
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
    company_id: input.companyId,
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

  const { data, error } = await admin.from('purchase_requests').insert(insert).select('id').single()
  if (error || !data) throw new Error(error?.message ?? 'Purchase request create failed')

  await writeImmutableAudit({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    action: 'purchase_request.created',
    entityType: 'purchase_request',
    entityId: String(data.id),
    afterSnapshot: { resourceName, quantity, estimatedCost },
  })

  const row = await loadPurchase(input.companyId, String(data.id))
  if (!row) throw new Error('Purchase request created but not readable')
  return mapLoaded(row)
}

export async function approvePurchaseRequest(input: {
  companyId: string
  actorUserId: string
  actorName: string
  purchaseId: string
}) {
  const row = await loadPurchase(input.companyId, input.purchaseId)
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
  const { error } = await admin
    .from('purchase_requests')
    .update({
      status: 'approved',
      approved_by_user_id: input.actorUserId,
      approved_by_name: String(input.actorName ?? '').trim() || 'Command',
      approved_at: now,
      updated_at: now,
    })
    .eq('company_id', input.companyId)
    .eq('id', input.purchaseId)
  if (error) throw new Error(error.message)

  await writeImmutableAudit({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    action: 'purchase_request.approved',
    entityType: 'purchase_request',
    entityId: input.purchaseId,
    beforeSnapshot: { status: mapped.status },
    afterSnapshot: { status: 'approved' },
  })

  const next = await loadPurchase(input.companyId, input.purchaseId)
  if (!next) throw new Error('Purchase request approved but not readable')
  return mapLoaded(next)
}
