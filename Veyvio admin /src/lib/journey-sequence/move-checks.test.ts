import { describe, expect, it } from 'vitest'
import { mockTransfersApi } from '@/lib/api/mock-transfers'
import { evaluateMoveChecks } from './move-checks'

describe('evaluateMoveChecks', () => {
  it('blocks completed jobs', () => {
    const source = mockTransfersApi.getTrip('trip-1041')
    const completed = source.jobs.filter((j) => j.status === 'completed').slice(0, 1)
    const result = evaluateMoveChecks({
      sourceTrip: source,
      destinationTrip: mockTransfersApi.getTrip('trip-1058'),
      jobs: completed,
      action: 'move_to_run',
    })
    expect(result.blocked).toBe(true)
    expect(result.checks.some((c) => c.code === 'completed_job')).toBe(true)
  })

  it('allows move of unstarted job when capacity ok', () => {
    const source = mockTransfersApi.getTrip('trip-1058')
    const job = source.jobs.find((j) => !j.wheelchairRequired)!
    const result = evaluateMoveChecks({
      sourceTrip: source,
      destinationTrip: mockTransfersApi.getTrip('trip-1072'),
      jobs: [job],
      action: 'move_to_run',
    })
    expect(result.blocked).toBe(false)
  })
})
