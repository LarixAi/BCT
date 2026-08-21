import { describe, expect, it } from 'vitest'
import { parseOptionalModelYear, safeMaintenanceHub } from './safe-hubs'
import type { MaintenanceHubData } from '@/lib/maintenance/types'

describe('parseOptionalModelYear', () => {
  it('keeps finite numbers', () => {
    expect(parseOptionalModelYear(2019)).toBe(2019)
  })

  it('parses numeric strings without comparing number | null to empty string', () => {
    expect(parseOptionalModelYear('2021')).toBe(2021)
    expect(parseOptionalModelYear('')).toBeNull()
    expect(parseOptionalModelYear('  ')).toBeNull()
  })

  it('rejects non-year values', () => {
    expect(parseOptionalModelYear(null)).toBeNull()
    expect(parseOptionalModelYear(undefined)).toBeNull()
    expect(parseOptionalModelYear('Sprinter')).toBeNull()
    expect(parseOptionalModelYear(Number.NaN)).toBeNull()
  })
})

describe('safeMaintenanceHub date columns', () => {
  it('maps requestedDate / scheduledStart onto scheduledDate for the Due column', () => {
    const hub = safeMaintenanceHub({
      summary: undefined,
      workOrders: [
        {
          workOrderId: 'wo-1',
          vehicleId: 'v1',
          registrationNumber: 'AB12 CDE',
          fleetNumber: null,
          depot: 'Depot',
          title: 'WO-1',
          type: 'repair',
          status: 'scheduled',
          requestedDate: '2026-08-20T09:00:00.000Z',
        } as MaintenanceHubData['workOrders'][number] & { requestedDate: string },
      ],
    } as unknown as MaintenanceHubData)
    expect(hub.workOrders[0]?.scheduledDate).toBe('2026-08-20T09:00:00.000Z')
    expect(hub.workOrders[0]?.createdAt).toBeTruthy()
  })
})
