/** Pure mapping for purchase_requests (F-03 / TD-027). */

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

export type PurchaseUrgency = 'routine' | 'urgent' | 'emergency'
export type PurchaseStatus = 'pending' | 'approved' | 'rejected'

const URGENCIES = new Set(['routine', 'urgent', 'emergency'])
const STATUSES = new Set(['pending', 'approved', 'rejected'])

type Row = Record<string, unknown>

export function normalizePurchaseUrgency(value: unknown): PurchaseUrgency {
  const raw = String(value ?? '').trim().toLowerCase()
  if (URGENCIES.has(raw)) return raw as PurchaseUrgency
  return 'routine'
}

export function normalizePurchaseStatus(value: unknown): PurchaseStatus {
  const raw = String(value ?? '').trim().toLowerCase()
  if (STATUSES.has(raw)) return raw as PurchaseStatus
  return 'pending'
}

export function mapPurchaseRequestRow(
  row: Row,
  opts?: { registrationNumber?: string | null; depotName?: string | null },
) {
  return {
    id: String(row.id),
    resourceName: String(row.resource_name ?? ''),
    quantity: Number(row.quantity ?? 0),
    unit: String(row.unit ?? 'each'),
    estimatedCost: Number(row.estimated_cost ?? 0),
    vehicleId: row.vehicle_id ? String(row.vehicle_id) : null,
    registrationNumber: opts?.registrationNumber ?? null,
    depotName: opts?.depotName ?? null,
    reason: String(row.reason ?? ''),
    urgency: normalizePurchaseUrgency(row.urgency),
    status: normalizePurchaseStatus(row.status),
    requestedBy: String(row.requested_by_name ?? ''),
    requestedByUserId: row.requested_by_user_id ? String(row.requested_by_user_id) : null,
    neededBy: row.needed_by ? String(row.needed_by) : null,
    createdAt: String(row.created_at ?? ''),
    approvedBy: row.approved_by_name ? String(row.approved_by_name) : null,
    approvedAt: row.approved_at ? String(row.approved_at) : null,
  }
}

/** Self-approval is blocked by user id when present, else by display name. */
export function canApprovePurchaseRequest(input: {
  status: PurchaseStatus
  requestedByUserId?: string | null
  requestedByName: string
  actorUserId?: string | null
  actorName: string
}): { ok: true } | { ok: false; reason: string } {
  if (input.status !== 'pending') {
    return { ok: false, reason: 'Only pending purchase requests can be approved' }
  }
  const actorId = input.actorUserId ? String(input.actorUserId) : ''
  const requesterId = input.requestedByUserId ? String(input.requestedByUserId) : ''
  if (actorId && requesterId && actorId === requesterId) {
    return { ok: false, reason: 'Requester cannot approve their own purchase' }
  }
  const actorName = input.actorName.trim().toLowerCase()
  const requesterName = input.requestedByName.trim().toLowerCase()
  if (actorName && requesterName && actorName === requesterName) {
    return { ok: false, reason: 'Requester cannot approve their own purchase' }
  }
  return { ok: true }
}
