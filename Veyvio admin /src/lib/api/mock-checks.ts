import { buildChecksHub } from '@/lib/checks/aggregate'
import { buildOperationalImpact } from '@/lib/checks/impact'
import { detectSuspiciousFlags } from '@/lib/checks/suspicious'
import { CHECK_TEMPLATES, templateForCheckType } from '@/lib/checks/templates'
import { CHECK_TEMPLATE_AREAS } from '@/lib/vehicles/checks'
import { evaluateVehicleRelease } from '@/lib/vehicles/release'
import type {
  CheckDetailRecord,
  ChecksHubData,
  ChecksIntelligenceSummary,
  ConditionalReleaseInput,
  LiveCheckRow,
  ResolveCheckImpactInput,
  ReviewCheckInput,
  StartAdminCheckInput,
} from '@/lib/checks/types'
import type { VehicleProfile } from '@/lib/vehicles/types'
import { mockTransfersApi } from './mock-transfers'
import { mockVehiclesApi } from './mock-vehicles'

const minutesAgo = (n: number) => new Date(Date.now() - n * 60 * 1000).toISOString()
const hoursFromNow = (n: number) => new Date(Date.now() + n * 60 * 60 * 1000).toISOString()
const now = () => new Date().toISOString()

type ReviewState = {
  lifecycleStatus: CheckDetailRecord['lifecycleStatus']
  operationalStatus: CheckDetailRecord['operationalStatus']
  reviewStatus: string
  reviewerName: string
  timelineExtra: CheckDetailRecord['timeline']
}

const reviewState: Record<string, ReviewState> = {}
const conditionalReleases: Record<string, CheckDetailRecord['conditionalRelease']> = {}
const resolvedImpacts: Record<string, { replacementVehicleId: string; reason: string; at: string; by: string }> = {}

function seedLiveChecks(): LiveCheckRow[] {
  return [
    {
      checkId: 'live-1',
      vehicleId: 'veh-3',
      registrationNumber: 'KL78 MNO',
      performedBy: 'Alice Brown',
      checkType: 'driver_pre_use',
      checkTypeLabel: 'Driver pre-use walkaround',
      startedAt: minutesAgo(18),
      currentSection: 'Brakes and steering',
      completionPercent: 62,
      syncStatus: 'synced',
      lastSyncAt: minutesAgo(1),
      deviceLabel: 'Yard app · iPhone 14',
      nextDepartureTime: '07:10',
      minutesSinceStart: 18,
    },
    {
      checkId: 'live-2',
      vehicleId: 'veh-2',
      registrationNumber: 'GH56 HIJ',
      performedBy: 'Michael Patel',
      checkType: 'driver_changeover',
      checkTypeLabel: 'Driver changeover',
      startedAt: minutesAgo(8),
      currentSection: 'Equipment handover',
      completionPercent: 78,
      syncStatus: 'synced',
      lastSyncAt: minutesAgo(0.5),
      deviceLabel: 'Driver app · Samsung A54',
      nextDepartureTime: null,
      minutesSinceStart: 8,
    },
    {
      checkId: 'live-3',
      vehicleId: 'veh-5',
      registrationNumber: 'MN90 PQR',
      performedBy: 'David Cole',
      checkType: 'driver_pre_use',
      checkTypeLabel: 'Driver pre-use walkaround',
      startedAt: minutesAgo(4),
      currentSection: 'Exterior',
      completionPercent: 22,
      syncStatus: 'offline',
      lastSyncAt: minutesAgo(4),
      deviceLabel: 'Driver app · iPhone 13',
      nextDepartureTime: '06:00',
      minutesSinceStart: 4,
    },
  ]
}

function findTripForVehicle(vehicleId: string) {
  return mockTransfersApi.listTrips().find((t) => t.vehicleId === vehicleId) ?? null
}

function replacementCandidates(blockedVehicle: VehicleProfile): CheckDetailRecord['replacementCandidates'] {
  return mockVehiclesApi
    .list()
    .filter((v) => v.id !== blockedVehicle.id && v.lifecycleStatus === 'active' && v.operationalStatus !== 'vor')
    .map((v) => {
      const release = evaluateVehicleRelease(v)
      return {
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        makeModel: `${v.make} ${v.model}`,
        seatingCapacity: v.seatingCapacity,
        wheelchairCapacity: v.wheelchairCapacity,
        depotName: v.currentDepotName,
        readinessLabel: release.canAllocate ? 'Ready' : 'Blocked',
        canAllocate: release.canAllocate,
        estimatedPrepMinutes: v.currentDepotId === blockedVehicle.currentDepotId ? 15 : 35,
      }
    })
    .filter((c) => c.seatingCapacity >= blockedVehicle.seatingCapacity || c.wheelchairCapacity >= blockedVehicle.wheelchairCapacity)
    .sort((a, b) => Number(b.canAllocate) - Number(a.canAllocate))
    .slice(0, 5)
}

function enrichDetail(base: CheckDetailRecord): CheckDetailRecord {
  const vehicle = mockVehiclesApi.get(base.vehicleId)
  if (!vehicle) return base

  const trip = findTripForVehicle(vehicle.id)
  const impact = buildOperationalImpact(vehicle, trip)
  const candidates = replacementCandidates(vehicle)
  const suspiciousFlags = detectSuspiciousFlags(base)
  const review = reviewState[base.checkId]
  const conditional = conditionalReleases[base.checkId] ?? null

  let detail: CheckDetailRecord = {
    ...base,
    operationalImpact: impact,
    replacementCandidates: candidates,
    suspiciousFlags,
    conditionalRelease: conditional,
    suspiciousFlagCount: suspiciousFlags.length,
  }

  if (review) {
    detail = {
      ...detail,
      lifecycleStatus: review.lifecycleStatus,
      operationalStatus: review.operationalStatus,
      reviewStatus: review.reviewStatus,
      reviewerName: review.reviewerName,
      timeline: [...base.timeline, ...review.timelineExtra],
    }
  }

  const resolved = resolvedImpacts[base.checkId]
  if (resolved) {
    detail.timeline = [
      ...detail.timeline,
      {
        id: `tl-resolve-${base.checkId}`,
        action: 'Operational impact resolved',
        actorName: resolved.by,
        source: 'command',
        occurredAt: resolved.at,
        detail: `Replacement vehicle assigned — ${resolved.reason}`,
      },
    ]
  }

  return detail
}

function buildDetailFromVehicle(checkId: string): CheckDetailRecord | null {
  const vehicles = mockVehiclesApi.list()
  for (const v of vehicles) {
    const check = v.checks.find((c) => c.id === checkId)
    if (!check) continue

    const tpl = templateForCheckType(check.checkType)
    const areas = CHECK_TEMPLATE_AREAS[check.checkType] ?? ['General']
    const sections = areas.map((area, i) => ({
      id: `sec-${check.id}-${i}`,
      section: area,
      question: `${area} — satisfactory?`,
      answer: check.result === 'fail' && i === 0 ? 'No' : 'Yes',
      answeredAt: check.checkDate,
      createdDefectId: check.defectIds[0] ?? null,
      notes: i === 0 ? check.notes : null,
    }))

    const defects = v.defects
      .filter((d) => check.defectIds.includes(d.id) || (check.result === 'fail' && d.status !== 'closed'))
      .map((d) => ({ id: d.id, description: d.description, severity: d.severity }))

    const lifecycle =
      check.result === 'fail' ? 'failed' : check.result === 'pass_with_advisory' ? 'awaiting_review' : 'approved'

    const base: CheckDetailRecord = {
      checkId: check.id,
      vehicleId: v.id,
      registrationNumber: v.registrationNumber,
      fleetNumber: v.fleetNumber,
      makeModel: `${v.make} ${v.model}`,
      vehicleCategory: v.vehicleCategory,
      depotId: v.currentDepotId,
      depotName: v.currentDepotName,
      operationalStatus: v.operationalStatus === 'vor' ? 'vor' : check.result === 'fail' ? 'blocked' : check.result === 'pass_with_advisory' ? 'conditionally_ready' : 'ready',
      lifecycleStatus: lifecycle,
      checkType: check.checkType,
      checkTypeLabel: check.checkType.replace(/_/g, ' '),
      completedBy: check.performedBy,
      sourceApplication: check.sourceApplication,
      startedAt: check.checkDate,
      submittedAt: check.checkDate,
      result: check.result,
      defectCount: defects.length,
      highestDefectSeverity: defects[0]?.severity ?? null,
      evidenceCount: 4,
      evidenceMissing: checkId === 'chk-2',
      validUntil: hoursFromNow(tpl?.validityHours ?? 12),
      workStatus: v.currentRunId ? 'live' : v.nextRunReference ? 'assigned' : 'unassigned',
      assignedRunReference: v.currentRunReference ?? v.nextRunReference,
      nextDepartureTime: v.nextDepartureTime,
      reviewerName: lifecycle === 'approved' ? 'System' : null,
      reviewStatus: lifecycle === 'approved' ? 'auto_approved' : 'pending',
      urgencyScore: check.result === 'fail' ? 100 : check.result === 'pass_with_advisory' ? 50 : 10,
      exceptionLabels: check.result === 'fail' ? ['Check failed'] : [],
      syncStatus: 'synced',
      suspiciousFlagCount: 0,
      currentLocation: v.currentLocationLabel,
      vorStatus: v.operationalStatus === 'vor',
      currentDriverName: v.currentDriverName ?? v.nextDriverName,
      templateVersion: tpl ? `${tpl.version} — ${tpl.name}` : 'v2.4',
      sections,
      evidence: [
        { id: 'ev-1', kind: 'photo', label: 'Front nearside', capturedAt: check.checkDate, url: null, sufficient: true },
        { id: 'ev-2', kind: 'photo', label: 'Dashboard warnings', capturedAt: check.checkDate, url: null, sufficient: true },
        { id: 'ev-3', kind: 'odometer', label: 'Odometer', capturedAt: check.checkDate, url: null, sufficient: true },
        { id: 'ev-4', kind: 'signature', label: 'Driver declaration', capturedAt: check.checkDate, url: null, sufficient: checkId !== 'chk-2' },
      ],
      timeline: [
        { id: 'tl-1', action: 'Check started', actorName: check.performedBy, source: check.sourceApplication, occurredAt: check.checkDate, detail: null },
        { id: 'tl-2', action: 'Check submitted', actorName: check.performedBy, source: check.sourceApplication, occurredAt: check.checkDate, detail: check.result },
        ...(check.result === 'fail'
          ? [
              { id: 'tl-3', action: 'Defect reported', actorName: check.performedBy, source: check.sourceApplication, occurredAt: check.checkDate, detail: check.notes },
              { id: 'tl-4', action: 'Dispatch alerted', actorName: 'System', source: 'command', occurredAt: check.checkDate, detail: 'Vehicle blocked from allocation' },
            ]
          : []),
      ],
      defectSummaries: defects,
      operationalImpact: null,
      suspiciousFlags: [],
      conditionalRelease: null,
      replacementCandidates: [],
    }

    return enrichDetail(base)
  }
  return null
}

function buildIntelligence(vehicles: VehicleProfile[]): ChecksIntelligenceSummary {
  const depots = [...new Set(vehicles.map((v) => v.currentDepotName))]
  return {
    suspiciousChecksToday: 2,
    recurringDefectVehicles: vehicles
      .filter((v) => v.openDefectCount >= 2)
      .map((v) => ({ vehicleId: v.id, registrationNumber: v.registrationNumber, defectCount: v.openDefectCount })),
    driverQualityAlerts: [
      { driverName: 'David Cole', missedChecks: 2 },
      { driverName: 'Robert Wilson', missedChecks: 1 },
    ],
    depotComparison: depots.map((name) => ({
      depotName: name,
      passRate: name === 'Wembley Depot' ? 0.91 : name === 'Croydon Depot' ? 0.86 : 0.88,
      overdueCount: vehicles.filter((v) => v.currentDepotName === name && v.checksOverdue).length,
    })),
    templatePerformance: CHECK_TEMPLATES.slice(0, 3).map((t) => ({
      templateName: t.name,
      failRate: t.checkType === 'driver_pre_use' ? 0.04 : 0.02,
      avgDurationMinutes: t.checkType === 'driver_pre_use' ? 11 : 8,
    })),
  }
}

let liveChecks = seedLiveChecks()

function hubData(): ChecksHubData {
  const vehicles = mockVehiclesApi.list()
  const hub = buildChecksHub(vehicles, liveChecks, [])
  return {
    ...hub,
    templates: CHECK_TEMPLATES,
    intelligence: buildIntelligence(vehicles),
    overview: hub.overview.map((r) => {
      const detail = getDetail(r.checkId)
      return detail
        ? { ...r, suspiciousFlagCount: detail.suspiciousFlags.length, lifecycleStatus: detail.lifecycleStatus, operationalStatus: detail.operationalStatus }
        : { ...r, suspiciousFlagCount: 0 }
    }),
  }
}

function getDetail(checkId: string): CheckDetailRecord | null {
  const live = liveChecks.find((l) => l.checkId === checkId)
  if (live) {
    const v = mockVehiclesApi.get(live.vehicleId)
    if (!v) return null
    const base: CheckDetailRecord = {
      checkId: live.checkId,
      vehicleId: v.id,
      registrationNumber: v.registrationNumber,
      fleetNumber: v.fleetNumber,
      makeModel: `${v.make} ${v.model}`,
      vehicleCategory: v.vehicleCategory,
      depotId: v.currentDepotId,
      depotName: v.currentDepotName,
      operationalStatus: 'check_in_progress',
      lifecycleStatus: 'in_progress',
      checkType: live.checkType,
      checkTypeLabel: live.checkTypeLabel,
      completedBy: live.performedBy,
      sourceApplication: 'driver',
      startedAt: live.startedAt,
      submittedAt: null,
      result: null,
      defectCount: 0,
      highestDefectSeverity: null,
      evidenceCount: 1,
      evidenceMissing: false,
      validUntil: null,
      workStatus: v.nextRunReference ? 'assigned' : 'unassigned',
      assignedRunReference: v.nextRunReference,
      nextDepartureTime: live.nextDepartureTime,
      reviewerName: null,
      reviewStatus: null,
      urgencyScore: 20,
      exceptionLabels: [],
      syncStatus: live.syncStatus,
      suspiciousFlagCount: live.syncStatus === 'offline' ? 1 : 0,
      currentLocation: v.currentLocationLabel,
      vorStatus: false,
      currentDriverName: live.performedBy,
      templateVersion: 'v2.4 — Driver pre-use',
      sections: [],
      evidence: [{ id: 'ev-live', kind: 'photo', label: 'In progress capture', capturedAt: live.startedAt, url: null, sufficient: true }],
      timeline: [{ id: 'tl-live', action: 'Check started', actorName: live.performedBy, source: 'driver', occurredAt: live.startedAt, detail: live.currentSection }],
      defectSummaries: [],
      operationalImpact: null,
      suspiciousFlags: [],
      conditionalRelease: null,
      replacementCandidates: [],
    }
    return enrichDetail(base)
  }
  return buildDetailFromVehicle(checkId)
}

export const mockChecksApi = {
  hub: hubData,

  detail: getDetail,

  startAdminCheck(input: StartAdminCheckInput, actorName: string): ChecksHubData {
    mockVehiclesApi.recordCheck(
      input.vehicleId,
      { checkType: input.checkType, result: 'pass', notes: input.notes },
      actorName,
    )
    return hubData()
  },

  reviewCheck(input: ReviewCheckInput, actorName: string): ChecksHubData {
    const detail = getDetail(input.checkId)
    if (!detail) throw new Error('Check not found')

    const ts = now()
    if (input.decision === 'approve') {
      reviewState[input.checkId] = {
        lifecycleStatus: 'approved',
        operationalStatus: detail.result === 'pass_with_advisory' ? 'conditionally_ready' : 'ready',
        reviewStatus: 'approved',
        reviewerName: actorName,
        timelineExtra: [{ id: `tl-rev-${Date.now()}`, action: 'Check approved', actorName, source: 'command', occurredAt: ts, detail: input.reason ?? null }],
      }
    } else if (input.decision === 'reject') {
      reviewState[input.checkId] = {
        lifecycleStatus: 'rejected',
        operationalStatus: 'blocked',
        reviewStatus: 'rejected',
        reviewerName: actorName,
        timelineExtra: [{ id: `tl-rev-${Date.now()}`, action: 'Check rejected', actorName, source: 'command', occurredAt: ts, detail: input.reason ?? 'Submission rejected' }],
      }
    } else {
      reviewState[input.checkId] = {
        lifecycleStatus: 'scheduled',
        operationalStatus: 'not_checked',
        reviewStatus: 'redo_requested',
        reviewerName: actorName,
        timelineExtra: [{ id: `tl-rev-${Date.now()}`, action: 'Check redo requested', actorName, source: 'command', occurredAt: ts, detail: input.reason ?? 'Checker must repeat check' }],
      }
    }
    return hubData()
  },

  conditionalRelease(input: ConditionalReleaseInput, actorName: string): ChecksHubData {
    conditionalReleases[input.checkId] = {
      authorisedBy: actorName,
      authorisedAt: now(),
      reason: input.reason,
      restrictions: input.restrictions,
      requiredCompletionDate: input.requiredCompletionDate ?? null,
    }
    reviewState[input.checkId] = {
      lifecycleStatus: 'approved',
      operationalStatus: 'conditionally_ready',
      reviewStatus: 'conditional_release',
      reviewerName: actorName,
      timelineExtra: [{ id: `tl-cond-${Date.now()}`, action: 'Conditional release authorised', actorName, source: 'command', occurredAt: now(), detail: input.restrictions }],
    }
    return hubData()
  },

  resolveImpact(input: ResolveCheckImpactInput, actorName: string): ChecksHubData {
    const detail = getDetail(input.checkId)
    if (!detail) throw new Error('Check not found')
    const replacement = mockVehiclesApi.get(input.replacementVehicleId)
    if (!replacement) throw new Error('Replacement vehicle not found')

    resolvedImpacts[input.checkId] = {
      replacementVehicleId: input.replacementVehicleId,
      reason: `${replacement.registrationNumber} — ${input.reason}`,
      at: now(),
      by: actorName,
    }
    return hubData()
  },
}
