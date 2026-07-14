import type {
  DashboardAlert,
  DashboardSummary,
  LiveDispatchVehicle,
  ApiNotification,
  DefectRecord,
  IncidentRecord,
} from './types'
import type { ActiveOperation, KpiCard, NotificationItem, OperationalException, OperationalHealth } from '../types'

/** Map veymo admin portal hrefs to Veyvio Command routes */
export function mapCommandHref(href: string): string {
  return href
    .replace(/^\/admin\/operations\/dispatch/, '/dispatch')
    .replace(/^\/admin\/operations\/live-map/, '/live-operations')
    .replace(/^\/admin\/operations\/duties/, '/runs')
    .replace(/^\/admin\/fleet\/defects/, '/defects')
    .replace(/^\/admin\/fleet\/vehicles/, '/vehicles')
    .replace(/^\/admin\/people\/drivers/, '/drivers')
    .replace(/^\/admin\/incidents/, '/incidents')
    .replace(/^\/admin\/compliance/, '/compliance-rules')
    .replace(/^\/admin\/notifications/, '/notifications')
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function deriveOperationalHealth(alerts: DashboardAlert[]): OperationalHealth {
  if (alerts.some((a) => a.severity === 'danger' && a.category === 'safety')) return 'critical'
  if (alerts.some((a) => a.severity === 'danger')) return 'risk'
  if (alerts.some((a) => a.severity === 'warning')) return 'attention'
  return 'healthy'
}

export function buildOverviewKpis(summary: DashboardSummary, unassignedCount: number): Record<string, KpiCard[]> {
  const inProgress = summary.timeline.filter((t) => t.status === 'in_progress').length
  const completed = summary.timeline.filter((t) => t.status === 'completed').length

  return {
    operations: [
      {
        id: 'duties-active',
        label: 'Active duties today',
        value: summary.todaysActiveDuties,
        href: '/dispatch',
      },
      {
        id: 'duties-progress',
        label: 'Duties in progress',
        value: inProgress,
        href: '/live-operations',
      },
      {
        id: 'duties-completed',
        label: 'Completed',
        value: completed,
        tone: 'success',
        href: '/runs?status=completed',
      },
      {
        id: 'duties-unassigned',
        label: 'Unassigned duties',
        value: unassignedCount,
        tone: unassignedCount > 0 ? 'warning' : 'default',
        href: '/dispatch?filter=unassigned',
      },
    ],
    drivers: [
      {
        id: 'drivers-on-duty',
        label: 'Drivers on duty',
        value: summary.driversOnDuty,
        href: '/drivers?status=on-duty',
      },
    ],
    vehicles: [
      {
        id: 'vehicles-in-service',
        label: 'Vehicles in service',
        value: summary.vehiclesInService,
        tone: 'success',
        href: '/vehicles?status=in-service',
      },
      {
        id: 'vehicles-off-road',
        label: 'Vehicles off road (VOR)',
        value: summary.vehiclesOffRoad,
        tone: summary.vehiclesOffRoad > 0 ? 'danger' : 'default',
        href: '/vehicles?status=vor',
      },
    ],
    safety: [
      {
        id: 'open-incidents',
        label: 'Open incidents',
        value: summary.openIncidents,
        tone: summary.openIncidents > 0 ? 'warning' : 'default',
        href: '/incidents',
      },
      {
        id: 'open-defects',
        label: 'Open defects',
        value: summary.openDefects,
        tone: summary.openDefects > 0 ? 'warning' : 'default',
        href: '/defects?status=open',
      },
      {
        id: 'expiring-docs',
        label: 'Expiring documents (30d)',
        value: summary.expiringDocuments,
        tone: summary.expiringDocuments > 0 ? 'warning' : 'default',
        href: '/compliance-rules?filter=expiring',
      },
      {
        id: 'compliance-attention',
        label: 'Compliance attention',
        value: summary.navBadges.compliance,
        tone: summary.navBadges.compliance > 0 ? 'warning' : 'default',
        href: '/compliance-rules',
      },
    ],
  }
}

export function countUnassignedFromAlerts(alerts: DashboardAlert[]): number {
  const match = alerts.find((a) => a.title.includes('unassigned'))
  if (!match) return 0
  const num = parseInt(match.title, 10)
  return Number.isNaN(num) ? 0 : num
}

export function mapAlertToException(alert: DashboardAlert, index: number): OperationalException {
  const severityMap = { danger: 'critical', warning: 'high', info: 'medium' } as const
  const categoryMap = {
    compliance: 'compliance',
    operations: 'trip',
    fleet: 'vehicle',
    safety: 'passenger',
  } as const

  return {
    id: `alert-${index}`,
    severity: severityMap[alert.severity] ?? 'medium',
    title: alert.title,
    category: categoryMap[alert.category] ?? 'trip',
    relatedRecord: alert.title.split(' ').slice(0, 3).join(' '),
    relatedHref: mapCommandHref(alert.href),
    depot: '—',
    raisedAt: 'Today',
    ageMinutes: 0,
    slaMinutesRemaining: alert.severity === 'danger' ? 5 : null,
    owner: null,
    status: 'new',
    lastUpdate: 'Today',
    recommendedAction: alert.details?.[0],
  }
}

export function mapDefectToException(defect: DefectRecord): OperationalException {
  const severity =
    defect.severity === 'high' || defect.severity === 'critical' ? 'critical' : 'high'

  return {
    id: defect.id,
    severity,
    title: `${defect.severity} ${defect.category} defect`,
    category: 'vehicle',
    relatedRecord: defect.vehicle?.registrationNumber ?? 'Vehicle',
    relatedHref: `/defects/${defect.id}`,
    depot: '—',
    raisedAt: new Date(defect.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ageMinutes: Math.round((Date.now() - new Date(defect.createdAt).getTime()) / 60_000),
    slaMinutesRemaining: severity === 'critical' ? 5 : 15,
    owner: null,
    status: 'new',
    lastUpdate: new Date(defect.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    recommendedAction: defect.description ?? 'Review defect and assess vehicle availability',
  }
}

export function mapIncidentToException(incident: IncidentRecord): OperationalException {
  return {
    id: incident.id,
    severity: incident.isSafeguarding ? 'critical' : 'high',
    title: incident.title ?? incident.description ?? 'Open incident',
    category: 'passenger',
    relatedRecord: incident.id.slice(0, 8),
    relatedHref: `/incidents/${incident.id}`,
    depot: '—',
    raisedAt: new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ageMinutes: Math.round((Date.now() - new Date(incident.createdAt).getTime()) / 60_000),
    slaMinutesRemaining: incident.isSafeguarding ? 5 : 30,
    owner: null,
    status: 'new',
    lastUpdate: new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}

export function mapLiveVehicleToOperation(vehicle: LiveDispatchVehicle): ActiveOperation {
  const delayMinutes = vehicle.nextStop?.etaMinutes ?? 0
  const gpsFreshnessSeconds =
    vehicle.staleMinutes != null ? vehicle.staleMinutes * 60 : null

  const progress =
    vehicle.routeTotalStops > 0
      ? `${vehicle.routeCompletedStops} of ${vehicle.routeTotalStops}`
      : undefined

  return {
    id: vehicle.dutyId,
    type: 'run',
    reference: vehicle.reference,
    driver: vehicle.driverName ?? 'Unassigned',
    vehicle: vehicle.vehicleRegistration ?? '—',
    progress,
    currentState: formatDutyStatus(vehicle.status),
    eta: vehicle.nextStop?.pickupTime ?? undefined,
    delayMinutes: delayMinutes > 5 ? delayMinutes : 0,
    gpsFreshnessSeconds: vehicle.isStale ? null : gpsFreshnessSeconds,
    operationalState: vehicle.isStale ? 'GPS stale' : formatDutyStatus(vehicle.status),
    passengerOnboard: vehicle.status === 'passenger_boarded',
    wheelchair: false,
    escortRequired: false,
    hasException: vehicle.isStale || vehicle.status === 'incident_reported',
  }
}

function formatDutyStatus(status: string): string {
  return status.replace(/_/g, ' ')
}

export function mapApiNotification(notification: ApiNotification): NotificationItem {
  const priority =
    notification.type.includes('emergency') || notification.type.includes('safeguarding')
      ? 'urgent'
      : notification.type.includes('stale') || notification.type.includes('late')
        ? 'high'
        : 'normal'

  const category = notification.type.startsWith('tracking')
    ? 'operational'
    : notification.type.includes('defect')
      ? 'vehicle'
      : 'system'

  return {
    id: notification.id,
    category,
    title: notification.title,
    body: notification.body ?? '',
    relatedRecord: undefined,
    relatedHref: notification.link ? mapCommandHref(notification.link) : undefined,
    receivedAt: new Date(notification.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    priority,
    read: notification.readAt != null,
    acknowledged: notification.readAt != null,
    actionRequired: notification.readAt == null && priority !== 'normal',
    actions: notification.link
      ? [{ label: 'Open record', href: mapCommandHref(notification.link), variant: 'primary' as const }]
      : undefined,
  }
}

export function buildHealthSummary(summary: DashboardSummary, unassigned: number): string {
  const parts = [
    `${summary.todaysActiveDuties} active duties`,
    unassigned > 0 ? `${unassigned} unassigned` : null,
    summary.vehiclesOffRoad > 0 ? `${summary.vehiclesOffRoad} vehicles off road` : null,
    summary.openDefects > 0 ? `${summary.openDefects} open defects` : null,
  ].filter(Boolean)
  return parts.join(' · ')
}
