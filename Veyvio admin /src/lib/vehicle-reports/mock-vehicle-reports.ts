import { mockVehiclesApi } from '@/lib/api/mock-vehicles'
import type {
  CreateVehicleReportInput,
  ReviewVehicleReportInput,
  VehicleReportRecord,
  VehicleReportsHubData,
  VehicleReportSeverity,
  VehicleReportStage,
  VehicleReportStatus,
} from './types'

let seq = 2

function now() {
  return new Date().toISOString()
}

function ref(n: number) {
  return `VR-${String(n).padStart(5, '0')}`
}

function initialSeverity(input: CreateVehicleReportInput): VehicleReportSeverity {
  if (input.severity) return input.severity
  if (input.vorRequired || input.safeToMove === false) return 'critical'
  if (input.reportType === 'defect') return 'major'
  if (input.reportType === 'damage') return 'moderate'
  return 'minor'
}

function nextActionFor(stage: VehicleReportStage, status: VehicleReportStatus): string {
  if (status === 'closed' || status === 'duplicate') return 'None — retained in history'
  if (stage === 'reported' || stage === 'under_review') return 'Command review'
  if (stage === 'action') return 'Complete maintenance work'
  if (stage === 'verification') return 'Verify repair and return to road'
  return 'Assess risk'
}

const seed: VehicleReportRecord[] = [
  {
    id: 'vrep-1',
    reference: 'VR-00001',
    depotId: 'depot-1',
    depotName: 'Streatham',
    vehicleId: 'veh-4',
    registrationNumber: 'EF34 GHI',
    fleetNumber: 'F-104',
    reportType: 'defect',
    reportCategory: 'brakes',
    severity: 'critical',
    stage: 'action',
    status: 'in_progress',
    vehicleOperationalStatus: 'vor',
    title: 'Brake warning light and pull to nearside',
    description: 'Driver reported brake warning and vehicle pulling left under braking.',
    vehicleArea: 'Brakes',
    reportedBy: 'Sam Driver',
    reportedByRole: 'Driver',
    reportedAt: '2026-07-18T06:40:00.000Z',
    mileage: 91240,
    location: 'Streatham depot',
    passengersOnboard: false,
    safeToMove: false,
    vorRequired: true,
    restrictionType: null,
    linkedDefectId: null,
    linkedWorkOrderId: null,
    linkedVorId: null,
    linkedIncidentId: null,
    linkedCheckId: null,
    assignedOwner: 'Workshop',
    dueAt: '2026-07-19T12:00:00.000Z',
    evidence: [
      {
        id: 'ev-1',
        kind: 'photo',
        label: 'Dashboard warning',
        capturedAt: '2026-07-18T06:40:00.000Z',
        url: null,
      },
    ],
    timeline: [
      {
        id: 'tl-1',
        action: 'Report submitted',
        actorName: 'Sam Driver',
        occurredAt: '2026-07-18T06:40:00.000Z',
        detail: 'Driver defect from walkaround',
      },
      {
        id: 'tl-2',
        action: 'VOR applied',
        actorName: 'Fleet controller',
        occurredAt: '2026-07-18T06:55:00.000Z',
        detail: 'Vehicle held pending brake assessment',
      },
    ],
    rootCause: null,
    resolution: null,
    verifiedBy: null,
    verifiedAt: null,
    closedAt: null,
    labourCost: null,
    partsCost: null,
    externalCost: null,
    totalCost: null,
    downtimeHours: null,
    slaStatus: 'warning',
    nextAction: 'Complete maintenance work',
  },
]

let reports = [...seed]

export const mockVehicleReportsApi = {
  list(params?: { vehicleId?: string; status?: string }): VehicleReportRecord[] {
    let rows = reports.slice().sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))
    if (params?.vehicleId) rows = rows.filter((r) => r.vehicleId === params.vehicleId)
    if (params?.status === 'open') {
      rows = rows.filter((r) => r.status !== 'closed' && r.status !== 'duplicate')
    }
    return rows
  },

  get(id: string): VehicleReportRecord | null {
    return reports.find((r) => r.id === id) ?? null
  },

  hub(): VehicleReportsHubData {
    const rows = this.list()
    const today = now().slice(0, 10)
    const open = rows.filter((r) => r.status !== 'closed' && r.status !== 'duplicate')
    return {
      operationalDate: today,
      summary: {
        openReports: open.length,
        criticalReports: open.filter((r) => r.severity === 'critical').length,
        vehiclesVor: open.filter((r) => r.vehicleOperationalStatus === 'vor').length,
        awaitingReview: open.filter((r) => r.stage === 'reported' || r.stage === 'under_review').length,
        awaitingVerification: open.filter((r) => r.stage === 'verification').length,
        overdueActions: open.filter((r) => r.slaStatus === 'breached').length,
        repeatDefects: 0,
        submittedToday: rows.filter((r) => r.reportedAt.startsWith(today)).length,
      },
      reports: rows,
    }
  },

  create(input: CreateVehicleReportInput, actorName: string): VehicleReportRecord {
    const profile = mockVehiclesApi.get(input.vehicleId)
    const severity = initialSeverity(input)
    const reportedAt = now()
    const id = `vrep-${++seq}`
    const row: VehicleReportRecord = {
      id,
      reference: ref(seq),
      depotId: input.depotId ?? profile?.homeDepotId ?? null,
      depotName: input.depotName ?? profile?.homeDepotName ?? null,
      vehicleId: input.vehicleId,
      registrationNumber: input.registrationNumber ?? profile?.registrationNumber ?? '—',
      fleetNumber: input.fleetNumber ?? profile?.fleetNumber ?? null,
      reportType: input.reportType,
      reportCategory: input.reportCategory ?? input.reportType,
      severity,
      stage: 'reported',
      status: 'awaiting_review',
      vehicleOperationalStatus: profile?.operationalStatus ?? 'available',
      title: input.title,
      description: input.description,
      vehicleArea: input.vehicleArea ?? null,
      reportedBy: actorName,
      reportedByRole: input.reportedByRole ?? 'Staff',
      reportedAt,
      mileage: input.mileage ?? profile?.mileage ?? null,
      location: input.location ?? profile?.currentLocationLabel ?? null,
      passengersOnboard: input.passengersOnboard ?? false,
      safeToMove: input.safeToMove ?? null,
      vorRequired: Boolean(input.vorRequired),
      restrictionType: null,
      linkedDefectId: null,
      linkedWorkOrderId: null,
      linkedVorId: null,
      linkedIncidentId: null,
      linkedCheckId: null,
      assignedOwner: null,
      dueAt: null,
      evidence: (input.evidenceLabels ?? []).map((label, index) => ({
        id: `${id}-ev-${index}`,
        kind: 'photo' as const,
        label,
        capturedAt: reportedAt,
        url: null,
      })),
      timeline: [
        {
          id: `${id}-tl-1`,
          action: 'Report submitted',
          actorName,
          occurredAt: reportedAt,
          detail: `${input.reportType} report`,
        },
      ],
      rootCause: null,
      resolution: null,
      verifiedBy: null,
      verifiedAt: null,
      closedAt: null,
      labourCost: null,
      partsCost: null,
      externalCost: null,
      totalCost: null,
      downtimeHours: null,
      slaStatus: severity === 'critical' ? 'warning' : 'ok',
      nextAction: nextActionFor('reported', 'awaiting_review'),
    }

    if (input.vorRequired || severity === 'critical') {
      const vorProfile = mockVehiclesApi.markVor(
        input.vehicleId,
        {
          reason: input.title,
          category: input.reportCategory ?? input.reportType,
          location: input.location ?? undefined,
          recoveryRequired: input.safeToMove === false,
        },
        actorName,
      )
      const vor = vorProfile.vorRecords.find((v) => !v.resolvedAt)
      row.linkedVorId = vor?.id ?? null
      row.vehicleOperationalStatus = 'vor'
      row.stage = 'action'
      row.status = 'in_progress'
      row.timeline.push({
        id: `${id}-tl-vor`,
        action: 'VOR applied',
        actorName,
        occurredAt: now(),
        detail: 'Automatic hold from critical / unsafe-to-move report',
      })
      row.nextAction = nextActionFor(row.stage, row.status)
    } else {
      const defectProfile = mockVehiclesApi.reportDefect(
        input.vehicleId,
        {
          category: input.reportCategory ?? input.reportType,
          component: input.vehicleArea ?? input.reportType,
          description: input.description,
          // Critical reports take the VOR branch above — this path is non-critical only.
          severity: severity === 'major' ? 'major' : 'minor',
          source: 'vehicle_report',
          location: input.location ?? undefined,
          mileage: input.mileage ?? undefined,
          markVor: false,
          passengersOnboard: input.passengersOnboard,
          safeToMove: input.safeToMove ?? undefined,
        },
        actorName,
      )
      row.linkedDefectId = defectProfile.defects[defectProfile.defects.length - 1]?.id ?? null
    }

    reports = [row, ...reports]
    return row
  },

  review(id: string, input: ReviewVehicleReportInput, actorName: string): VehicleReportRecord {
    const idx = reports.findIndex((r) => r.id === id)
    if (idx < 0) throw new Error('Vehicle report not found')
    const current = reports[idx]!
    const at = now()
    let next: VehicleReportRecord = {
      ...current,
      timeline: [
        ...current.timeline,
        {
          id: `${id}-tl-${current.timeline.length + 1}`,
          action: input.action.replace(/_/g, ' '),
          actorName,
          occurredAt: at,
          detail: input.notes ?? null,
        },
      ],
    }

    switch (input.action) {
      case 'accept':
        next = { ...next, stage: 'under_review', status: 'awaiting_review', assignedOwner: actorName }
        break
      case 'request_info':
        next = { ...next, stage: 'under_review', status: 'awaiting_review', nextAction: 'Awaiting more evidence' }
        break
      case 'mark_duplicate':
        next = { ...next, status: 'duplicate', stage: 'closed', closedAt: at, nextAction: 'None — retained in history' }
        break
      case 'escalate':
        next = {
          ...next,
          severity: 'critical',
          stage: 'under_review',
          slaStatus: 'warning',
        }
        break
      case 'reduce_severity':
        next = {
          ...next,
          severity: input.severity ?? 'minor',
        }
        break
      case 'apply_vor': {
        const profile = mockVehiclesApi.markVor(
          current.vehicleId,
          {
            reason: current.title,
            category: current.reportCategory,
            defectId: current.linkedDefectId ?? undefined,
            location: current.location ?? undefined,
          },
          actorName,
        )
        const vor = profile.vorRecords.find((v) => !v.resolvedAt)
        next = {
          ...next,
          linkedVorId: vor?.id ?? current.linkedVorId,
          vehicleOperationalStatus: 'vor',
          vorRequired: true,
          stage: 'action',
          status: 'in_progress',
        }
        break
      }
      case 'restrict':
        next = {
          ...next,
          restrictionType: input.restrictionType ?? 'restricted_use',
          vehicleOperationalStatus: 'restricted_use',
          stage: 'action',
          status: 'in_progress',
        }
        break
      case 'create_work_order': {
        const profile = mockVehiclesApi.createWorkOrder(
          current.vehicleId,
          {
            type: 'repair',
            title: input.workOrderTitle ?? `WO — ${current.title}`,
            defectId: current.linkedDefectId ?? undefined,
          },
          actorName,
        )
        const wo = profile.workOrders[profile.workOrders.length - 1]
        next = {
          ...next,
          linkedWorkOrderId: wo?.id ?? null,
          stage: 'action',
          status: 'in_progress',
          assignedOwner: 'Workshop',
          nextAction: 'Complete maintenance work',
        }
        break
      }
      case 'close_no_fault':
        next = {
          ...next,
          status: 'closed',
          stage: 'closed',
          closedAt: at,
          resolution: input.notes ?? 'No fault found',
          rootCause: input.notes ?? 'No fault found',
          nextAction: 'None — retained in history',
        }
        break
    }

    next = {
      ...next,
      nextAction: next.nextAction || nextActionFor(next.stage, next.status),
    }
    reports[idx] = next
    return next
  },
}
