import type { DashboardSummary, DutyRecord, LiveDispatchResponse } from '@/lib/api/types'
import type { ChecksHubData } from '@/lib/checks/types'
import type { DefectsHubData } from '@/lib/defects/types'
import type { DriverDirectorySummary } from '@/lib/drivers/types'
import type { VehicleDirectorySummary } from '@/lib/vehicles/types'
import type { YardHubData } from '@/lib/yard/types'
import type { DailyOperationsSummary, ReportAttentionItem } from './types'

function isCompletedDuty(status: string) {
  const s = status.toLowerCase()
  return s.includes('complete') || s.includes('signed_off') || s === 'closed'
}

function isCancelledDuty(status: string) {
  return status.toLowerCase().includes('cancel')
}

function isActiveDuty(status: string) {
  const s = status.toLowerCase()
  return (
    s.includes('in_progress') ||
    s.includes('on_duty') ||
    s.includes('signed_on') ||
    s.includes('active') ||
    s.includes('en_route')
  )
}

function isUnassigned(duty: DutyRecord) {
  return !duty.driver?.id || !duty.vehicle?.id
}

export function buildDailyOperationsSummary(input: {
  from: string
  to: string
  depotLabel: string
  dashboard?: DashboardSummary | null
  duties?: DutyRecord[] | null
  live?: LiveDispatchResponse | null
  checks?: ChecksHubData | null
  defects?: DefectsHubData | null
  drivers?: DriverDirectorySummary | null
  vehicles?: VehicleDirectorySummary | null
  yard?: YardHubData | null
}): DailyOperationsSummary {
  const duties = input.duties ?? []
  const inPeriod = duties.filter((d) => d.dutyDate >= input.from && d.dutyDate <= input.to)

  const planned = inPeriod.length
  const completed = inPeriod.filter((d) => isCompletedDuty(d.status) || isCompletedDuty(d.driverLifecycleStatus ?? '')).length
  const cancelled = inPeriod.filter((d) => isCancelledDuty(d.status)).length
  const active = inPeriod.filter((d) => isActiveDuty(d.status) || isActiveDuty(d.driverLifecycleStatus ?? '')).length
  const unassigned = inPeriod.filter(isUnassigned).length
  const needsAck = inPeriod.filter(
    (d) =>
      d.acknowledgementRequired &&
      String(d.driverLifecycleStatus ?? '').toLowerCase() !== 'acknowledged' &&
      !isCompletedDuty(d.status),
  ).length

  const openDefects = input.defects?.summary.openDefects ?? input.dashboard?.openDefects ?? 0
  const safetyCritical = input.defects?.summary.safetyCritical ?? 0
  const vehiclesVor =
    input.defects?.summary.vehiclesVor ??
    input.vehicles?.vor ??
    input.dashboard?.vehiclesOffRoad ??
    0
  const openIncidents = input.dashboard?.openIncidents ?? 0
  const checksDue = input.checks?.summary.missingOrOverdue ?? 0
  const checksInProgress = input.checks?.summary.checksInProgress ?? 0
  const checksActionRequired = input.checks?.summary.actionRequired ?? 0
  const checksReady = input.checks?.summary.vehiclesReady ?? 0
  const driversNotEligible = input.drivers?.notEligible ?? 0
  const documentsExpiring =
    input.drivers?.documentsExpiringSoon ?? input.dashboard?.expiringDocuments ?? 0
  const liveVehicles = input.live?.vehicles?.length ?? 0
  const staleGps = input.live?.vehicles?.filter((v) => v.isStale).length ?? 0
  const yardVor = input.yard?.summary?.vor ?? 0

  const attention: ReportAttentionItem[] = []
  if (safetyCritical > 0) {
    attention.push({
      id: 'safety-defects',
      label: 'Safety-critical defects open',
      count: safetyCritical,
      href: '/defects?severity=critical',
      severity: 'critical',
    })
  }
  if (vehiclesVor > 0 || yardVor > 0) {
    attention.push({
      id: 'vor',
      label: 'Vehicles currently VOR',
      count: Math.max(vehiclesVor, yardVor),
      href: '/vehicles/vor',
      severity: 'critical',
    })
  }
  if (unassigned > 0) {
    attention.push({
      id: 'unassigned',
      label: 'Duties missing driver or vehicle',
      count: unassigned,
      href: '/dispatch',
      severity: 'warning',
    })
  }
  if (needsAck > 0) {
    attention.push({
      id: 'ack',
      label: 'Duties awaiting driver acknowledgement',
      count: needsAck,
      href: '/runs',
      severity: 'warning',
    })
  }
  if (openIncidents > 0) {
    attention.push({
      id: 'incidents',
      label: 'Open incidents',
      count: openIncidents,
      href: '/incidents',
      severity: 'warning',
    })
  }
  if (driversNotEligible > 0) {
    attention.push({
      id: 'drivers-blocked',
      label: 'Drivers not eligible today',
      count: driversNotEligible,
      href: '/drivers',
      severity: 'warning',
    })
  }
  if (documentsExpiring > 0) {
    attention.push({
      id: 'docs',
      label: 'Driver documents expiring soon',
      count: documentsExpiring,
      href: '/drivers',
      severity: 'info',
    })
  }
  if (staleGps > 0) {
    attention.push({
      id: 'stale-gps',
      label: 'Live vehicles with stale GPS',
      count: staleGps,
      href: '/live-operations',
      severity: 'warning',
    })
  }

  for (const alert of input.dashboard?.alerts ?? []) {
    if (attention.length >= 8) break
    attention.push({
      id: `dash-${alert.title}`,
      label: alert.title,
      count: 1,
      href: alert.href || '/overview',
      severity: alert.severity === 'danger' ? 'critical' : alert.severity === 'warning' ? 'warning' : 'info',
    })
  }

  const dataQuality: string[] = []
  if (planned === 0) {
    dataQuality.push('No duties in this period — totals may understate planned work.')
  }
  if (!input.checks) {
    dataQuality.push('Vehicle check hub unavailable — check compliance figures may be incomplete.')
  }
  if (!input.live?.trackingEnabled) {
    dataQuality.push('Live tracking is not enabled — GPS stale counts may be empty.')
  }
  dataQuality.push(
    'Passenger boarded / no-show / handover outcomes are not yet in the shared reporting layer.',
  )
  dataQuality.push(
    'Punctuality tolerances by contract are not configured — on-time % is not calculated here.',
  )

  return {
    period: { from: input.from, to: input.to },
    generatedAt: new Date().toISOString(),
    depotLabel: input.depotLabel,
    metrics: [
      { key: 'planned', label: 'Planned duties', value: planned, href: '/runs' },
      { key: 'active', label: 'Active duties', value: active || input.dashboard?.todaysActiveDuties || 0, href: '/live-operations' },
      { key: 'completed', label: 'Completed duties', value: completed, href: '/runs', gap: completed === 0 && planned > 0 },
      { key: 'cancelled', label: 'Cancelled duties', value: cancelled, href: '/runs' },
      { key: 'unassigned', label: 'Unassigned work', value: unassigned, href: '/dispatch' },
      { key: 'needs-ack', label: 'Awaiting acknowledgement', value: needsAck, href: '/runs' },
      { key: 'open-defects', label: 'Open defects', value: openDefects, href: '/defects' },
      { key: 'safety-critical', label: 'Safety-critical defects', value: safetyCritical, href: '/defects' },
      { key: 'vor', label: 'Vehicles VOR', value: vehiclesVor, href: '/vehicles/vor' },
      { key: 'incidents', label: 'Open incidents', value: openIncidents, href: '/incidents' },
      {
        key: 'checks-ready',
        label: 'Vehicles check-ready',
        value: checksReady,
        href: '/vehicle-checks',
        gap: input.checks == null,
      },
      {
        key: 'checks-progress',
        label: 'Checks in progress',
        value: checksInProgress,
        href: '/vehicle-checks',
      },
      {
        key: 'checks-action',
        label: 'Checks needing action',
        value: checksActionRequired,
        href: '/vehicle-checks',
      },
      {
        key: 'checks-missed',
        label: 'Checks missing / overdue',
        value: checksDue,
        href: '/vehicle-checks',
      },
      {
        key: 'drivers-on-duty',
        label: 'Drivers on duty',
        value: input.drivers?.onDuty ?? input.dashboard?.driversOnDuty ?? 0,
        href: '/drivers',
      },
      {
        key: 'drivers-blocked',
        label: 'Drivers not eligible',
        value: driversNotEligible,
        href: '/drivers',
      },
      {
        key: 'fleet-available',
        label: 'Vehicles available',
        value: input.vehicles?.availableNow ?? input.dashboard?.vehiclesInService ?? 0,
        href: '/vehicles',
      },
      {
        key: 'live-tracked',
        label: 'Vehicles on live map',
        value: liveVehicles,
        href: '/live-operations',
      },
      {
        key: 'passengers',
        label: 'Passengers transported',
        value: 0,
        href: '/passengers',
        gap: true,
        note: 'Needs trip outcome events',
      },
      {
        key: 'no-shows',
        label: 'Passenger no-shows',
        value: 0,
        href: '/exceptions',
        gap: true,
        note: 'Needs pickup outcome records',
      },
    ],
    attention,
    dataQuality,
    sourceNotes: [
      'Figures are calculated in Command from shared operational hubs (duties, defects, checks, fleet directories).',
      'Apps capture evidence; this report is the management view — open any number to act on the records.',
    ],
  }
}
