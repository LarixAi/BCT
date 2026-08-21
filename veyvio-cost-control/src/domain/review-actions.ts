import { assertBalancedAllocations } from './allocation'
import { assertSameOrganisation, requireOrganisationId } from './tenancy'
import type {
  CostAllocation,
  CostEvidence,
  CostRecord,
  OrganisationId,
  ReviewItem,
  ReviewState,
} from './types'

/**
 * Cost review depth — Blueprint §8.2 / §10.
 * Approve / reject / request evidence / reallocate with balanced splits + immutable audit.
 */

export type AuditEvent = {
  id: string
  organisationId: OrganisationId
  actorId: string
  action: string
  entityType: string
  entityId: string
  reason: string | null
  beforeState: unknown
  afterState: unknown
  createdAt: string
}

export type ReviewDecision =
  | {
      type: 'approve'
      reason?: string
      /** Optional reallocation that must balance to cost gross. */
      allocations?: CostAllocation[]
      evidenceLabel?: string
    }
  | {
      type: 'reject'
      reason: string
    }
  | {
      type: 'request_evidence'
      reason: string
    }
  | {
      type: 'snooze'
      reason?: string
    }
  | {
      type: 'reallocate'
      reason: string
      allocations: CostAllocation[]
    }

export type ReviewActionResult = {
  review: ReviewItem
  cost: CostRecord
  audit: AuditEvent
}

export function applyReviewDecision(input: {
  organisationId: OrganisationId
  review: ReviewItem
  cost: CostRecord
  decision: ReviewDecision
  actorId?: string
  nowIso?: string
}): ReviewActionResult {
  const orgId = requireOrganisationId(input.organisationId)
  assertSameOrganisation(orgId, input.review.organisationId, 'review')
  assertSameOrganisation(orgId, input.cost.organisationId, 'cost')
  if (input.review.costId !== input.cost.id) {
    throw new Error('Review costId does not match cost record')
  }
  if (input.review.state !== 'open' && input.decision.type !== 'request_evidence') {
    throw new Error('Only open reviews can be decided (except evidence requests)')
  }

  const now = input.nowIso ?? new Date().toISOString()
  const actorId = input.actorId ?? 'finance_controller'
  const before = { review: input.review, cost: input.cost }

  let nextCost: CostRecord = { ...input.cost }
  let nextReview: ReviewItem = { ...input.review }
  let action = `review.${input.decision.type}`

  switch (input.decision.type) {
    case 'approve': {
      if (input.decision.allocations?.length) {
        assertBalancedAllocations(input.decision.allocations, input.cost.gross.amountMinor)
        nextCost = {
          ...nextCost,
          allocations: input.decision.allocations,
          version: nextCost.version + 1,
          updatedAt: now,
        }
      }
      if (input.decision.evidenceLabel?.trim()) {
        nextCost = attachEvidence(nextCost, input.decision.evidenceLabel.trim(), now)
      }
      nextCost = {
        ...nextCost,
        reviewState: 'approved',
        validationState: nextCost.validationState === 'quarantined' ? 'validated' : nextCost.validationState,
        updatedAt: now,
      }
      nextReview = {
        ...nextReview,
        state: 'approved',
        resolutionNote: input.decision.reason?.trim() || 'Approved',
        resolvedAt: now,
        resolvedBy: actorId,
      }
      break
    }
    case 'reject': {
      const reason = input.decision.reason.trim()
      if (!reason) throw new Error('Reject requires a reason')
      nextCost = {
        ...nextCost,
        reviewState: 'rejected',
        correctionReason: reason,
        version: nextCost.version + 1,
        updatedAt: now,
      }
      nextReview = {
        ...nextReview,
        state: 'rejected',
        resolutionNote: reason,
        resolvedAt: now,
        resolvedBy: actorId,
      }
      break
    }
    case 'request_evidence': {
      const reason = input.decision.reason.trim()
      if (!reason) throw new Error('Evidence request requires a reason')
      nextReview = {
        ...nextReview,
        state: 'open',
        detail: `${input.review.detail}\n\nEvidence requested: ${reason}`,
        resolutionNote: `Evidence requested: ${reason}`,
      }
      nextCost = {
        ...nextCost,
        reviewState: 'open',
        updatedAt: now,
      }
      action = 'review.request_evidence'
      break
    }
    case 'snooze': {
      nextReview = {
        ...nextReview,
        state: 'snoozed',
        resolutionNote: input.decision.reason?.trim() || 'Snoozed',
        resolvedAt: now,
        resolvedBy: actorId,
      }
      nextCost = { ...nextCost, reviewState: 'snoozed', updatedAt: now }
      break
    }
    case 'reallocate': {
      assertBalancedAllocations(input.decision.allocations, input.cost.gross.amountMinor)
      nextCost = {
        ...nextCost,
        allocations: input.decision.allocations,
        version: nextCost.version + 1,
        correctionReason: input.decision.reason.trim(),
        reviewState: 'approved',
        updatedAt: now,
      }
      nextReview = {
        ...nextReview,
        state: 'approved',
        resolutionNote: `Reallocated: ${input.decision.reason.trim()}`,
        resolvedAt: now,
        resolvedBy: actorId,
      }
      action = 'review.reallocate'
      break
    }
    default: {
      const _exhaustive: never = input.decision
      void _exhaustive
      throw new Error('Unknown review decision')
    }
  }

  const audit: AuditEvent = {
    id: crypto.randomUUID(),
    organisationId: orgId,
    actorId,
    action,
    entityType: 'review_item',
    entityId: input.review.id,
    reason: nextReview.resolutionNote ?? null,
    beforeState: before,
    afterState: { review: nextReview, cost: nextCost },
    createdAt: now,
  }

  return { review: nextReview, cost: nextCost, audit }
}

function attachEvidence(cost: CostRecord, label: string, now: string): CostRecord {
  const evidence: CostEvidence = {
    id: crypto.randomUUID(),
    label,
    sourceType: 'manual',
  }
  return {
    ...cost,
    evidence: [...cost.evidence, evidence],
    version: cost.version + 1,
    updatedAt: now,
  }
}

export function reviewStateFromDecision(decision: ReviewDecision): Exclude<ReviewState, 'none'> {
  if (decision.type === 'approve' || decision.type === 'reallocate') return 'approved'
  if (decision.type === 'reject') return 'rejected'
  if (decision.type === 'snooze') return 'snoozed'
  return 'open'
}
