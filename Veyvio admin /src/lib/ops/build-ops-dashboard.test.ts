import { describe, expect, it } from 'vitest'
import { buildOpsDashboard } from './build-ops-dashboard'
import { mapDriverDutyState, mapRunState, mapVehicleReadinessState } from './canonical-states'
import type { DutyRecord } from '@/lib/api/types'
import type { YardHubData } from '@/lib/yard/types'
import type { ChecksHubData } from '@/lib/checks/types'

describe('canonical state mappers', () => {
  it('maps blocked drivers and signed-on duties', () => {
    expect(mapDriverDutyState('on_duty')).toBe('SIGNED_ON')
    expect(mapDriverDutyState('on_trip')).toBe('ACTIVE')
    expect(mapDriverDutyState('available', true)).toBe('BLOCKED')
  })

  it('distinguishes yard ready, driver check pending, and operationally ready', () => {
    expect(
      mapVehicleReadinessState({ yardReadiness: 'ready', checkRelease: 'not_checked' }),
    ).toBe('DRIVER_CHECK_PENDING')
    expect(
      mapVehicleReadinessState({ yardReadiness: 'ready', checkRelease: 'ready' }),
    ).toBe('OPERATIONALLY_READY')
    expect(mapVehicleReadinessState({ yardReadiness: 'vor' })).toBe('VOR')
  })

  it('maps blocked runs', () => {
    expect(mapRunState({ dutyStatus: 'assigned', blocked: true })).toBe('BLOCKED')
    expect(mapRunState({ dutyStatus: 'in_progress' })).toBe('IN_PROGRESS')
  })
})

describe('buildOpsDashboard', () => {
  const duties: DutyRecord[] = [
    {
      id: 'd1',
      reference: 'AM-112',
      dutyDate: '2026-07-17',
      startTime: '07:35',
      status: 'assigned',
      driver: { id: 'drv-1', firstName: 'Maria', lastName: 'Jones', status: 'signed_on' },
      vehicle: { id: 'veh-6', registrationNumber: 'EO71 NTJ', status: 'available' },
    },
    {
      id: 'd2',
      reference: 'AM-104',
      dutyDate: '2026-07-17',
      startTime: '07:30',
      status: 'in_progress',
      driver: { id: 'drv-2', firstName: 'Jane', lastName: 'Smith', status: 'on_duty' },
      vehicle: { id: 'veh-1', registrationNumber: 'LK23 ABC', status: 'in_service' },
    },
  ]

  const yard = {
    depotId: 'depot-1',
    depotName: 'Wembley',
    shiftLabel: 'AM',
    operationalDate: '2026-07-17',
    summary: {
      onSite: 5,
      readyForService: 2,
      workRequired: 1,
      awaitingInspection: 1,
      vor: 1,
      departingSoon: 2,
      locationUnknown: 0,
    },
    vehicles: [
      {
        vehicleId: 'veh-6',
        registrationNumber: 'EO71 NTJ',
        fleetNumber: null,
        vehicleCategory: 'minibus',
        makeModel: 'Ford',
        depotId: 'depot-1',
        depotName: 'Wembley',
        zone: 'prep',
        bay: 'B2',
        presenceState: 'in_yard' as const,
        activityState: 'loading_equipment' as const,
        readinessState: 'blocked' as const,
        custodyState: 'yard_custody' as const,
        openTaskCount: 1,
        assignedStaffName: null,
        nextDeparture: '07:35',
        lastMovementAt: null,
        lastMovementBy: null,
        lastUpdatedSource: 'yard',
        lastUpdatedAt: '2026-07-17T06:50:00Z',
        exceptionLabels: ['Equipment incomplete'],
        locationConfidence: 'confirmed' as const,
      },
    ],
    movements: [],
    auditEvents: [],
    tasks: [
      {
        id: 't1',
        depotId: 'depot-1',
        vehicleId: 'veh-6',
        registrationNumber: 'EO71 NTJ',
        taskType: 'replenish_equipment' as const,
        title: 'Fit replacement wheelchair restraint set',
        priority: 'safety_critical' as const,
        status: 'open' as const,
        assignedStaffId: null,
        assignedStaffName: null,
        dueAt: '2026-07-17T07:35:00Z',
        instructions: null,
        evidenceRequired: true,
        blockingRelease: true,
        syncStatus: 'pending' as const,
        createdAt: '2026-07-17T06:00:00Z',
        completedAt: null,
        createdBy: 'System',
      },
    ],
    exceptions: [
      {
        id: 'e1',
        severity: 'critical' as const,
        vehicleId: 'veh-6',
        registrationNumber: 'EO71 NTJ',
        depotId: 'depot-1',
        title: 'Driver reported return — Yard has not confirmed physical receipt',
        detail: 'Custody mismatch',
        detectedAt: '2026-07-17T06:40:00Z',
        operationalImpact: 'Missing vehicle risk',
        ownerName: null,
        recommendedAction: 'Confirm physical receipt',
        escalationStatus: 'open' as const,
      },
    ],
    handover: null,
    mapMarkers: [],
    depots: [{ id: 'depot-1', name: 'Wembley' }],
    zones: [],
  } satisfies YardHubData

  const checks = {
    operationalDate: '2026-07-17',
    summary: {
      vehiclesReady: 1,
      expiringSoon: 0,
      checksInProgress: 0,
      oldestInProgressMinutes: null,
      actionRequired: 0,
      assignedDespiteIssue: 0,
      missingOrOverdue: 1,
      departureDueSoon: 1,
      vehiclesOffRoad: 0,
      awaitingMaintenanceReview: 0,
    },
    overview: [
      {
        checkId: 'c1',
        vehicleId: 'veh-1',
        registrationNumber: 'LK23 ABC',
        fleetNumber: null,
        makeModel: 'Ford',
        vehicleCategory: 'minibus',
        depotId: 'depot-1',
        depotName: 'Wembley',
        operationalStatus: 'ready' as const,
        lifecycleStatus: 'submitted' as const,
        checkType: 'driver_pre_use' as const,
        checkTypeLabel: 'Pre-use',
        completedBy: 'Jane Smith',
        sourceApplication: 'driver',
        startedAt: '2026-07-17T06:40:00Z',
        submittedAt: '2026-07-17T06:55:00Z',
        result: 'pass' as const,
        defectCount: 0,
        highestDefectSeverity: null,
        evidenceCount: 2,
        evidenceMissing: false,
        validUntil: null,
        workStatus: 'completed' as const,
        assignedRunReference: 'AM-104',
        nextDepartureTime: '07:30',
        reviewerName: null,
        reviewStatus: null,
        urgencyScore: 0,
        exceptionLabels: [],
        syncStatus: 'synced' as const,
        suspiciousFlagCount: 0,
      },
      {
        checkId: 'c2',
        vehicleId: 'veh-6',
        registrationNumber: 'EO71 NTJ',
        fleetNumber: null,
        makeModel: 'Ford',
        vehicleCategory: 'minibus',
        depotId: 'depot-1',
        depotName: 'Wembley',
        operationalStatus: 'not_checked' as const,
        lifecycleStatus: 'scheduled' as const,
        checkType: null,
        checkTypeLabel: 'Pre-use',
        completedBy: null,
        sourceApplication: null,
        startedAt: null,
        submittedAt: null,
        result: null,
        defectCount: 0,
        highestDefectSeverity: null,
        evidenceCount: 0,
        evidenceMissing: false,
        validUntil: null,
        workStatus: 'unassigned' as const,
        assignedRunReference: 'AM-112',
        nextDepartureTime: '07:35',
        reviewerName: null,
        reviewStatus: null,
        urgencyScore: 80,
        exceptionLabels: [],
        syncStatus: 'synced' as const,
        suspiciousFlagCount: 0,
      },
    ],
    liveChecks: [],
    submitted: [],
    actionQueue: [],
    overdue: [],
    history: [],
    depots: [],
    templates: [],
    intelligence: {
      suspiciousChecksToday: 0,
      recurringDefectVehicles: [],
      driverQualityAlerts: [],
      depotComparison: [],
      templatePerformance: [],
    },
  } satisfies ChecksHubData

  it('surfaces blocker text on the readiness pipeline', () => {
    const model = buildOpsDashboard({
      dashboard: null,
      live: null,
      duties,
      yard,
      checks,
      defects: null,
      driversSummary: {
        totalActive: 10,
        eligibleToday: 8,
        notEligible: 2,
        documentsExpiringSoon: 1,
        invitePending: 0,
        onDuty: 5,
        onTrip: 1,
        suspendedOrRestricted: 1,
        appNotRecentlySynced: 1,
      },
      vehiclesSummary: null,
      driverExceptions: [
        {
          id: 'ex1',
          severity: 'high',
          title: 'Driver not eligible — Alex Reed',
          category: 'compliance',
          relatedRecord: 'DRV-9',
          relatedHref: '/drivers/drv-9',
          depot: 'Wembley',
          raisedAt: '2026-07-17T06:00:00Z',
          ageMinutes: 40,
          slaMinutesRemaining: 20,
          owner: null,
          status: 'new',
          lastUpdate: '2026-07-17T06:00:00Z',
          recommendedAction: 'Licence expired',
        },
      ],
      vehicleExceptions: [],
      now: new Date('2026-07-17T07:00:00Z'),
    })

    const blocked = model.pipeline.find((p) => p.runReference === 'AM-112')
    expect(blocked?.blocker).toMatch(/wheelchair restraint|Equipment incomplete|blocked/i)
    expect(blocked?.releaseLabel).toBe('Blocked')

    const ready = model.pipeline.find((p) => p.runReference === 'AM-104')
    expect(ready?.driverCheckLabel).toMatch(/Passed/i)

    expect(model.drivers.blockedReasons[0]?.reason).toBe('Licence expired')
    expect(model.vehicles.stages.yardReady).toBe(2)
    expect(model.vehicles.stages.driverChecked).toBeGreaterThanOrEqual(0)
    expect(model.handoverExceptions[0]?.title).toMatch(/physical receipt/i)
    expect(model.actionQueue.some((a) => a.severity === 'critical')).toBe(true)
    expect(model.syncHealth.yardTasksPendingSync).toBe(1)
  })
})
