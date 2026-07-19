import { describe, expect, it } from 'vitest'
import {
  buildTripCompletionReport,
  buildDriverComplianceReport,
  buildYardOperationsReport,
  buildCommunicationsReport,
} from './build-standard-reports'

describe('standard report builders', () => {
  it('builds trip completion from duties', () => {
    const summary = buildTripCompletionReport({
      from: '2026-07-01',
      to: '2026-07-31',
      depotLabel: 'All depots',
      duties: [
        {
          id: '1',
          reference: 'A',
          dutyDate: '2026-07-10',
          startTime: '06:00',
          status: 'completed',
        },
        {
          id: '2',
          reference: 'B',
          dutyDate: '2026-07-10',
          startTime: '07:00',
          status: 'cancelled',
        },
        {
          id: '3',
          reference: 'C',
          dutyDate: '2026-07-10',
          startTime: '08:00',
          status: 'published',
        },
      ],
    })
    const byKey = Object.fromEntries(summary.metrics.map((m) => [m.key, m.value]))
    expect(byKey.planned).toBe(3)
    expect(byKey.completed).toBe(1)
    expect(byKey.cancelled).toBe(1)
    expect(byKey.incomplete).toBe(1)
    expect(summary.metrics.find((m) => m.key === 'no-show')?.gap).toBe(true)
  })

  it('builds driver compliance attention from not eligible', () => {
    const summary = buildDriverComplianceReport({
      from: '2026-07-19',
      to: '2026-07-19',
      depotLabel: 'All depots',
      drivers: {
        totalActive: 10,
        eligibleToday: 7,
        notEligible: 3,
        documentsExpiringSoon: 2,
        invitePending: 1,
        onDuty: 4,
        onTrip: 2,
        suspendedOrRestricted: 1,
        appNotRecentlySynced: 0,
      },
    })
    expect(summary.attention.some((a) => a.id === 'ne')).toBe(true)
    expect(summary.metrics.find((m) => m.key === 'not-eligible')?.value).toBe(3)
  })

  it('builds yard operations from hub summary', () => {
    const summary = buildYardOperationsReport({
      from: '2026-07-19',
      to: '2026-07-19',
      depotLabel: 'Wembley',
      yard: {
        summary: {
          onSite: 12,
          readyForService: 8,
          workRequired: 2,
          awaitingInspection: 1,
          vor: 1,
          departingSoon: 3,
          locationUnknown: 0,
        },
        vehicles: [],
        movements: [],
        auditEvents: [],
        tasks: [
          {
            id: 't1',
            depotId: 'd1',
            vehicleId: 'v1',
            registrationNumber: 'AB12 CDE',
            taskType: 'clean',
            title: 'Clean',
            priority: 'high',
            status: 'open',
            assignedStaffId: null,
            assignedStaffName: null,
            dueAt: null,
            instructions: null,
            evidenceRequired: false,
            blockingRelease: true,
            syncStatus: 'synced',
          },
        ],
        exceptions: [],
        handover: null,
        mapMarkers: [],
        depots: [],
        zones: [],
      } as never,
    })
    expect(summary.metrics.find((m) => m.key === 'on-site')?.value).toBe(12)
    expect(summary.metrics.find((m) => m.key === 'blocking')?.value).toBe(1)
    expect(summary.attention.some((a) => a.id === 'bt')).toBe(true)
  })

  it('builds communications unread counts', () => {
    const summary = buildCommunicationsReport({
      from: '2026-07-01',
      to: '2026-07-31',
      depotLabel: 'All depots',
      inbox: [
        {
          id: '1',
          subject: 'Hi',
          body: 'x',
          readAt: null,
          createdAt: '2026-07-10T10:00:00Z',
          sender: { id: 'a', firstName: 'A', lastName: 'B' },
          recipient: { id: 'c', firstName: 'C', lastName: 'D' },
        },
      ],
      sent: [],
      announcements: [],
      notifications: [
        {
          id: 'n1',
          tenantId: 't',
          userId: 'u',
          type: 'alert',
          title: 'Test',
          body: null,
          link: null,
          readAt: null,
          createdAt: '2026-07-10T11:00:00Z',
        },
      ],
    })
    expect(summary.metrics.find((m) => m.key === 'unread')?.value).toBe(1)
    expect(summary.metrics.find((m) => m.key === 'alerts-unread')?.value).toBe(1)
  })
})
