import { buildDefectsHub, getDefectSlaSettings } from '@/lib/defects/aggregate'
import { filterDefectAuditEvents } from '@/lib/defects/audit'
import { buildDefectSourceRecord } from '@/lib/defects/source'
import { activeRestrictionsForDefect, restrictionSummary } from '@/lib/defects/restrictions'
import { requiredVerificationLevel, VERIFICATION_LEVEL_LABELS } from '@/lib/defects/verification'
import type {
  ApplyDefectRestrictionInput,
  CloseDefectHubInput,
  CompleteRepairHubInput,
  DefectDetailRecord,
  DefectsHubData,
  DefectTimelineEvent,
  ReportDefectHubInput,
  ReopenDefectHubInput,
  TriageDefectHubInput,
  UploadDefectEvidenceInput,
  BulkDefectActionInput,
  VerifyDefectHubInput,
  MarkDefectVorHubInput,
} from '@/lib/defects/types'
import { mockVehiclesApi } from './mock-vehicles'

function buildDetail(vehicleId: string, defectId: string): DefectDetailRecord | null {
  const hub = buildDefectsHub(mockVehiclesApi.list())
  const row = hub.register.find((r) => r.id === defectId && r.vehicleId === vehicleId)
  if (!row) return null

  const profile = mockVehiclesApi.get(vehicleId)
  if (!profile) return null
  const defect = profile.defects.find((d) => d.id === defectId)
  if (!defect) return null

  const similar = profile.defects.filter((d) => d.component === defect.component && d.id !== defectId).length
  const readyCount = mockVehiclesApi.list().filter(
    (v) => v.id !== vehicleId && v.operationalStatus !== 'vor' && v.seatingCapacity >= profile.seatingCapacity,
  ).length
  const linkedWo = defect.linkedWorkOrderId ? profile.workOrders.find((w) => w.id === defect.linkedWorkOrderId) : null
  const restrictions = activeRestrictionsForDefect(profile, defectId)
  const requiredLevel = requiredVerificationLevel(defect)

  const settings = getDefectSlaSettings()
  const dispatchBlocked =
    (settings.blockDispatchOnCritical && defect.severity === 'dangerous') ||
    (settings.blockDispatchOnPendingAssessment && row.vehicleAvailability === 'pending_safety_assessment') ||
    row.vehicleAvailability === 'vor'

  const storedEvidence = (defect.evidence ?? []).map((e) => ({
    id: e.id,
    kind: e.kind as 'photo' | 'video' | 'document',
    label: e.label,
    uploadedBy: e.uploadedBy,
    capturedAt: e.capturedAt,
    source: e.source,
  }))

  return {
    ...row,
    symptoms: defect.description,
    mileage: defect.mileage,
    vorApplied: defect.vorApplied,
    triagedBy: defect.triagedBy,
    triagedAt: defect.triagedAt,
    closureReason: defect.closureReason,
    closedBy: defect.closedBy,
    closedAt: defect.closedAt,
    evidence: [
      ...storedEvidence,
      ...(storedEvidence.length === 0
        ? [{ id: 'ev-1', kind: 'photo' as const, label: 'Fault photograph', uploadedBy: defect.reportedBy, capturedAt: defect.reportedAt, source: defect.source }]
        : []),
      ...(row.linkedCheckId
        ? [{ id: 'ev-2', kind: 'check_answer' as const, label: `Linked check ${row.linkedCheckId}`, uploadedBy: defect.reportedBy, capturedAt: defect.reportedAt, source: 'vehicle_check' }]
        : []),
      ...(defect.repairCompletedAt && !storedEvidence.some((e) => e.label.includes('Repair'))
        ? [{ id: 'ev-3', kind: 'document' as const, label: 'Repair evidence', uploadedBy: defect.repairCompletedBy ?? 'Technician', capturedAt: defect.repairCompletedAt, source: 'maintenance' }]
        : []),
    ],
    timeline: [
      { id: 'tl-1', action: 'Defect reported', actorName: defect.reportedBy, occurredAt: defect.reportedAt, detail: defect.source },
      ...(defect.triagedAt
        ? [{ id: 'tl-2', action: 'Triage completed', actorName: defect.triagedBy ?? 'Reviewer', occurredAt: defect.triagedAt, detail: defect.triageStatus }]
        : []),
      ...(defect.vorApplied
        ? [{ id: 'tl-3', action: 'Vehicle marked VOR', actorName: defect.triagedBy ?? 'System', occurredAt: defect.triagedAt ?? defect.reportedAt, detail: 'Safety-critical defect' }]
        : []),
      ...(row.linkedWorkOrderId
        ? [{ id: 'tl-4', action: 'Maintenance job linked', actorName: 'System', occurredAt: defect.reportedAt, detail: row.linkedWorkOrderId }]
        : []),
      ...(defect.repairCompletedAt
        ? [{ id: 'tl-5', action: 'Repair completed', actorName: defect.repairCompletedBy ?? 'Technician', occurredAt: defect.repairCompletedAt, detail: defect.repairSummary ?? null }]
        : []),
      ...(defect.verifiedAt
        ? [{ id: 'tl-6', action: defect.verificationResult === 'pass' ? 'Verification passed' : 'Verification failed', actorName: defect.verifiedBy ?? 'Verifier', occurredAt: defect.verifiedAt, detail: defect.verificationNotes ?? null }]
        : []),
      ...(defect.closedAt
        ? [{ id: 'tl-7', action: 'Defect closed', actorName: defect.closedBy ?? 'Admin', occurredAt: defect.closedAt, detail: defect.closureReason ?? null }]
        : []),
      ...restrictions.map((r, i) => ({
        id: `tl-r-${i}`,
        action: 'Restriction applied',
        actorName: r.createdBy,
        occurredAt: r.createdAt,
        detail: r.label,
      })),
    ] satisfies DefectTimelineEvent[],
    operationalImpact: {
      currentRunReference: profile.currentRunReference,
      nextRunReference: profile.nextRunReference,
      nextDepartureTime: profile.nextDepartureTime,
      assignedDriverName: profile.currentDriverName ?? profile.nextDriverName,
      wheelchairRequired: profile.wheelchairCapacity > 0,
      openDefectCount: profile.openDefectCount,
      similarDefectCount: similar,
      replacementCandidates: readyCount,
      dispatchBlocked,
      dispatchBlockReason: dispatchBlocked
        ? row.severity === 'dangerous'
          ? 'Critical defect — vehicle blocked from dispatch'
          : row.vehicleAvailability === 'vor'
            ? 'Vehicle VOR — hard block on assignment'
            : 'Pending safety assessment — dispatch blocked'
        : null,
      impactSummary:
        row.severity === 'dangerous' && profile.nextRunReference
          ? `Vehicle assigned to ${profile.nextRunReference} — replacement required before departure`
          : similar >= 2
            ? `Recurring ${defect.component} issue — engineering review recommended`
            : restrictions.length > 0
              ? `Active restrictions: ${restrictions.map((r) => r.label).join(', ')}`
              : null,
    },
    recurringWarning:
      similar >= 2
        ? `This is the ${similar + 1}th ${defect.component} defect on this vehicle. Consider root-cause investigation.`
        : null,
    restrictionLabel: restrictionSummary(profile) ?? (row.vehicleAvailability === 'available_with_restriction' ? 'Restricted use until repair' : null),
    restrictions,
    repair: linkedWo || defect.repairCompletedAt
      ? {
          linkedWorkOrderId: defect.linkedWorkOrderId,
          workOrderStatus: linkedWo?.status ?? null,
          technicianName: linkedWo?.technicianName ?? defect.repairCompletedBy ?? null,
          diagnosis: linkedWo?.diagnosis ?? null,
          workPerformed: defect.repairSummary ?? null,
          repairType: defect.repairSummary?.includes('temporary') ? 'temporary' : 'permanent',
          completedAt: defect.repairCompletedAt ?? null,
          completedBy: defect.repairCompletedBy ?? null,
        }
      : null,
    verification: {
      requiredLevel,
      completedLevel: defect.verificationLevel ?? null,
      result: defect.verificationResult ?? null,
      verifiedBy: defect.verifiedBy ?? null,
      verifiedAt: defect.verifiedAt ?? null,
      method: defect.verificationNotes ?? null,
      notes: defect.verificationNotes ?? null,
    },
    sourceRecord: buildDefectSourceRecord(defect, profile, row.linkedCheckId, row.linkedWorkOrderId),
    auditTrail: filterDefectAuditEvents(profile.auditEvents, defectId),
    safetyContext:
      defect.symptoms != null ||
      defect.passengersOnboard != null ||
      defect.safeToMove != null ||
      defect.recoveryRequired != null ||
      defect.affectsAccessibility != null
        ? {
            symptoms: defect.symptoms ?? null,
            passengersOnboard: defect.passengersOnboard ?? null,
            safeToMove: defect.safeToMove ?? null,
            recoveryRequired: defect.recoveryRequired ?? null,
            affectsAccessibility: defect.affectsAccessibility ?? null,
          }
        : null,
  }
}

export const mockDefectsApi = {
  hub(): DefectsHubData {
    return buildDefectsHub(mockVehiclesApi.list())
  },

  detail(vehicleId: string, defectId: string): DefectDetailRecord | null {
    return buildDetail(vehicleId, defectId)
  },

  detailById(defectId: string): DefectDetailRecord | null {
    const hub = this.hub()
    const row = hub.register.find((r) => r.id === defectId)
    if (!row) return null
    return buildDetail(row.vehicleId, defectId)
  },

  triage(input: TriageDefectHubInput, actorName: string): DefectsHubData {
    mockVehiclesApi.triageDefect(input.vehicleId, input.defectId, {
      triageStatus: input.triageStatus,
      notes: input.notes,
      createWorkOrder: input.createWorkOrder,
      markVor: input.markVor,
    }, actorName)
    return this.hub()
  },

  report(input: ReportDefectHubInput, actorName: string): DefectsHubData {
    mockVehiclesApi.reportDefect(
      input.vehicleId,
      {
        category: input.category,
        component: input.component,
        description: input.description,
        severity: input.severity,
        location: input.location,
        markVor: input.markVor || input.severity === 'dangerous',
        symptoms: input.symptoms,
        passengersOnboard: input.passengersOnboard,
        safeToMove: input.safeToMove,
        recoveryRequired: input.recoveryRequired,
        affectsAccessibility: input.affectsAccessibility,
      },
      actorName,
    )
    return this.hub()
  },

  markVor(input: MarkDefectVorHubInput, actorName: string): DefectDetailRecord {
    const profile = mockVehiclesApi.get(input.vehicleId)
    const defect = profile?.defects.find((d) => d.id === input.defectId)
    if (!defect) throw new Error('Defect not found')
    mockVehiclesApi.markVor(input.vehicleId, {
      reason: input.reason,
      category: defect.category,
      defectId: input.defectId,
    }, actorName)
    return this.detail(input.vehicleId, input.defectId)!
  },

  completeRepair(input: CompleteRepairHubInput, actorName: string): DefectDetailRecord {
    mockVehiclesApi.completeDefectRepair(input.vehicleId, input.defectId, {
      diagnosis: input.diagnosis,
      workPerformed: input.workPerformed,
      repairType: input.repairType,
      notes: input.notes,
    }, actorName)
    return this.detail(input.vehicleId, input.defectId)!
  },

  verify(input: VerifyDefectHubInput, actorName: string): DefectDetailRecord {
    const profile = mockVehiclesApi.get(input.vehicleId)
    const defect = profile?.defects.find((d) => d.id === input.defectId)
    if (!defect) throw new Error('Defect not found')
    const required = requiredVerificationLevel(defect)
    if (input.result === 'pass' && input.level < required) {
      throw new Error(`${VERIFICATION_LEVEL_LABELS[required]} required before closure`)
    }
    mockVehiclesApi.verifyDefect(input.vehicleId, input.defectId, {
      result: input.result,
      level: input.level,
      method: input.method,
      notes: input.notes,
    }, actorName)
    return this.detail(input.vehicleId, input.defectId)!
  },

  close(input: CloseDefectHubInput, actorName: string): DefectDetailRecord {
    mockVehiclesApi.closeDefect(input.vehicleId, input.defectId, actorName, input.reason)
    return this.detail(input.vehicleId, input.defectId)!
  },

  applyRestriction(input: ApplyDefectRestrictionInput, actorName: string): DefectDetailRecord {
    mockVehiclesApi.addRestriction(input.vehicleId, {
      type: input.restrictionType,
      label: input.label,
      reason: input.reason,
      defectId: input.defectId,
      expiresAt: input.expiresAt,
    }, actorName)
    return this.detail(input.vehicleId, input.defectId)!
  },

  liftRestriction(vehicleId: string, restrictionId: string, actorName: string, defectId: string): DefectDetailRecord {
    mockVehiclesApi.liftRestriction(vehicleId, restrictionId, actorName)
    return this.detail(vehicleId, defectId)!
  },

  reopen(input: ReopenDefectHubInput, actorName: string): DefectDetailRecord {
    mockVehiclesApi.reopenDefect(input.vehicleId, input.defectId, actorName, input.reason)
    return this.detail(input.vehicleId, input.defectId)!
  },

  uploadEvidence(input: UploadDefectEvidenceInput, actorName: string): DefectDetailRecord {
    mockVehiclesApi.uploadDefectEvidence(input.vehicleId, input.defectId, input, actorName)
    return this.detail(input.vehicleId, input.defectId)!
  },

  bulkAction(input: BulkDefectActionInput, actorName: string): DefectsHubData {
    const hub = this.hub()
    const rows = hub.register.filter((r) => input.defectIds.includes(r.id))

    if (rows.some((r) => r.severity === 'dangerous') && input.action !== 'export') {
      throw new Error('Bulk actions are not permitted on safety-critical defects')
    }

    if (input.action === 'assign_technician' && input.assignee) {
      for (const row of rows) {
        mockVehiclesApi.triageDefect(row.vehicleId, row.id, {
          triageStatus: 'validated',
          notes: `Bulk assigned to ${input.assignee}`,
          createWorkOrder: true,
        }, actorName)
      }
    }

    if (input.action === 'add_note' && input.note) {
      for (const row of rows) {
        mockVehiclesApi.addDefectNote(row.vehicleId, row.id, input.note, actorName)
      }
    }

    return this.hub()
  },
}
