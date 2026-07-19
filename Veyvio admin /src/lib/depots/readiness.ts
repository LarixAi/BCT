import type { DepotOpsSnapshot, DepotProfile, DepotReadiness } from './types'

/** Derive depot readiness from status, capacity, contacts, and ops pressure. */
export function deriveDepotReadiness(
  profile: Pick<DepotProfile, 'status' | 'capacity' | 'contacts'>,
  snapshot?: Pick<DepotOpsSnapshot, 'vehiclesAssigned' | 'vehiclesVor' | 'checksOutstanding'>,
): DepotReadiness {
  const reasons: string[] = []
  const calculatedAt = new Date().toISOString()

  if (profile.status === 'closed') {
    return { level: 'blocked', reasons: ['Depot is closed'], calculatedAt }
  }

  if (profile.status === 'planned') {
    reasons.push('Depot is planned — not yet operational')
  }

  if (!profile.contacts.managerName?.trim()) {
    reasons.push('Depot manager not assigned')
  }

  let overCapacity = false
  if (snapshot) {
    if (snapshot.vehiclesAssigned > profile.capacity.vehicleCapacity) {
      overCapacity = true
      reasons.push(
        `Assigned fleet (${snapshot.vehiclesAssigned}) exceeds vehicle capacity (${profile.capacity.vehicleCapacity})`,
      )
    }
    if (snapshot.vehiclesVor >= 3) {
      reasons.push(`${snapshot.vehiclesVor} vehicles VOR`)
    }
    if (snapshot.checksOutstanding > 5) {
      reasons.push(`${snapshot.checksOutstanding} vehicle checks outstanding`)
    }
  }

  if (profile.status === 'maintenance_warning') {
    reasons.push('Site has a maintenance warning')
  }

  if (reasons.length === 0) {
    return { level: 'ready', reasons: [], calculatedAt }
  }

  return { level: overCapacity ? 'blocked' : 'attention', reasons, calculatedAt }
}
