import type { OperationalJob, OperationalTrip } from '@/lib/transfers/types'
import type { MoveCheckResult, MoveJourneyAction } from './types'

export function evaluateMoveChecks(input: {
  sourceTrip: OperationalTrip
  destinationTrip: OperationalTrip | null
  jobs: OperationalJob[]
  action: MoveJourneyAction
}): { checks: MoveCheckResult[]; blocked: boolean; suggestedOptions: string[] } {
  const checks: MoveCheckResult[] = []
  const { sourceTrip, destinationTrip, jobs, action } = input

  if (jobs.length === 0) {
    checks.push({
      level: 'error',
      code: 'no_jobs',
      message: 'Select at least one journey leg to move.',
    })
  }

  for (const job of jobs) {
    if (job.status === 'completed') {
      checks.push({
        level: 'error',
        code: 'completed_job',
        message: `${job.passengerName}: completed journeys cannot be moved.`,
      })
    }
    if (job.status === 'onboard') {
      checks.push({
        level: 'error',
        code: 'onboard_job',
        message: `${job.passengerName} is onboard — record a physical handover before moving.`,
      })
    }
  }

  if (action === 'leave_unassigned') {
    checks.push({
      level: 'warning',
      code: 'unassigned',
      message: 'Journey will leave the current run and wait in the unassigned queue.',
    })
  }

  if (action === 'create_new_run') {
    checks.push({
      level: 'info',
      code: 'new_run',
      message: 'A new run will be created for the selected journeys (demo).',
    })
  }

  if (action === 'assign_standby') {
    checks.push({
      level: 'info',
      code: 'standby',
      message: 'Standby driver will receive passenger details and must acknowledge before acceptance.',
    })
  }

  if (action === 'move_to_run') {
    if (!destinationTrip) {
      checks.push({
        level: 'error',
        code: 'no_destination',
        message: 'Select a destination run.',
      })
    } else {
      if (destinationTrip.id === sourceTrip.id) {
        checks.push({
          level: 'error',
          code: 'same_run',
          message: 'Destination run is the same as the current run.',
        })
      }
      if (destinationTrip.status === 'completed' || destinationTrip.status === 'cancelled') {
        checks.push({
          level: 'error',
          code: 'destination_closed',
          message: 'Destination run is completed or cancelled.',
        })
      }
      if (destinationTrip.vehicleRegistration == null && destinationTrip.status !== 'planned') {
        checks.push({
          level: 'warning',
          code: 'no_vehicle',
          message: 'Destination run has no vehicle assigned yet.',
        })
      }

      // Demo capacity: max 2 wheelchair passengers per run.
      const destWcCount = destinationTrip.jobs.filter((j) => j.wheelchairRequired).length
      const movingWc = jobs.filter((j) => j.wheelchairRequired).length
      if (movingWc > 0 && destWcCount + movingWc > 2) {
        checks.push({
          level: 'error',
          code: 'wheelchair_capacity',
          message: 'The selected vehicle has no available wheelchair position.',
        })
      }

      if (!destinationTrip.driverId && destinationTrip.assignmentStatus === 'unassigned') {
        checks.push({
          level: 'warning',
          code: 'no_driver',
          message: 'Destination run has no driver — journey will wait for assignment.',
        })
      }

      if (destinationTrip.status === 'in_progress') {
        const remaining = destinationTrip.jobs.filter(
          (j) => j.status === 'unstarted' || j.status === 'waiting',
        )
        if (remaining.length === 0) {
          checks.push({
            level: 'error',
            code: 'stop_passed',
            message: 'The destination run has already passed the required stop window.',
          })
        } else {
          checks.push({
            level: 'warning',
            code: 'live_destination',
            message: 'Destination run is active — receiving driver must acknowledge immediately.',
          })
        }
      }

      const escortNeeded = jobs.some((j) => j.escortRequired)
      if (escortNeeded) {
        checks.push({
          level: 'warning',
          code: 'escort',
          message: 'An escort is required — confirm escort availability on the destination run.',
        })
      }

      checks.push({
        level: 'info',
        code: 'eligibility',
        message: 'Driver training, DBS and passenger-info access will be re-checked on commit.',
      })
    }
  }

  const blocked = checks.some((c) => c.level === 'error')
  const suggestedOptions = blocked
    ? ['Select another vehicle / run', 'Move another passenger', 'Create a separate run', 'Leave unassigned']
    : []

  return { checks, blocked, suggestedOptions }
}
