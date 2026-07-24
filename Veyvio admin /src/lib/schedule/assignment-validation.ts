import type { DutyRecord } from '@/lib/api/types'
import type { DriverProfile, VehicleProfile } from '@/lib/drivers/types'
import { evaluateDriverEligibility, jobContextFromBookingRequirements } from '@/lib/eligibility/engine'
import type { OperationalJob, OperationalTrip } from '@/lib/transfers/types'
import { evaluateVehicleRelease } from '@/lib/vehicles/release'
import type {
  PlanningAssignmentValidation,
  PlanningValidationItem,
  PlanningValidationLevel,
} from '@/lib/schedule/planning-types'

function worstLevel(items: PlanningValidationItem[]): PlanningValidationLevel {
  if (items.some((i) => i.level === 'blocked')) return 'blocked'
  if (items.some((i) => i.level === 'warning')) return 'warning'
  return 'compatible'
}

function jobContextFromJobs(jobs: OperationalJob[]) {
  return jobContextFromBookingRequirements({
    wheelchairAccessible: jobs.some((j) => j.wheelchairRequired),
    safeguardingRequired: jobs.some((j) => j.safeguardingFlag),
    schoolContract: jobs.some((j) => j.safeguardingFlag),
    escortRequired: jobs.some((j) => j.escortRequired),
  })
}

function driverDoubleBooked(
  driverId: string,
  dutyDate: string,
  dutyId: string | null,
  duties: DutyRecord[],
): PlanningValidationItem | null {
  const clashes = duties.filter(
    (d) => d.driver?.id === driverId && d.dutyDate === dutyDate && d.id !== dutyId,
  )
  if (clashes.length === 0) return null
  return {
    id: 'driver-double-booked',
    level: 'warning',
    title: 'Driver double booked',
    detail: `Driver already has ${clashes.length} other run(s) on this date`,
  }
}

function vehicleDoubleBooked(
  vehicleId: string,
  dutyDate: string,
  dutyId: string | null,
  duties: DutyRecord[],
): PlanningValidationItem | null {
  const clashes = duties.filter(
    (d) => d.vehicle?.id === vehicleId && d.dutyDate === dutyDate && d.id !== dutyId,
  )
  if (clashes.length === 0) return null
  return {
    id: 'vehicle-double-booked',
    level: 'warning',
    title: 'Vehicle double booked',
    detail: `Vehicle already assigned to ${clashes.length} other run(s) on this date`,
  }
}

export function validatePlanningAssignment(input: {
  trip: OperationalTrip
  jobs: OperationalJob[]
  driver: DriverProfile | null
  vehicle: VehicleProfile | null
  duties: DutyRecord[]
  dutyDate: string
}): PlanningAssignmentValidation {
  const items: PlanningValidationItem[] = []
  const ctx = jobContextFromJobs(input.jobs)

  if (!input.driver) {
    items.push({
      id: 'no-driver',
      level: 'blocked',
      title: 'No driver assigned',
      detail: 'Select a driver before publishing this run',
    })
  } else {
    const eligibility = evaluateDriverEligibility(input.driver, ctx)
    for (const block of eligibility.failures) {
      items.push({
        id: `driver-${block.code}`,
        level: 'blocked',
        title: 'Driver blocked',
        detail: block.message,
      })
    }
    for (const warn of eligibility.warnings) {
      items.push({
        id: `driver-warn-${warn.code}`,
        level: 'warning',
        title: 'Driver warning',
        detail: warn.message,
      })
    }
    const clash = driverDoubleBooked(
      input.driver.id,
      input.dutyDate,
      input.trip.dutyId,
      input.duties,
    )
    if (clash) items.push(clash)
  }

  if (!input.vehicle) {
    items.push({
      id: 'no-vehicle',
      level: 'blocked',
      title: 'No vehicle assigned',
      detail: 'Select a vehicle before publishing this run',
    })
  } else {
    const release = evaluateVehicleRelease(input.vehicle, {
      wheelchairRequired: ctx.wheelchairRequired,
      passengerCount: input.jobs.length,
    })
    for (const block of release.failures) {
      items.push({
        id: `vehicle-${block.code}`,
        level: 'blocked',
        title: 'Vehicle blocked',
        detail: block.message,
      })
    }
    for (const warn of release.warnings) {
      items.push({
        id: `vehicle-warn-${warn.code}`,
        level: 'warning',
        title: 'Vehicle warning',
        detail: warn.message,
      })
    }
    const clash = vehicleDoubleBooked(
      input.vehicle.id,
      input.dutyDate,
      input.trip.dutyId,
      input.duties,
    )
    if (clash) items.push(clash)
  }

  const wheelchairJobs = input.jobs.filter((j) => j.wheelchairRequired).length
  if (wheelchairJobs > 0 && input.vehicle && (input.vehicle.wheelchairCapacity ?? 0) < wheelchairJobs) {
    items.push({
      id: 'wheelchair-capacity',
      level: 'blocked',
      title: 'Wheelchair capacity',
      detail: `Trip needs ${wheelchairJobs} wheelchair space(s); vehicle has ${input.vehicle.wheelchairCapacity ?? 0}`,
    })
  }

  if (input.jobs.some((j) => j.safeguardingFlag) && !input.driver) {
    items.push({
      id: 'safeguarding-driver',
      level: 'blocked',
      title: 'Safeguarding',
      detail: 'Safeguarding jobs require a vetted driver assignment',
    })
  }

  const level = worstLevel(items)
  const hasBlocks = items.some((i) => i.level === 'blocked')

  return {
    level,
    items,
    canAssign: !hasBlocks && Boolean(input.driver && input.vehicle),
    canPublish: !hasBlocks && Boolean(input.driver && input.vehicle),
  }
}
