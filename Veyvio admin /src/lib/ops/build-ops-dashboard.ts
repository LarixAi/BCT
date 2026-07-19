import type { ChecksHubData } from '@/lib/checks/types'
import type { DefectsHubData } from '@/lib/defects/types'
import type { DriverDirectorySummary } from '@/lib/drivers/types'
import type {
  DashboardSummary,
  DutyRecord,
  LiveDispatchResponse,
} from '@/lib/api/types'
import type { OperationalException } from '@/lib/types'
import type { VehicleDirectorySummary } from '@/lib/vehicles/types'
import type { YardHubData, YardTask } from '@/lib/yard/types'
import {
  labelRunState,
  mapDriverDutyState,
  mapRunState,
  mapVehicleReadinessState,
  type DriverDutyState,
  type RunState,
  type VehicleReadinessState,
} from './canonical-states'
import type {
  ChecksSnapshotCard,
  DefectsVorCard,
  DriverReadinessCard,
  HandoverExceptionRow,
  LiveTripRow,
  OpsActionItem,
  OpsDashboardModel,
  ReadinessPipelineRow,
  SyncHealthCard,
  VehicleReadinessCard,
  YardSnapshotCard,
} from './ops-dashboard'

export interface OpsDashboardInput {
  dashboard: DashboardSummary | null | undefined
  live: LiveDispatchResponse | null | undefined
  duties: DutyRecord[] | null | undefined
  yard: YardHubData | null | undefined
  checks: ChecksHubData | null | undefined
  defects: DefectsHubData | null | undefined
  driversSummary: DriverDirectorySummary | null | undefined
  vehiclesSummary: VehicleDirectorySummary | null | undefined
  driverExceptions: OperationalException[] | null | undefined
  vehicleExceptions: OperationalException[] | null | undefined
  now?: Date
}

function driverName(d: DutyRecord['driver']): string {
  if (!d) return 'Unassigned'
  return [d.firstName, d.lastName].filter(Boolean).join(' ') || 'Unassigned'
}

function formatAge(iso: string | null | undefined, now: Date): string {
  if (!iso) return 'No recent update'
  const ms = now.getTime() - new Date(iso).getTime()
  if (Number.isNaN(ms) || ms < 0) return 'Just now'
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  return `${Math.round(min / 60)} hr ago`
}

function isTaskOverdue(task: YardTask, now: Date): boolean {
  if (!task.dueAt) return false
  if (task.status === 'completed' || task.status === 'cancelled') return false
  return new Date(task.dueAt).getTime() < now.getTime()
}

function yardLabelForVehicle(
  yard: YardHubData | null | undefined,
  vehicleId: string | undefined,
  registration: string | undefined,
): { label: string; readiness: string | null; blocker: string | null } {
  if (!yard) return { label: '—', readiness: null, blocker: null }
  const row =
    yard.vehicles.find((v) => v.vehicleId === vehicleId) ??
    yard.vehicles.find((v) => v.registrationNumber === registration)
  if (!row) return { label: 'Not in yard view', readiness: null, blocker: null }
  const openBlocking = yard.tasks.filter(
    (t) =>
      t.vehicleId === row.vehicleId &&
      t.blockingRelease &&
      t.status !== 'completed' &&
      t.status !== 'cancelled',
  )
  const blocker =
    row.readinessState === 'blocked' || row.readinessState === 'vor'
      ? openBlocking[0]?.title ??
        row.exceptionLabels[0] ??
        (row.readinessState === 'vor' ? 'Vehicle is VOR' : 'Yard readiness blocked')
      : openBlocking[0]
        ? openBlocking[0].title
        : null
  const labelMap: Record<string, string> = {
    ready: 'Ready',
    ready_with_advisory: 'Ready (advisory)',
    conditional: 'Preparing',
    blocked: 'Blocked',
    vor: 'VOR',
    unknown: 'Unknown',
  }
  return {
    label: labelMap[row.readinessState] ?? row.readinessState,
    readiness: row.readinessState,
    blocker,
  }
}

function checkLabelForVehicle(
  checks: ChecksHubData | null | undefined,
  vehicleId: string | undefined,
  registration: string | undefined,
): { label: string; release: string | null; blocker: string | null } {
  if (!checks) return { label: '—', release: null, blocker: null }
  const rows = [
    ...(checks.overview ?? []),
    ...(checks.submitted ?? []),
    ...(checks.actionQueue ?? []),
    ...(checks.overdue ?? []),
  ]
  const row =
    rows.find((r) => r.vehicleId === vehicleId) ??
    rows.find((r) => r.registrationNumber === registration)
  if (!row) return { label: 'Not started', release: 'not_checked', blocker: null }
  if (row.result === 'fail' || row.operationalStatus === 'blocked' || row.operationalStatus === 'vor') {
    return {
      label: row.result === 'fail' ? 'Failed' : 'Blocked',
      release: row.operationalStatus,
      blocker: row.exceptionLabels[0] ?? 'Driver check blocked release',
    }
  }
  if (row.operationalStatus === 'ready' || row.operationalStatus === 'conditionally_ready') {
    return {
      label: row.result === 'pass_with_advisory' ? 'Passed (advisory)' : 'Passed',
      release: row.operationalStatus,
      blocker: null,
    }
  }
  if (row.operationalStatus === 'check_in_progress' || row.lifecycleStatus === 'in_progress') {
    return { label: 'In progress', release: row.operationalStatus, blocker: null }
  }
  if (row.operationalStatus === 'not_checked' || row.lifecycleStatus === 'scheduled') {
    return { label: 'Not started', release: row.operationalStatus, blocker: null }
  }
  return {
    label: row.operationalStatus.replace(/_/g, ' '),
    release: row.operationalStatus,
    blocker: null,
  }
}

function buildDriverCard(
  driversSummary: DriverDirectorySummary | null | undefined,
  duties: DutyRecord[],
  driverExceptions: OperationalException[],
  dashboard: DashboardSummary | null | undefined,
): DriverReadinessCard {
  const scheduled = duties.length || dashboard?.todaysActiveDuties || driversSummary?.totalActive || 0
  const signedOn =
    driversSummary?.onDuty ??
    duties.filter((d) =>
      ['signed_on', 'on_duty', 'in_progress', 'active', 'on_trip', 'ready'].includes(d.status),
    ).length
  const eligible = driversSummary?.eligibleToday ?? Math.max(0, scheduled - (driversSummary?.notEligible ?? 0))
  const blocked = driversSummary?.notEligible ?? driversSummary?.suspendedOrRestricted ?? 0
  const notSignedOn = Math.max(0, scheduled - signedOn)

  const reasonCounts = new Map<string, number>()
  for (const ex of driverExceptions) {
    const key =
      ex.recommendedAction?.trim() ||
      ex.title.replace(/^Driver not eligible\s*[—–-]\s*/i, '').trim() ||
      ex.title
    reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1)
  }
  if (reasonCounts.size === 0 && blocked > 0) {
    reasonCounts.set('Eligibility or compliance block', blocked)
  }

  return {
    scheduled,
    signedOn,
    notSignedOn,
    eligible,
    blocked,
    onBreak: null,
    currentlyDriving: driversSummary?.onTrip ?? null,
    withoutAssignments: duties.filter((d) => !d.driver).length || null,
    blockedReasons: [...reasonCounts.entries()].map(([reason, count]) => ({
      reason,
      count,
      href: '/drivers?filter=not_eligible',
    })),
  }
}

function buildVehicleCard(
  vehiclesSummary: VehicleDirectorySummary | null | undefined,
  yard: YardHubData | null | undefined,
  checks: ChecksHubData | null | undefined,
  duties: DutyRecord[],
  dashboard: DashboardSummary | null | undefined,
): VehicleReadinessCard {
  const required = duties.filter((d) => d.vehicle || ['assigned', 'planned', 'ready', 'in_progress'].includes(d.status)).length
    || vehiclesSummary?.currentlyAllocated
    || dashboard?.vehiclesInService
    || 0
  const yardReady = yard?.summary.readyForService ?? 0
  const preparing = yard?.summary.workRequired ?? 0
  const awaitingCheck =
    checks?.summary.missingOrOverdue ??
    checks?.summary.checksInProgress ??
    vehiclesSummary?.checksOverdue ??
    0
  const ready = checks?.summary.vehiclesReady ?? yardReady
  const inService = vehiclesSummary?.inService ?? dashboard?.vehiclesInService ?? 0
  const vor = vehiclesSummary?.vor ?? yard?.summary.vor ?? dashboard?.vehiclesOffRoad ?? 0
  const unavailable = (vehiclesSummary?.inMaintenance ?? 0) + vor
  const allocated = vehiclesSummary?.currentlyAllocated ?? required
  const driverChecked = (checks?.submitted ?? []).filter(
    (r) => r.result === 'pass' || r.result === 'pass_with_advisory',
  ).length
  const operationallyReleased = checks?.summary.vehiclesReady ?? 0

  return {
    required: required || vehiclesSummary?.totalActive || 0,
    ready,
    preparing,
    awaitingCheck,
    allocated,
    inService,
    unavailable,
    vor,
    stages: {
      yardReady,
      driverChecked,
      operationallyReleased,
    },
  }
}

function buildPipeline(
  duties: DutyRecord[],
  yard: YardHubData | null | undefined,
  checks: ChecksHubData | null | undefined,
): ReadinessPipelineRow[] {
  return duties.slice(0, 15).map((duty) => {
    const yardInfo = yardLabelForVehicle(yard, duty.vehicle?.id, duty.vehicle?.registrationNumber)
    const checkInfo = checkLabelForVehicle(checks, duty.vehicle?.id, duty.vehicle?.registrationNumber)
    const noDriver = !duty.driver
    const noVehicle = !duty.vehicle
    const blocked = Boolean(yardInfo.blocker || checkInfo.blocker || noDriver || noVehicle)
    const runState = mapRunState({
      dutyStatus: duty.status,
      blocked,
    })
    const vehicleState = mapVehicleReadinessState({
      yardReadiness: yardInfo.readiness,
      checkRelease: checkInfo.release,
      vehicleStatus: duty.vehicle?.status,
    })
    const driverBlocked = false
    const driverState = mapDriverDutyState(duty.driver?.status ?? duty.status, driverBlocked || noDriver)

    let blocker: string | null = null
    if (noDriver) blocker = 'No driver assigned'
    else if (noVehicle) blocker = 'No vehicle allocated'
    else if (yardInfo.blocker) blocker = yardInfo.blocker
    else if (checkInfo.blocker) blocker = checkInfo.blocker

    const releaseLabel = blocked
      ? 'Blocked'
      : vehicleState === 'OPERATIONALLY_READY' || vehicleState === 'IN_SERVICE'
        ? 'Released'
        : vehicleState === 'YARD_READY'
          ? 'Yard ready'
          : labelRunState(runState)

    return {
      id: duty.id,
      runReference: duty.reference,
      driverName: driverName(duty.driver),
      vehicleRegistration: duty.vehicle?.registrationNumber ?? '—',
      yardLabel: yardInfo.label,
      driverCheckLabel: checkInfo.label,
      releaseLabel,
      runState,
      vehicleState,
      driverState,
      blocker,
      href: `/dispatch?duty=${duty.id}`,
    }
  })
}

function buildLiveTrips(live: LiveDispatchResponse | null | undefined, now: Date): LiveTripRow[] {
  return (live?.vehicles ?? []).slice(0, 12).map((v) => ({
    id: v.dutyId,
    tripReference: v.reference,
    runReference: v.routeName ?? v.reference,
    driverName: v.driverName ?? 'Unassigned',
    vehicleRegistration: v.vehicleRegistration ?? '—',
    stage: v.nextStop
      ? `Next: ${v.nextStop.name}`
      : v.status.replace(/_/g, ' '),
    plannedTime: v.nextStop?.pickupTime ?? null,
    delayMinutes: v.isStale ? Math.max(1, v.staleMinutes ?? 0) : 0,
    lastUpdateLabel: formatAge(v.lastPositionAt, now),
    isStale: v.isStale,
    hasException: v.isStale,
    wheelchairRequired: false,
    escortRequired: false,
    href: `/live-operations?duty=${v.dutyId}`,
  }))
}

function buildYardSnapshot(yard: YardHubData | null | undefined, now: Date): YardSnapshotCard {
  const vehicles = yard?.vehicles ?? []
  const tasks = yard?.tasks ?? []
  const openTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
  const byActivity = (state: string) => vehicles.filter((v) => v.activityState === state).length

  return {
    onSite: yard?.summary.onSite ?? vehicles.filter((v) => v.presenceState === 'in_yard').length,
    offSite: vehicles.filter((v) => v.presenceState === 'off_site' || v.presenceState === 'in_transit').length,
    locationUnknown: yard?.summary.locationUnknown ?? 0,
    preparing: yard?.summary.workRequired ?? 0,
    awaitingCleaning: byActivity('cleaning'),
    awaitingFuel: byActivity('fuelling'),
    awaitingCharge: byActivity('charging'),
    awaitingEquipment: byActivity('loading_equipment'),
    inInspection: byActivity('awaiting_inspection') + byActivity('under_inspection'),
    inMaintenance: byActivity('awaiting_maintenance') + byActivity('in_workshop'),
    readyForCollection: yard?.summary.readyForService ?? byActivity('ready_for_release'),
    openTasks: openTasks.length,
    overdueTasks: openTasks.filter((t) => isTaskOverdue(t, now)).length,
    safetyCriticalTasks: openTasks.filter((t) => t.priority === 'safety_critical').length,
  }
}

function buildChecksCard(checks: ChecksHubData | null | undefined): ChecksSnapshotCard {
  const overview = checks?.overview ?? []
  const passed = overview.filter((r) => r.result === 'pass' || r.result === 'pass_with_advisory').length
  const failed = overview.filter((r) => r.result === 'fail').length
  const incomplete = checks?.summary.checksInProgress ?? overview.filter((r) => r.lifecycleStatus === 'in_progress').length
  const notSynced =
    overview.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'offline').length +
    (checks?.liveChecks ?? []).filter((r) => r.syncStatus !== 'synced').length
  const required =
    checks?.summary.missingOrOverdue !== undefined
      ? (checks.summary.vehiclesReady ?? 0) +
        (checks.summary.missingOrOverdue ?? 0) +
        (checks.summary.checksInProgress ?? 0) +
        (checks.summary.actionRequired ?? 0)
      : overview.length

  const failedRows = (checks?.actionQueue ?? overview.filter((r) => r.result === 'fail'))
    .slice(0, 5)
    .map((r) => ({
      id: r.checkId,
      registration: r.registrationNumber,
      driverOrPerformer: r.completedBy ?? '—',
      runReference: r.assignedRunReference,
      failure: r.exceptionLabels[0] ?? (r.highestDefectSeverity ? `${r.highestDefectSeverity} defect` : 'Check failed'),
      href: `/vehicle-checks?tab=action&check=${r.checkId}`,
    }))

  return {
    required: required || overview.length,
    passed: passed || checks?.summary.vehiclesReady || 0,
    failed: failed || checks?.summary.actionRequired || 0,
    incomplete,
    notSynced,
    failedRows,
  }
}

function buildDefectsVor(defects: DefectsHubData | null | undefined, dashboard: DashboardSummary | null | undefined): DefectsVorCard {
  const summary = defects?.summary
  return {
    newToday: summary?.addedToday ?? 0,
    critical: summary?.safetyCritical ?? 0,
    awaitingAssessment: summary?.awaitingTriage ?? 0,
    affectingActiveRuns: summary?.overdueAffectingActive ?? 0,
    vorVehicles: summary?.vehiclesVor ?? summary?.allVor ?? dashboard?.vehiclesOffRoad ?? 0,
    awaitingRepair: summary?.overdueRepairs ?? 0,
    awaitingVerification: summary?.awaitingVerification ?? 0,
  }
}

function buildHandoverExceptions(yard: YardHubData | null | undefined): HandoverExceptionRow[] {
  const fromExceptions = (yard?.exceptions ?? [])
    .filter((e) => e.escalationStatus !== 'resolved')
    .filter((e) =>
      /handover|key|return|damage|receipt|custody/i.test(`${e.title} ${e.detail} ${e.operationalImpact}`),
    )
    .map((e) => ({
      id: e.id,
      title: e.title,
      detail: e.detail,
      registration: e.registrationNumber,
      recommendedAction: e.recommendedAction,
      href: `/yard?tab=exceptions&vehicle=${e.vehicleId}`,
    }))

  if (fromExceptions.length > 0) return fromExceptions.slice(0, 8)

  // Soft signal from open shift handover still awaiting acceptance
  if (yard?.handover && yard.handover.status === 'awaiting_acceptance') {
    return [
      {
        id: yard.handover.id,
        title: 'Shift handover awaiting acceptance',
        detail: `${yard.handover.outgoingSupervisor} handed over ${yard.handover.shiftLabel}; incoming supervisor has not accepted.`,
        registration: null,
        recommendedAction: 'Open yard handover and accept or reopen',
        href: '/yard?tab=handover',
      },
    ]
  }
  return []
}

function buildSyncHealth(
  driversSummary: DriverDirectorySummary | null | undefined,
  checks: ChecksHubData | null | undefined,
  yard: YardHubData | null | undefined,
  live: LiveDispatchResponse | null | undefined,
): SyncHealthCard {
  const driversStale = driversSummary?.appNotRecentlySynced ?? 0
  const checksPendingSync =
    (checks?.overview ?? []).filter((r) => r.syncStatus !== 'synced').length +
    (checks?.liveChecks ?? []).filter((r) => r.syncStatus !== 'synced').length
  const yardTasksPendingSync = (yard?.tasks ?? []).filter(
    (t) => t.syncStatus === 'pending' || t.syncStatus === 'failed' || t.syncStatus === 'conflict',
  ).length
  const liveVehiclesStale = (live?.vehicles ?? []).filter((v) => v.isStale).length
  const notes: string[] = []
  if (driversStale > 0) notes.push(`${driversStale} driver app(s) not recently synced`)
  if (checksPendingSync > 0) notes.push(`${checksPendingSync} check(s) pending sync`)
  if (yardTasksPendingSync > 0) notes.push(`${yardTasksPendingSync} yard task(s) not confirmed synced`)
  if (liveVehiclesStale > 0) notes.push(`${liveVehiclesStale} live vehicle(s) with stale GPS`)

  let connectionStatus: SyncHealthCard['connectionStatus'] = 'live'
  if (liveVehiclesStale > 2 || driversStale > 3 || yardTasksPendingSync > 3) connectionStatus = 'delayed'
  if (liveVehiclesStale > 5 && driversStale > 5) connectionStatus = 'offline'

  return {
    driversOnlineProxy: Math.max(0, (driversSummary?.onDuty ?? 0) - driversStale),
    driversStale,
    checksPendingSync,
    yardTasksPendingSync,
    liveVehiclesStale,
    connectionStatus,
    notes,
  }
}

function pushAction(
  queue: OpsActionItem[],
  item: OpsActionItem,
) {
  queue.push(item)
}

function buildActionQueue(input: {
  dashboard: DashboardSummary | null | undefined
  driverExceptions: OperationalException[]
  vehicleExceptions: OperationalException[]
  yard: YardHubData | null | undefined
  checks: ChecksHubData | null | undefined
  defects: DefectsHubData | null | undefined
  pipeline: ReadinessPipelineRow[]
  now: Date
}): OpsActionItem[] {
  const queue: OpsActionItem[] = []

  for (const alert of input.dashboard?.alerts ?? []) {
    const severity =
      alert.severity === 'danger' ? 'critical' : alert.severity === 'warning' ? 'urgent' : 'warning'
    pushAction(queue, {
      id: `dash-${alert.title}-${alert.href}`,
      severity,
      title: alert.title,
      detail: alert.details?.join(' · ') ?? alert.category,
      owner: null,
      recommendedAction: 'Open related record',
      href: alert.href,
      source: 'dashboard',
    })
  }

  for (const ex of input.driverExceptions.slice(0, 10)) {
    pushAction(queue, {
      id: `drv-${ex.id}`,
      severity: ex.severity === 'critical' ? 'critical' : ex.severity === 'high' ? 'urgent' : 'warning',
      title: ex.title,
      detail: ex.recommendedAction ?? ex.relatedRecord,
      owner: ex.owner,
      recommendedAction: ex.recommendedAction ?? 'Review driver eligibility',
      href: ex.relatedHref || '/drivers',
      source: 'driver',
    })
  }

  for (const ex of input.vehicleExceptions.slice(0, 10)) {
    pushAction(queue, {
      id: `veh-${ex.id}`,
      severity: ex.severity === 'critical' ? 'critical' : ex.severity === 'high' ? 'urgent' : 'warning',
      title: ex.title,
      detail: ex.recommendedAction ?? ex.relatedRecord,
      owner: ex.owner,
      recommendedAction: ex.recommendedAction ?? 'Review vehicle release',
      href: ex.relatedHref || '/vehicles',
      source: 'vehicle',
    })
  }

  for (const task of (input.yard?.tasks ?? []).filter((t) => t.blockingRelease && t.status !== 'completed')) {
    pushAction(queue, {
      id: `yard-task-${task.id}`,
      severity: task.priority === 'safety_critical' ? 'critical' : task.priority === 'urgent' ? 'urgent' : 'warning',
      title: `Yard task: ${task.title}`,
      detail: `${task.registrationNumber} · due ${task.dueAt ? formatAge(task.dueAt, input.now).replace(' ago', '') : 'not set'}`,
      owner: task.assignedStaffName,
      recommendedAction: 'Complete yard task before release',
      href: `/yard?tab=tasks&task=${task.id}`,
      source: 'yard',
    })
  }

  for (const row of (input.checks?.actionQueue ?? []).slice(0, 8)) {
    pushAction(queue, {
      id: `check-${row.checkId}`,
      severity: row.result === 'fail' || row.operationalStatus === 'vor' ? 'critical' : 'urgent',
      title: `Check action: ${row.registrationNumber}`,
      detail: row.exceptionLabels[0] ?? row.checkTypeLabel,
      owner: row.reviewerName,
      recommendedAction: 'Review failed or blocked vehicle check',
      href: `/vehicle-checks?tab=action&check=${row.checkId}`,
      source: 'checks',
    })
  }

  for (const d of (input.defects?.register ?? [])
    .filter((r) => r.severity === 'dangerous' || r.defectStatus === 'vor')
    .slice(0, 8)) {
    pushAction(queue, {
      id: `def-${d.id}`,
      severity: 'critical',
      title: `Defect: ${d.registrationNumber}`,
      detail: d.title,
      owner: d.assignee,
      recommendedAction: d.defectStatus === 'vor' ? 'Manage VOR and reallocate work' : 'Assess safety-critical defect',
      href: `/defects/${d.id}`,
      source: 'defects',
    })
  }

  for (const row of input.pipeline.filter((p) => p.blocker).slice(0, 8)) {
    pushAction(queue, {
      id: `pipe-${row.id}`,
      severity: row.runState === 'BLOCKED' ? 'urgent' : 'warning',
      title: `Run ${row.runReference} blocked`,
      detail: row.blocker ?? 'Readiness incomplete',
      owner: null,
      recommendedAction: 'Clear blocker before release',
      href: row.href,
      source: 'dashboard',
    })
  }

  const rank = { critical: 0, urgent: 1, warning: 2 }
  const seen = new Set<string>()
  return queue
    .filter((item) => {
      const key = `${item.title}|${item.href}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => rank[a.severity] - rank[b.severity])
    .slice(0, 25)
}

/** Pure aggregator: compose existing hubs into the control-centre model. */
export function buildOpsDashboard(input: OpsDashboardInput): OpsDashboardModel {
  const now = input.now ?? new Date()
  const duties = input.duties ?? []
  const driverExceptions = input.driverExceptions ?? []
  const vehicleExceptions = input.vehicleExceptions ?? []

  const drivers = buildDriverCard(input.driversSummary, duties, driverExceptions, input.dashboard)
  const vehicles = buildVehicleCard(input.vehiclesSummary, input.yard, input.checks, duties, input.dashboard)
  const pipeline = buildPipeline(duties, input.yard, input.checks)
  const liveTrips = buildLiveTrips(input.live, now)
  const yard = buildYardSnapshot(input.yard, now)
  const checks = buildChecksCard(input.checks)
  const defectsVor = buildDefectsVor(input.defects, input.dashboard)
  const handoverExceptions = buildHandoverExceptions(input.yard)
  const syncHealth = buildSyncHealth(input.driversSummary, input.checks, input.yard, input.live)
  const actionQueue = buildActionQueue({
    dashboard: input.dashboard,
    driverExceptions,
    vehicleExceptions,
    yard: input.yard,
    checks: input.checks,
    defects: input.defects,
    pipeline,
    now,
  })

  const runsReady = pipeline.filter((p) => !p.blocker && (p.runState === 'READY' || p.runState === 'RELEASED' || p.releaseLabel === 'Released')).length
  const runsBlocked = pipeline.filter((p) => Boolean(p.blocker)).length
  const criticalExceptions = actionQueue.filter((a) => a.severity === 'critical').length

  return {
    operationalDate: input.yard?.operationalDate ?? input.live?.date ?? now.toISOString().slice(0, 10),
    generatedAt: now.toISOString(),
    topLine: {
      driversReadyLabel: `${drivers.signedOn} signed on · ${drivers.blocked} blocked`,
      vehiclesReadyLabel: `${vehicles.ready} ready · ${vehicles.vor} VOR`,
      runsReady,
      runsBlocked,
      activeTrips: liveTrips.length || input.dashboard?.todaysActiveDuties || 0,
      criticalExceptions,
    },
    drivers,
    vehicles,
    pipeline,
    liveTrips,
    yard,
    checks,
    defectsVor,
    handoverExceptions,
    syncHealth,
    actionQueue,
  }
}

// Re-export labels used by tests / UI without pulling unused type warnings
export type { DriverDutyState, RunState, VehicleReadinessState }
