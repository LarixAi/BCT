/** Live Command hub projections from shared operational tables. */
import { admin } from './supabase.ts'

type Row = Record<string, unknown>

function today() {
  return new Date().toISOString().slice(0, 10)
}

function ageMinutes(iso: string | null | undefined) {
  if (!iso) return 0
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
}

export async function projectDefectsHub(companyId: string) {
  const [{ data: defects }, { data: depots }, { data: vorCases }] = await Promise.all([
    admin
      .from('defects')
      .select('*, vehicles(id, registration, fleet_number, make, model, primary_depot_id), depots(id, name)')
      .eq('company_id', companyId)
      .order('reported_at', { ascending: false }),
    admin.from('depots').select('id, name').eq('company_id', companyId),
    admin.from('vor_cases').select('id, vehicle_id, status').eq('company_id', companyId).eq('status', 'active'),
  ])

  const open = (defects ?? []).filter((d) => !['closed', 'rejected'].includes(String(d.status)))
  const critical = open.filter((d) => ['critical', 'dangerous', 'major'].includes(String(d.severity)))
  const awaitingTriage = open.filter((d) => d.status === 'reported' || d.status === 'under_review')
  const awaitingVerification = open.filter((d) => d.status === 'awaiting_verification')
  const vorVehicleIds = new Set((vorCases ?? []).map((v) => String(v.vehicle_id)))

  const register = (defects ?? []).map((row: Row) => {
    const vehicle = (row.vehicles as Row | null) ?? {}
    const depot = (row.depots as Row | null) ?? {}
    const reportedAt = String(row.reported_at ?? row.created_at)
    const severity = String(row.severity ?? 'attention')
    const mappedSeverity =
      severity === 'critical' || severity === 'dangerous'
        ? 'dangerous'
        : severity === 'major'
          ? 'major'
          : severity === 'minor'
            ? 'minor'
            : 'advisory'
    return {
      id: row.id,
      defectRef: row.defect_reference,
      vehicleId: row.vehicle_id,
      registrationNumber: vehicle.registration ?? '—',
      fleetNumber: vehicle.fleet_number ?? null,
      makeModel: [vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Unknown',
      depotId: row.depot_id ?? vehicle.primary_depot_id ?? depot.id ?? '',
      depotName: depot.name ?? 'Depot',
      title: row.component ?? row.category ?? 'Defect',
      description: row.description,
      category: row.category ?? 'general',
      component: row.component ?? 'unknown',
      severity: mappedSeverity,
      workflowStatus: row.status,
      defectStatus: row.status === 'closed' ? 'closed' : row.operational_decision === 'vor' ? 'vor' : 'open',
      triageStatus: row.status === 'reported' ? 'awaiting_triage' : 'triaged',
      vehicleAvailability: vorVehicleIds.has(String(row.vehicle_id)) ? 'vor' : 'available',
      source: row.source_type ?? row.source_app ?? 'command',
      reportedBy: row.reported_by ?? 'system',
      reportedAt,
      location: row.location_on_vehicle ?? null,
      assignee: null,
      repairDeadline: null,
      triageDeadline: null,
      slaMinutesRemaining: null,
      isSlaBreached: false,
      ageMinutes: ageMinutes(reportedAt),
      isOverdue: false,
      evidenceCount: (() => {
        const evidence = row.evidence as Row | null
        if (!evidence || typeof evidence !== 'object') return 0
        if (Array.isArray(evidence)) return evidence.length
        return evidence.photoDataUrl || evidence.photoPath ? 1 : Object.keys(evidence).length > 0 ? 1 : 0
      })(),
      linkedWorkOrderId: null,
      linkedCheckId:
        String(row.source_type ?? '') === 'vehicle_check' && row.source_id ? String(row.source_id) : null,
      urgencyScore: mappedSeverity === 'dangerous' ? 100 : mappedSeverity === 'major' ? 70 : 40,
      operationalImpact: row.operational_decision ?? 'under_review',
      assignedRunReference: null,
      nextDepartureTime: null,
    }
  })

  return {
    operationalDate: today(),
    summary: {
      openDefects: open.length,
      addedToday: open.filter((d) => String(d.reported_at ?? '').startsWith(today())).length,
      safetyCritical: critical.length,
      allVor: register.filter((r) => r.defectStatus === 'vor').length,
      awaitingTriage: awaitingTriage.length,
      oldestTriageHours: awaitingTriage.length
        ? Math.round(Math.max(...awaitingTriage.map((d) => ageMinutes(String(d.reported_at)))) / 60)
        : null,
      overdueRepairs: open.filter((d) => d.status === 'repair_required' || d.status === 'repair_in_progress').length,
      overdueAffectingActive: 0,
      vehiclesVor: vorVehicleIds.size,
      awaitingVerification: awaitingVerification.length,
    },
    register,
    priorityAlerts: critical.slice(0, 5).map((d: Row) => ({
      id: d.id,
      title: d.description,
      severity: 'danger',
      defectId: d.id,
      vehicleId: d.vehicle_id,
      registrationNumber: (d.vehicles as Row | null)?.registration ?? '—',
      message: String(d.description),
      href: `/defects/${d.id}`,
    })),
    depots: (depots ?? []).map((d) => ({ id: d.id, name: d.name })),
    recurring: [],
    recurringInsights: [],
    slaSettings: {
      triageMinutes: { dangerous: 0, major: 30, minor: 480, advisory: 1440 },
      repairMinutes: { dangerous: 0, major: 240, minor: 1440, advisory: 4320 },
      notifyRoles: ['operations_manager', 'maintenance_manager', 'yard_manager'],
      blockDispatchOnCritical: true,
      blockDispatchOnPendingAssessment: true,
      recurringComponentThreshold: 2,
      recurringWindowDays: 60,
    },
    automationRules: [],
    analytics: {
      byDepot: (depots ?? []).map((d) => ({
        depotName: String(d.name),
        count: register.filter((r) => r.depotId === d.id && r.defectStatus !== 'closed').length,
      })),
      byCategory: Object.entries(
        register.reduce((acc: Record<string, number>, r) => {
          if (r.defectStatus === 'closed') return acc
          const key = String(r.category ?? 'general')
          acc[key] = (acc[key] ?? 0) + 1
          return acc
        }, {}),
      ).map(([category, count]) => ({ category, count })),
      bySource: Object.entries(
        register.reduce((acc: Record<string, number>, r) => {
          if (r.defectStatus === 'closed') return acc
          const key = String(r.source ?? 'command')
          acc[key] = (acc[key] ?? 0) + 1
          return acc
        }, {}),
      ).map(([source, count]) => ({ source, count })),
      slaBreaches: register.filter((r) => r.isSlaBreached).length,
      avgAgeHours: open.length
        ? Math.round(open.reduce((s, d) => s + ageMinutes(String(d.reported_at)), 0) / open.length / 60)
        : 0,
      reopenedCount: 0,
      closedThisWeek: (defects ?? []).filter((d) => d.status === 'closed' && String(d.updated_at ?? '').startsWith(today().slice(0, 7))).length,
    },
  }
}

export async function projectIncidentsHub(companyId: string) {
  const [{ data: incidents }, { data: depots }] = await Promise.all([
    admin
      .from('incidents')
      .select('*, vehicles(registration), drivers(driver_number)')
      .eq('company_id', companyId)
      .order('occurred_at', { ascending: false }),
    admin.from('depots').select('id, name').eq('company_id', companyId),
  ])

  const open = (incidents ?? []).filter((i) => i.status !== 'closed')
  const critical = open.filter((i) => i.severity === 'critical' || i.severity === 'high')
  const monthPrefix = today().slice(0, 7)

  const register = (incidents ?? []).map((row: Row) => {
    const vehicle = (row.vehicles as Row | null) ?? {}
    const driver = (row.drivers as Row | null) ?? {}
    return {
      id: row.id,
      incidentRef: row.incident_reference,
      title: row.incident_type ?? 'Incident',
      shortDescription: row.description,
      severity: row.severity === 'critical' ? 'critical' : row.severity === 'high' ? 'high' : row.severity === 'low' ? 'low' : 'medium',
      status: row.status === 'closed' ? 'closed' : 'open',
      category: row.incident_type ?? 'other',
      reportingSource: row.source_app ?? 'command',
      reportedAt: row.reported_at,
      occurredAt: row.occurred_at,
      location: typeof row.location === 'object' ? JSON.stringify(row.location) : row.location ?? null,
      depotId: (depots ?? [])[0]?.id ?? '',
      depotName: (depots ?? [])[0]?.name ?? 'Depot',
      ownerName: null,
      ownerId: null,
      involvedSummary: Array.isArray(row.passenger_ids) && row.passenger_ids.length
        ? `${row.passenger_ids.length} passenger(s)`
        : 'No passengers linked',
      journeyReference: row.trip_id ?? null,
      vehicleRegistration: vehicle.registration ?? null,
      vehicleId: row.vehicle_id ?? null,
      driverName: driver.driver_number ?? null,
      driverId: row.driver_id ?? null,
      isSafeguarding: row.incident_type === 'safeguarding',
      isAcknowledged: true,
      acknowledgedAt: row.reported_at,
      nextDeadline: null,
    }
  })

  return {
    operationalDate: today(),
    summary: {
      openCritical: critical.length,
      awaitingTriage: open.filter((i) => i.status === 'open').length,
      overdueActions: 0,
      externalAssessmentRequired: 0,
      openInvestigations: open.length,
      incidentsThisMonth: (incidents ?? []).filter((i) => String(i.occurred_at ?? '').startsWith(monthPrefix)).length,
      previousMonthCount: 0,
      nearMissThisMonth: (incidents ?? []).filter((i) => i.incident_type === 'near_miss').length,
    },
    register,
    priorityAlerts: critical.slice(0, 5).map((i: Row) => ({
      id: i.id,
      title: i.description,
      severity: 'danger',
      incidentId: i.id,
      message: String(i.description),
      href: `/incidents/${i.id}`,
    })),
    depots: (depots ?? []).map((d) => ({ id: d.id, name: d.name })),
    regulatory: register.filter((r) => r.isSafeguarding || r.severity === 'critical'),
    correctiveActions: [],
    analytics: {
      byType: Object.entries(
        register.reduce((acc: Record<string, number>, r) => {
          const key = String(r.category ?? 'other')
          acc[key] = (acc[key] ?? 0) + 1
          return acc
        }, {}),
      ).map(([category, count]) => ({ category, count })),
      bySeverity: Object.entries(
        register.reduce((acc: Record<string, number>, r) => {
          const key = String(r.severity ?? 'medium')
          acc[key] = (acc[key] ?? 0) + 1
          return acc
        }, {}),
      ).map(([severity, count]) => ({ severity, count })),
      byDepot: (depots ?? []).map((d) => ({
        depotName: String(d.name),
        count: register.filter((r) => r.depotId === d.id).length,
      })),
      avgAcknowledgeHours: 0,
      avgContainHours: 0,
      overdueActions: 0,
      nearMissRate: register.length
        ? Math.round((register.filter((r) => r.category === 'near_miss').length / register.length) * 100)
        : 0,
      preventableCount: 0,
    },
    automationRules: [],
    recurringAlerts: [],
    telematicsFeed: [],
    insurerConnectors: [],
    riskSummary: { highRiskCount: critical.length, avgScore: critical.length ? 80 : 0 },
    settings: {
      requireSeniorAckForCritical: true,
      autoBlockVehicleOnCritical: true,
      autoPauseDriverOnCritical: false,
      icoAssessmentHours: 72,
      riddorAssessmentDays: 10,
    },
  }
}

export async function projectMaintenanceHub(companyId: string) {
  const [{ data: vehicles }, { data: workOrders }, { data: defects }, { data: depots }] = await Promise.all([
    admin.from('vehicles').select('*, depots(name)').eq('company_id', companyId),
    admin.from('maintenance_work_orders').select('*, vehicles(registration, fleet_number, primary_depot_id)').eq('company_id', companyId).order('created_at', { ascending: false }),
    admin.from('defects').select('*').eq('company_id', companyId).not('status', 'in', '("closed","rejected")'),
    admin.from('depots').select('id, name').eq('company_id', companyId),
  ])

  const total = (vehicles ?? []).length
  const available = (vehicles ?? []).filter((v) => v.operational_status === 'available').length
  const inMaintenance = (vehicles ?? []).filter((v) => ['maintenance', 'awaiting_check'].includes(String(v.operational_status))).length
  const vor = (vehicles ?? []).filter((v) => v.operational_status === 'vor').length

  const workOrderRows = (workOrders ?? []).map((row: Row) => {
    const vehicle = (row.vehicles as Row | null) ?? {}
    return {
      workOrderId: row.id,
      vehicleId: row.vehicle_id,
      registrationNumber: vehicle.registration ?? '—',
      fleetNumber: vehicle.fleet_number ?? null,
      depot: (depots ?? []).find((d) => d.id === vehicle.primary_depot_id)?.name ?? 'Depot',
      title: row.work_order_reference,
      type: row.source_type ?? 'maintenance',
      status: row.status,
      severity: null,
      provider: null,
      technicianName: null,
      managerName: null,
      requestedDate: row.scheduled_start ?? null,
      targetCompletionDate: row.scheduled_end ?? null,
      expectedCompletion: row.scheduled_end ?? null,
      defectId: row.source_id ?? null,
      creationSource: row.source_app ?? 'command',
      diagnosis: null,
      labourHours: null,
      labourCost: null,
      partsCost: null,
      estimatedCost: row.estimated_cost ?? null,
      actualCost: row.actual_cost ?? null,
      roadTestRequired: false,
      partsCount: 0,
      createdAt: row.created_at,
      createdBy: row.created_by ?? 'system',
    }
  })

  return {
    summary: {
      attention: {
        dueToday: 0,
        dueWithin14Days: 0,
        overdue: 0,
        vor,
        safetyCriticalDefects: (defects ?? []).filter((d) =>
          ['critical', 'dangerous', 'major'].includes(String(d.severity)),
        ).length,
        inWorkshop: inMaintenance,
        awaitingParts: (workOrders ?? []).filter((w) => w.status === 'awaiting_parts').length,
        readyForRelease: (workOrders ?? []).filter((w) => w.status === 'completed').length,
      },
      fleetAvailability: {
        total,
        available,
        availableWithAdvisory: 0,
        inMaintenance,
        vor,
        awaitingInspection: (vehicles ?? []).filter((v) => v.operational_status === 'awaiting_check').length,
        awaitingParts: (workOrders ?? []).filter((w) => w.status === 'awaiting_parts').length,
        readyForRelease: (workOrders ?? []).filter((w) => w.status === 'completed').length,
        dueSoonUsable: 0,
      },
      maintenanceRisk: {
        overdueServices: 0,
        dueWithin7Days: 0,
        safetyCriticalDefects: (defects ?? []).filter((d) => ['critical', 'dangerous', 'major'].includes(String(d.severity))).length,
        repeatDefectVehicles: 0,
        motApproaching: 0,
        tachoApproaching: 0,
        missingEvidence: 0,
      },
      workshopPosition: {
        notStarted: (workOrders ?? []).filter((w) => w.status === 'open' || w.status === 'draft').length,
        inProgress: (workOrders ?? []).filter((w) => w.status === 'in_progress').length,
        awaitingParts: (workOrders ?? []).filter((w) => w.status === 'awaiting_parts').length,
        awaitingApproval: 0,
        readyForInspection: 0,
        readyForRelease: (workOrders ?? []).filter((w) => w.status === 'completed').length,
      },
    },
    priorityQueue: workOrderRows.slice(0, 10).map((wo) => ({
      id: wo.workOrderId,
      priorityGroup: 'attention',
      vehicleId: wo.vehicleId,
      registrationNumber: wo.registrationNumber,
      fleetNumber: wo.fleetNumber,
      depot: wo.depot,
      issue: wo.title ?? 'Work order',
      operationalImpact: 'Workshop capacity',
      maintenanceStage: wo.status ?? 'scheduled',
      severity: 'advisory',
      title: wo.title,
      status: wo.status,
      dueAt: wo.targetCompletionDate,
      deadline: wo.targetCompletionDate,
      responsiblePerson: wo.managerName,
      recommendedAction: null,
    })),
    fleetRows: (vehicles ?? []).map((v: Row) => ({
      vehicleId: v.id,
      registrationNumber: v.registration,
      fleetNumber: v.fleet_number,
      depot: (v.depots as Row | null)?.name ?? 'Depot',
      operationalStatus: v.operational_status,
      openDefectCount: (defects ?? []).filter((d) => d.vehicle_id === v.id).length,
      openWorkOrders: (workOrders ?? []).filter((w) => w.vehicle_id === v.id && w.status !== 'completed' && w.status !== 'cancelled').length,
    })),
    workOrders: workOrderRows,
    schedule: [],
    calendar: [],
    parts: [],
    suppliers: [],
    downtime: {
      averageDowntimeHours: 0,
      vehiclesOnDowntime: vor,
      repeatVorEvents: 0,
      averageApprovalDelayHours: 0,
      averagePartsWaitHours: 0,
      recentEvents: [],
    },
    intelligence: {
      maintenanceCostPerMile: [],
      repeatDefectCategories: [],
      highCostVehicles: [],
      plannedVsUnplanned: { planned: 0, unplanned: workOrderRows.length },
      warrantySavings: 0,
      supplierScores: [],
      fleetAvgCostPerMile: null,
      unplannedSharePercent: workOrderRows.length ? 100 : 0,
      costAlerts: [],
    },
    defects: (defects ?? []).map((d: Row) => {
      const vehicle = (vehicles ?? []).find((v) => v.id === d.vehicle_id) as Row | undefined
      return {
        id: d.id,
        vehicleId: d.vehicle_id,
        registrationNumber: vehicle?.registration ?? '—',
        fleetNumber: vehicle?.fleet_number ?? null,
        depot: (vehicle?.depots as Row | null)?.name ?? (depots ?? [])[0]?.name ?? 'Depot',
        component: d.component ?? d.category ?? '—',
        description: d.description ?? '—',
        severity: ['critical', 'dangerous'].includes(String(d.severity))
          ? 'dangerous'
          : d.severity === 'major'
            ? 'major'
            : d.severity === 'minor'
              ? 'minor'
              : 'advisory',
        status: d.status === 'closed' ? 'closed' : d.operational_decision === 'vor' ? 'vor' : 'open',
        source: d.source_type ?? d.source_app ?? 'command',
        reportedBy: d.reported_by ?? 'system',
        reportedAt: d.reported_at ?? d.created_at,
        triageStatus: d.status === 'reported' || d.status === 'under_review' ? 'pending' : 'validated',
        operationalImpact: d.operational_decision ?? 'under_review',
        linkedWorkOrderId: null,
      }
    }),
  }
}

/** Formal inspections hub — Phase 1 projection until dedicated inspections table lands. */
export async function projectInspectionsHub(companyId: string) {
  const [{ data: vehicles }, { data: depots }, { data: workOrders }] = await Promise.all([
    admin.from('vehicles').select('*, depots(name)').eq('company_id', companyId),
    admin.from('depots').select('id, name').eq('company_id', companyId),
    admin
      .from('maintenance_work_orders')
      .select('id, vehicle_id, work_order_reference, status, source_type, scheduled_start')
      .eq('company_id', companyId)
      .not('status', 'in', '("completed","cancelled")'),
  ])

  const todayIso = today()
  const register = (vehicles ?? [])
    .filter((v) => v.status === 'active')
    .map((v: Row) => {
      const depotName =
        (v.depots as Row | null)?.name ??
        (depots ?? []).find((d) => d.id === v.primary_depot_id)?.name ??
        'Depot'
      const linked = (workOrders ?? []).filter((w) => w.vehicle_id === v.id)
      const dueDate = String(v.commissioned_at ?? todayIso).slice(0, 10)
      return {
        id: `insp-live-${v.id}`,
        vehicleId: v.id,
        registrationNumber: v.registration ?? '—',
        fleetNumber: v.fleet_number ?? null,
        vehicleType: v.vehicle_class ?? v.body_type ?? 'vehicle',
        depot: depotName,
        inspectionType: 'safety_pmi',
        intervalWeeks: 8,
        dueDate,
        bookedDate: dueDate,
        odometer: null,
        scheduledMileage: null,
        provider: 'Fleet Workshop',
        inspectorName: null,
        bookingStatus: 'unscheduled',
        status: 'due',
        outcome: 'pending',
        operationalStatus: v.operational_status ?? 'available',
        previousInspectionDate: null,
        nextProjectedDate: dueDate,
        linkedDefects: [],
        linkedWorkOrders: linked.map((w) => ({
          workOrderId: w.id,
          title: w.work_order_reference ?? 'Work order',
          status: w.status,
        })),
        checklist: null,
        evidenceSummary: [],
        signedOffAt: null,
        signedOffBy: null,
        importFileName: null,
        driverInstruction: null,
        createdAt: v.created_at ?? new Date().toISOString(),
        updatedAt: v.updated_at ?? new Date().toISOString(),
      }
    })

  const overdue = register.filter((r) => r.dueDate < todayIso).length
  const dueToday = register.filter((r) => r.dueDate === todayIso).length
  const dueWithin7Days = register.filter((r) => {
    const t = new Date(r.dueDate).getTime()
    const now = Date.now()
    return t >= now && t <= now + 7 * 24 * 60 * 60 * 1000
  }).length

  return {
    summary: {
      dueToday,
      dueWithin7Days,
      overdue,
      inProgress: 0,
      awaitingRectification: register.filter((r) => r.linkedWorkOrders.length > 0).length,
      awaitingSignOff: 0,
      failedVor: (vehicles ?? []).filter((v) => v.operational_status === 'vor').length,
      complianceRate90d: 100,
    },
    register,
    calendar: register.map((r) => ({
      id: `cal-${r.id}`,
      date: r.bookedDate ?? r.dueDate,
      title: `Safety Inspection (PMI) — ${r.registrationNumber}`,
      inspectionId: r.id,
      vehicleId: r.vehicleId,
      registrationNumber: r.registrationNumber,
      eventKind: 'inspection',
      status: r.status,
    })),
    providers: [
      {
        id: 'prov-internal',
        name: 'Fleet Workshop (internal)',
        type: 'internal',
        approved: true,
        services: ['Safety Inspection (PMI)', 'Post-repair', 'Return-to-service'],
        slaHours: 48,
        contactEmail: 'workshop@example.com',
      },
    ],
  }
}

/** Fleet Resources hub — Phase 1 live stub until dedicated resource tables land. */
export async function projectFleetResourcesHub(companyId: string) {
  const [{ data: vehicles }, { data: depots }] = await Promise.all([
    admin.from('vehicles').select('id, registration, fleet_number, primary_depot_id, operational_status, depots(name)').eq('company_id', companyId),
    admin.from('depots').select('id, name').eq('company_id', companyId),
  ])

  const vehicleRows = vehicles ?? []
  const lowFuelVehicles = vehicleRows.filter((v) => v.operational_status === 'vor').length
  const vehicleCosts = vehicleRows.slice(0, 20).map((v: Row) => ({
    vehicleId: v.id,
    registrationNumber: v.registration ?? '—',
    fleetNumber: v.fleet_number ?? null,
    depot:
      (v.depots as Row | null)?.name ??
      (depots ?? []).find((d) => d.id === v.primary_depot_id)?.name ??
      '—',
    fuelSpend: 0,
    fluidSpend: 0,
    otherSpend: 0,
    totalSpend: 0,
    mileage: null,
    costPerMile: null,
  }))

  // Until dedicated equipment / card tables exist, project a working register from the fleet.
  const kit = [
    { key: 'fe', name: 'Fire extinguisher', category: 'safety_equipment', required: true },
    { key: 'fa', name: 'First aid kit', category: 'safety_equipment', required: true },
    { key: 'gh', name: 'Glass hammer', category: 'safety_equipment', required: true },
  ] as const

  const equipment = vehicleRows.flatMap((v: Row) =>
    kit.map((item) => ({
      id: `eq-live-${v.id}-${item.key}`,
      qrCode: `EQ-${String(v.fleet_number ?? v.registration ?? v.id).slice(0, 8)}-${item.key.toUpperCase()}`,
      name: item.name,
      category: item.category,
      status: 'assigned',
      vehicleId: v.id,
      registrationNumber: v.registration ?? '—',
      depotId: null,
      depotName: null,
      expiryDate: null,
      lastCheckedAt: null,
      requiredForDuty: item.required,
    })),
  )

  const cards = vehicleRows.slice(0, 20).map((v: Row, index: number) => ({
    id: `card-live-${v.id}`,
    provider: index % 2 === 0 ? 'Allstar' : 'FuelGenie',
    maskedNumber: `•••• ${String(1000 + ((index * 137) % 9000))}`,
    status: 'active',
    assignmentModel: 'vehicle',
    assignedVehicleId: v.id,
    assignedRegistration: v.registration ?? '—',
    assignedDriverName: null,
    dailyLimit: 200,
    lastTransactionAt: null,
  }))

  return {
    summary: {
      lowFuelVehicles,
      lowAdBlueVehicles: 0,
      missingReceipts: 0,
      suspectedCardMisuse: 0,
      tyresNeedingAttention: 0,
      lowDepotStock: (depots ?? []).length,
      unapprovedPurchases: 0,
      missingEquipment: 0,
      resourceBlocks: 0,
      spendThisMonth: 0,
      costPerMileThisMonth: null,
    },
    alerts: [],
    catalogue: [],
    transactions: [],
    stock: (depots ?? []).flatMap((d) => [
      {
        id: `stk-live-adblue-${d.id}`,
        depotId: d.id,
        depotName: d.name,
        resourceItemId: 'res-adblue',
        resourceName: 'AdBlue',
        category: 'adblue',
        available: 0,
        reserved: 0,
        minimum: 40,
        unit: 'L',
        status: 'out',
      },
    ]),
    cards,
    purchaseRequests: [],
    vehicleCosts,
    tyres: [],
    equipment,
    stockTransfers: [],
    forecasts: [],
    anomalies: [],
    baselines: [],
    integrations: [],
    budgets: [],
    wholeLife: [],
    settings: {
      requireReceiptAbove: 50,
      requireOdometer: true,
      blockPurchaseWhenVor: true,
      maxLitresPerTransaction: 200,
      managerApprovalAbove: 250,
      companyMpgBaseline: 9.5,
      minTreadDepthMm: 2,
      lowFuelPercent: 25,
    },
  }
}
