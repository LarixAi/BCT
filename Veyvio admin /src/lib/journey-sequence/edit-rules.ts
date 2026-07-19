import type { OperationalTripStatus } from '@/lib/transfers/types'
import type { SequenceEditCapability } from './types'

export function sequenceEditCapability(status: OperationalTripStatus): SequenceEditCapability {
  switch (status) {
    case 'planned':
      return 'full'
    case 'assigned':
    case 'accepted':
    case 'released':
      return 'notify_required'
    case 'in_progress':
      return 'active_warning'
    case 'completed':
      return 'correction_only'
    case 'cancelled':
      return 'reinstate_only'
    default:
      return 'read_only'
  }
}

export function canReorderSequence(capability: SequenceEditCapability): boolean {
  return capability === 'full' || capability === 'notify_required' || capability === 'active_warning'
}

export function canSaveWithoutNotify(capability: SequenceEditCapability): boolean {
  return capability === 'full' || capability === 'correction_only'
}

export function capabilityBanner(capability: SequenceEditCapability): string | null {
  switch (capability) {
    case 'notify_required':
      return 'This trip is assigned. Significant changes will notify the driver and may require acknowledgement.'
    case 'active_warning':
      return 'This trip is currently active. Changes may affect the driver and passengers immediately. High-priority driver update is required.'
    case 'correction_only':
      return 'This trip is completed. Operational reordering is closed — you can record clerical corrections with a full audit trail.'
    case 'reinstate_only':
      return 'This trip is cancelled. Reinstate, duplicate or reschedule — cancellation history is retained.'
    case 'read_only':
      return 'This trip cannot be reorganised in its current status.'
    default:
      return null
  }
}
