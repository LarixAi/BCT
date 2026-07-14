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

export function allowedTransferScopes(permissions: string[]): typeof TRANSFER_SCOPES {
  const isSenior =
    permissions.includes('transfer.live') ||
    permissions.includes('transfer.override') ||
    permissions.includes('dispatch.override')

  return TRANSFER_SCOPES.filter((scope) => {
    const required = SCOPE_PERMISSION[scope.id]
    if (!required) return isSenior
    if (permissions.includes(required)) return true
    if (scope.workflowTypes.includes('live_transfer') && isSenior) return true
    return false
  })
}

export function canPerformHandover(permissions: string[]) {
  return (
    permissions.includes('transfer.handover') ||
    permissions.includes('transfer.override') ||
    permissions.includes('dispatch.override')
  )
}

export function canOverrideTransferWarnings(permissions: string[]) {
  return permissions.includes('transfer.override') || permissions.includes('dispatch.override')
}
