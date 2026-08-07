import { useEffect, useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import {
  buildExceptionsInbox,
} from '@/lib/exceptions/build-exceptions-inbox'
import { isOpenException } from '@/lib/exceptions/exception-filters'
import { tKey } from '@/lib/tenant/tenant-query-scope'
import {
  buildSidebarBadges,
  countUnreadMessages,
  type SidebarBadgeMap,
} from '@/lib/navigation/build-sidebar-badges'

/** Badge data is secondary chrome — do not refetch on every route change. */
const BADGE_QUERY = {
  staleTime: 55_000,
  gcTime: 5 * 60_000,
  refetchInterval: 60_000,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  retry: 1,
  throwOnError: false,
} as const

/**
 * Sidebar badges previously fired ~15 Command API calls on every shell render
 * (often 7–8s wall time). Gate all badge traffic behind a short paint delay,
 * keep a tiny critical set, then load hubs in two deferred waves.
 */
export function useSidebarNavBadges(): SidebarBadgeMap {
  // 0 = wait for route paint, 1 = critical badges, 2 = exceptions wave, 3 = hubs wave
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    // Let the route's own data fetch go first (Incoming Interests, etc.).
    const start = window.setTimeout(() => setPhase(1), 350)
    const w1 = window.setTimeout(() => setPhase(2), 1_800)
    const w2 = window.setTimeout(() => setPhase(3), 4_000)
    return () => {
      window.clearTimeout(start)
      window.clearTimeout(w1)
      window.clearTimeout(w2)
    }
  }, [])

  const badgesEnabled = phase >= 1
  const wave1 = phase >= 2
  const wave2 = phase >= 3

  const critical = useQueries({
    queries: [
      {
        queryKey: tKey(['notifications-unread-count']),
        queryFn: () => api.getNotificationUnreadCount(),
        enabled: badgesEnabled,
        ...BADGE_QUERY,
      },
      {
        // Same key shape as IncomingInterestsPage with no filters → shared cache.
        queryKey: tKey(['interests', {}]),
        queryFn: () => api.getInterestSubmissions(),
        enabled: badgesEnabled,
        ...BADGE_QUERY,
      },
    ],
  })

  const heavyWave1 = useQueries({
    queries: [
      {
        queryKey: tKey(['dashboard']),
        queryFn: () => api.getDashboard(),
        enabled: wave1,
        ...BADGE_QUERY,
      },
      {
        queryKey: tKey(['defects', 'open']),
        queryFn: () => api.getDefects({ status: 'open' }),
        enabled: wave1,
        ...BADGE_QUERY,
      },
      {
        queryKey: tKey(['incidents', 'open']),
        queryFn: () => api.getIncidents({ status: 'open' }),
        enabled: wave1,
        ...BADGE_QUERY,
      },
      {
        queryKey: tKey(['driver-eligibility-exceptions']),
        queryFn: () => api.getDriverEligibilityExceptions(),
        enabled: wave1,
        ...BADGE_QUERY,
      },
      {
        queryKey: tKey(['vehicle-release-exceptions']),
        queryFn: () => api.getVehicleReleaseExceptions(),
        enabled: wave1,
        ...BADGE_QUERY,
      },
      {
        queryKey: tKey(['messages', 'inbox']),
        queryFn: () => api.getMessages({ folder: 'inbox' }),
        enabled: wave1,
        ...BADGE_QUERY,
      },
    ],
  })

  const heavyWave2 = useQueries({
    queries: [
      {
        queryKey: tKey(['bookings', 'sidebar']),
        queryFn: () => api.getBookings(),
        enabled: wave2,
        ...BADGE_QUERY,
      },
      {
        queryKey: tKey(['duties', 'today']),
        queryFn: () => api.getDuties(),
        enabled: wave2,
        ...BADGE_QUERY,
      },
      {
        queryKey: tKey(['operational-trips']),
        queryFn: () => api.getOperationalTrips(),
        enabled: wave2,
        ...BADGE_QUERY,
      },
      {
        queryKey: tKey(['driver-directory-summary']),
        queryFn: () => api.getDriverDirectorySummary(),
        enabled: wave2,
        ...BADGE_QUERY,
      },
      {
        queryKey: tKey(['vehicle-directory-summary']),
        queryFn: () => api.getVehicleDirectorySummary(),
        enabled: wave2,
        ...BADGE_QUERY,
      },
      {
        queryKey: tKey(['depots']),
        queryFn: () => api.getDepots(),
        enabled: wave2,
        ...BADGE_QUERY,
      },
      {
        queryKey: tKey(['maintenance-hub']),
        queryFn: () => api.getMaintenanceHub(),
        enabled: wave2,
        ...BADGE_QUERY,
      },
      {
        queryKey: tKey(['attendance-hub', 'sidebar']),
        queryFn: () => api.getAttendanceHub(),
        enabled: wave2,
        ...BADGE_QUERY,
      },
    ],
  })

  const [unreadQ, interestsQ] = critical
  const [dashboardQ, defectsQ, incidentsQ, driverExceptionsQ, vehicleExceptionsQ, messagesQ] =
    heavyWave1
  const [
    bookingsQ,
    dutiesQ,
    tripsQ,
    driversSummaryQ,
    vehiclesSummaryQ,
    depotsQ,
    maintenanceQ,
    attendanceQ,
  ] = heavyWave2

  return useMemo(() => {
    const inbox = buildExceptionsInbox({
      alerts: dashboardQ.data?.alerts,
      defects: defectsQ.data,
      incidents: incidentsQ.data,
      driverExceptions: driverExceptionsQ.data,
      vehicleExceptions: vehicleExceptionsQ.data,
      includeCatalog: false,
    })

    const hub = attendanceQ.data
    const leaveRequests = Array.isArray(hub?.leaveRequests) ? hub.leaveRequests : []
    const pendingLeave = leaveRequests.filter(
      (r) => r.status === 'pending' || r.status === 'moved',
    ).length
    const summary = hub?.summary
    const attendanceAttention =
      (summary?.late ?? 0) + (summary?.notArrived ?? 0) + (summary?.uncoveredDuties ?? 0)

    const awaitingReview = interestsQ.data?.summary?.awaitingReview ?? 0

    return {
      ...buildSidebarBadges({
        openExceptions: inbox.filter(isOpenException),
        unreadNotifications: unreadQ.data?.count ?? 0,
        bookings: bookingsQ.data,
        duties: dutiesQ.data,
        trips: tripsQ.data,
        driversSummary: driversSummaryQ.data,
        vehiclesSummary: vehiclesSummaryQ.data,
        depotCount: depotsQ.data?.length ?? 0,
        maintenance: maintenanceQ.data,
        openDefects: defectsQ.data?.length ?? dashboardQ.data?.openDefects ?? 0,
        openIncidents: incidentsQ.data?.length ?? dashboardQ.data?.openIncidents ?? 0,
        unreadMessages: countUnreadMessages(messagesQ.data),
        pendingLeaveRequests: pendingLeave,
        attendanceAttention,
      }),
      ...(awaitingReview > 0
        ? { '/interests': { count: awaitingReview, tone: 'info' as const } }
        : {}),
    }
  }, [
    unreadQ.data,
    interestsQ.data,
    dashboardQ.data,
    defectsQ.data,
    incidentsQ.data,
    driverExceptionsQ.data,
    vehicleExceptionsQ.data,
    bookingsQ.data,
    dutiesQ.data,
    tripsQ.data,
    driversSummaryQ.data,
    vehiclesSummaryQ.data,
    depotsQ.data,
    maintenanceQ.data,
    messagesQ.data,
    attendanceQ.data,
  ])
}
