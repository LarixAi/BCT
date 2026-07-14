import type { StaffDepotAssignment, StaffProfile } from './types'

export function expireTemporaryDepotAccess(profile: StaffProfile, asOf = Date.now()): StaffProfile {
  const depotAssignments = profile.depotAssignments.map((d) => {
    if (d.status !== 'temporary' || !d.endDate) return d
    if (new Date(d.endDate).getTime() >= asOf) return d
    return { ...d, status: 'expired' as const }
  })
  const hasChanges = depotAssignments.some((d, i) => d.status !== profile.depotAssignments[i]?.status)
  if (!hasChanges) return profile
  return { ...profile, depotAssignments }
}

export function activeDepotAssignments(assignments: StaffDepotAssignment[]): StaffDepotAssignment[] {
  return assignments.filter((d) => d.status === 'active' || d.status === 'temporary')
}

export function temporaryDepotExpiringSoon(assignments: StaffDepotAssignment[], withinDays = 7): StaffDepotAssignment[] {
  const cutoff = Date.now() + withinDays * 24 * 60 * 60 * 1000
  return assignments.filter(
    (d) => d.status === 'temporary' && d.endDate && new Date(d.endDate).getTime() <= cutoff && new Date(d.endDate).getTime() >= Date.now(),
  )
}
