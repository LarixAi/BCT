import type { DialARideMember, DialARideRequest } from './types'

export type GeneratedDialARideJob = {
  leg: 'outbound' | 'return'
  passengerId: string
  passengerName: string
  pickupAddress: string
  dropoffAddress: string
  plannedPickupTime: string
  wheelchairRequired: boolean
  escortRequired: boolean
  safeguardingFlag: boolean
}

export function buildJobsFromDialARideRequest(
  request: DialARideRequest,
  member: DialARideMember,
): GeneratedDialARideJob[] {
  const outbound: GeneratedDialARideJob = {
    leg: 'outbound',
    passengerId: member.id,
    passengerName: `${member.firstName} ${member.lastName}`,
    pickupAddress: request.pickupAddress,
    dropoffAddress: request.destinationAddress,
    plannedPickupTime: request.preferredPickupTime || request.pickupWindowStart || '09:00',
    wheelchairRequired: request.requirements.wheelchair || member.wheelchairRequired,
    escortRequired: request.requirements.companion || request.requirements.carer,
    safeguardingFlag: false,
  }

  if (!request.returnRequired) return [outbound]

  return [
    outbound,
    {
      leg: 'return',
      passengerId: member.id,
      passengerName: `${member.firstName} ${member.lastName}`,
      pickupAddress: request.destinationAddress,
      dropoffAddress: request.pickupAddress,
      plannedPickupTime: request.returnTime || '15:00',
      wheelchairRequired: outbound.wheelchairRequired,
      escortRequired: outbound.escortRequired,
      safeguardingFlag: false,
    },
  ]
}
