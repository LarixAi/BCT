import type { DutyRecord } from '@/lib/api/types'
import type { DriverProfile } from '@/lib/drivers/types'
import type { VehicleProfile } from '@/lib/vehicles/types'
import type { OperationalTrip } from '@/lib/transfers/types'
import type { PlanningJob } from './planning-types'

export type OptimisationCategory =
  | 'grouping'
  | 'stop_order'
  | 'crew'
  | 'capacity'
  | 'dead_mileage'

export type OptimisationSuggestion = {
  id: string
  category: OptimisationCategory
  title: string
  detail: string
  impactLabel: string
  priority: 'high' | 'medium' | 'low'
  jobIds?: string[]
  driverId?: string
  vehicleId?: string
}

function timeToMinutes(value: string): number {
  const match = value.match(/(\d{1,2}):(\d{2})/)
  if (!match) return 0
  return Number(match[1]) * 60 + Number(match[2])
}

function jobsNeedReorder(trip: OperationalTrip): boolean {
  const open = (trip.jobs ?? []).filter((j) => j.status !== 'completed' && j.status !== 'cancelled')
  if (open.length < 2) return false
  const sorted = [...open].sort((a, b) => timeToMinutes(a.plannedPickupTime) - timeToMinutes(b.plannedPickupTime))
  return open.some((job, index) => job.id !== sorted[index]?.id)
}

function wheelchairCount(trip: OperationalTrip | null, jobs: PlanningJob[]): number {
  if (trip) {
    return (trip.jobs ?? []).filter((j) => j.wheelchairRequired).length
  }
  return jobs.filter((j) => j.requirements.includes('Wheelchair')).length
}

export function buildScheduleOptimisations(input: {
  unscheduledJobs: PlanningJob[]
  checkedJobIds: string[]
  activeTrip: OperationalTrip | null
  duties: DutyRecord[]
  trips: OperationalTrip[]
  drivers: DriverProfile[]
  vehicles: VehicleProfile[]
}): OptimisationSuggestion[] {
  const suggestions: OptimisationSuggestion[] = []
  const checked = input.unscheduledJobs.filter((j) => input.checkedJobIds.includes(j.jobId))
  const focusJobs = checked.length > 0 ? checked : input.unscheduledJobs

  const byDestination = new Map<string, PlanningJob[]>()
  for (const job of focusJobs) {
    const key = job.dropoffAddress.toLowerCase().slice(0, 24)
    const list = byDestination.get(key) ?? []
    list.push(job)
    byDestination.set(key, list)
  }

  for (const [destination, jobs] of byDestination) {
    if (jobs.length < 2) continue
    const times = jobs.map((j) => timeToMinutes(j.requiredTime)).sort((a, b) => a - b)
    const spread = times[times.length - 1]! - times[0]!
    if (spread <= 45) {
      suggestions.push({
        id: `group-${destination}`,
        category: 'grouping',
        title: `Group ${jobs.length} jobs to ${jobs[0]?.dropoffAddress ?? 'shared destination'}`,
        detail: 'Passengers share destination and pickup window — one trip reduces dead mileage.',
        impactLabel: `Save ~${Math.max(1, jobs.length - 1) * 4} km dead mileage`,
        priority: spread <= 20 ? 'high' : 'medium',
        jobIds: jobs.map((j) => j.jobId),
      })
      break
    }
  }

  if (input.activeTrip && jobsNeedReorder(input.activeTrip)) {
    suggestions.push({
      id: `stops-${input.activeTrip.id}`,
      category: 'stop_order',
      title: 'Reorder stops by planned pickup time',
      detail: 'Current stop sequence does not follow the published pickup plan.',
      impactLabel: 'Reduce delay risk',
      priority: 'high',
    })
  }

  const wcNeeded = wheelchairCount(input.activeTrip, checked)
  if (wcNeeded > 0) {
    const vehicle = input.vehicles.find((v) => v.id === input.activeTrip?.vehicleId)
    if (!vehicle || vehicle.wheelchairCapacity < wcNeeded) {
      const replacement = input.vehicles.find(
        (v) => v.wheelchairCapacity >= wcNeeded && v.readinessStatus === 'ready',
      )
      suggestions.push({
        id: 'capacity-wheelchair',
        category: 'capacity',
        title: 'Wheelchair capacity mismatch',
        detail: replacement
          ? `Use ${replacement.registrationNumber} (${replacement.wheelchairCapacity} wheelchair spaces).`
          : 'No release-ready vehicle has enough wheelchair spaces for this trip.',
        impactLabel: `${wcNeeded} wheelchair passenger${wcNeeded === 1 ? '' : 's'} onboard`,
        priority: 'high',
        vehicleId: replacement?.id,
      })
    }
  }

  if (input.activeTrip && !input.activeTrip.driverId) {
    const eligibleDrivers = input.drivers
      .filter(
        (d) =>
          d.operationalEligibility === 'eligible' &&
          (d.dutyStatus === 'available' || d.dutyStatus === 'on_duty'),
      )
      .slice(0, 2)

    for (const driver of eligibleDrivers) {
      const vehicle = input.vehicles.find(
        (v) =>
          v.readinessStatus === 'ready' &&
          (!wcNeeded || v.wheelchairCapacity >= wcNeeded) &&
          v.currentDriverId !== driver.id,
      )
      suggestions.push({
        id: `crew-${driver.id}`,
        category: 'crew',
        title: `Assign ${driver.firstName} ${driver.lastName}`,
        detail: vehicle
          ? `Pair with ${vehicle.registrationNumber} — both release-ready for ${input.activeTrip.reference}.`
          : 'Driver is eligible; select a release-ready vehicle.',
        impactLabel: 'Recommended crew',
        priority: 'medium',
        driverId: driver.id,
        vehicleId: vehicle?.id,
      })
    }
  }

  const unlinkedTrips = input.trips.filter((t) => !t.dutyId && t.assignmentStatus === 'unassigned')
  for (const trip of unlinkedTrips.slice(0, 2)) {
    const matchingDuty = input.duties.find(
      (d) => d.route?.name && trip.routeName && d.route.name === trip.routeName && d.status !== 'completed',
    )
    if (matchingDuty) {
      suggestions.push({
        id: `mileage-${trip.id}`,
        category: 'dead_mileage',
        title: `Attach ${trip.reference} to run ${matchingDuty.reference}`,
        detail: 'Trip matches an existing run route — linking avoids a separate depot pull-out.',
        impactLabel: 'Cut duplicate dead mileage',
        priority: 'medium',
      })
    }
  }

  return suggestions.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 }
    return rank[a.priority] - rank[b.priority]
  })
}
