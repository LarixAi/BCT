/**
 * Pure helpers for Command journey-sequence move (F-03).
 */

import { extractTripIdFromJobId } from './journey-sequence-reorder.mapping.ts'

export type JourneyMoveAction =
  | 'move_to_run'
  | 'create_new_run'
  | 'assign_standby'
  | 'leave_unassigned'

export type JourneyMoveCheck = {
  code: string
  level: 'error' | 'warning' | 'info'
  message: string
}

export function uniqueTripIdsFromJobIds(jobIds: string[]): string[] {
  if (!jobIds.length) throw new Error('Select at least one journey leg to move')
  const tripIds: string[] = []
  for (const jobId of jobIds) {
    const tripId = extractTripIdFromJobId(jobId)
    if (!tripId) throw new Error(`Unrecognised journey job id: ${jobId}`)
    if (!tripIds.includes(tripId)) tripIds.push(tripId)
  }
  return tripIds
}

export function evaluateJourneyMovePlan(input: {
  action: JourneyMoveAction
  sourceTripIds: string[]
  sourceRunId: string | null
  destinationRunId: string | null
  destinationClosed?: boolean
  destinationSameAsSource?: boolean
}): { checks: JourneyMoveCheck[]; blocked: boolean } {
  const checks: JourneyMoveCheck[] = []
  if (!input.sourceTripIds.length) {
    checks.push({
      level: 'error',
      code: 'no_jobs',
      message: 'Select at least one journey leg to move.',
    })
  }
  if (!input.sourceRunId) {
    checks.push({
      level: 'error',
      code: 'source_run_missing',
      message: 'Source journey is not linked to a run, so it cannot be moved.',
    })
  }

  if (input.action === 'move_to_run') {
    if (!input.destinationRunId) {
      checks.push({
        level: 'error',
        code: 'no_destination',
        message: 'Select a destination run.',
      })
    } else if (input.destinationSameAsSource || input.destinationRunId === input.sourceRunId) {
      checks.push({
        level: 'error',
        code: 'same_run',
        message: 'Destination run is the same as the current run.',
      })
    }
    if (input.destinationClosed) {
      checks.push({
        level: 'error',
        code: 'destination_closed',
        message: 'Destination run is completed or cancelled.',
      })
    }
  }

  if (input.action === 'create_new_run') {
    checks.push({
      level: 'info',
      code: 'new_run',
      message: 'A new planned run will be created for the selected pickups.',
    })
  }
  if (input.action === 'leave_unassigned') {
    checks.push({
      level: 'warning',
      code: 'unassigned',
      message: 'Selected pickups will leave the current run and wait unassigned.',
    })
  }
  if (input.action === 'assign_standby') {
    checks.push({
      level: 'info',
      code: 'standby',
      message: 'Selected pickups leave this run and wait for standby coverage.',
    })
  }

  return { checks, blocked: checks.some((c) => c.level === 'error') }
}

export function nextRunSequences(
  existingSequences: number[],
  movingCount: number,
): number[] {
  const max = existingSequences.reduce((m, n) => Math.max(m, n), 0)
  return Array.from({ length: movingCount }, (_, i) => max + i + 1)
}
