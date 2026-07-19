import { describe, expect, it } from 'vitest'
import { buildDepotOpsSnapshot } from './ops-snapshot'
import type { VehicleProfile } from '@/lib/vehicles/types'
import type { DriverProfile } from '@/lib/drivers/types'

function vehicle(partial: Partial<VehicleProfile> & Pick<VehicleProfile, 'id' | 'homeDepotId' | 'currentDepotId'>): VehicleProfile {
  return {
    registrationNumber: 'XX00 AAA',
    reference: 'VYV-0',
    previousRegistrations: [],
    vin: null,
    fleetNumber: null,
    make: 'Ford',
    model: 'Transit',
    modelYear: null,
    vehicleCategory: 'minibus',
    colour: null,
    ownershipType: 'owned',
    ownerName: null,
    homeDepotName: 'Wembley',
    currentDepotName: 'Wembley',
    currentLocationLabel: null,
    parkingBay: null,
    seatingCapacity: 16,
    wheelchairCapacity: 0,
    standingCapacity: 0,
    fuelType: 'diesel',
    fuelLevelPercent: null,
    batteryLevelPercent: null,
    mileage: null,
    lifecycleStatus: 'active',
    operationalStatus: 'available',
    complianceStatus: 'compliant',
    conditionStatus: 'no_known_issues',
    yardStatus: 'in_yard',
    readinessStatus: 'ready',
    releaseDecision: 'released',
    readiness: {
      vehicleId: partial.id,
      lifecycleStatus: 'active',
      operationalStatus: 'available',
      complianceStatus: 'compliant',
      conditionStatus: 'no_known_issues',
      assignmentEligible: true,
      blockingReasons: [],
      warningReasons: [],
      calculatedAt: new Date().toISOString(),
      releaseDecision: 'released',
    },
    capabilities: [],
    motExpiry: null,
    insuranceExpiry: null,
    taxExpiry: null,
    tachographCalibrationExpiry: null,
    wheelRetorqueDueAt: null,
    currentDriverId: null,
    currentDriverName: null,
    currentRunId: null,
    currentRunReference: null,
    nextDriverName: null,
    nextRunReference: null,
    nextDepartureTime: null,
    lastCheckAt: null,
    lastCheckType: null,
    nextMaintenanceDate: null,
    nextMaintenanceMileage: null,
    openDefectCount: 0,
    criticalDefectCount: 0,
    checksOverdue: false,
    dateAddedToFleet: '2024-01-01',
    documents: [],
    restrictions: [],
    vorRecords: [],
    notes: [],
    auditEvents: [],
    checks: [],
    defects: [],
    workOrders: [],
    downtimeEvents: [],
    wheelLayout: [],
    retorqueTasks: [],
    equipment: [],
    tachograph: null,
    onboarding: { currentStage: 'approved', stages: [], approvedAt: null, approvedBy: null },
    damageRecords: [],
    telematics: null,
    platformEvents: [],
    release: {
      releaseDecision: 'released',
      failures: [],
      warnings: [],
      canAllocate: true,
      canLeaveYard: true,
      canAcceptPassengers: true,
      summary: 'ok',
      evaluatedAt: new Date().toISOString(),
    },
    nearestExpiryDate: null,
    nearestExpiryLabel: null,
    status: 'available',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  } as VehicleProfile
}

describe('buildDepotOpsSnapshot', () => {
  it('counts home vs on-site vehicles separately', () => {
    const vehicles = [
      vehicle({
        id: 'v1',
        homeDepotId: 'depot-wembley',
        currentDepotId: 'depot-wembley',
        yardStatus: 'in_yard',
        operationalStatus: 'available',
      }),
      vehicle({
        id: 'v2',
        homeDepotId: 'depot-wembley',
        currentDepotId: 'depot-wembley',
        yardStatus: 'checked_out',
        operationalStatus: 'in_service',
      }),
      vehicle({
        id: 'v3',
        homeDepotId: 'depot-croydon',
        currentDepotId: 'depot-wembley',
        yardStatus: 'at_bay',
        operationalStatus: 'available',
      }),
    ]
    const snapshot = buildDepotOpsSnapshot({
      depotId: 'depot-wembley',
      vehicles,
      drivers: [],
      duties: [],
    })
    expect(snapshot.vehiclesAssigned).toBe(2)
    expect(snapshot.vehiclesOnSite).toBe(2) // v1 home + v3 visiting on site
    expect(snapshot.vehiclesOut).toBe(1) // v2 checked out / in service
  })

  it('counts primary drivers only', () => {
    const drivers = [
      { id: 'd1', depotId: 'depot-wembley', operationalStatus: 'available', employmentStatus: 'active' },
      { id: 'd2', depotId: 'depot-croydon', operationalStatus: 'available', employmentStatus: 'active' },
    ] as unknown as DriverProfile[]
    const snapshot = buildDepotOpsSnapshot({
      depotId: 'depot-wembley',
      vehicles: [],
      drivers,
      duties: [],
    })
    expect(snapshot.driversTotal).toBe(1)
  })
})
