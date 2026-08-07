import { describe, expect, it } from 'vitest'
import {
  applySimpleReviewDecision,
  parseSimpleReviewDecision,
} from './finance-review-decision'

describe('finance review decision helper', () => {
  it('parses supported decision types', () => {
    expect(parseSimpleReviewDecision({ type: 'approve' }).type).toBe('approve')
    expect(parseSimpleReviewDecision({ type: 'reject', reason: 'No invoice' })).toEqual({
      type: 'reject',
      reason: 'No invoice',
    })
  })

  it('applies approve and reject with audit', () => {
    const review = {
      id: 'rev-1',
      organisationId: 'org-1',
      costId: 'cost-1',
      signal: 'missing_evidence',
      title: 'Missing invoice',
      detail: 'Needs invoice',
      state: 'open' as const,
      resolutionNote: null,
      version: 1,
      createdAt: '2026-08-01T00:00:00.000Z',
    }
    const cost = {
      id: 'cost-1',
      organisationId: 'org-1',
      version: 3,
      reviewState: 'open' as const,
      validationState: 'validated',
      correctionReason: null,
      updatedAt: '2026-08-01T00:00:00.000Z',
    }

    const approved = applySimpleReviewDecision({
      organisationId: 'org-1',
      actorId: 'user-1',
      decision: { type: 'approve' },
      review,
      cost,
      nowIso: '2026-08-07T12:00:00.000Z',
      auditId: 'audit-1',
    })
    expect(approved.review.state).toBe('approved')
    expect(approved.cost.reviewState).toBe('approved')
    expect(approved.audit.action).toBe('review.approve')

    const rejected = applySimpleReviewDecision({
      organisationId: 'org-1',
      actorId: 'user-1',
      decision: { type: 'reject', reason: 'Duplicate' },
      review,
      cost,
      nowIso: '2026-08-07T12:00:00.000Z',
      auditId: 'audit-2',
    })
    expect(rejected.review.state).toBe('rejected')
    expect(rejected.cost.version).toBe(4)
    expect(rejected.cost.correctionReason).toBe('Duplicate')
  })
})
