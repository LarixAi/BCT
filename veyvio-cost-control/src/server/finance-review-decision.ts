/**
 * Durable Cost Control review decisions (approve / reject / snooze / request_evidence).
 * Kept Deno-compatible so finance-api can share the same rules as the SPA domain.
 */

export type SimpleReviewDecision =
  | { type: 'approve'; reason?: string }
  | { type: 'reject'; reason: string }
  | { type: 'snooze'; reason?: string }
  | { type: 'request_evidence'; reason: string }

export type ReviewRow = {
  id: string
  organisationId: string
  costId: string
  signal: string
  title: string
  detail: string
  state: 'open' | 'approved' | 'rejected' | 'snoozed'
  resolutionNote: string | null
  version: number
  createdAt: string
}

export type CostRowPatch = {
  id: string
  organisationId: string
  version: number
  reviewState: 'none' | 'open' | 'approved' | 'rejected' | 'snoozed'
  validationState: string
  correctionReason: string | null
  updatedAt: string
}

export type ReviewDecisionResult = {
  review: ReviewRow & {
    resolvedAt: string | null
    resolvedBy: string | null
  }
  cost: CostRowPatch
  audit: {
    id: string
    organisationId: string
    actorId: string
    action: string
    entityType: string
    entityId: string
    reason: string | null
    beforeState: unknown
    afterState: unknown
    createdAt: string
  }
}

export function parseSimpleReviewDecision(raw: unknown): SimpleReviewDecision {
  if (!raw || typeof raw !== 'object') throw new Error('decision_required')
  const decision = raw as Record<string, unknown>
  const type = String(decision.type ?? '')
  if (type === 'approve') {
    return { type: 'approve', reason: decision.reason != null ? String(decision.reason) : undefined }
  }
  if (type === 'reject') {
    const reason = String(decision.reason ?? '').trim()
    if (!reason) throw new Error('reject_requires_reason')
    return { type: 'reject', reason }
  }
  if (type === 'snooze') {
    return { type: 'snooze', reason: decision.reason != null ? String(decision.reason) : undefined }
  }
  if (type === 'request_evidence') {
    const reason = String(decision.reason ?? '').trim()
    if (!reason) throw new Error('evidence_requires_reason')
    return { type: 'request_evidence', reason }
  }
  throw new Error('unsupported_decision_type')
}

export function applySimpleReviewDecision(input: {
  organisationId: string
  review: ReviewRow
  cost: CostRowPatch
  decision: SimpleReviewDecision
  actorId: string
  nowIso?: string
  auditId?: string
}): ReviewDecisionResult {
  if (input.review.organisationId !== input.organisationId) {
    throw new Error('review_organisation_mismatch')
  }
  if (input.cost.organisationId !== input.organisationId) {
    throw new Error('cost_organisation_mismatch')
  }
  if (input.review.costId !== input.cost.id) {
    throw new Error('review_cost_mismatch')
  }
  if (input.review.state !== 'open' && input.decision.type !== 'request_evidence') {
    throw new Error('review_not_open')
  }

  const now = input.nowIso ?? new Date().toISOString()
  const before = { review: input.review, cost: input.cost }
  let nextCost: CostRowPatch = { ...input.cost, updatedAt: now }
  let nextReview: ReviewDecisionResult['review'] = {
    ...input.review,
    resolvedAt: null,
    resolvedBy: null,
  }
  let action = `review.${input.decision.type}`

  switch (input.decision.type) {
    case 'approve': {
      nextCost = {
        ...nextCost,
        reviewState: 'approved',
        validationState:
          nextCost.validationState === 'quarantined' ? 'validated' : nextCost.validationState,
      }
      nextReview = {
        ...nextReview,
        state: 'approved',
        resolutionNote: input.decision.reason?.trim() || 'Approved',
        resolvedAt: now,
        resolvedBy: input.actorId,
      }
      break
    }
    case 'reject': {
      nextCost = {
        ...nextCost,
        reviewState: 'rejected',
        correctionReason: input.decision.reason,
        version: nextCost.version + 1,
      }
      nextReview = {
        ...nextReview,
        state: 'rejected',
        resolutionNote: input.decision.reason,
        resolvedAt: now,
        resolvedBy: input.actorId,
      }
      break
    }
    case 'snooze': {
      nextCost = { ...nextCost, reviewState: 'snoozed' }
      nextReview = {
        ...nextReview,
        state: 'snoozed',
        resolutionNote: input.decision.reason?.trim() || 'Snoozed',
        resolvedAt: now,
        resolvedBy: input.actorId,
      }
      break
    }
    case 'request_evidence': {
      nextCost = { ...nextCost, reviewState: 'open' }
      nextReview = {
        ...nextReview,
        state: 'open',
        detail: `${input.review.detail}\n\nEvidence requested: ${input.decision.reason}`,
        resolutionNote: `Evidence requested: ${input.decision.reason}`,
        resolvedAt: null,
        resolvedBy: null,
      }
      action = 'review.request_evidence'
      break
    }
    default: {
      const _exhaustive: never = input.decision
      void _exhaustive
      throw new Error('unsupported_decision_type')
    }
  }

  return {
    review: nextReview,
    cost: nextCost,
    audit: {
      id: input.auditId ?? crypto.randomUUID(),
      organisationId: input.organisationId,
      actorId: input.actorId,
      action,
      entityType: 'review_item',
      entityId: input.review.id,
      reason: nextReview.resolutionNote,
      beforeState: before,
      afterState: { review: nextReview, cost: nextCost },
      createdAt: now,
    },
  }
}
