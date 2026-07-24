import { describe, expect, it } from 'vitest'
import {
  deriveRunLifecycle,
  runListRow,
  runWorkingTimeMinutes,
  validateRunPublish,
} from '@/lib/runs/run-register'
import type { DutyRecord } from '@/lib/api/types'

const baseDuty: DutyRecord = {
  id: 'duty-1',
  reference: 'SCH-PM-207',
  dutyDate: '2026-07-23',
  startTime: '14:30',
  endTime: '17:00',
  status: 'unassigned',
  publicationStatus: 'draft',
  driver: null,
  vehicle: null,
  route: { id: 'route-3', name: 'School PM Return' },
}

describe('run-register', () => {
  it('derives draft when unassigned', () => {
    expect(deriveRunLifecycle(baseDuty)).toBe('draft')
  })

  it('derives planned when crew assigned but not published', () => {
    const duty: DutyRecord = {
      ...baseDuty,
      status: 'assigned',
      driver: { id: 'drv-1', firstName: 'Jane', lastName: 'Smith' },
      vehicle: { id: 'veh-1', registrationNumber: 'AB12 CDE' },
      publicationStatus: 'ready_to_publish',
    }
    expect(deriveRunLifecycle(duty)).toBe('planned')
  })

  it('blocks publish without driver and vehicle', () => {
    const result = validateRunPublish(baseDuty, 1)
    expect(result.canPublish).toBe(false)
    expect(result.blockers.length).toBeGreaterThanOrEqual(2)
  })

  it('calculates working time from clock window', () => {
    expect(runWorkingTimeMinutes(baseDuty)).toBe(150)
  })

  it('maps list row with trip count', () => {
    const row = runListRow(
      {
        ...baseDuty,
        driver: { id: 'drv-1', firstName: 'Jane', lastName: 'Smith' },
        vehicle: { id: 'veh-1', registrationNumber: 'AB12 CDE' },
        passengerAssistant: { id: 'pa-1', firstName: 'Sam', lastName: 'Lee' },
      },
      { tripCount: 2, depotName: 'Wembley Depot' },
    )
    expect(row.tripCount).toBe(2)
    expect(row.passengerAssistantName).toBe('Sam Lee')
    expect(row.warning).toBeTruthy()
  })
})
