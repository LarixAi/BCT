import type { TransferScope } from './types'
import { TRANSFER_SCOPES } from './constants'

const SCOPE_PERMISSION: Partial<Record<TransferScope, string>> = {
  entire_trip: 'transfer.reassign',
  selected_jobs: 'transfer.reassign',
  remaining_jobs: 'transfer.live',
  driver_only: 'transfer.reassign',
  vehicle_only: 'transfer.vehicle',
  driver_and_vehicle: 'transfer.live',
  swap_drivers: 'transfer.swap',
  split_trip: 'transfer.split',
  return_to_queue: 'transfer.queue',
}

const PRIVILEGED_OPS_ROLES = new Set([
  'company_owner',
  'owner',
  'admin',
  'administrator',
  'operations_manager',
  'ops_manager',
  'dispatcher',
  'dispatch_manager',
])

function hasFullTransferAccess(permissions: string[], role?: string | null) {
  if (permissions.includes('*')) return true
  if (role && PRIVILEGED_OPS_ROLES.has(role)) return true
  return (
    permissions.includes('transfer.live') ||
    permissions.includes('transfer.override') ||
    permissions.includes('dispatch.override') ||
    permissions.includes('dispatch.manage')
  )
}

export function allowedTransferScopes(
  permissions: string[],
  role?: string | null,
): typeof TRANSFER_SCOPES {
  if (hasFullTransferAccess(permissions, role)) return TRANSFER_SCOPES

  return TRANSFER_SCOPES.filter((scope) => {
    const required = SCOPE_PERMISSION[scope.id]
    if (!required) return false
    return permissions.includes(required)
  })
}

export function canPerformHandover(permissions: string[], role?: string | null) {
  if (hasFullTransferAccess(permissions, role)) return true
  return permissions.includes('transfer.handover')
}

export function canOverrideTransferWarnings(permissions: string[], role?: string | null) {
  if (permissions.includes('*')) return true
  if (role && PRIVILEGED_OPS_ROLES.has(role)) return true
  return permissions.includes('transfer.override') || permissions.includes('dispatch.override')
}
