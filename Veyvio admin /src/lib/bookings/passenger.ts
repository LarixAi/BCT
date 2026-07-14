import type { PassengerRecord } from '@/lib/api/types'
import type { BookingPassengerRef } from './types'

export function enrichPassenger(p: PassengerRecord): BookingPassengerRef {
  const requirements: string[] = []
  if (p.needsWheelchair) requirements.push('Wheelchair')
  if (p.safeguardingFlag) {
    requirements.push('Do not release without authorised adult')
    requirements.push('Contact parent if vehicle is more than 10 minutes late')
  }
  if (requirements.length === 0) requirements.push('Standard transport')

  return {
    passengerId: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    requirements,
    safeguardingFlag: p.safeguardingFlag,
  }
}
