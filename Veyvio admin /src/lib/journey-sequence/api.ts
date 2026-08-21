import { isMockApi } from '@/lib/api/config'
import { api } from '@/lib/api/client'
import type { OperationalTrip } from '@/lib/transfers/types'
import { buildWorkspace, findLinkedReturn, recalculatePickupTimes } from './build-sequence'
import { canReorderSequence, sequenceEditCapability } from './edit-rules'
import { evaluateMoveChecks } from './move-checks'
import { NOTIFY_TOLERANCE } from './constants'
import type {
  DriverDeclineReason,
  JourneySequenceWorkspace,
  LinkedReturnDecision,
  MoveJourneyAction,
  SequenceChangePreview,
  SequenceCommitInput,
} from './types'

const mockJourneySequenceApi =
  import.meta.env.VITE_MOCK_API === 'true'
    ? (await import('./mock-hub')).mockJourneySequenceApi
    : null

export const JOURNEY_SEQUENCE_LIVE_BLOCKED =
  'Journey sequence acknowledgement controls require a signed-in Command session.'

/** Reorder, move, and acknowledgement are writable in mock and on live Command. */
export function isJourneySequenceWritable(): boolean {
  return true
}

export function isJourneySequenceMoveWritable(): boolean {
  return true
}

type LiveTripCache = {
  trip: OperationalTrip
  siblings: OperationalTrip[]
}

const liveTripCache = new Map<string, LiveTripCache>()

function cacheTrips(trip: OperationalTrip, siblings: OperationalTrip[] = []) {
  const all = [trip, ...siblings.filter((s) => s.id !== trip.id)]
  for (const t of all) {
    liveTripCache.set(t.id, { trip: t, siblings: all })
  }
  if (trip.dutyId) {
    liveTripCache.set(`duty-trip-${trip.dutyId}`, { trip, siblings: all })
  }
}

function requireCachedTrip(tripId: string): LiveTripCache {
  const cached = liveTripCache.get(tripId)
  if (!cached) {
    throw new Error('Journey sequence workspace is not loaded yet. Refresh and try again.')
  }
  return cached
}

function minutesBetween(a: string, b: string): number {
  const [ah, am] = a.split(':').map(Number)
  const [bh, bm] = b.split(':').map(Number)
  return (bh ?? 0) * 60 + (bm ?? 0) - ((ah ?? 0) * 60 + (am ?? 0))
}

function buildLivePreview(
  trip: OperationalTrip,
  siblings: OperationalTrip[],
  orderedPickupJobIds: string[],
  linkedReturnDecision: LinkedReturnDecision,
): SequenceChangePreview {
  const capability = sequenceEditCapability(trip.status)
  if (!canReorderSequence(capability)) {
    throw new Error('This trip cannot be reorganised in its current status')
  }

  const original = [...trip.jobs].sort((a, b) => a.sequence - b.sequence)
  const recalculated = recalculatePickupTimes(trip.jobs, orderedPickupJobIds)
  const workspace = buildWorkspace(trip, siblings, recalculated)
  const pickupDeltas = original
    .map((job) => {
      const next = recalculated.find((j) => j.id === job.id)
      if (!next) return null
      const oldPickup = job.plannedPickupTime
      const newPickup = next.plannedPickupTime
      return {
        passengerName: job.passengerName,
        oldPickup,
        newPickup,
        minutesDelta: minutesBetween(oldPickup, newPickup),
      }
    })
    .filter(Boolean) as SequenceChangePreview['pickupDeltas']

  const firstMoved = original.findIndex((job, i) => job.id !== orderedPickupJobIds[i])
  const movedJob = firstMoved >= 0 ? original[firstMoved] : null
  const newPos =
    movedJob != null ? orderedPickupJobIds.findIndex((id) => id === movedJob.id) + 1 : null

  const schoolFrom = original[original.length - 1]?.plannedDropoffTime ?? '09:00'
  const schoolTo =
    recalculated[recalculated.length - 1]?.plannedDropoffTime ?? schoolFrom
  const schoolDelta = minutesBetween(schoolFrom, schoolTo)
  const linkedReturn = movedJob ? findLinkedReturn(trip, movedJob, siblings) : null

  return {
    tripId: trip.id,
    tripReference: trip.reference,
    capability,
    movedPassengerName: movedJob?.passengerName ?? null,
    oldPosition: firstMoved >= 0 ? firstMoved + 1 : null,
    newPosition: newPos,
    pickupDeltas,
    distanceMiles: null,
    durationMinutes: null,
    affectedPassengerCount: pickupDeltas.filter((d) => d.minutesDelta !== 0).length,
    schoolArrival: { from: schoolFrom, to: schoolTo },
    linkedReturn,
    linkedReturnDecision,
    notifications: [
      {
        audience: 'driver',
        notify: true,
        reason: 'Stop order and estimated timings changed',
      },
      {
        audience: 'parent_carer',
        notify: pickupDeltas.some((d) => Math.abs(d.minutesDelta) >= NOTIFY_TOLERANCE.passengerPickupMinutes),
        reason: 'Pickup timing change',
      },
      {
        audience: 'school',
        notify: Math.abs(schoolDelta) >= NOTIFY_TOLERANCE.schoolArrivalMinutes,
        reason: 'School arrival change',
      },
      {
        audience: 'control',
        notify: capability === 'active_warning' || capability === 'notify_required',
        reason: 'Assigned/active trip reorganisation logged',
      },
    ],
    acknowledgementRequired: capability === 'notify_required' || capability === 'active_warning',
    activeTripWarning: capability === 'active_warning',
    stops: workspace.stops,
  }
}

export function projectJourneyWorkspace(
  trip: OperationalTrip,
  siblings: OperationalTrip[] = [],
): JourneySequenceWorkspace {
  cacheTrips(trip, siblings.length ? siblings : [trip])
  return {
    ...buildWorkspace(trip, siblings.length ? siblings : [trip]),
    acknowledgement: null,
  }
}

export const journeySequenceApi = {
  getWorkspace(tripId: string): JourneySequenceWorkspace {
    if (isMockApi && mockJourneySequenceApi) return mockJourneySequenceApi.getWorkspace(tripId)
    const { trip, siblings } = requireCachedTrip(tripId)
    return {
      ...buildWorkspace(trip, siblings),
      acknowledgement: null,
    }
  },

  ensureWorkspaceFromTrips(trip: OperationalTrip, siblings: OperationalTrip[]): JourneySequenceWorkspace {
    if (isMockApi && mockJourneySequenceApi) {
      return mockJourneySequenceApi.ensureWorkspaceFromTrips(trip, siblings)
    }
    return projectJourneyWorkspace(trip, siblings)
  },

  async loadAcknowledgement(tripId: string) {
    if (isMockApi && mockJourneySequenceApi) {
      return mockJourneySequenceApi.getAcknowledgement(tripId)
    }
    const result = await api.getJourneySequenceAcknowledgement(tripId)
    return result.acknowledgement
  },

  listAudit(tripId: string) {
    if (!(isMockApi && mockJourneySequenceApi)) return []
    return mockJourneySequenceApi.listAudit(tripId)
  },

  previewStops(tripId: string, orderedPickupJobIds: string[]) {
    if (isMockApi && mockJourneySequenceApi) {
      return mockJourneySequenceApi.previewStops(tripId, orderedPickupJobIds)
    }
    const { trip, siblings } = requireCachedTrip(tripId)
    const recalculated = recalculatePickupTimes(trip.jobs, orderedPickupJobIds)
    return buildWorkspace(trip, siblings, recalculated).stops
  },

  previewReorder(tripId: string, orderedPickupJobIds: string[], linked: LinkedReturnDecision) {
    if (isMockApi && mockJourneySequenceApi) {
      return mockJourneySequenceApi.previewReorder(tripId, orderedPickupJobIds, linked)
    }
    const { trip, siblings } = requireCachedTrip(tripId)
    return buildLivePreview(trip, siblings, orderedPickupJobIds, linked)
  },

  async commitReorder(input: SequenceCommitInput & { dutyId?: string | null }) {
    if (isMockApi && mockJourneySequenceApi) return mockJourneySequenceApi.commitReorder(input)

    const preview = journeySequenceApi.previewReorder(
      input.tripId,
      input.orderedPickupJobIds,
      input.linkedReturnDecision,
    )
    const result = await api.commitJourneySequenceReorder({
      tripId: input.tripId,
      orderedPickupJobIds: input.orderedPickupJobIds,
      reason: input.reason,
      reasonNotes: input.reasonNotes,
      linkedReturnDecision: input.linkedReturnDecision,
      sendNotifications: input.sendNotifications,
      actorName: input.actorName,
      dutyId: input.dutyId ?? null,
    })

    if (result.trip) {
      cacheTrips(result.trip, [result.trip])
    }

    return {
      trip: result.trip,
      preview,
      audit: {
        id: result.auditId,
        at: new Date().toISOString(),
        actorName: input.actorName,
        tripId: input.tripId,
        tripReference: preview.tripReference,
        summary: preview.movedPassengerName
          ? `${preview.movedPassengerName}: pickup position ${preview.oldPosition} → ${preview.newPosition}`
          : 'Run sequence reorganised',
        reason: input.reason,
        reasonNotes: input.reasonNotes,
        linkedReturnDecision: input.linkedReturnDecision,
        notificationsSent: input.sendNotifications
          ? preview.notifications.filter((n) => n.notify).map((n) => n.audience)
          : [],
        acknowledgementRequired: Boolean(result.acknowledgement),
        originalPickupOrder: result.originalOrder,
        newPickupOrder: result.newOrder,
      },
      acknowledgement: result.acknowledgement ?? null,
    }
  },

  async advanceAcknowledgement(
    tripId: string,
    status: 'viewed' | 'acknowledged' | 'declined',
    declineReason?: DriverDeclineReason,
  ) {
    if (isMockApi && mockJourneySequenceApi) {
      return mockJourneySequenceApi.advanceAcknowledgement(tripId, status, declineReason)
    }
    const result = await api.advanceJourneySequenceAcknowledgement({
      tripId,
      status,
      declineReason,
    })
    return result.acknowledgement
  },

  findLinkedReturnForJob(tripId: string, jobId: string) {
    if (isMockApi && mockJourneySequenceApi) {
      return mockJourneySequenceApi.findLinkedReturnForJob(tripId, jobId)
    }
    const { trip, siblings } = requireCachedTrip(tripId)
    const job = trip.jobs.find((j) => j.id === jobId)
    if (!job) return null
    return findLinkedReturn(trip, job, siblings)
  },

  listDestinationRuns(tripId: string, dutyId?: string | null) {
    if (isMockApi && mockJourneySequenceApi) return mockJourneySequenceApi.listDestinationRuns(tripId)
    return api.listJourneySequenceDestinations(tripId, dutyId)
  },

  previewMove(input: {
    sourceTripId: string
    jobIds: string[]
    action: MoveJourneyAction
    destinationTripId: string | null
  }) {
    if (isMockApi && mockJourneySequenceApi) return mockJourneySequenceApi.previewMove(input)
    const { trip: sourceTrip, siblings } = requireCachedTrip(input.sourceTripId)
    const jobs = sourceTrip.jobs.filter((j) => input.jobIds.includes(j.id))
    const destinationTrip = input.destinationTripId
      ? siblings.find((t) => t.id === input.destinationTripId) ??
        liveTripCache.get(input.destinationTripId)?.trip ??
        null
      : null
    const { checks, blocked, suggestedOptions } = evaluateMoveChecks({
      sourceTrip,
      destinationTrip,
      jobs,
      action: input.action,
    })
    return {
      sourceTripId: input.sourceTripId,
      destinationTripId: input.destinationTripId ?? null,
      action: input.action,
      jobIds: input.jobIds,
      passengerNames: jobs.map((j) => j.passengerName),
      checks,
      blocked,
      suggestedOptions,
    }
  },

  async commitMove(input: {
    sourceTripId: string
    jobIds: string[]
    action: MoveJourneyAction
    destinationTripId: string | null
    actorName: string
    reason: string
    dutyId?: string | null
  }) {
    if (isMockApi && mockJourneySequenceApi) return mockJourneySequenceApi.commitMove(input)
    const preview = journeySequenceApi.previewMove(input)
    if (preview.blocked) {
      throw new Error(preview.checks.find((c) => c.level === 'error')?.message ?? 'Cannot move journey')
    }
    const result = await api.commitJourneySequenceMove({
      tripId: input.sourceTripId,
      jobIds: input.jobIds,
      action: input.action,
      destinationTripId: input.destinationTripId,
      actorName: input.actorName,
      reason: input.reason,
      dutyId: input.dutyId ?? null,
    })
    if (result.trip) cacheTrips(result.trip, [result.trip])
    return {
      message: result.message,
      destinationTripId: result.destinationRunId,
    }
  },
}
