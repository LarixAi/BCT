/**
 * Pure helpers for Command journey-sequence reorder (F-03).
 * Pickup order is authoritative on run_trips.sequence / trips.passenger_ids.
 */

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

export type JourneySequenceTripStatus =
  | 'planned'
  | 'assigned'
  | 'accepted'
  | 'released'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | string

export function canReorderTripStatus(status: JourneySequenceTripStatus): boolean {
  return ['planned', 'assigned', 'accepted', 'released', 'in_progress'].includes(String(status))
}

export function parseDutyTripSyntheticId(id: string): string | null {
  const match = new RegExp(`^duty-trip-(${UUID})$`, 'i').exec(id.trim())
  return match?.[1] ?? null
}

/** Extract underlying trip UUID from a projected / synthetic job id. */
export function extractTripIdFromJobId(jobId: string): string | null {
  const raw = jobId.trim()
  const dutyStop = new RegExp(`^duty-stop-${UUID}-stop-pickup-(${UUID})$`, 'i').exec(raw)
  if (dutyStop?.[1]) return dutyStop[1]
  const paxUuid = new RegExp(`^(${UUID})-pax-(?:${UUID}|\\d+)$`, 'i').exec(raw)
  if (paxUuid?.[1]) return paxUuid[1]
  const paxLegacy = /^(.+)-pax-\d+$/.exec(raw)
  if (paxLegacy?.[1] && !paxLegacy[1].startsWith('duty-')) return paxLegacy[1]
  return null
}

/** Passenger id from stable `${tripId}-pax-${passengerId}` job ids. */
export function extractPassengerIdFromJobId(jobId: string): string | null {
  const match = new RegExp(`^${UUID}-pax-(${UUID})$`, 'i').exec(jobId.trim())
  return match?.[1] ?? null
}

export function planRunTripReorder(input: {
  currentTripIdsInSequence: string[]
  orderedPickupJobIds: string[]
}): { orderedTripIds: string[]; changed: boolean } {
  if (!input.orderedPickupJobIds.length) {
    throw new Error('orderedPickupJobIds is required')
  }
  const orderedTripIds: string[] = []
  for (const jobId of input.orderedPickupJobIds) {
    const tripId = extractTripIdFromJobId(jobId)
    if (!tripId) throw new Error(`Unrecognised journey job id: ${jobId}`)
    if (!orderedTripIds.includes(tripId)) orderedTripIds.push(tripId)
  }

  const current = input.currentTripIdsInSequence
  if (orderedTripIds.length !== current.length) {
    throw new Error('Reorder must include every pickup trip on this run')
  }
  const currentSet = new Set(current)
  for (const id of orderedTripIds) {
    if (!currentSet.has(id)) throw new Error(`Job maps to trip ${id} which is not on this run`)
  }
  for (const id of current) {
    if (!orderedTripIds.includes(id)) throw new Error('Reorder must include every pickup trip on this run')
  }

  const changed = orderedTripIds.some((id, index) => id !== current[index])
  return { orderedTripIds, changed }
}

export function planPassengerReorder(input: {
  currentPassengerIds: string[]
  orderedPickupJobIds: string[]
}): { orderedPassengerIds: string[]; changed: boolean } {
  if (!input.currentPassengerIds.length) {
    throw new Error('Trip has no passengers to reorder')
  }
  if (input.orderedPickupJobIds.length !== input.currentPassengerIds.length) {
    throw new Error('Reorder must include every passenger on this trip')
  }

  const orderedPassengerIds: string[] = []
  for (const jobId of input.orderedPickupJobIds) {
    const passengerId = extractPassengerIdFromJobId(jobId)
    if (passengerId) {
      orderedPassengerIds.push(passengerId)
      continue
    }
    // Legacy index-based ids: tripId-pax-N
    const legacy = /^.+-pax-(\d+)$/.exec(jobId.trim())
    if (!legacy) throw new Error(`Unrecognised passenger job id: ${jobId}`)
    const index = Number(legacy[1]) - 1
    const fromIndex = input.currentPassengerIds[index]
    if (!fromIndex) throw new Error(`Passenger index out of range in ${jobId}`)
    orderedPassengerIds.push(String(fromIndex))
  }

  const unique = new Set(orderedPassengerIds)
  if (unique.size !== orderedPassengerIds.length) {
    throw new Error('Reorder contains duplicate passengers')
  }
  for (const id of input.currentPassengerIds) {
    if (!unique.has(String(id))) throw new Error('Reorder must include every passenger on this trip')
  }

  const changed = orderedPassengerIds.some((id, index) => id !== String(input.currentPassengerIds[index]))
  return { orderedPassengerIds, changed }
}
