import type { YardTaskStatus } from './types'

export function yardTaskProgressPercent(status: YardTaskStatus): number {
  switch (status) {
    case 'open':
      return 10
    case 'assigned':
      return 33
    case 'in_progress':
      return 66
    case 'completed':
      return 100
    default:
      return 0
  }
}

export function yardTaskProgressLabel(status: YardTaskStatus): string {
  switch (status) {
    case 'open':
      return 'Waiting for yard'
    case 'assigned':
      return 'Assigned to yard'
    case 'in_progress':
      return 'Yard working on it'
    case 'completed':
      return 'Completed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}
