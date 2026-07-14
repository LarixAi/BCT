import type { VehicleProfile } from '@/lib/vehicles/types'
import { isExpiringSoon } from './status'
import type { ChecksHubData, ChecksOperationalRow, ChecksSummary, LiveCheckRow } from './types'
import {
  buildExceptionLabels,
  checkTypeLabel,
  computeUrgency,
  computeValidUntil,
  deriveReleaseStatus,
  deriveWorkStatus,
} from './status'

function highestSeverity(v: VehicleProfile): ChecksOperationalRow['highestDefectSeverity'] {
  const order = ['dangerous', 'major', 'minor', 'advisory'] as const
  for (const s of order) {
    if (v.defects.some((d) => d.severity === s && d.status !== 'closed')) return s
  }
  return null
}

function rowFromProfileCheck(
  v: VehicleProfile,
  checkId: string,
  lifecycle: ChecksOperationalRow['lifecycleStatus'],
  overrides: Partial<ChecksOperationalRow> = {},
): ChecksOperationalRow {
  const latest = v.checks[0]
  const validUntil = computeValidUntil(latest?.checkDate ?? v.lastCheckAt)
  const workStatus = deriveWorkStatus(v)
  const base: ChecksOperationalRow = {
    checkId,
    vehicleId: v.id,
    registrationNumber: v.registrationNumber,
    fleetNumber: v.fleetNumber,
    makeModel: `${v.make} ${v.model}`,
    vehicleCategory: v.vehicleCategory,
    depotId: v.currentDepotId,
    depotName: v.currentDepotName,
    operationalStatus: deriveReleaseStatus(v, lifecycle),
    lifecycleStatus: lifecycle,
    checkType: latest?.checkType ?? null,
    checkTypeLabel: latest ? checkTypeLabel(latest.checkType) : 'Check required',
    completedBy: latest?.performedBy ?? null,
    sourceApplication: latest?.sourceApplication ?? null,
    startedAt: latest?.checkDate ?? null,
    submittedAt: ['submitted', 'awaiting_review', 'approved', 'failed', 'closed'].includes(lifecycle) ? latest?.checkDate ?? null : null,
    result: latest?.result ?? null,
    defectCount: v.openDefectCount,
    highestDefectSeverity: highestSeverity(v),
    evidenceCount: latest ? 3 : 0,
    evidenceMissing: lifecycle === 'awaiting_review' && !latest?.notes,
    validUntil,
    workStatus,
    assignedRunReference: v.currentRunReference ?? v.nextRunReference,
    nextDepartureTime: v.nextDepartureTime,
    reviewerName: lifecycle === 'approved' ? 'Auto-approved' : lifecycle === 'awaiting_review' ? null : null,
    reviewStatus: lifecycle === 'approved' ? 'auto_approved' : lifecycle === 'awaiting_review' ? 'pending' : null,
    urgencyScore: 0,
    exceptionLabels: [],
    syncStatus: 'synced',
    suspiciousFlagCount: 0,
    ...overrides,
  }
  base.urgencyScore = computeUrgency(base)
  base.exceptionLabels = buildExceptionLabels(v, base)
  return base
}

export function buildChecksHub(
  vehicles: VehicleProfile[],
  liveChecks: LiveCheckRow[],
  extraRows: ChecksOperationalRow[],
): ChecksHubData {
  const active = vehicles.filter((v) => v.lifecycleStatus === 'active' || v.lifecycleStatus === 'awaiting_onboarding')

  const overview: ChecksOperationalRow[] = []

  for (const v of active) {
    const live = liveChecks.find((l) => l.vehicleId === v.id)
    if (live) {
      overview.push(
        rowFromProfileCheck(v, live.checkId, 'in_progress', {
          startedAt: live.startedAt,
          completedBy: live.performedBy,
          checkType: live.checkType,
          checkTypeLabel: live.checkTypeLabel,
          syncStatus: live.syncStatus,
          operationalStatus: 'check_in_progress',
        }),
      )
      continue
    }

    const latest = v.checks[0]
    if (v.checksOverdue || !v.lastCheckAt) {
      overview.push(
        rowFromProfileCheck(v, `overdue-${v.id}`, 'scheduled', {
          operationalStatus: 'not_checked',
          lifecycleStatus: 'expired',
          result: null,
          checkTypeLabel: 'Morning check required',
        }),
      )
      continue
    }

    if (latest?.result === 'fail' || v.criticalDefectCount > 0) {
      overview.push(rowFromProfileCheck(v, latest?.id ?? `chk-${v.id}`, 'failed', { operationalStatus: v.operationalStatus === 'vor' ? 'vor' : 'blocked' }))
      continue
    }

    if (latest?.result === 'pass_with_advisory' || v.openDefectCount > 0) {
      overview.push(rowFromProfileCheck(v, latest!.id, 'awaiting_review', { operationalStatus: 'conditionally_ready' }))
      continue
    }

    overview.push(rowFromProfileCheck(v, latest?.id ?? `chk-${v.id}`, 'approved', { operationalStatus: 'ready' }))
  }

  for (const row of extraRows) {
    const idx = overview.findIndex((r) => r.vehicleId === row.vehicleId)
    if (idx >= 0) overview[idx] = row
    else overview.push(row)
  }

  overview.sort((a, b) => b.urgencyScore - a.urgencyScore)

  const submitted = overview.filter((r) =>
    ['submitted', 'awaiting_review', 'approved', 'rejected', 'failed', 'closed'].includes(r.lifecycleStatus),
  )
  const actionQueue = overview.filter(
    (r) =>
      r.result === 'fail' ||
      r.highestDefectSeverity === 'dangerous' ||
      r.highestDefectSeverity === 'major' ||
      r.lifecycleStatus === 'awaiting_review' ||
      r.evidenceMissing ||
      (r.workStatus === 'assigned' && r.operationalStatus !== 'ready' && r.operationalStatus !== 'conditionally_ready'),
  )
  const overdue = overview.filter((r) => r.lifecycleStatus === 'expired' || r.lifecycleStatus === 'scheduled' || r.operationalStatus === 'not_checked')

  const depots = [...new Map(active.map((v) => [v.currentDepotId, { id: v.currentDepotId, name: v.currentDepotName }])).values()]

  const today = new Date()
  const summary: ChecksSummary = {
    vehiclesReady: overview.filter((r) => r.operationalStatus === 'ready').length,
    expiringSoon: overview.filter((r) => r.operationalStatus === 'ready' && isExpiringSoon(r.validUntil)).length,
    checksInProgress: liveChecks.length,
    oldestInProgressMinutes: liveChecks.length
      ? Math.max(...liveChecks.map((l) => l.minutesSinceStart))
      : null,
    actionRequired: actionQueue.length,
    assignedDespiteIssue: actionQueue.filter((r) => r.workStatus === 'assigned' || r.workStatus === 'live').length,
    missingOrOverdue: overdue.length,
    departureDueSoon: overdue.filter((r) => r.nextDepartureTime).length,
    vehiclesOffRoad: overview.filter((r) => r.operationalStatus === 'vor').length,
    awaitingMaintenanceReview: overview.filter((r) => r.operationalStatus === 'in_maintenance').length,
  }

  return {
    operationalDate: today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
    summary,
    overview,
    liveChecks,
    submitted,
    actionQueue,
    overdue,
    history: [...overview].sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '')),
    depots,
    templates: [],
    intelligence: {
      suspiciousChecksToday: 0,
      recurringDefectVehicles: [],
      driverQualityAlerts: [],
      depotComparison: [],
      templatePerformance: [],
    },
  }
}

export function filterCheckRows(rows: ChecksOperationalRow[], filter: string, search: string, depotId?: string): ChecksOperationalRow[] {
  let list = rows
  if (depotId && depotId !== 'all') list = list.filter((r) => r.depotId === depotId)
  if (filter === 'ready') list = list.filter((r) => r.operationalStatus === 'ready')
  else if (filter === 'in_progress') list = list.filter((r) => r.lifecycleStatus === 'in_progress')
  else if (filter === 'action') list = list.filter((r) => r.urgencyScore >= 40 || r.result === 'fail')
  else if (filter === 'overdue') list = list.filter((r) => r.operationalStatus === 'not_checked' || r.lifecycleStatus === 'expired')
  else if (filter === 'vor') list = list.filter((r) => r.operationalStatus === 'vor' || r.operationalStatus === 'in_maintenance')

  if (search.trim()) {
    const q = search.toLowerCase()
    list = list.filter(
      (r) =>
        r.registrationNumber.toLowerCase().includes(q) ||
        r.fleetNumber?.toLowerCase().includes(q) ||
        r.completedBy?.toLowerCase().includes(q) ||
        r.checkTypeLabel.toLowerCase().includes(q),
    )
  }
  return list
}
