import { isMockApi } from '@/lib/api/config'
import type { OperationalTrip } from '@/lib/transfers/types'
import { buildWorkspace } from './build-sequence'
import { mockJourneySequenceApi } from './mock-hub'
import type {
  DriverDeclineReason,
  JourneySequenceWorkspace,
  LinkedReturnDecision,
  MoveJourneyAction,
  SequenceCommitInput,
} from './types'

export const JOURNEY_SEQUENCE_LIVE_BLOCKED =
  'Journey sequence changes are view-only until the Command workspace API is live. Mock reorder is not used in production.'

/** Mock-backed mutate path only — production is read-only projection. */
export function isJourneySequenceWritable(): boolean {
  return isMockApi
}

export function projectJourneyWorkspace(
  trip: OperationalTrip,
  siblings: OperationalTrip[] = [],
): JourneySequenceWorkspace {
  return {
    ...buildWorkspace(trip, siblings.length ? siblings : [trip]),
    acknowledgement: null,
  }
}

export const journeySequenceApi = {
  getWorkspace(tripId: string): JourneySequenceWorkspace {
    if (!isMockApi) {
      throw new Error(JOURNEY_SEQUENCE_LIVE_BLOCKED)
    }
    return mockJourneySequenceApi.getWorkspace(tripId)
  },

  ensureWorkspaceFromTrips(trip: OperationalTrip, siblings: OperationalTrip[]): JourneySequenceWorkspace {
    if (isMockApi) {
      return mockJourneySequenceApi.ensureWorkspaceFromTrips(trip, siblings)
    }
    return projectJourneyWorkspace(trip, siblings)
  },

  listAudit(tripId: string) {
    if (!isMockApi) return []
    return mockJourneySequenceApi.listAudit(tripId)
  },

  previewStops(tripId: string, orderedPickupJobIds: string[]) {
    if (!isMockApi) {
      throw new Error(JOURNEY_SEQUENCE_LIVE_BLOCKED)
    }
    return mockJourneySequenceApi.previewStops(tripId, orderedPickupJobIds)
  },

  previewReorder(tripId: string, orderedPickupJobIds: string[], linked: LinkedReturnDecision) {
    if (!isMockApi) {
      throw new Error(JOURNEY_SEQUENCE_LIVE_BLOCKED)
    }
    return mockJourneySequenceApi.previewReorder(tripId, orderedPickupJobIds, linked)
  },

  commitReorder(input: SequenceCommitInput) {
    if (!isMockApi) {
      throw new Error(JOURNEY_SEQUENCE_LIVE_BLOCKED)
    }
    return mockJourneySequenceApi.commitReorder(input)
  },

  advanceAcknowledgement(
    tripId: string,
    status: 'viewed' | 'acknowledged' | 'declined',
    declineReason?: DriverDeclineReason,
  ) {
    if (!isMockApi) {
      throw new Error(JOURNEY_SEQUENCE_LIVE_BLOCKED)
    }
    return mockJourneySequenceApi.advanceAcknowledgement(tripId, status, declineReason)
  },

  findLinkedReturnForJob(tripId: string, jobId: string) {
    if (!isMockApi) return null
    return mockJourneySequenceApi.findLinkedReturnForJob(tripId, jobId)
  },

  listDestinationRuns(tripId: string) {
    if (!isMockApi) return []
    return mockJourneySequenceApi.listDestinationRuns(tripId)
  },

  previewMove(input: {
    sourceTripId: string
    jobIds: string[]
    action: MoveJourneyAction
    destinationTripId: string | null
  }) {
    if (!isMockApi) {
      throw new Error(JOURNEY_SEQUENCE_LIVE_BLOCKED)
    }
    return mockJourneySequenceApi.previewMove(input)
  },

  commitMove(input: {
    sourceTripId: string
    jobIds: string[]
    action: MoveJourneyAction
    destinationTripId: string | null
    actorName: string
    reason: string
  }) {
    if (!isMockApi) {
      throw new Error(JOURNEY_SEQUENCE_LIVE_BLOCKED)
    }
    return mockJourneySequenceApi.commitMove(input)
  },
}
