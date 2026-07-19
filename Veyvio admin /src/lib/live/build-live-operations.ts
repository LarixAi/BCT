import type {
  DashboardSummary,
  DutyRecord,
  LiveDispatchResponse,
  LiveDispatchVehicle,
} from '@/lib/api/types'
import type { OperationalException } from '@/lib/types'
import {
  labelServiceHealth,
  labelTripLifecycle,
  mapLiveDriverState,
  mapLiveVehicleState,
  mapServiceHealth,
  mapTripLifecycle,
  type LiveExceptionSeverity,
} from './canonical-trip-states'
import type {
  LiveActivityItem,
  LiveDrawerModel,
  LiveExceptionCard,
  LiveOperationsModel,
  LiveRunRow,
  LiveSummaryCards,
  LiveTripRow,
} from './live-operations'

export interface BuildLiveOperationsInput {
  live: LiveDispatchResponse | null | undefined
  completedLive?: LiveDispatchResponse | null | undefined
  duties?: DutyRecord[] | null | undefined
  dashboard?: DashboardSummary | null | undefined
  driverExceptions?: OperationalException[] | null | undefined
  vehicleExceptions?: OperationalException[] | null | undefined
  paused?: boolean
  now?: Date
}

function ageLabel(iso: string | null | undefined, now: Date): string {
  if (!iso) return 'No recent update'
  const ms = now.getTime() - new Date(iso).getTime()
  if (Number.isNaN(ms) || ms < 0) return 'Just now'
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  return `${Math.round(min / 60)} hr ago`
}

function clockLabel(now: Date): string {
  return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/** Minutes behind the published plan — never GPS age (that falsely marked runs late). */
export function computeOperationalDelayMinutes(
  v: LiveDispatchVehicle,
  now: Date = new Date(),
): number {
  if (typeof v.delayMinutes === 'number' && Number.isFinite(v.delayMinutes) && v.delayMinutes >= 0) {
    return Math.round(v.delayMinutes)
  }

  const status = (v.status ?? '').toLowerCase().replace(/-/g, '_')
  if (['completed', 'signed_off', 'cancelled'].includes(status)) return 0

  const startMs = v.plannedStartAt ? new Date(v.plannedStartAt).getTime() : NaN
  const endMs = v.plannedEndAt ? new Date(v.plannedEndAt).getTime() : NaN
  const nowMs = now.getTime()
  if (Number.isNaN(nowMs)) return 0

  const notUnderway = ['planned', 'assigned', 'signed_on', 'ready', 'accepted'].includes(status)
  if (notUnderway && Number.isFinite(startMs) && nowMs > startMs) {
    return Math.max(0, Math.round((nowMs - startMs) / 60_000))
  }

  if (Number.isFinite(endMs) && nowMs > endMs) {
    return Math.max(0, Math.round((nowMs - endMs) / 60_000))
  }

  return 0
}

function isMoving(v: LiveDispatchVehicle): boolean {
  return !v.isStale && ['in_progress', 'en_route', 'active', 'passenger_boarded'].includes(v.status)
}

function toRunRow(v: LiveDispatchVehicle, now: Date): LiveRunRow {
  const delayMinutes = computeOperationalDelayMinutes(v, now)
  const stage = mapTripLifecycle(v.status)
  const health = mapServiceHealth({
    status: v.status,
    delayMinutes,
    // GPS silence is a tracking risk, not schedule lateness on its own.
    isStale: v.isStale && delayMinutes < 4,
    blocked: v.status === 'incident_reported',
  })
  const progressLabel =
    v.routeTotalStops > 0
      ? `${v.routeCompletedStops} of ${v.routeTotalStops} stops`
      : labelTripLifecycle(stage)

  let nextAction = 'View'
  if (health === 'blocked') nextAction = 'Resolve'
  else if (health === 'late' || health === 'severely_late') nextAction = 'Manage delay'
  else if (health === 'at_risk') nextAction = 'Review'
  else if (v.isStale) nextAction = 'Request update'

  return {
    id: v.dutyId,
    runReference: v.reference,
    serviceType: v.routeName ?? 'Operational run',
    driverName: v.driverName ?? 'Unassigned',
    driverId: v.driverId,
    vehicleRegistration: v.vehicleRegistration ?? '—',
    progressLabel,
    tripProgress:
      v.routeTotalStops > 0 ? `${v.routeCompletedStops} of ${v.routeTotalStops}` : null,
    health,
    healthLabel: labelServiceHealth(health),
    delayMinutes,
    nextStop: v.nextStop?.name ?? null,
    nextAction,
    stage,
    stageLabel: labelTripLifecycle(stage),
    lastUpdateLabel: v.lastPositionAt ? ageLabel(v.lastPositionAt, now) : 'No GPS yet',
    isStale: v.isStale,
    isMoving: isMoving(v),
    hasException: v.isStale || delayMinutes >= 8 || v.status === 'incident_reported',
    passengerOnboard: v.status === 'passenger_boarded',
    wheelchair: false,
    escortRequired: false,
    latitude: v.lastLatitude,
    longitude: v.lastLongitude,
    href: `/live-operations?duty=${v.dutyId}`,
  }
}

function toTripRows(runs: LiveRunRow[]): LiveTripRow[] {
  return runs.map((r) => ({
    id: `trip-${r.id}`,
    tripReference: r.runReference.replace(/^(SCH-|DAY-|AM-|PM-)/, 'TRP-'),
    runReference: r.runReference,
    passengerStage: r.passengerOnboard
      ? 'Passenger onboard'
      : r.stage === 'COMPLETED'
        ? 'Completed'
        : r.nextStop
          ? 'Waiting pickup'
          : r.stageLabel,
    driverName: r.driverName,
    vehicleRegistration: r.vehicleRegistration,
    plannedTime: null,
    health: r.health,
    healthLabel: r.healthLabel,
    delayMinutes: r.delayMinutes,
    stage: r.stage,
    href: `/live-operations/trips/${r.id}`,
  }))
}

function severityFromAlert(sev: string): LiveExceptionSeverity {
  if (sev === 'danger' || sev === 'critical') return 'critical'
  if (sev === 'warning' || sev === 'high') return 'urgent'
  return 'warning'
}

function buildExceptions(input: BuildLiveOperationsInput, runs: LiveRunRow[], now: Date): LiveExceptionCard[] {
  const cards: LiveExceptionCard[] = []

  for (const alert of input.dashboard?.alerts ?? []) {
    cards.push({
      id: `dash-${alert.title}`,
      severity: severityFromAlert(alert.severity),
      title: alert.title,
      detail: alert.details?.join(' · ') ?? alert.category,
      runReference: null,
      driverName: null,
      vehicleRegistration: null,
      detectedAtLabel: clockLabel(now),
      owner: null,
      recommendedAction: 'Open related record',
      lifecycle: 'OPEN',
      href: alert.href,
      source: 'dashboard',
    })
  }

  for (const ex of [...(input.driverExceptions ?? []), ...(input.vehicleExceptions ?? [])].slice(0, 12)) {
    cards.push({
      id: ex.id,
      severity: ex.severity === 'critical' ? 'critical' : ex.severity === 'high' ? 'urgent' : 'warning',
      title: ex.title,
      detail: ex.recommendedAction ?? ex.relatedRecord,
      runReference: null,
      driverName: ex.category === 'driver' ? ex.relatedRecord : null,
      vehicleRegistration: ex.category === 'vehicle' ? ex.relatedRecord : null,
      detectedAtLabel: ex.raisedAt,
      owner: ex.owner,
      recommendedAction: ex.recommendedAction ?? 'Review exception',
      lifecycle: 'OPEN',
      href: ex.relatedHref,
      source: ex.category,
    })
  }

  for (const run of runs.filter((r) => r.hasException || (r.latitude == null && r.longitude == null))) {
    const noGps = run.latitude == null || run.longitude == null
    cards.push({
      id: `live-${run.id}`,
      severity: run.health === 'severely_late' || run.isStale ? 'critical' : noGps || run.health === 'late' ? 'urgent' : 'warning',
      title: noGps
        ? `No live GPS — ${run.runReference}`
        : run.isStale
          ? `Location stale — ${run.runReference}`
          : run.delayMinutes > 0
            ? `${run.runReference} delayed ${run.delayMinutes} min`
            : `Attention required — ${run.runReference}`,
      detail: noGps
        ? `${run.driverName} · ${run.vehicleRegistration}. Waiting for the Driver app to report position.`
        : run.isStale
          ? `Last confirmed ${run.lastUpdateLabel}. Do not assume silence means no activity.`
          : `${run.driverName} · ${run.vehicleRegistration} · ${run.stageLabel}`,
      runReference: run.runReference,
      driverName: run.driverName,
      vehicleRegistration: run.vehicleRegistration,
      detectedAtLabel: run.lastUpdateLabel,
      owner: null,
      recommendedAction: noGps ? 'Confirm driver app location' : run.nextAction,
      lifecycle: 'OPEN',
      href: run.href,
      source: 'live',
    })
  }

  const rank = { critical: 0, urgent: 1, warning: 2 }
  const seen = new Set<string>()
  return cards
    .filter((c) => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
    .sort((a, b) => rank[a.severity] - rank[b.severity])
    .slice(0, 20)
}

function buildActivity(runs: LiveRunRow[], exceptions: LiveExceptionCard[], now: Date): LiveActivityItem[] {
  const items: LiveActivityItem[] = []

  for (const run of runs.slice(0, 8)) {
    items.push({
      id: `act-${run.id}`,
      timeLabel: clockLabel(now),
      description: `${run.driverName} on ${run.runReference} — ${run.stageLabel}${
        run.delayMinutes > 0 ? ` (+${run.delayMinutes} min)` : ''
      }`,
      actor: 'Driver app',
      category: 'trips',
      href: run.href,
    })
  }

  for (const ex of exceptions.slice(0, 5)) {
    items.push({
      id: `act-ex-${ex.id}`,
      timeLabel: ex.detectedAtLabel,
      description: ex.title,
      actor: 'System',
      category: ex.source === 'vehicle' ? 'vehicles' : ex.source === 'driver' ? 'drivers' : 'admin',
      href: ex.href,
    })
  }

  return items.slice(0, 15)
}

function buildSummary(
  activeRuns: LiveRunRow[],
  completedCount: number,
  duties: DutyRecord[],
  exceptions: LiveExceptionCard[],
): LiveSummaryCards {
  const notStarted = duties.filter((d) => ['assigned', 'planned', 'ready', 'unassigned'].includes(d.status)).length
  const onTime = activeRuns.filter((r) => r.health === 'on_time').length
  const atRisk = activeRuns.filter((r) => r.health === 'at_risk').length
  const late = activeRuns.filter((r) => r.health === 'late' || r.health === 'severely_late').length
  const onboard = activeRuns.filter((r) => r.passengerOnboard).length
  const travelling = activeRuns.filter((r) => !r.passengerOnboard && r.stage !== 'COMPLETED').length
  const awaitingPickup = activeRuns.filter((r) => r.nextStop && !r.passengerOnboard).length

  return {
    activeRuns: activeRuns.length,
    runsNotStarted: notStarted,
    runsCompleted: completedCount,
    activeTrips: activeRuns.length,
    awaitingPickup,
    onboard,
    travelling,
    onTime,
    atRisk,
    late,
    driversActive: new Set(activeRuns.map((r) => r.driverId).filter(Boolean)).size,
    driversOnBreak: 0,
    assistanceRequests: exceptions.filter((e) => /assistance|emergency|unreachable/i.test(e.title)).length,
    vehiclesInService: new Set(activeRuns.map((r) => r.vehicleRegistration).filter((r) => r !== '—')).size,
    vehiclesRestricted: activeRuns.filter((r) => r.health === 'blocked').length,
    criticalExceptions: exceptions.filter((e) => e.severity === 'critical').length,
    urgentExceptions: exceptions.filter((e) => e.severity === 'urgent').length,
    warningExceptions: exceptions.filter((e) => e.severity === 'warning').length,
  }
}

export function buildLiveOperations(input: BuildLiveOperationsInput): LiveOperationsModel {
  const now = input.now ?? new Date()
  const vehicles = input.live?.vehicles ?? []
  const completedVehicles = input.completedLive?.vehicles ?? []
  const duties = input.duties ?? []

  const runs = vehicles.map((v) => toRunRow(v, now))
  const trips = toTripRows(runs)
  const exceptions = buildExceptions(input, runs, now)
  const activity = buildActivity(runs, exceptions, now)
  const summary = buildSummary(runs, completedVehicles.length, duties, exceptions)

  const staleCount = runs.filter((r) => r.isStale).length
  let connectionStatus: LiveOperationsModel['connection']['status'] = 'live'
  let message = 'Receiving live Driver and Yard updates'
  if (input.paused) {
    connectionStatus = 'paused'
    message = 'Live updates paused — showing last received position'
  } else if (!input.live?.trackingEnabled) {
    connectionStatus = 'gps_unavailable'
    message = 'Live vehicle locations temporarily unavailable. Trip and driver status updates are still received.'
  } else if (staleCount >= 1) {
    connectionStatus = 'delayed'
    message = `${staleCount} vehicle${staleCount === 1 ? '' : 's'} have stale location. Do not assume silence means no activity.`
  }

  return {
    operationalDate: input.live?.date ?? now.toISOString().slice(0, 10),
    generatedAt: input.live?.generatedAt ?? now.toISOString(),
    currentTimeLabel: clockLabel(now),
    connection: {
      status: connectionStatus,
      message,
      lastUpdatedLabel: ageLabel(input.live?.generatedAt, now),
    },
    summary,
    runs,
    trips,
    exceptions,
    activity,
    trackingEnabled: input.live?.trackingEnabled ?? false,
  }
}

export function buildLiveDrawer(
  run: LiveRunRow,
  vehicle: LiveDispatchVehicle | null | undefined,
  exceptions: LiveExceptionCard[],
  now = new Date(),
): LiveDrawerModel {
  const noGps = vehicle?.lastLatitude == null || vehicle?.lastLongitude == null
  const driverState = mapLiveDriverState({
    status: vehicle?.status,
    isStale: run.isStale,
    noGps,
    passengerOnboard: run.passengerOnboard,
  })
  const vehicleState = mapLiveVehicleState({
    status: vehicle?.status,
    isStale: run.isStale,
    noGps,
  })

  const timeline: LiveActivityItem[] = [
    {
      id: 'tl-1',
      timeLabel: run.lastUpdateLabel,
      description: `Current stage: ${run.stageLabel}`,
      actor: 'Driver app',
      category: 'trips',
    },
  ]
  if (vehicle?.nextStop) {
    timeline.push({
      id: 'tl-2',
      timeLabel: clockLabel(now),
      description: `Next stop ${vehicle.nextStop.name} · ETA ${vehicle.nextStop.etaMinutes} min`,
      actor: 'System',
      category: 'trips',
    })
  }
  if (noGps) {
    timeline.push({
      id: 'tl-3',
      timeLabel: run.lastUpdateLabel,
      description: 'No live GPS yet — waiting for the Driver app to report position',
      actor: 'System',
      category: 'vehicles',
    })
  } else if (run.isStale) {
    timeline.push({
      id: 'tl-3',
      timeLabel: run.lastUpdateLabel,
      description: 'Location may be outdated — last confirmed position is stale',
      actor: 'System',
      category: 'vehicles',
    })
  }

  return {
    run,
    driverState,
    vehicleState,
    locationSource: vehicle?.lastLatitude != null ? 'Driver app GPS' : 'No live GPS',
    locationAccuracyLabel: vehicle?.lastLatitude != null ? 'Approximate device GPS' : 'Unavailable',
    nextStopEta: vehicle?.nextStop ? `${vehicle.nextStop.etaMinutes} min` : null,
    timeline,
    openExceptions: exceptions.filter(
      (e) => e.runReference === run.runReference || e.vehicleRegistration === run.vehicleRegistration,
    ),
  }
}

export function filterLiveRuns(
  runs: LiveRunRow[],
  filter: string,
  search: string,
): LiveRunRow[] {
  const q = search.trim().toLowerCase()
  return runs.filter((r) => {
    if (filter === 'late') {
      if (!(r.health === 'late' || r.health === 'severely_late')) return false
    } else if (filter === 'at_risk') {
      if (r.health !== 'at_risk') return false
    } else if (filter === 'exceptions') {
      if (!r.hasException) return false
    } else if (filter === 'stale_gps') {
      if (!r.isStale) return false
    } else if (filter === 'onboard') {
      if (!r.passengerOnboard) return false
    } else if (filter === 'active_runs') {
      if (r.health === 'completed') return false
    }

    if (!q) return true
    return (
      r.runReference.toLowerCase().includes(q) ||
      r.driverName.toLowerCase().includes(q) ||
      r.vehicleRegistration.toLowerCase().includes(q) ||
      r.serviceType.toLowerCase().includes(q)
    )
  })
}
