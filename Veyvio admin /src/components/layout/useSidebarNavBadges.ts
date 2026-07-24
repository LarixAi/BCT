import { useMemo } from 'react'
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

const REFETCH_MS = 60_000

export function useSidebarNavBadges(): SidebarBadgeMap {
  const results = useQueries({
    queries: [
      {
        queryKey: tKey(['notifications-unread-count']),
        queryFn: () => api.getNotificationUnreadCount(),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['dashboard']),
        queryFn: () => api.getDashboard(),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['defects', 'open']),
        queryFn: () => api.getDefects({ status: 'open' }),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['incidents', 'open']),
        queryFn: () => api.getIncidents({ status: 'open' }),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['driver-eligibility-exceptions']),
        queryFn: () => api.getDriverEligibilityExceptions(),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['vehicle-release-exceptions']),
        queryFn: () => api.getVehicleReleaseExceptions(),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['bookings', 'sidebar']),
        queryFn: () => api.getBookings(),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['duties', 'today']),
        queryFn: () => api.getDuties(),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['operational-trips']),
        queryFn: () => api.getOperationalTrips(),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['driver-directory-summary']),
        queryFn: () => api.getDriverDirectorySummary(),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['vehicle-directory-summary']),
        queryFn: () => api.getVehicleDirectorySummary(),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['depots']),
        queryFn: () => api.getDepots(),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['maintenance-hub']),
        queryFn: () => api.getMaintenanceHub(),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['messages', 'inbox']),
        queryFn: () => api.getMessages({ folder: 'inbox' }),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['attendance-hub', 'sidebar']),
        queryFn: () => api.getAttendanceHub(),
        refetchInterval: REFETCH_MS,
        // Never let a bad attendance payload take down the whole Command shell.
        retry: 1,
        throwOnError: false,
      },
    ],
  })

  const [
    unreadQ,
    dashboardQ,
    defectsQ,
    incidentsQ,
    driverExceptionsQ,
    vehicleExceptionsQ,
    bookingsQ,
    dutiesQ,
    tripsQ,
    driversSummaryQ,
    vehiclesSummaryQ,
    depotsQ,
    maintenanceQ,
    messagesQ,
    attendanceQ,
  ] = results

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

    return buildSidebarBadges({
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
    })
  }, [
    unreadQ.data,
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
