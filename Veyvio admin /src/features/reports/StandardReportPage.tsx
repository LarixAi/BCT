import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { useOperationalContext } from '@/lib/context'
import {
  STANDARD_REPORT_META,
  buildAuditActivityReport,
  buildChecksDefectsReport,
  buildCommunicationsReport,
  buildContractPerformanceReport,
  buildDriverComplianceReport,
  buildExceptionsReport,
  buildFleetAvailabilityReport,
  buildIncidentsReport,
  buildMaintenanceDueReport,
  buildOnTimeReport,
  buildTripCompletionReport,
  buildVorDowntimeReport,
  buildWorkingTimeReport,
  buildYardOperationsReport,
  isStandardReportId,
} from '@/lib/reports/build-standard-reports'
import type { ReportSummaryView, StandardReportId } from '@/lib/reports/types'
import { ReportPageShell } from './ReportPageShell'
import { tKey } from '@/lib/tenant/tenant-query-scope'


function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function monthStartIso() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function defaultRange(reportId: StandardReportId): { from: string; to: string } {
  if (
    reportId === 'on-time' ||
    reportId === 'trip-completion' ||
    reportId === 'working-time' ||
    reportId === 'contract-performance' ||
    reportId === 'communications' ||
    reportId === 'audit-activity'
  ) {
    return { from: monthStartIso(), to: todayIso() }
  }
  return { from: todayIso(), to: todayIso() }
}

export function StandardReportPage() {
  const { reportId = '' } = useParams()
  if (!isStandardReportId(reportId)) {
    return <Navigate to="/reports" replace />
  }

  return <StandardReportBody reportId={reportId} />
}

function StandardReportBody({ reportId }: { reportId: StandardReportId }) {
  const { depotId, depots, operationalDate } = useOperationalContext()
  const initial = defaultRange(reportId)
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const depotLabel = depots.find((d) => d.id === depotId)?.name ?? 'All depots'
  const meta = STANDARD_REPORT_META[reportId]
  const yardDepot = depotId && depotId !== 'all' ? depotId : undefined

  const results = useQueries({
    queries: [
      {
        queryKey: tKey(['dashboard']),
        queryFn: () => api.getDashboard(),
        enabled: ['exceptions', 'driver-compliance'].includes(reportId),
      },
      {
        queryKey: tKey(['duties', 'report', from, to]),
        queryFn: () => api.getDuties({ from, to }),
        enabled: ['on-time', 'trip-completion', 'working-time', 'contract-performance'].includes(reportId),
      },
      {
        queryKey: tKey(['performance', from, to]),
        queryFn: () => api.getPerformanceMetrics({ from, to }),
        enabled: ['on-time', 'contract-performance'].includes(reportId),
      },
      {
        queryKey: tKey(['driver-directory-summary']),
        queryFn: () => api.getDriverDirectorySummary(),
        enabled: ['driver-compliance', 'working-time'].includes(reportId),
      },
      {
        queryKey: tKey(['driver-eligibility-exceptions']),
        queryFn: () => api.getDriverEligibilityExceptions(),
        enabled: ['exceptions', 'driver-compliance'].includes(reportId),
      },
      {
        queryKey: tKey(['vehicle-release-exceptions']),
        queryFn: () => api.getVehicleReleaseExceptions(),
        enabled: reportId === 'exceptions',
      },
      {
        queryKey: tKey(['compliance-expiring']),
        queryFn: () => api.getComplianceExpiring(30),
        enabled: reportId === 'driver-compliance',
      },
      {
        queryKey: tKey(['vehicle-directory-summary']),
        queryFn: () => api.getVehicleDirectorySummary(),
        enabled: ['fleet-availability', 'vor-downtime'].includes(reportId),
      },
      {
        queryKey: tKey(['maintenance-hub']),
        queryFn: () => api.getMaintenanceHub(),
        enabled: ['fleet-availability', 'vor-downtime', 'maintenance-due'].includes(reportId),
      },
      {
        queryKey: tKey(['checks-hub']),
        queryFn: () => api.getChecksHub(),
        enabled: reportId === 'checks-defects',
      },
      {
        queryKey: tKey(['defects-hub']),
        queryFn: () => api.getDefectsHub(),
        enabled: ['checks-defects', 'vor-downtime'].includes(reportId),
      },
      {
        queryKey: tKey(['incidents-hub']),
        queryFn: () => api.getIncidentsHub(),
        enabled: reportId === 'incidents',
      },
      {
        queryKey: tKey(['contracts']),
        queryFn: () => api.getContracts(),
        enabled: reportId === 'contract-performance',
      },
      {
        queryKey: tKey(['yard-hub', yardDepot ?? 'default']),
        queryFn: () => api.getYardHub(yardDepot),
        enabled: reportId === 'yard-operations',
      },
      {
        queryKey: tKey(['messages', 'inbox']),
        queryFn: () => api.getMessages({ folder: 'inbox' }),
        enabled: reportId === 'communications',
      },
      {
        queryKey: tKey(['messages', 'sent']),
        queryFn: () => api.getMessages({ folder: 'sent' }),
        enabled: reportId === 'communications',
      },
      {
        queryKey: tKey(['announcements']),
        queryFn: () => api.getAnnouncements(),
        enabled: reportId === 'communications',
      },
      {
        queryKey: tKey(['notifications']),
        queryFn: () => api.getNotifications(),
        enabled: reportId === 'communications',
      },
      {
        queryKey: tKey(['audit-logs']),
        queryFn: () => api.getAuditLogs(),
        enabled: reportId === 'audit-activity',
      },
    ],
  })

  const [
    dashboardQ,
    dutiesQ,
    performanceQ,
    driversQ,
    driverExQ,
    vehicleExQ,
    complianceQ,
    vehiclesQ,
    maintenanceQ,
    checksQ,
    defectsQ,
    incidentsQ,
    contractsQ,
    yardQ,
    inboxQ,
    sentQ,
    announcementsQ,
    notificationsQ,
    auditQ,
  ] = results

  const loading = results.some((r) => r.isFetching)

  const summary: ReportSummaryView | null = useMemo(() => {
    switch (reportId) {
      case 'exceptions':
        return buildExceptionsReport({
          from,
          to,
          depotLabel,
          dashboard: dashboardQ.data,
          driverExceptions: driverExQ.data,
          vehicleExceptions: vehicleExQ.data,
        })
      case 'on-time':
        return buildOnTimeReport({
          from,
          to,
          depotLabel,
          performance: performanceQ.data,
          duties: dutiesQ.data,
        })
      case 'trip-completion':
        return buildTripCompletionReport({ from, to, depotLabel, duties: dutiesQ.data })
      case 'driver-compliance':
        return buildDriverComplianceReport({
          from,
          to,
          depotLabel,
          drivers: driversQ.data,
          driverExceptions: driverExQ.data,
          expiringCount: complianceQ.data?.items?.length,
        })
      case 'working-time':
        return buildWorkingTimeReport({
          from,
          to,
          depotLabel,
          duties: dutiesQ.data,
          drivers: driversQ.data,
        })
      case 'fleet-availability':
        return buildFleetAvailabilityReport({
          from,
          to,
          depotLabel,
          vehicles: vehiclesQ.data,
          maintenance: maintenanceQ.data,
        })
      case 'checks-defects':
        return buildChecksDefectsReport({
          from,
          to,
          depotLabel,
          checks: checksQ.data,
          defects: defectsQ.data,
        })
      case 'vor-downtime':
        return buildVorDowntimeReport({
          from,
          to,
          depotLabel,
          vehicles: vehiclesQ.data,
          defects: defectsQ.data,
          maintenance: maintenanceQ.data,
        })
      case 'maintenance-due':
        return buildMaintenanceDueReport({
          from,
          to,
          depotLabel,
          maintenance: maintenanceQ.data,
        })
      case 'incidents':
        return buildIncidentsReport({
          from,
          to,
          depotLabel,
          incidents: incidentsQ.data,
        })
      case 'contract-performance':
        return buildContractPerformanceReport({
          from,
          to,
          depotLabel,
          contracts: contractsQ.data,
          performance: performanceQ.data,
          duties: dutiesQ.data,
        })
      case 'yard-operations':
        return buildYardOperationsReport({
          from,
          to,
          depotLabel,
          yard: yardQ.data,
        })
      case 'communications':
        return buildCommunicationsReport({
          from,
          to,
          depotLabel,
          inbox: inboxQ.data,
          sent: sentQ.data,
          announcements: announcementsQ.data,
          notifications: notificationsQ.data,
        })
      case 'audit-activity':
        return buildAuditActivityReport({
          from,
          to,
          depotLabel,
          logs: auditQ.data,
        })
      default:
        return null
    }
  }, [
    reportId,
    from,
    to,
    depotLabel,
    dashboardQ.data,
    dutiesQ.data,
    performanceQ.data,
    driversQ.data,
    driverExQ.data,
    vehicleExQ.data,
    complianceQ.data,
    vehiclesQ.data,
    maintenanceQ.data,
    checksQ.data,
    defectsQ.data,
    incidentsQ.data,
    contractsQ.data,
    yardQ.data,
    inboxQ.data,
    sentQ.data,
    announcementsQ.data,
    notificationsQ.data,
    auditQ.data,
  ])

  return (
    <ReportPageShell
      title={meta.title}
      subtitle={meta.subtitle}
      from={from}
      to={to}
      onFromChange={setFrom}
      onToChange={setTo}
      summary={summary}
      loading={loading}
      operationalDate={operationalDate}
      relatedLinks={meta.related}
    />
  )
}
