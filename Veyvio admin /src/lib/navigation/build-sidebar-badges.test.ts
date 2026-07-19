import { describe, expect, it } from 'vitest'
import type { BookingListItem } from '@/lib/bookings/types'
import type { DutyRecord } from '@/lib/api/types'
import type { OperationalException } from '@/lib/types'
import type { OperationalTrip } from '@/lib/transfers/types'
import { applySidebarBadges, buildSidebarBadges } from './build-sidebar-badges'

function booking(partial: Partial<BookingListItem>): BookingListItem {
  return {
    id: 'b1',
    reference: 'BK-1',
    customerName: 'Acme',
    passengerSummary: '1 pax',
    bookingType: 'one_way',
    firstJourneyDate: '2026-07-18',
    tripCount: 1,
    serviceRequirement: 'standard',
    status: 'confirmed',
    schedulingStatus: 'assigned',
    billingStatus: 'ok',
    depotName: null,
    warningCount: 0,
    owner: null,
    ...partial,
  }
}

describe('buildSidebarBadges', () => {
  it('builds attention badges from live inputs and omits zeros', () => {
    const exceptions: OperationalException[] = [
      {
        id: 'ex-1',
        title: 'VOR',
        category: 'vehicle',
        severity: 'critical',
        status: 'new',
        module: 'vehicle',
        ageMinutes: 10,
      } as OperationalException,
    ]

    const duties: DutyRecord[] = [
      {
        id: 'd1',
        reference: 'R1',
        dutyDate: '2026-07-18',
        startTime: '09:00',
        status: 'unassigned',
        driver: null,
      },
      {
        id: 'd2',
        reference: 'R2',
        dutyDate: '2026-07-18',
        startTime: '10:00',
        status: 'in_progress',
        driver: { id: 'dr1', firstName: 'A', lastName: 'B' },
      },
    ]

    const trips: OperationalTrip[] = [
      { id: 't1', reference: 'T1', status: 'in_progress', delayMinutes: 0 } as OperationalTrip,
      { id: 't2', reference: 'T2', status: 'completed', delayMinutes: 0 } as OperationalTrip,
      { id: 't3', reference: 'T3', status: 'cancelled', delayMinutes: 0 } as OperationalTrip,
    ]

    const badges = buildSidebarBadges({
      openExceptions: exceptions,
      unreadNotifications: 3,
      bookings: [booking({ status: 'awaiting_approval' }), booking({ status: 'completed', id: 'b2' })],
      duties,
      trips,
      driversSummary: {
        totalActive: 40,
        eligibleToday: 30,
        notEligible: 2,
        documentsExpiringSoon: 1,
        invitePending: 0,
        onDuty: 10,
        onTrip: 5,
        suspendedOrRestricted: 0,
        appNotRecentlySynced: 0,
      },
      vehiclesSummary: {
        total: 50,
        totalActive: 45,
        availableNow: 20,
        currentlyAllocated: 10,
        inService: 10,
        attention: 4,
        vor: 1,
        inMaintenance: 3,
        checksOverdue: 0,
        complianceExpiring: 0,
        motDue: 0,
        tachographDue: 0,
        wheelRetorqueDue: 0,
        unknownLocation: 0,
      },
      depotCount: 2,
      openDefects: 5,
      openIncidents: 1,
      unreadMessages: 0,
      pendingLeaveRequests: 2,
      attendanceAttention: 4,
    })

    expect(badges['/exceptions']).toEqual({ count: 1, tone: 'danger' })
    expect(badges['/time-off']).toEqual({ count: 2, tone: 'warning' })
    expect(badges['/attendance']).toEqual({ count: 4, tone: 'warning' })
    expect(badges['/notifications']).toEqual({ count: 3, tone: 'success' })
    expect(badges['/bookings']).toEqual({ count: 1, tone: 'warning' })
    expect(badges['/dispatch']).toEqual({ count: 1, tone: 'warning' })
    expect(badges['/runs']).toEqual({ count: 1, tone: 'info' })
    expect(badges.Trips?.count).toBe(3)
    expect(badges['/trips?status=active']?.count).toBe(1)
    expect(badges['/trips?status=completed']?.count).toBe(1)
    expect(badges['/trips?status=cancelled']?.count).toBe(1)
    expect(badges['/drivers']).toEqual({ count: 3, tone: 'warning' })
    expect(badges['/vehicles']).toEqual({ count: 5, tone: 'warning' })
    expect(badges['/depots']).toEqual({ count: 2 })
    expect(badges['/defects']).toEqual({ count: 5, tone: 'warning' })
    expect(badges['/incidents']).toEqual({ count: 1, tone: 'danger' })
    expect(badges['/messages']).toBeUndefined()
  })

  it('applies badges onto nav items by href and label', () => {
    const items = applySidebarBadges(
      [
        { label: 'Exceptions', href: '/exceptions', icon: () => null },
        {
          label: 'Trips',
          icon: () => null,
          children: [
            { label: 'Active', href: '/trips?status=active' },
            { label: 'All trips', href: '/trips' },
          ],
        },
      ],
      {
        '/exceptions': { count: 4, tone: 'danger' },
        Trips: { count: 12 },
        '/trips?status=active': { count: 7, tone: 'info' },
      },
    )

    expect(items[0].badge).toBe(4)
    expect(items[0].badgeTone).toBe('danger')
    expect(items[1].badge).toBe(12)
    expect(items[1].children?.[0].badge).toBe(7)
    expect(items[1].children?.[1].badge).toBeUndefined()
  })
})
