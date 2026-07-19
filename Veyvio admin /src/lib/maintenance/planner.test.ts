import { describe, expect, it } from 'vitest'
import { filterPlannerRows, mapEventTypeToWorkOrderType } from './planner'
import type { ServiceScheduleItem } from './types'

const rows: ServiceScheduleItem[] = [
  {
    id: '1',
    vehicleId: 'veh-1',
    registrationNumber: 'AB12 CDE',
    depot: 'Wembley Depot',
    serviceType: 'Scheduled service',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    dueMileage: null,
    currentMileage: null,
    milesRemaining: null,
    status: 'due_soon',
    workshop: null,
    owner: 'Fleet Workshop',
    source: 'profile',
  },
  {
    id: '2',
    vehicleId: 'veh-4',
    registrationNumber: 'CD34 EFG',
    depot: 'Croydon Depot',
    serviceType: 'PMI / safety inspection',
    dueDate: '2020-01-01',
    dueMileage: null,
    currentMileage: null,
    milesRemaining: null,
    status: 'overdue',
    workshop: 'Fleet Workshop',
    owner: 'Dave Wilson',
    source: 'work_order',
  },
]

describe('filterPlannerRows', () => {
  it('filters by depot and status', () => {
    const filtered = filterPlannerRows(rows, {
      depot: 'Croydon Depot',
      eventType: 'all',
      status: 'overdue',
      dueWindow: 'all',
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].registrationNumber).toBe('CD34 EFG')
  })

  it('filters by event type substring', () => {
    const filtered = filterPlannerRows(rows, {
      depot: 'all',
      eventType: 'pmi',
      status: 'all',
      dueWindow: 'all',
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].serviceType).toMatch(/PMI/i)
  })

  it('filters overdue due window', () => {
    const filtered = filterPlannerRows(rows, {
      depot: 'all',
      eventType: 'all',
      status: 'all',
      dueWindow: 'overdue',
    })
    expect(filtered.every((r) => r.status === 'overdue')).toBe(true)
  })
})

describe('mapEventTypeToWorkOrderType', () => {
  it('maps PMI and repair titles', () => {
    expect(mapEventTypeToWorkOrderType('PMI / safety')).toBe('pmi')
    expect(mapEventTypeToWorkOrderType('Brake system repair')).toBe('repair')
    expect(mapEventTypeToWorkOrderType('Scheduled service')).toBe('scheduled_service')
  })
})
