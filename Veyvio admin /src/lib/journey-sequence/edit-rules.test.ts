import { describe, expect, it } from 'vitest'
import {
  canReorderSequence,
  canSaveWithoutNotify,
  sequenceEditCapability,
} from './edit-rules'

describe('sequenceEditCapability', () => {
  it('allows full edit for planned trips', () => {
    expect(sequenceEditCapability('planned')).toBe('full')
    expect(canReorderSequence('full')).toBe(true)
    expect(canSaveWithoutNotify('full')).toBe(true)
  })

  it('requires notify for assigned trips', () => {
    expect(sequenceEditCapability('assigned')).toBe('notify_required')
    expect(canSaveWithoutNotify('notify_required')).toBe(false)
  })

  it('warns for active trips and blocks save-without-send', () => {
    expect(sequenceEditCapability('in_progress')).toBe('active_warning')
    expect(canReorderSequence('active_warning')).toBe(true)
    expect(canSaveWithoutNotify('active_warning')).toBe(false)
  })

  it('limits completed and cancelled trips', () => {
    expect(sequenceEditCapability('completed')).toBe('correction_only')
    expect(canReorderSequence('correction_only')).toBe(false)
    expect(sequenceEditCapability('cancelled')).toBe('reinstate_only')
  })
})
