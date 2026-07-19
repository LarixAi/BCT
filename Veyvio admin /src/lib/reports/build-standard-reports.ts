import type {
  AnnouncementRecord,
  ApiNotification,
  AuditLogRecord,
  ContractRecord,
  DashboardSummary,
  DutyRecord,
  MessageRecord,
  PerformanceMetrics,
} from '@/lib/api/types'
import type { ChecksHubData } from '@/lib/checks/types'
import type { DefectsHubData } from '@/lib/defects/types'
import type { DriverDirectorySummary } from '@/lib/drivers/types'
import type { IncidentsHubData } from '@/lib/incidents/types'
import type { MaintenanceHubData } from '@/lib/maintenance/types'
import type { OperationalException } from '@/lib/types'
import type { VehicleDirectorySummary } from '@/lib/vehicles/types'
import type { YardHubData } from '@/lib/yard/types'
import type { ReportMetric, ReportSummaryView, StandardReportId } from './types'

function inPeriod(iso: string | null | undefined, from: string, to: string) {
  if (!iso) return false
  const day = iso.slice(0, 10)
  return day >= from && day <= to
}

function base(
  from: string,
  to: string,
  depotLabel: string,
  metrics: ReportMetric[],
  attention: ReportSummaryView['attention'],
  dataQuality: string[],
  sourceNotes: string[],
): ReportSummaryView {
  return {
    period: { from, to },
    generatedAt: new Date().toISOString(),
    depotLabel,
    metrics,
    attention,
    dataQuality,
    sourceNotes,
  }
}

function isCompletedDuty(status: string) {
  const s = status.toLowerCase()
  return s.includes('complete') || s.includes('signed_off') || s === 'closed'
}

function isCancelledDuty(status: string) {
  return status.toLowerCase().includes('cancel')
}

function dutyHours(duty: DutyRecord): number {
  if (!duty.startTime || !duty.endTime) return 0
  const [sh, sm] = duty.startTime.split(':').map(Number)
  const [eh, em] = duty.endTime.split(':').map(Number)
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0
  const mins = eh * 60 + em - (sh * 60 + sm)
  return mins > 0 ? Math.round((mins / 60) * 10) / 10 : 0
}

export function buildExceptionsReport(input: {
  from: string
  to: string
  depotLabel: string
  dashboard?: DashboardSummary | null
  driverExceptions?: OperationalException[] | null
  vehicleExceptions?: OperationalException[] | null
}): ReportSummaryView {
  const driverEx = input.driverExceptions ?? []
  const vehicleEx = input.vehicleExceptions ?? []
  const critical =
    driverEx.filter((e) => e.severity === 'critical').length +
    vehicleEx.filter((e) => e.severity === 'critical').length
  const open = driverEx.length + vehicleEx.length

  return base(
    input.from,
    input.to,
    input.depotLabel,
    [
      { key: 'open', label: 'Open eligibility / release exceptions', value: open, href: '/exceptions' },
      { key: 'critical', label: 'Critical exceptions', value: critical, href: '/exceptions?severity=critical' },
      { key: 'driver', label: 'Driver eligibility exceptions', value: driverEx.length, href: '/drivers' },
      { key: 'vehicle', label: 'Vehicle release exceptions', value: vehicleEx.length, href: '/vehicles' },
      {
        key: 'alerts',
        label: 'Dashboard alerts',
        value: input.dashboard?.alerts.length ?? 0,
        href: '/overview',
      },
      {
        key: 'inbox',
        label: 'Full exceptions inbox',
        value: open,
        href: '/exceptions',
        note: 'Open workspace for ownership & SLA',
      },
    ],
    [
      ...(critical > 0
        ? [{ id: 'crit', label: 'Critical exceptions need owners', count: critical, href: '/exceptions?severity=critical', severity: 'critical' as const }]
        : []),
      ...(open > 0
        ? [{ id: 'open', label: 'Open exceptions', count: open, href: '/exceptions', severity: 'warning' as const }]
        : []),
    ],
    [
      'This report summarises driver eligibility and vehicle release exceptions. Broader ops exceptions are assembled in the Exceptions workspace.',
    ],
    ['Source: eligibility-exceptions, release-exceptions and control-centre alerts.'],
  )
}

export function buildOnTimeReport(input: {
  from: string
  to: string
  depotLabel: string
  performance?: PerformanceMetrics | null
  duties?: DutyRecord[] | null
}): ReportSummaryView {
  const perf = input.performance
  const duties = (input.duties ?? []).filter((d) => d.dutyDate >= input.from && d.dutyDate <= input.to)
  return base(
    input.from,
    input.to,
    input.depotLabel,
    [
      {
        key: 'otp',
        label: 'On-time % (aggregate)',
        value: perf?.onTimePct ?? 0,
        href: '/performance',
        gap: true,
        note: 'Mock/aggregate until stop outcomes exist',
      },
      {
        key: 'delay',
        label: 'Avg delay (minutes)',
        value: perf?.avgDelayMinutes ?? 0,
        href: '/performance',
        gap: true,
      },
      {
        key: 'completed',
        label: 'Completed runs (perf)',
        value: perf?.completedRuns ?? duties.filter((d) => isCompletedDuty(d.status)).length,
        href: '/runs',
      },
      {
        key: 'duties',
        label: 'Duties in period',
        value: duties.length,
        href: '/runs',
      },
      {
        key: 'pickup-otp',
        label: 'Pickup on-time %',
        value: 0,
        href: '/live-operations',
        gap: true,
        note: 'Needs stop arrival vs planned window',
      },
      {
        key: 'dropoff-otp',
        label: 'Drop-off on-time %',
        value: 0,
        href: '/live-operations',
        gap: true,
        note: 'Needs handover timestamps',
      },
    ],
    [],
    [
      'Contract tolerances are not configured yet — treat on-time % as indicative only.',
      'Stop-level variance (first pickup, each passenger, return to depot) is not rolled up.',
    ],
    ['Uses getPerformanceMetrics plus duty counts until trip event analytics exist.'],
  )
}

export function buildTripCompletionReport(input: {
  from: string
  to: string
  depotLabel: string
  duties?: DutyRecord[] | null
}): ReportSummaryView {
  const duties = (input.duties ?? []).filter((d) => d.dutyDate >= input.from && d.dutyDate <= input.to)
  const completed = duties.filter((d) => isCompletedDuty(d.status) || isCompletedDuty(d.driverLifecycleStatus ?? '')).length
  const cancelled = duties.filter((d) => isCancelledDuty(d.status)).length
  const incomplete = Math.max(0, duties.length - completed - cancelled)

  return base(
    input.from,
    input.to,
    input.depotLabel,
    [
      { key: 'planned', label: 'Planned duties', value: duties.length, href: '/runs' },
      { key: 'completed', label: 'Completed duties', value: completed, href: '/runs' },
      { key: 'cancelled', label: 'Cancelled duties', value: cancelled, href: '/runs' },
      { key: 'incomplete', label: 'Incomplete / open', value: incomplete, href: '/exceptions' },
      {
        key: 'boarded',
        label: 'Passengers boarded',
        value: 0,
        href: '/passengers',
        gap: true,
        note: 'Needs pickup outcome events',
      },
      {
        key: 'no-show',
        label: 'Passenger no-shows',
        value: 0,
        href: '/exceptions',
        gap: true,
      },
      {
        key: 'handover',
        label: 'Successful handovers',
        value: 0,
        href: '/exceptions',
        gap: true,
      },
    ],
    incomplete > 0
      ? [{ id: 'incomplete', label: 'Duties not closed', count: incomplete, href: '/runs', severity: 'warning' }]
      : [],
    [
      'Completion is inferred from duty status — passenger-level outcomes are not in the shared layer yet.',
    ],
    ['Source: published duties in the selected period.'],
  )
}

export function buildDriverComplianceReport(input: {
  from: string
  to: string
  depotLabel: string
  drivers?: DriverDirectorySummary | null
  driverExceptions?: OperationalException[] | null
  expiringCount?: number
}): ReportSummaryView {
  const d = input.drivers
  const ex = input.driverExceptions?.length ?? 0
  const expiring = input.expiringCount ?? d?.documentsExpiringSoon ?? 0
  return base(
    input.from,
    input.to,
    input.depotLabel,
    [
      { key: 'active', label: 'Active drivers', value: d?.totalActive ?? 0, href: '/drivers' },
      { key: 'eligible', label: 'Eligible today', value: d?.eligibleToday ?? 0, href: '/drivers' },
      { key: 'not-eligible', label: 'Not eligible', value: d?.notEligible ?? 0, href: '/drivers' },
      { key: 'on-duty', label: 'On duty', value: d?.onDuty ?? 0, href: '/live-operations' },
      { key: 'suspended', label: 'Suspended / restricted', value: d?.suspendedOrRestricted ?? 0, href: '/drivers' },
      { key: 'expiring', label: 'Documents expiring soon', value: expiring, href: '/compliance-rules?filter=expiring' },
      { key: 'exceptions', label: 'Eligibility exceptions', value: ex, href: '/exceptions' },
      { key: 'invite', label: 'Invites pending', value: d?.invitePending ?? 0, href: '/settings/invitations' },
    ],
    [
      ...((d?.notEligible ?? 0) > 0
        ? [{ id: 'ne', label: 'Drivers not eligible today', count: d!.notEligible, href: '/drivers', severity: 'critical' as const }]
        : []),
      ...(expiring > 0
        ? [{ id: 'ex', label: 'Documents expiring soon', count: expiring, href: '/drivers', severity: 'warning' as const }]
        : []),
    ],
    ['Point-in-time readiness from the driver directory — not a historical compliance trend yet.'],
    ['Source: driver directory summary, eligibility exceptions and compliance expiry list.'],
  )
}

export function buildWorkingTimeReport(input: {
  from: string
  to: string
  depotLabel: string
  duties?: DutyRecord[] | null
  drivers?: DriverDirectorySummary | null
}): ReportSummaryView {
  const duties = (input.duties ?? []).filter((d) => d.dutyDate >= input.from && d.dutyDate <= input.to)
  const plannedHours = Math.round(duties.reduce((s, d) => s + dutyHours(d), 0) * 10) / 10
  const withWindow = duties.filter((d) => d.startTime && d.endTime).length

  return base(
    input.from,
    input.to,
    input.depotLabel,
    [
      { key: 'duties', label: 'Duties in period', value: duties.length, href: '/runs' },
      {
        key: 'planned-hours',
        label: 'Planned duty hours',
        value: plannedHours,
        href: '/runs',
        note: 'From roster start/end only',
      },
      {
        key: 'with-window',
        label: 'Duties with time window',
        value: withWindow,
        href: '/runs',
      },
      {
        key: 'on-duty-now',
        label: 'Drivers on duty now',
        value: input.drivers?.onDuty ?? 0,
        href: '/drivers',
      },
      {
        key: 'actual-hours',
        label: 'Actual signed hours',
        value: 0,
        href: '/drivers',
        gap: true,
        note: 'Needs Command working-time segments',
      },
      {
        key: 'breaks',
        label: 'Breaks recorded',
        value: 0,
        href: '/drivers',
        gap: true,
      },
      {
        key: 'breach',
        label: 'WTD breach risk',
        value: 0,
        href: '/exceptions',
        gap: true,
      },
    ],
    [],
    [
      'Working-time compliance needs sign-on/sign-off and other-work segments from Driver → Command.',
      'Planned hours are roster estimates only and must not be used for legal WTD decisions yet.',
    ],
    ['Interim source: duty start/end times and driver directory on-duty count.'],
  )
}

export function buildFleetAvailabilityReport(input: {
  from: string
  to: string
  depotLabel: string
  vehicles?: VehicleDirectorySummary | null
  maintenance?: MaintenanceHubData | null
}): ReportSummaryView {
  const v = input.vehicles
  const m = input.maintenance?.summary.fleetAvailability
  return base(
    input.from,
    input.to,
    input.depotLabel,
    [
      { key: 'total', label: 'Fleet total', value: v?.total ?? m?.total ?? 0, href: '/vehicles' },
      { key: 'available', label: 'Available now', value: v?.availableNow ?? m?.available ?? 0, href: '/vehicles' },
      { key: 'allocated', label: 'Currently allocated', value: v?.currentlyAllocated ?? 0, href: '/dispatch' },
      { key: 'in-service', label: 'In service', value: v?.inService ?? 0, href: '/live-operations' },
      { key: 'vor', label: 'VOR', value: v?.vor ?? m?.vor ?? 0, href: '/vehicles/vor' },
      { key: 'maintenance', label: 'In maintenance', value: v?.inMaintenance ?? m?.inMaintenance ?? 0, href: '/maintenance' },
      { key: 'attention', label: 'Needs attention', value: v?.attention ?? 0, href: '/vehicles' },
      {
        key: 'util',
        label: 'Utilisation %',
        value: 0,
        href: '/vehicles',
        gap: true,
        note: 'Needs hours assigned vs available',
      },
    ],
    [
      ...((v?.vor ?? m?.vor ?? 0) > 0
        ? [{ id: 'vor', label: 'Vehicles VOR', count: v?.vor ?? m?.vor ?? 0, href: '/vehicles/vor', severity: 'critical' as const }]
        : []),
    ],
    ['Point-in-time fleet availability — not a utilisation time series.'],
    ['Source: vehicle directory summary and maintenance hub fleet availability.'],
  )
}

export function buildChecksDefectsReport(input: {
  from: string
  to: string
  depotLabel: string
  checks?: ChecksHubData | null
  defects?: DefectsHubData | null
}): ReportSummaryView {
  const c = input.checks?.summary
  const d = input.defects?.summary
  return base(
    input.from,
    input.to,
    input.depotLabel,
    [
      { key: 'ready', label: 'Vehicles check-ready', value: c?.vehiclesReady ?? 0, href: '/vehicle-checks' },
      { key: 'progress', label: 'Checks in progress', value: c?.checksInProgress ?? 0, href: '/vehicle-checks' },
      { key: 'action', label: 'Checks needing action', value: c?.actionRequired ?? 0, href: '/vehicle-checks' },
      { key: 'missing', label: 'Missing / overdue checks', value: c?.missingOrOverdue ?? 0, href: '/vehicle-checks' },
      { key: 'open-defects', label: 'Open defects', value: d?.openDefects ?? 0, href: '/defects' },
      { key: 'critical', label: 'Safety-critical defects', value: d?.safetyCritical ?? 0, href: '/defects' },
      { key: 'triage', label: 'Awaiting triage', value: d?.awaitingTriage ?? 0, href: '/defects' },
      { key: 'vor', label: 'Vehicles VOR (defects)', value: d?.vehiclesVor ?? 0, href: '/vehicles/vor' },
    ],
    [
      ...((d?.safetyCritical ?? 0) > 0
        ? [{ id: 'sc', label: 'Safety-critical defects open', count: d!.safetyCritical, href: '/defects', severity: 'critical' as const }]
        : []),
      ...((c?.missingOrOverdue ?? 0) > 0
        ? [{ id: 'miss', label: 'Checks missing or overdue', count: c!.missingOrOverdue, href: '/vehicle-checks', severity: 'warning' as const }]
        : []),
    ],
    ['Period compliance rate (checks completed vs due across the date range) is not yet calculated.'],
    ['Source: checks hub and defects hub summaries.'],
  )
}

export function buildVorDowntimeReport(input: {
  from: string
  to: string
  depotLabel: string
  vehicles?: VehicleDirectorySummary | null
  defects?: DefectsHubData | null
  maintenance?: MaintenanceHubData | null
}): ReportSummaryView {
  const downtime = input.maintenance?.downtime
  const vor = input.vehicles?.vor ?? input.defects?.summary.vehiclesVor ?? input.maintenance?.summary.attention.vor ?? 0
  return base(
    input.from,
    input.to,
    input.depotLabel,
    [
      { key: 'vor', label: 'Vehicles VOR', value: vor, href: '/vehicles/vor' },
      {
        key: 'on-downtime',
        label: 'Vehicles on downtime',
        value: downtime?.vehiclesOnDowntime ?? vor,
        href: '/maintenance',
      },
      {
        key: 'avg-hours',
        label: 'Avg downtime hours',
        value: downtime?.averageDowntimeHours ?? 0,
        href: '/maintenance',
      },
      {
        key: 'repeat',
        label: 'Repeat VOR events',
        value: downtime?.repeatVorEvents ?? 0,
        href: '/vehicles/vor',
      },
      {
        key: 'parts-wait',
        label: 'Avg parts wait (hours)',
        value: downtime?.averagePartsWaitHours ?? 0,
        href: '/maintenance',
      },
      {
        key: 'approval',
        label: 'Avg approval delay (hours)',
        value: downtime?.averageApprovalDelayHours ?? 0,
        href: '/maintenance',
      },
      {
        key: 'safety',
        label: 'Safety-critical defects',
        value: input.defects?.summary.safetyCritical ?? 0,
        href: '/defects',
      },
    ],
    vor > 0
      ? [{ id: 'vor', label: 'Vehicles currently VOR', count: vor, href: '/vehicles/vor', severity: 'critical' }]
      : [],
    ['Downtime analytics are workshop-derived; cause taxonomy by depot/period is still thin.'],
    ['Source: maintenance downtime analytics, vehicle directory and defects hub.'],
  )
}

export function buildMaintenanceDueReport(input: {
  from: string
  to: string
  depotLabel: string
  maintenance?: MaintenanceHubData | null
}): ReportSummaryView {
  const a = input.maintenance?.summary.attention
  const risk = input.maintenance?.summary.maintenanceRisk
  const workshop = input.maintenance?.summary.workshopPosition
  return base(
    input.from,
    input.to,
    input.depotLabel,
    [
      { key: 'due-today', label: 'Due today', value: a?.dueToday ?? 0, href: '/maintenance' },
      { key: 'due-14', label: 'Due within 14 days', value: a?.dueWithin14Days ?? 0, href: '/maintenance' },
      { key: 'overdue', label: 'Overdue', value: a?.overdue ?? 0, href: '/maintenance' },
      { key: 'vor', label: 'VOR', value: a?.vor ?? 0, href: '/vehicles/vor' },
      { key: 'workshop', label: 'In workshop', value: a?.inWorkshop ?? 0, href: '/maintenance' },
      { key: 'parts', label: 'Awaiting parts', value: a?.awaitingParts ?? 0, href: '/maintenance' },
      { key: 'release', label: 'Ready for release', value: a?.readyForRelease ?? 0, href: '/maintenance' },
      { key: 'overdue-svc', label: 'Overdue services', value: risk?.overdueServices ?? 0, href: '/maintenance' },
      { key: 'wo-progress', label: 'Work orders in progress', value: workshop?.inProgress ?? 0, href: '/maintenance' },
    ],
    [
      ...((a?.overdue ?? 0) > 0
        ? [{ id: 'od', label: 'Overdue maintenance', count: a!.overdue, href: '/maintenance', severity: 'critical' as const }]
        : []),
      ...((a?.dueToday ?? 0) > 0
        ? [{ id: 'dt', label: 'Maintenance due today', count: a!.dueToday, href: '/maintenance', severity: 'warning' as const }]
        : []),
    ],
    ['Schedule items and work orders are live from the maintenance hub; PMI calendar export is not packaged here.'],
    ['Source: maintenance hub attention, risk and workshop position.'],
  )
}

export function buildIncidentsReport(input: {
  from: string
  to: string
  depotLabel: string
  incidents?: IncidentsHubData | null
}): ReportSummaryView {
  const s = input.incidents?.summary
  const safeguarding = (input.incidents?.register ?? []).filter((r) => r.isSafeguarding && !['closed', 'cancelled'].includes(r.status)).length
  return base(
    input.from,
    input.to,
    input.depotLabel,
    [
      { key: 'critical', label: 'Open critical', value: s?.openCritical ?? 0, href: '/incidents' },
      { key: 'triage', label: 'Awaiting triage', value: s?.awaitingTriage ?? 0, href: '/incidents' },
      { key: 'investigations', label: 'Open investigations', value: s?.openInvestigations ?? 0, href: '/incidents' },
      { key: 'overdue', label: 'Overdue actions', value: s?.overdueActions ?? 0, href: '/incidents' },
      { key: 'external', label: 'External assessment required', value: s?.externalAssessmentRequired ?? 0, href: '/incidents' },
      { key: 'month', label: 'Incidents this month', value: s?.incidentsThisMonth ?? 0, href: '/incidents' },
      { key: 'near-miss', label: 'Near miss this month', value: s?.nearMissThisMonth ?? 0, href: '/incidents' },
      {
        key: 'safeguarding',
        label: 'Open safeguarding cases',
        value: safeguarding,
        href: '/incidents',
        note: 'Restricted access still applies in detail views',
      },
    ],
    [
      ...((s?.openCritical ?? 0) > 0
        ? [{ id: 'c', label: 'Critical incidents open', count: s!.openCritical, href: '/incidents', severity: 'critical' as const }]
        : []),
      ...(safeguarding > 0
        ? [{ id: 'sg', label: 'Open safeguarding cases', count: safeguarding, href: '/incidents', severity: 'critical' as const }]
        : []),
    ],
    [
      'Safeguarding detail remains permission-controlled — this count is a management flag only.',
    ],
    ['Source: incidents hub summary and register flags.'],
  )
}

export function buildContractPerformanceReport(input: {
  from: string
  to: string
  depotLabel: string
  contracts?: ContractRecord[] | null
  performance?: PerformanceMetrics | null
  duties?: DutyRecord[] | null
}): ReportSummaryView {
  const contracts = input.contracts ?? []
  const active = contracts.filter((c) => String(c.status).toLowerCase() === 'active').length
  const duties = (input.duties ?? []).filter((d) => d.dutyDate >= input.from && d.dutyDate <= input.to)

  return base(
    input.from,
    input.to,
    input.depotLabel,
    [
      { key: 'contracts', label: 'Contracts on file', value: contracts.length, href: '/contracts' },
      { key: 'active', label: 'Active contracts', value: active, href: '/contracts' },
      {
        key: 'otp',
        label: 'Tenant on-time %',
        value: input.performance?.onTimePct ?? 0,
        href: '/performance',
        gap: true,
        note: 'Not split by contract yet',
      },
      {
        key: 'duties',
        label: 'Duties in period',
        value: duties.length,
        href: '/runs',
        gap: true,
        note: 'Not joined to contract yet',
      },
      {
        key: 'delivered',
        label: 'Delivered journeys',
        value: 0,
        href: '/bookings',
        gap: true,
      },
      {
        key: 'sla',
        label: 'SLA breaches',
        value: 0,
        href: '/contracts',
        gap: true,
      },
      {
        key: 'credits',
        label: 'Service credits',
        value: 0,
        href: '/contracts',
        gap: true,
      },
    ],
    [],
    [
      'Contract identity exists, but journey→contract joins and SLA tolerances are not in the reporting layer yet.',
      'Use this page as the placeholder for customer performance packs.',
    ],
    ['Source: contracts list plus tenant-wide performance metrics until contract KPIs exist.'],
  )
}

export const STANDARD_REPORT_META: Record<
  StandardReportId,
  { title: string; subtitle: string; related: { label: string; href: string }[] }
> = {
  exceptions: {
    title: 'Unresolved exceptions',
    subtitle: 'Eligibility, release blockers and control-centre alerts',
    related: [
      { label: 'Exceptions workspace', href: '/exceptions' },
      { label: 'Control centre', href: '/overview' },
    ],
  },
  'on-time': {
    title: 'On-time performance',
    subtitle: 'Aggregate punctuality until stop-level outcomes land',
    related: [
      { label: 'Performance', href: '/performance' },
      { label: 'Live operations', href: '/live-operations' },
    ],
  },
  'trip-completion': {
    title: 'Trip completion',
    subtitle: 'Duty completion with passenger outcome gaps marked',
    related: [
      { label: 'Runs', href: '/runs' },
      { label: 'Bookings', href: '/bookings' },
    ],
  },
  'driver-compliance': {
    title: 'Driver readiness & compliance',
    subtitle: 'Eligibility, documents and blocks that prevent duty',
    related: [
      { label: 'Drivers', href: '/drivers' },
      { label: 'Compliance rules', href: '/compliance-rules' },
    ],
  },
  'working-time': {
    title: 'Driver working time',
    subtitle: 'Planned hours now — actual WTD when Command segments exist',
    related: [
      { label: 'Drivers', href: '/drivers' },
      { label: 'Runs', href: '/runs' },
    ],
  },
  'fleet-availability': {
    title: 'Vehicle availability',
    subtitle: 'Available, allocated, VOR and workshop position',
    related: [
      { label: 'Vehicles', href: '/vehicles' },
      { label: 'VOR board', href: '/vehicles/vor' },
      { label: 'Yard', href: '/yard' },
    ],
  },
  'checks-defects': {
    title: 'Vehicle check & defect compliance',
    subtitle: 'Walkaround readiness and open defect pressure',
    related: [
      { label: 'Vehicle checks', href: '/vehicle-checks' },
      { label: 'Defects', href: '/defects' },
    ],
  },
  'vor-downtime': {
    title: 'VOR & downtime',
    subtitle: 'Off-road vehicles and workshop downtime analytics',
    related: [
      { label: 'VOR board', href: '/vehicles/vor' },
      { label: 'Maintenance', href: '/maintenance' },
    ],
  },
  'maintenance-due': {
    title: 'Maintenance due & overdue',
    subtitle: 'PMI pressure, workshop queue and release readiness',
    related: [
      { label: 'Maintenance', href: '/maintenance' },
      { label: 'Inspections', href: '/inspections' },
    ],
  },
  incidents: {
    title: 'Incident & safeguarding summary',
    subtitle: 'Open investigations and safeguarding flags for managers',
    related: [
      { label: 'Incidents', href: '/incidents' },
      { label: 'Safeguarding', href: '/safeguarding' },
    ],
  },
  'contract-performance': {
    title: 'Contract service performance',
    subtitle: 'Contract register with SLA gaps until journey joins exist',
    related: [
      { label: 'Contracts', href: '/contracts' },
      { label: 'Customers', href: '/customers' },
    ],
  },
  'yard-operations': {
    title: 'Yard operations & turnaround',
    subtitle: 'On-site position, movements, tasks and release blockers',
    related: [
      { label: 'Yard', href: '/yard' },
      { label: 'VOR board', href: '/vehicles/vor' },
      { label: 'Vehicle checks', href: '/vehicle-checks' },
    ],
  },
  communications: {
    title: 'Communications effectiveness',
    subtitle: 'Messages, announcements and notification follow-through',
    related: [
      { label: 'Messages', href: '/messages' },
      { label: 'Announcements', href: '/announcements' },
      { label: 'Notifications', href: '/notifications' },
    ],
  },
  'audit-activity': {
    title: 'Audit activity',
    subtitle: 'Record changes and privileged actions for the period',
    related: [
      { label: 'Audit log', href: '/audit' },
      { label: 'Security settings', href: '/settings/security' },
    ],
  },
}

export function buildYardOperationsReport(input: {
  from: string
  to: string
  depotLabel: string
  yard?: YardHubData | null
}): ReportSummaryView {
  const y = input.yard
  const s = y?.summary
  const movements = y?.movements ?? []
  const tasks = y?.tasks ?? []
  const exceptions = y?.exceptions ?? []
  const openTasks = tasks.filter((t) => !['completed', 'cancelled'].includes(String(t.status))).length
  const blockingTasks = tasks.filter((t) => t.blockingRelease && !['completed', 'cancelled'].includes(String(t.status))).length
  const openExceptions = exceptions.filter((e) => e.escalationStatus !== 'resolved').length
  const criticalExceptions = exceptions.filter(
    (e) => e.escalationStatus !== 'resolved' && e.severity === 'critical',
  ).length
  const movementsInPeriod = movements.filter((m) => inPeriod(m.startedAt, input.from, input.to)).length
  const completedMoves = movements.filter(
    (m) => m.status === 'completed' && inPeriod(m.startedAt, input.from, input.to),
  ).length
  const checksOnYard = y?.vehicleChecks?.length ?? 0

  return base(
    input.from,
    input.to,
    input.depotLabel,
    [
      { key: 'on-site', label: 'Vehicles on site', value: s?.onSite ?? 0, href: '/yard' },
      { key: 'ready', label: 'Ready for service', value: s?.readyForService ?? 0, href: '/yard' },
      { key: 'work', label: 'Work required', value: s?.workRequired ?? 0, href: '/yard' },
      { key: 'inspection', label: 'Awaiting inspection', value: s?.awaitingInspection ?? 0, href: '/yard' },
      { key: 'vor', label: 'VOR on yard', value: s?.vor ?? 0, href: '/vehicles/vor' },
      { key: 'departing', label: 'Departing soon', value: s?.departingSoon ?? 0, href: '/yard' },
      { key: 'unknown', label: 'Location unknown', value: s?.locationUnknown ?? 0, href: '/yard' },
      { key: 'movements', label: 'Movements in period', value: movementsInPeriod, href: '/yard' },
      { key: 'moves-done', label: 'Movements completed', value: completedMoves, href: '/yard' },
      { key: 'open-tasks', label: 'Open yard tasks', value: openTasks, href: '/yard' },
      { key: 'blocking', label: 'Release-blocking tasks', value: blockingTasks, href: '/yard' },
      { key: 'exceptions', label: 'Open yard exceptions', value: openExceptions, href: '/exceptions' },
      {
        key: 'turnaround',
        label: 'Avg turnaround (mins)',
        value: 0,
        href: '/yard',
        gap: true,
        note: 'Needs arrival→ready timestamps',
      },
      {
        key: 'yard-checks',
        label: 'Yard check reports',
        value: checksOnYard,
        href: '/vehicle-checks',
      },
    ],
    [
      ...(criticalExceptions > 0
        ? [{ id: 'ye', label: 'Critical yard exceptions', count: criticalExceptions, href: '/yard', severity: 'critical' as const }]
        : []),
      ...(blockingTasks > 0
        ? [{ id: 'bt', label: 'Release-blocking yard tasks', count: blockingTasks, href: '/yard', severity: 'warning' as const }]
        : []),
      ...((s?.vor ?? 0) > 0
        ? [{ id: 'vor', label: 'VOR vehicles on yard', count: s!.vor, href: '/vehicles/vor', severity: 'critical' as const }]
        : []),
    ],
    [
      'Turnaround time (arrived → cleaned → fuelled → ready) needs linked stage timestamps before it can be official.',
      'Movement counts use yard hub records filtered by the selected period.',
    ],
    ['Source: yard hub summary, movements, tasks, exceptions and yard vehicle checks.'],
  )
}

export function buildCommunicationsReport(input: {
  from: string
  to: string
  depotLabel: string
  inbox?: MessageRecord[] | null
  sent?: MessageRecord[] | null
  announcements?: AnnouncementRecord[] | null
  notifications?: ApiNotification[] | null
}): ReportSummaryView {
  const inbox = input.inbox ?? []
  const sent = input.sent ?? []
  const announcements = input.announcements ?? []
  const notifications = input.notifications ?? []

  const inboxInPeriod = inbox.filter((m) => inPeriod(m.createdAt, input.from, input.to))
  const sentInPeriod = sent.filter((m) => inPeriod(m.createdAt, input.from, input.to))
  const unreadInbox = inbox.filter((m) => !m.readAt).length
  const readInbox = inbox.filter((m) => Boolean(m.readAt)).length
  const announcementsInPeriod = announcements.filter((a) => inPeriod(a.publishedAt, input.from, input.to))
  const unreadNotifications = notifications.filter((n) => !n.readAt).length
  const notificationsInPeriod = notifications.filter((n) => inPeriod(n.createdAt, input.from, input.to))

  return base(
    input.from,
    input.to,
    input.depotLabel,
    [
      { key: 'inbox-period', label: 'Inbox messages (period)', value: inboxInPeriod.length, href: '/messages' },
      { key: 'sent-period', label: 'Sent messages (period)', value: sentInPeriod.length, href: '/messages' },
      { key: 'unread', label: 'Unread inbox', value: unreadInbox, href: '/messages' },
      { key: 'read', label: 'Read inbox (all)', value: readInbox, href: '/messages' },
      {
        key: 'ack',
        label: 'Required acknowledgements',
        value: 0,
        href: '/announcements',
        gap: true,
        note: 'Needs delivered/opened/acknowledged states',
      },
      {
        key: 'announcements',
        label: 'Announcements published',
        value: announcementsInPeriod.length,
        href: '/announcements',
      },
      {
        key: 'alerts-period',
        label: 'Notifications (period)',
        value: notificationsInPeriod.length,
        href: '/notifications',
      },
      {
        key: 'alerts-unread',
        label: 'Unread notifications',
        value: unreadNotifications,
        href: '/notifications',
      },
      {
        key: 'ignored',
        label: 'Alerts closed without action',
        value: 0,
        href: '/notifications',
        gap: true,
      },
    ],
    [
      ...(unreadInbox > 0
        ? [{ id: 'unread', label: 'Unread driver/ops messages', count: unreadInbox, href: '/messages', severity: 'warning' as const }]
        : []),
      ...(unreadNotifications > 0
        ? [{ id: 'n', label: 'Unread notifications', count: unreadNotifications, href: '/notifications', severity: 'info' as const }]
        : []),
    ],
    [
      'Read vs acknowledged is not fully modelled yet — unread is the operational proxy today.',
      'Announcement acknowledgement deadlines and superseding versions are not in this rollup.',
    ],
    ['Source: messages inbox/sent, announcements and in-app notifications.'],
  )
}

export function buildAuditActivityReport(input: {
  from: string
  to: string
  depotLabel: string
  logs?: AuditLogRecord[] | null
}): ReportSummaryView {
  const logs = (input.logs ?? []).filter((l) => inPeriod(l.createdAt, input.from, input.to))
  const byAction = new Map<string, number>()
  const byEntity = new Map<string, number>()
  for (const log of logs) {
    byAction.set(log.action, (byAction.get(log.action) ?? 0) + 1)
    byEntity.set(log.entityType, (byEntity.get(log.entityType) ?? 0) + 1)
  }
  const topAction = [...byAction.entries()].sort((a, b) => b[1] - a[1])[0]
  const topEntity = [...byEntity.entries()].sort((a, b) => b[1] - a[1])[0]
  const sensitive = logs.filter((l) =>
    /override|delete|suspend|permission|role|export|safeguard|impersonat/i.test(`${l.action} ${l.entityType}`),
  ).length

  return base(
    input.from,
    input.to,
    input.depotLabel,
    [
      { key: 'total', label: 'Audit events (period)', value: logs.length, href: '/audit' },
      {
        key: 'actions',
        label: 'Distinct actions',
        value: byAction.size,
        href: '/audit',
      },
      {
        key: 'entities',
        label: 'Entity types touched',
        value: byEntity.size,
        href: '/audit',
      },
      {
        key: 'top-action',
        label: topAction ? `Top action: ${topAction[0]}` : 'Top action',
        value: topAction?.[1] ?? 0,
        href: '/audit',
      },
      {
        key: 'top-entity',
        label: topEntity ? `Top entity: ${topEntity[0]}` : 'Top entity',
        value: topEntity?.[1] ?? 0,
        href: '/audit',
      },
      {
        key: 'sensitive',
        label: 'Sensitive / privileged events',
        value: sensitive,
        href: '/audit',
        note: 'Heuristic match on action/entity text',
      },
      {
        key: 'exports',
        label: 'Export events',
        value: logs.filter((l) => /export/i.test(l.action)).length,
        href: '/exports',
      },
      {
        key: 'immutable',
        label: 'Immutable trail verified',
        value: 0,
        href: '/settings/security',
        gap: true,
        note: 'Needs hash-chain / WORM verification',
      },
    ],
    sensitive > 0
      ? [{ id: 'sens', label: 'Sensitive audit events in period', count: sensitive, href: '/audit', severity: 'warning' }]
      : [],
    [
      'Audit detail (before/after values, reason, device) varies by event type — open the audit log for full rows.',
      'Impersonation and safeguarding access exports should remain restricted by role.',
    ],
    ['Source: Command audit log filtered to the selected period.'],
  )
}

export function isStandardReportId(value: string): value is StandardReportId {
  return value in STANDARD_REPORT_META
}
