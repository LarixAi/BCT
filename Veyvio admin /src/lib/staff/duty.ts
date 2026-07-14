import type { StaffDutyStatus } from './types'

const TRANSITIONS: Partial<Record<StaffDutyStatus, StaffDutyStatus[]>> = {
  off_duty: ['scheduled', 'on_duty', 'unavailable', 'on_leave'],
  scheduled: ['on_duty', 'off_duty', 'unavailable', 'on_leave'],
  on_duty: ['on_break', 'off_duty', 'unavailable'],
  on_break: ['on_duty', 'off_duty'],
  unavailable: ['off_duty', 'scheduled'],
  on_leave: ['off_duty', 'scheduled'],
}

export function canTransitionDuty(from: StaffDutyStatus, to: StaffDutyStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}

export function dutyActionForStatus(status: StaffDutyStatus): string {
  switch (status) {
    case 'on_duty':
      return 'Started duty'
    case 'off_duty':
      return 'Ended duty'
    case 'on_break':
      return 'Started break'
    case 'unavailable':
      return 'Marked unavailable'
    case 'scheduled':
      return 'Scheduled for shift'
    default:
      return 'Duty status updated'
  }
}
