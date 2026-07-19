import type {
  CreateTransferInput,
  OperationalJob,
  OperationalTrip,
  TransferValidationItem,
} from './types'
import type { DriverRecord, VehicleRecord } from '@/lib/api/types'

interface ValidationContext {
  trip: OperationalTrip
  jobsInScope: OperationalJob[]
  drivers: DriverRecord[]
  vehicles: VehicleRecord[]
  newDriverId?: string | null
  newVehicleId?: string | null
  overrideWarnings?: boolean
}

function isExpired(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

export function getJobsInScope(trip: OperationalTrip, input: Pick<CreateTransferInput, 'scope' | 'sourceJobIds'>): OperationalJob[] {
  const jobs = trip.jobs ?? []
  switch (input.scope) {
    case 'entire_trip':
    case 'driver_only':
    case 'vehicle_only':
    case 'driver_and_vehicle':
    case 'swap_drivers':
      return jobs
    case 'selected_jobs':
      return jobs.filter((j) => input.sourceJobIds?.includes(j.id))
    case 'remaining_jobs':
      return jobs.filter(
        (j) => j.status === 'unstarted' || j.status === 'waiting' || j.status === 'onboard',
      )
    case 'return_to_queue':
      return input.sourceJobIds?.length
        ? jobs.filter((j) => input.sourceJobIds!.includes(j.id))
        : jobs.filter((j) => j.status !== 'completed')
    default:
      return jobs
  }
}

export function inferWorkflowType(trip: OperationalTrip, jobsInScope: OperationalJob[]): CreateTransferInput['workflowType'] {
  const hasOnboard = jobsInScope.some((j) => j.status === 'onboard')
  if (hasOnboard || trip.passengersOnboard > 0) return 'physical_handover'
  if (trip.status === 'in_progress' || trip.status === 'released') return 'live_transfer'
  return 'reassignment'
}

export function validateTransfer(ctx: ValidationContext): TransferValidationItem[] {
  const items: TransferValidationItem[] = []
  const { trip, jobsInScope, drivers, vehicles, newDriverId, newVehicleId } = ctx

  const onboardInScope = jobsInScope.filter((j) => j.status === 'onboard')
  const completedInScope = jobsInScope.filter((j) => j.status === 'completed')

  if (completedInScope.length > 0) {
    items.push({
      level: 'error',
      code: 'completed_job_move',
      message: 'Completed jobs cannot be transferred.',
    })
  }

  if (onboardInScope.length > 0) {
    items.push({
      level: 'warning',
      code: 'passenger_onboard',
      message: `${onboardInScope.length} passenger(s) onboard — record handover location and authorisation before confirming.`,
    })
    if (jobsInScope.some((j) => j.safeguardingFlag && j.status === 'onboard')) {
      items.push({
        level: 'warning',
        code: 'safeguarding_handover',
        message: 'Safeguarding passenger onboard — duty manager authorisation required.',
      })
    }
  }

  const otherOnboardNotInScope =
    trip.passengersOnboard - onboardInScope.length
  if (otherOnboardNotInScope > 0 && jobsInScope.length > 0 && onboardInScope.length === 0) {
    items.push({
      level: 'info',
      code: 'other_onboard_remain',
      message: `${otherOnboardNotInScope} other passenger(s) remain onboard with the original driver.`,
    })
  }

  if (newDriverId) {
    const driver = drivers.find((d) => d.id === newDriverId)
    if (!driver) {
      items.push({ level: 'error', code: 'driver_not_found', message: 'Receiving driver not found.' })
    } else {
      if (driver.status === 'unavailable') {
        items.push({ level: 'error', code: 'driver_unavailable', message: `${driver.firstName} ${driver.lastName} is unavailable.` })
      }
      if (isExpired(driver.licenceExpiry)) {
        items.push({ level: 'error', code: 'licence_expired', message: 'Driver licence has expired.' })
      }
      if (isExpired(driver.dbsExpiry) && jobsInScope.some((j) => j.safeguardingFlag)) {
        items.push({ level: 'error', code: 'dbs_required', message: 'Safeguarding clearance required for this passenger.' })
      }
      if (driver.id === trip.driverId && ctx.trip.driverId) {
        items.push({ level: 'warning', code: 'same_driver', message: 'Receiving driver is already assigned to this trip.' })
      }
    }
  }

  if (newVehicleId) {
    const vehicle = vehicles.find((v) => v.id === newVehicleId)
    if (!vehicle) {
      items.push({ level: 'error', code: 'vehicle_not_found', message: 'Receiving vehicle not found.' })
    } else {
      if (vehicle.status === 'off_road') {
        items.push({ level: 'error', code: 'vehicle_vor', message: `${vehicle.registrationNumber} is marked off road.` })
      }
      if (isExpired(vehicle.motExpiry) || isExpired(vehicle.insuranceExpiry)) {
        items.push({ level: 'error', code: 'vehicle_compliance', message: 'Vehicle MOT or insurance is expired.' })
      }
      const wcNeeded = jobsInScope.some((j) => j.wheelchairRequired)
      if (wcNeeded && (vehicle.wheelchairCapacity ?? 0) < 1) {
        items.push({ level: 'error', code: 'wheelchair_capacity', message: 'Vehicle does not meet wheelchair requirement.' })
      }
      const seatsForReceiving = jobsInScope.filter((j) => j.status !== 'completed').length
      if (seatsForReceiving > 0 && (vehicle.seatingCapacity ?? 0) < seatsForReceiving) {
        items.push({ level: 'error', code: 'insufficient_seats', message: 'Vehicle does not have sufficient capacity.' })
      }
    }
  }

  if (jobsInScope.some((j) => j.escortRequired)) {
    items.push({
      level: 'warning',
      code: 'escort_required',
      message: 'Passenger assistant may be required — verify staffing before confirming.',
    })
  }

  if (jobsInScope.length === 0) {
    items.push({ level: 'error', code: 'no_jobs', message: 'No jobs selected for transfer.' })
  }

  return items
}

export function requiresHandoverRecording(jobsInScope: OperationalJob[]) {
  return jobsInScope.some((j) => j.status === 'onboard')
}

export function hasBlockingTransferErrors(items: TransferValidationItem[]) {
  return items.some((i) => i.level === 'error')
}

export function hasTransferWarnings(items: TransferValidationItem[]) {
  return items.some((i) => i.level === 'warning')
}
