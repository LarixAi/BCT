import { VEHICLE_CAPABILITY_OPTIONS } from '@/lib/vehicles/constants'
import { applyVerifiedDocumentToProfile } from '@/lib/vehicles/compliance'
import { zoneLabel } from '@/lib/vehicles/damage'
import { applyDefectToProfile, closeDefectOnProfile, completeRepairOnDefect, reopenDefectOnProfile, verifyDefectOnProfile } from '@/lib/vehicles/defects'
import { seedEquipment } from '@/lib/vehicles/equipment'
import { emitVehicleEvent, mockTelematicsFromDuty } from '@/lib/vehicles/events'
import { ingestDriverPlatformEvents } from '@/lib/ops/ingest-driver-platform-events'
import { canReturnToService, normalizeWorkOrder } from '@/lib/vehicles/maintenance'
import { computeFleetIntelligence } from '@/lib/vehicles/intelligence'
import { canTransitionWorkOrder } from '@/lib/maintenance/work-order-lifecycle'
import { validateOnboardingStage } from '@/lib/vehicles/onboarding-checks'
import {
  advanceOnboardingStage as advanceOnboarding,
  createInitialOnboarding,
  ONBOARDING_STAGE_DEFS,
} from '@/lib/vehicles/onboarding'
import { syncVehicleProfile } from '@/lib/vehicles/release'
import { defaultTachograph } from '@/lib/vehicles/tachograph'
import { createRetorqueTask, defaultWheelLayout } from '@/lib/vehicles/wheels'
import type {
  CreateVehicleInput,
  CreateVehicleDefectInput,
  CreateWorkOrderInput,
  MarkVehicleVorInput,
  OnboardingStageId,
  RecordVehicleCheckInput,
  ReportDamageInput,
  ReturnToServiceInput,
  TriageDefectInput,
  UpdateVehicleEquipmentInput,
  UpdateVehicleInput,
  UpdateWorkOrderInput,
  AddWorkOrderPartInput,
  UploadVehicleDocumentInput,
  VehicleAuditEvent,
  VehicleCheckEntry,
  VehicleDamageRecord,
  VehicleDefectEntry,
  VehicleDowntimeEvent,
  VehicleDirectorySummary,
  VehicleDocument,
  VehicleOnboardingState,
  VehiclePlatformEvent,
  VehicleProfile,
  VehicleVorRecord,
  YardCheckInOutInput,
} from '@/lib/vehicles/types'

const now = () => new Date().toISOString()
const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()

function caps(...keys: string[]) {
  return VEHICLE_CAPABILITY_OPTIONS.map((o) => ({ ...o, enabled: keys.includes(o.key) }))
}

function baseDocs(mot: string, insurance: string, tax?: string, tacho?: string): VehicleDocument[] {
  return [
    {
      id: 'vdoc-mot',
      requirementType: 'mot',
      label: 'MOT / annual test',
      referenceNumber: null,
      issuingOrganisation: 'DVSA',
      issueDate: '2024-01-01',
      expiryDate: mot,
      verificationStatus: 'verified',
      verifiedBy: 'Tom Harris',
      verifiedAt: '2025-06-01T10:00:00Z',
      rejectionReason: null,
      notes: null,
      fileName: 'mot.pdf',
    },
    {
      id: 'vdoc-insurance',
      requirementType: 'insurance',
      label: 'Fleet insurance',
      referenceNumber: 'POL-88421',
      issuingOrganisation: 'Aviva Fleet',
      issueDate: '2025-05-01',
      expiryDate: insurance,
      verificationStatus: 'verified',
      verifiedBy: 'Tom Harris',
      verifiedAt: '2025-06-01T10:00:00Z',
      rejectionReason: null,
      notes: null,
      fileName: 'insurance.pdf',
    },
    {
      id: 'vdoc-tax',
      requirementType: 'tax',
      label: 'Road tax',
      referenceNumber: null,
      issuingOrganisation: 'DVLA',
      issueDate: '2025-04-01',
      expiryDate: tax ?? daysFromNow(180),
      verificationStatus: 'verified',
      verifiedBy: 'Tom Harris',
      verifiedAt: '2025-06-01T10:00:00Z',
      rejectionReason: null,
      notes: null,
      fileName: 'tax.pdf',
    },
    ...(tacho
      ? [
          {
            id: 'vdoc-tacho',
            requirementType: 'tachograph_calibration',
            label: 'Tachograph calibration',
            referenceNumber: 'TCH-4421',
            issuingOrganisation: 'TachoCal Ltd',
            issueDate: '2024-07-01',
            expiryDate: tacho,
            verificationStatus: 'verified' as const,
            verifiedBy: 'Tom Harris',
            verifiedAt: '2025-06-01T10:00:00Z',
            rejectionReason: null,
            notes: null,
            fileName: 'tacho.pdf',
          },
        ]
      : []),
  ]
}

function createApprovedOnboarding(approvedAt: string, approvedBy: string): VehicleOnboardingState {
  return {
    currentStage: 'approved',
    stages: ONBOARDING_STAGE_DEFS.map((s) => ({
      ...s,
      status: 'complete',
      completedAt: approvedAt,
      completedBy: approvedBy,
    })),
    approvedAt,
    approvedBy,
  }
}

function seedOnboardingForVehicle(id: string): VehicleOnboardingState {
  if (id === 'veh-6') {
    return {
      currentStage: 'documents_complete',
      stages: ONBOARDING_STAGE_DEFS.map((s, i) => ({
        ...s,
        status: i <= 2 ? 'complete' : i === 3 ? 'in_progress' : 'pending',
        completedAt: i <= 2 ? daysAgo(4 - i) : null,
        completedBy: i <= 2 ? 'Maria Santos' : null,
      })),
      approvedAt: null,
      approvedBy: null,
    }
  }
  return createApprovedOnboarding('2022-03-15T09:00:00Z', 'Tom Harris')
}

function seedDamageForVehicle(id: string): VehicleDamageRecord[] {
  if (id === 'veh-4') {
    return [
      {
        id: 'vdmg-1',
        zone: 'front_bumper',
        zoneLabel: zoneLabel('front_bumper'),
        description: 'Scuff on nearside — recorded at fleet intake',
        classification: 'existing',
        severity: 'cosmetic',
        reportedAt: daysAgo(180),
        reportedBy: 'Yard app',
        sourceApplication: 'yard',
        imageFileName: null,
        imageDataUrl: null,
        baseline: true,
        linkedDefectId: null,
      },
      {
        id: 'vdmg-2',
        zone: 'driver_rear',
        zoneLabel: zoneLabel('driver_rear'),
        description: 'Dent near wheel arch — baseline photo on file',
        classification: 'existing',
        severity: 'minor',
        reportedAt: daysAgo(90),
        reportedBy: 'Dave Wilson',
        sourceApplication: 'maintenance',
        imageFileName: 'rear-dent.jpg',
        imageDataUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="80"%3E%3Crect fill="%23e2e8f0" width="120" height="80"/%3E%3Ctext x="8" y="44" fill="%2364748b" font-size="10"%3ERear dent%3C/text%3E%3C/svg%3E',
        baseline: true,
        linkedDefectId: null,
      },
    ]
  }
  return []
}

function attachPlatformEvent(
  profile: VehicleProfile,
  type: VehiclePlatformEvent['type'],
  summary: string,
  actorName: string | null,
  sourceApplication: VehiclePlatformEvent['sourceApplication'],
  payload: VehiclePlatformEvent['payload'] = {},
): VehicleProfile {
  const event = emitVehicleEvent({
    type,
    vehicleId: profile.id,
    summary,
    payload,
    sourceApplication,
    actorName,
  })
  return { ...profile, platformEvents: [event, ...profile.platformEvents] }
}

function buildProfile(
  partial: Omit<
    VehicleProfile,
    'release' | 'releaseDecision' | 'nearestExpiryDate' | 'nearestExpiryLabel' | 'status' |
    'checks' | 'defects' | 'workOrders' | 'wheelLayout' | 'retorqueTasks' | 'equipment' | 'tachograph' |
    'onboarding' | 'damageRecords' | 'telematics' | 'platformEvents' | 'downtimeEvents'
  > & {
    release?: VehicleProfile['release']
    checks?: VehicleProfile['checks']
    defects?: VehicleProfile['defects']
    workOrders?: VehicleProfile['workOrders']
    wheelLayout?: VehicleProfile['wheelLayout']
    retorqueTasks?: VehicleProfile['retorqueTasks']
    equipment?: VehicleProfile['equipment']
    tachograph?: VehicleProfile['tachograph']
    onboarding?: VehicleProfile['onboarding']
    damageRecords?: VehicleProfile['damageRecords']
    telematics?: VehicleProfile['telematics']
    platformEvents?: VehicleProfile['platformEvents']
    downtimeEvents?: VehicleProfile['downtimeEvents']
  },
): VehicleProfile {
  const withDefaults = {
    ...partial,
    documents: partial.documents ?? [],
    restrictions: partial.restrictions ?? [],
    vorRecords: partial.vorRecords ?? [],
    capabilities: partial.capabilities ?? [],
    notes: partial.notes ?? [],
    auditEvents: partial.auditEvents ?? [],
    checks: partial.checks ?? [],
    defects: partial.defects ?? [],
    workOrders: partial.workOrders ?? [],
    wheelLayout: partial.wheelLayout ?? defaultWheelLayout(partial.vehicleCategory, partial.wheelRetorqueDueAt),
    retorqueTasks: partial.retorqueTasks ?? [],
    equipment: partial.equipment ?? seedEquipment(partial.wheelchairCapacity),
    tachograph: partial.tachograph ?? defaultTachograph(partial.tachographCalibrationExpiry ?? null),
    onboarding: partial.onboarding ?? createInitialOnboarding(),
    damageRecords: partial.damageRecords ?? [],
    telematics: partial.telematics ?? null,
    platformEvents: partial.platformEvents ?? [],
    downtimeEvents: partial.downtimeEvents ?? [],
  }
  return syncVehicleProfile(withDefaults as VehicleProfile)
}

function seedChecksForVehicle(id: string): VehicleCheckEntry[] {
  const base = { performedBy: 'System', mileage: null as number | null, notes: null as string | null, defectIds: [] as string[] }
  if (id === 'veh-1') {
    return [{ id: 'chk-1', checkType: 'driver_pre_use', checkDate: daysAgo(0), result: 'pass', sourceApplication: 'driver', ...base, performedBy: 'Jane Smith', mileage: 84200 }]
  }
  if (id === 'veh-2') {
    return [{ id: 'chk-2', checkType: 'driver_pre_use', checkDate: daysAgo(0), result: 'pass_with_advisory', sourceApplication: 'driver', ...base, performedBy: 'Michael Patel', defectIds: ['vdef-2'], mileage: 62100, notes: 'Nearside mirror crack noted' }]
  }
  if (id === 'veh-3') {
    return [{ id: 'chk-3', checkType: 'yard_return', checkDate: daysAgo(1), result: 'pass', sourceApplication: 'yard', ...base, performedBy: 'Alice Brown', mileage: 45100 }]
  }
  if (id === 'veh-4') {
    return [{ id: 'chk-4', checkType: 'driver_pre_use', checkDate: daysAgo(0), result: 'fail', sourceApplication: 'driver', ...base, performedBy: 'Jane Smith', defectIds: ['vdef-1'], mileage: 112400, notes: 'Brake pedal spongy — critical brake warning' }]
  }
  return []
}

function defectDefaults(
  partial: Omit<VehicleDefectEntry, 'triageStatus' | 'triagedBy' | 'triagedAt' | 'linkedWorkOrderId'> &
    Partial<Pick<VehicleDefectEntry, 'triageStatus' | 'triagedBy' | 'triagedAt' | 'linkedWorkOrderId'>>,
): VehicleDefectEntry {
  return {
    triageStatus: 'pending',
    triagedBy: null,
    triagedAt: null,
    linkedWorkOrderId: null,
    ...partial,
  }
}

function seedDefectsForVehicle(id: string): VehicleDefectEntry[] {
  if (id === 'veh-1') {
    return [
      defectDefaults({
        id: 'vdef-closed', category: 'lights', component: 'Nearside indicator', description: 'Indicator bulb replaced',
        severity: 'minor', status: 'closed', source: 'yard_inspection', reportedBy: 'Tom Harris', reportedAt: daysAgo(14),
        mileage: 83800, location: 'Wembley Depot', vorApplied: false, closedAt: daysAgo(12), closedBy: 'Dave Wilson', closureReason: 'permanently_repaired',
        triageStatus: 'validated', triagedBy: 'Tom Harris', triagedAt: daysAgo(14),
      }),
      defectDefaults({
        id: 'vdef-4', category: 'interior', component: 'Passenger seat', description: 'Seat cushion tear — row 3 nearside',
        severity: 'minor', status: 'open', source: 'driver_walkaround', reportedBy: 'Jane Smith', reportedAt: daysAgo(0),
        mileage: 84200, location: 'Wembley Depot', vorApplied: false, closedAt: null, closedBy: null, closureReason: null,
      }),
    ]
  }
  if (id === 'veh-2') {
    return [defectDefaults({
      id: 'vdef-2', category: 'bodywork', component: 'Nearside mirror', description: 'Mirror housing cracked',
      severity: 'minor', status: 'open', source: 'driver_walkaround', reportedBy: 'Michael Patel', reportedAt: daysAgo(1),
      mileage: 62100, location: 'Wembley Depot', vorApplied: false, closedAt: null, closedBy: null, closureReason: null,
    })]
  }
  if (id === 'veh-3') {
    return [
      defectDefaults({
        id: 'vdef-5', category: 'accessibility', component: 'Wheelchair ramp', description: 'Ramp slow to deploy — hydraulic hesitation',
        severity: 'major', status: 'open', source: 'yard_inspection', reportedBy: 'Alice Brown', reportedAt: daysAgo(0),
        mileage: 45800, location: 'Croydon Depot', vorApplied: false, closedAt: null, closedBy: null, closureReason: null,
      }),
      defectDefaults({
        id: 'vdef-6', category: 'tyres', component: 'Offside front tyre', description: 'Early tread wear pattern noted',
        severity: 'advisory', status: 'open', source: 'scheduled_inspection', reportedBy: 'Maria Santos', reportedAt: daysAgo(2),
        mileage: 45700, location: 'Croydon Depot', vorApplied: false, closedAt: null, closedBy: null, closureReason: null,
        triageStatus: 'deferred', triagedBy: 'Maria Santos', triagedAt: daysAgo(2),
      }),
    ]
  }
  if (id === 'veh-4') {
    return [
      defectDefaults({
        id: 'vdef-br2', category: 'brakes', component: 'Brake pedal', description: 'Previous brake fluid leak — repaired',
        severity: 'major', status: 'closed', source: 'maintenance_job', reportedBy: 'Dave Wilson', reportedAt: daysAgo(45),
        mileage: 111200, location: 'Wembley Depot', vorApplied: false, closedAt: daysAgo(40), closedBy: 'Dave Wilson', closureReason: 'permanently_repaired',
        triageStatus: 'validated', triagedBy: 'Tom Harris', triagedAt: daysAgo(45),
      }),
      defectDefaults({
        id: 'vdef-1', category: 'brakes', component: 'Brake pedal', description: 'Brake pedal spongy — reported during pre-use check',
        severity: 'dangerous', status: 'vor', source: 'driver_walkaround', reportedBy: 'Jane Smith', reportedAt: daysAgo(0),
        mileage: 112400, location: 'Wembley Depot', vorApplied: true, closedAt: null, closedBy: null, closureReason: null,
        triageStatus: 'validated', triagedBy: 'Tom Harris', triagedAt: daysAgo(0), linkedWorkOrderId: 'wo-4',
      }),
      defectDefaults({
        id: 'vdef-3', category: 'steering', component: 'Steering assembly', description: 'Steering pull to left under load',
        severity: 'major', status: 'awaiting_repair', source: 'driver_journey', reportedBy: 'Jane Smith', reportedAt: daysAgo(0),
        mileage: 112400, location: 'Wembley Depot', vorApplied: true, closedAt: null, closedBy: null, closureReason: null,
        triageStatus: 'validated', triagedBy: 'Tom Harris', triagedAt: daysAgo(0),
      }),
    ]
  }
  if (id === 'veh-5') {
    return [
      defectDefaults({
        id: 'vdef-7', category: 'electrical', component: 'Saloon lighting', description: 'Intermittent saloon light flicker',
        severity: 'minor', status: 'awaiting_repair', source: 'driver_walkaround', reportedBy: 'Michael Patel', reportedAt: daysAgo(5),
        mileage: 197800, location: 'Croydon Depot', vorApplied: false, closedAt: null, closedBy: null, closureReason: null,
        triageStatus: 'validated', triagedBy: 'Tom Harris', triagedAt: daysAgo(4), linkedWorkOrderId: 'wo-5',
      }),
      defectDefaults({
        id: 'vdef-8', category: 'bodywork', component: 'Nearside skirt panel', description: 'Panel refitted after minor scrape repair',
        severity: 'minor', status: 'awaiting_verification', source: 'maintenance_job', reportedBy: 'Dave Wilson', reportedAt: daysAgo(3),
        mileage: 198100, location: 'Croydon Depot', vorApplied: false, closedAt: null, closedBy: null, closureReason: null,
        triageStatus: 'validated', triagedBy: 'Tom Harris', triagedAt: daysAgo(3),
        repairSummary: 'Panel refitted and secured', repairCompletedAt: daysAgo(1), repairCompletedBy: 'Dave Wilson',
      }),
    ]
  }
  if (id === 'veh-6') {
    return [defectDefaults({
      id: 'vdef-9', category: 'telematics', component: 'CAN bus gateway', description: 'Telematics alert — intermittent connectivity',
      severity: 'minor', status: 'open', source: 'telematics_alert', reportedBy: 'System', reportedAt: daysAgo(0),
      mileage: 12400, location: 'Wembley Depot', vorApplied: false, closedAt: null, closedBy: null, closureReason: null,
    })]
  }
  return []
}

function seedDowntimeForVehicle(id: string): VehicleDowntimeEvent[] {
  if (id !== 'veh-4') return []
  return [
    { id: 'dt-1', stage: 'defect_reported', occurredAt: daysAgo(0), actorName: 'Jane Smith', notes: 'Pre-use check fail' },
    { id: 'dt-2', stage: 'vor_declared', occurredAt: daysAgo(0), actorName: 'Tom Harris', notes: 'Dangerous brake defect' },
    { id: 'dt-3', stage: 'workshop_notified', occurredAt: daysAgo(0), actorName: 'Tom Harris', notes: null },
    { id: 'dt-4', stage: 'work_approved', occurredAt: daysAgo(0), actorName: 'Tom Harris', notes: 'WO-4 approved' },
    { id: 'dt-5', stage: 'work_started', occurredAt: daysAgo(0), actorName: 'Dave Wilson', notes: null },
    { id: 'dt-6', stage: 'parts_requested', occurredAt: daysAgo(0), actorName: 'Dave Wilson', notes: 'Brake fluid' },
  ]
}

function seedWorkOrdersForVehicle(id: string) {
  if (id === 'veh-1') {
    return [normalizeWorkOrder({
      id: 'wo-1', type: 'routine_service', title: 'Routine service', status: 'scheduled',
      scheduledDate: daysFromNow(45), provider: 'Fleet Workshop', estimatedCost: 450,
      creationSource: 'scheduled_service_rule', managerName: 'Tom Harris',
      createdAt: daysAgo(30), createdBy: 'Tom Harris',
    })]
  }
  if (id === 'veh-4') {
    return [normalizeWorkOrder({
      id: 'wo-4', type: 'repair', title: 'Brake system repair', status: 'awaiting_parts',
      scheduledDate: daysFromNow(0), targetCompletionDate: daysFromNow(2), provider: 'Fleet Workshop',
      estimatedCost: 1200, labourCost: 420, partsCost: 180, labourHours: 6.5,
      defectId: 'vdef-1', technicianName: 'Dave Wilson', managerName: 'Tom Harris',
      creationSource: 'vehicle_check', diagnosis: 'Brake fluid leak at rear union',
      notes: 'Awaiting brake fluid parts', roadTestRequired: true,
      parts: [{ id: 'wop-1', partName: 'Brake fluid DOT 4', partNumber: 'BF-DOT4-1L', quantity: 2, unitCost: 12.5, supplierId: 'sup-3' }],
      createdAt: daysAgo(0), createdBy: 'Tom Harris',
    })]
  }
  if (id === 'veh-5') {
    return [normalizeWorkOrder({
      id: 'wo-5', type: 'pmi', title: 'PMI due at 200k miles', status: 'approved',
      scheduledDate: daysFromNow(7), provider: 'External Workshop', estimatedCost: 380,
      creationSource: 'scheduled_service_rule', createdAt: daysAgo(14), createdBy: 'Maria Santos',
    })]
  }
  return []
}

let vehicleSeq = 6

const SEED_PROFILES: VehicleProfile[] = [
  buildProfile({
    id: 'veh-1',
    reference: 'VYV-014',
    registrationNumber: 'AB12 CDE',
    previousRegistrations: [],
    vin: 'WDB9066331N123456',
    fleetNumber: 'F-014',
    make: 'Mercedes',
    model: 'Sprinter',
    modelYear: 2022,
    vehicleCategory: 'minibus',
    colour: 'White',
    ownershipType: 'owned',
    ownerName: 'Metro Transport Ltd',
    homeDepotId: 'depot-wembley',
    homeDepotName: 'Wembley Depot',
    currentDepotId: 'depot-wembley',
    currentDepotName: 'Wembley Depot',
    currentLocationLabel: 'On route — Oakwood AM',
    parkingBay: 'Bay 3',
    seatingCapacity: 16,
    wheelchairCapacity: 1,
    standingCapacity: 0,
    fuelType: 'diesel',
    fuelLevelPercent: 68,
    batteryLevelPercent: null,
    mileage: 84200,
    lifecycleStatus: 'active',
    operationalStatus: 'in_service',
    complianceStatus: 'compliant',
    yardStatus: 'checked_out',
    readinessStatus: 'ready',
    capabilities: caps('school', 'wheelchair', 'psv', 'contract', 'low_emission'),
    motExpiry: '2027-08-01',
    insuranceExpiry: '2027-05-01',
    taxExpiry: daysFromNow(200),
    tachographCalibrationExpiry: '2027-02-01',
    wheelRetorqueDueAt: null,
    currentDriverId: 'drv-1',
    currentDriverName: 'Jane Smith',
    currentRunId: 'duty-1',
    currentRunReference: 'SCH-AM-104',
    nextDriverName: null,
    nextRunReference: null,
    nextDepartureTime: null,
    lastCheckAt: daysAgo(0),
    lastCheckType: 'Driver pre-use walkaround',
    nextMaintenanceDate: daysFromNow(45),
    nextMaintenanceMileage: 90000,
    openDefectCount: 0,
    criticalDefectCount: 0,
    checksOverdue: false,
    dateAddedToFleet: '2022-03-15',
    documents: baseDocs('2027-08-01', '2027-05-01', daysFromNow(200), '2027-02-01'),
    restrictions: [],
    vorRecords: [],
    notes: [],
    auditEvents: [
      {
        id: 'vaud-1',
        action: 'Vehicle activated',
        actor: 'Tom Harris',
        actorRole: 'Fleet administrator',
        createdAt: '2022-03-15T09:00:00Z',
        previousValue: null,
        newValue: 'active',
        reason: null,
        sourceApplication: 'command',
      },
    ],
    createdAt: '2022-03-10T09:00:00Z',
    updatedAt: daysAgo(0),
  }),
  buildProfile({
    id: 'veh-2',
    reference: 'VYV-022',
    registrationNumber: 'GH56 HIJ',
    previousRegistrations: [],
    vin: 'WF0XXXGCDX1234567',
    fleetNumber: 'F-022',
    make: 'Ford',
    model: 'Transit',
    modelYear: 2021,
    vehicleCategory: 'minibus',
    colour: 'Silver',
    ownershipType: 'leased',
    ownerName: 'LeaseCo Fleet',
    homeDepotId: 'depot-wembley',
    homeDepotName: 'Wembley Depot',
    currentDepotId: 'depot-wembley',
    currentDepotName: 'Wembley Depot',
    currentLocationLabel: 'Day Centre Run',
    parkingBay: 'Bay 7',
    seatingCapacity: 12,
    wheelchairCapacity: 0,
    standingCapacity: 0,
    fuelType: 'diesel',
    fuelLevelPercent: 42,
    batteryLevelPercent: null,
    mileage: 62100,
    lifecycleStatus: 'active',
    operationalStatus: 'in_service',
    complianceStatus: 'compliant',
    yardStatus: 'checked_out',
    readinessStatus: 'ready',
    capabilities: caps('psv', 'contract'),
    motExpiry: '2027-01-15',
    insuranceExpiry: '2026-09-01',
    taxExpiry: daysFromNow(120),
    tachographCalibrationExpiry: null,
    wheelRetorqueDueAt: null,
    currentDriverId: 'drv-2',
    currentDriverName: 'Michael Patel',
    currentRunId: 'duty-2',
    currentRunReference: 'DAY-024',
    nextDriverName: null,
    nextRunReference: null,
    nextDepartureTime: null,
    lastCheckAt: daysAgo(0),
    lastCheckType: 'Driver pre-use walkaround',
    nextMaintenanceDate: daysFromNow(90),
    nextMaintenanceMileage: 70000,
    openDefectCount: 1,
    criticalDefectCount: 0,
    checksOverdue: false,
    dateAddedToFleet: '2021-06-01',
    documents: baseDocs('2027-01-15', '2026-09-01'),
    restrictions: [],
    vorRecords: [],
    notes: [],
    auditEvents: [],
    createdAt: '2021-05-28T09:00:00Z',
    updatedAt: daysAgo(0),
  }),
  buildProfile({
    id: 'veh-3',
    reference: 'VYV-031',
    registrationNumber: 'KL78 MNO',
    previousRegistrations: [],
    vin: 'VF3YCBHY6H1234567',
    fleetNumber: 'F-031',
    make: 'Peugeot',
    model: 'Boxer',
    modelYear: 2023,
    vehicleCategory: 'accessible',
    colour: 'Blue',
    ownershipType: 'owned',
    ownerName: 'Metro Transport Ltd',
    homeDepotId: 'depot-croydon',
    homeDepotName: 'Croydon Depot',
    currentDepotId: 'depot-croydon',
    currentDepotName: 'Croydon Depot',
    currentLocationLabel: 'Croydon Depot — Bay 2',
    parkingBay: 'Bay 2',
    seatingCapacity: 8,
    wheelchairCapacity: 2,
    standingCapacity: 0,
    fuelType: 'diesel',
    fuelLevelPercent: 81,
    batteryLevelPercent: null,
    mileage: 45800,
    lifecycleStatus: 'active',
    operationalStatus: 'allocated',
    complianceStatus: 'expiring_soon',
    yardStatus: 'at_bay',
    readinessStatus: 'ready',
    capabilities: caps('school', 'wheelchair', 'psv', 'low_emission'),
    motExpiry: '2027-11-01',
    insuranceExpiry: '2027-07-01',
    taxExpiry: daysFromNow(250),
    tachographCalibrationExpiry: daysFromNow(25),
    wheelRetorqueDueAt: daysFromNow(3),
    currentDriverId: 'drv-3',
    currentDriverName: 'Alice Brown',
    currentRunId: 'duty-4',
    currentRunReference: 'EVEN-012',
    nextDriverName: 'Alice Brown',
    nextRunReference: 'EVEN-012',
    nextDepartureTime: '17:30',
    lastCheckAt: daysAgo(0),
    lastCheckType: 'Yard release inspection',
    nextMaintenanceDate: daysFromNow(14),
    nextMaintenanceMileage: 50000,
    openDefectCount: 0,
    criticalDefectCount: 0,
    checksOverdue: false,
    dateAddedToFleet: '2023-01-10',
    documents: baseDocs('2027-11-01', '2027-07-01', daysFromNow(250), daysFromNow(25)),
    restrictions: [],
    vorRecords: [],
    notes: [],
    auditEvents: [],
    createdAt: '2023-01-05T09:00:00Z',
    updatedAt: daysAgo(0),
  }),
  buildProfile({
    id: 'veh-4',
    reference: 'VYV-008',
    registrationNumber: 'CD34 EFG',
    previousRegistrations: ['BX19 ZZZ'],
    vin: 'WDB9066331N987654',
    fleetNumber: 'F-008',
    make: 'Mercedes',
    model: 'Sprinter',
    modelYear: 2019,
    vehicleCategory: 'minibus',
    colour: 'White',
    ownershipType: 'owned',
    ownerName: 'Metro Transport Ltd',
    homeDepotId: 'depot-wembley',
    homeDepotName: 'Wembley Depot',
    currentDepotId: 'depot-wembley',
    currentDepotName: 'Wembley Depot',
    currentLocationLabel: 'Workshop — Bay W2',
    parkingBay: 'W2',
    seatingCapacity: 16,
    wheelchairCapacity: 1,
    standingCapacity: 0,
    fuelType: 'diesel',
    fuelLevelPercent: 15,
    batteryLevelPercent: null,
    mileage: 112400,
    lifecycleStatus: 'active',
    operationalStatus: 'vor',
    complianceStatus: 'non_compliant',
    yardStatus: 'workshop',
    readinessStatus: 'deep_clean_required',
    capabilities: caps('school', 'wheelchair', 'psv'),
    motExpiry: '2025-04-01',
    insuranceExpiry: '2026-04-01',
    taxExpiry: daysFromNow(60),
    tachographCalibrationExpiry: '2026-08-01',
    wheelRetorqueDueAt: daysAgo(2),
    currentDriverId: null,
    currentDriverName: null,
    currentRunId: null,
    currentRunReference: null,
    nextDriverName: 'David Cole',
    nextRunReference: 'School Run 114',
    nextDepartureTime: '06:30',
    lastCheckAt: daysAgo(2),
    lastCheckType: 'Yard return inspection',
    nextMaintenanceDate: daysFromNow(0),
    nextMaintenanceMileage: 112500,
    openDefectCount: 2,
    criticalDefectCount: 1,
    checksOverdue: false,
    dateAddedToFleet: '2019-08-01',
    documents: baseDocs('2025-04-01', '2026-04-01', daysFromNow(60), '2026-08-01'),
    restrictions: [],
    vorRecords: [
      {
        id: 'vor-1',
        reason: 'Brake defect — spongy pedal reported during pre-use check',
        category: 'safety_defect',
        defectId: 'def-1',
        reportedAt: daysAgo(0),
        reportedBy: 'Jane Smith',
        location: 'Wembley Depot',
        recoveryRequired: false,
        resolvedAt: null,
        resolvedBy: null,
        resolutionReason: null,
      },
    ],
    notes: [
      {
        id: 'vnote-1',
        body: 'Replacement vehicle needed for tomorrow AM if not cleared.',
        createdAt: daysAgo(0),
        createdBy: 'Tom Harris',
      },
    ],
    auditEvents: [
      {
        id: 'vaud-2',
        action: 'Marked VOR',
        actor: 'Tom Harris',
        actorRole: 'Yard manager',
        createdAt: daysAgo(0),
        previousValue: 'available',
        newValue: 'vor',
        reason: 'Brake defect — dangerous',
        sourceApplication: 'yard',
      },
    ],
    createdAt: '2019-07-28T09:00:00Z',
    updatedAt: daysAgo(0),
  }),
  buildProfile({
    id: 'veh-5',
    reference: 'VYV-045',
    registrationNumber: 'MN90 PQR',
    previousRegistrations: [],
    vin: 'YS2R6X20001234567',
    fleetNumber: 'F-045',
    make: 'Scania',
    model: 'Touring',
    modelYear: 2020,
    vehicleCategory: 'coach',
    colour: 'Red',
    ownershipType: 'hire_purchase',
    ownerName: 'Metro Transport Ltd',
    homeDepotId: 'depot-croydon',
    homeDepotName: 'Croydon Depot',
    currentDepotId: 'depot-croydon',
    currentDepotName: 'Croydon Depot',
    currentLocationLabel: 'Croydon Depot',
    parkingBay: 'Coach 1',
    seatingCapacity: 49,
    wheelchairCapacity: 0,
    standingCapacity: 0,
    fuelType: 'diesel',
    fuelLevelPercent: 55,
    batteryLevelPercent: null,
    mileage: 198200,
    lifecycleStatus: 'active',
    operationalStatus: 'available',
    complianceStatus: 'expiring_soon',
    yardStatus: 'in_yard',
    readinessStatus: 'fuelling_required',
    capabilities: caps('psv', 'contract', 'school'),
    motExpiry: daysFromNow(18),
    insuranceExpiry: '2027-02-01',
    taxExpiry: daysFromNow(90),
    tachographCalibrationExpiry: daysFromNow(12),
    wheelRetorqueDueAt: null,
    currentDriverId: null,
    currentDriverName: null,
    currentRunId: null,
    currentRunReference: null,
    nextDriverName: 'Michael Patel',
    nextRunReference: 'COACH-118',
    nextDepartureTime: '06:00',
    lastCheckAt: daysAgo(1),
    lastCheckType: 'Driver pre-use walkaround',
    nextMaintenanceDate: daysFromNow(7),
    nextMaintenanceMileage: 200000,
    openDefectCount: 0,
    criticalDefectCount: 0,
    checksOverdue: true,
    dateAddedToFleet: '2020-02-01',
    documents: baseDocs(daysFromNow(18), '2027-02-01', daysFromNow(90), daysFromNow(12)),
    restrictions: [],
    vorRecords: [],
    notes: [],
    auditEvents: [],
    createdAt: '2020-01-28T09:00:00Z',
    updatedAt: daysAgo(0),
  }),
  buildProfile({
    id: 'veh-6',
    reference: 'VYV-052',
    registrationNumber: 'ST12 UVW',
    previousRegistrations: [],
    vin: 'W1V44781512345678',
    fleetNumber: 'F-052',
    make: 'Mercedes',
    model: 'eVito',
    modelYear: 2024,
    vehicleCategory: 'accessible',
    colour: 'Grey',
    ownershipType: 'leased',
    ownerName: 'EV Fleet Partners',
    homeDepotId: 'depot-wembley',
    homeDepotName: 'Wembley Depot',
    currentDepotId: 'depot-wembley',
    currentDepotName: 'Wembley Depot',
    currentLocationLabel: null,
    parkingBay: null,
    seatingCapacity: 6,
    wheelchairCapacity: 1,
    standingCapacity: 0,
    fuelType: 'electric',
    fuelLevelPercent: null,
    batteryLevelPercent: 72,
    mileage: 12400,
    lifecycleStatus: 'awaiting_onboarding',
    operationalStatus: 'under_inspection',
    complianceStatus: 'awaiting_verification',
    yardStatus: 'unknown_location',
    readinessStatus: 'charging_required',
    capabilities: caps('wheelchair', 'low_emission'),
    motExpiry: daysFromNow(365),
    insuranceExpiry: daysFromNow(300),
    taxExpiry: daysFromNow(300),
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
    checksOverdue: true,
    dateAddedToFleet: daysFromNow(-5),
    documents: [
      {
        id: 'vdoc-mot-new',
        requirementType: 'mot',
        label: 'MOT / annual test',
        referenceNumber: null,
        issuingOrganisation: null,
        issueDate: null,
        expiryDate: daysFromNow(365),
        verificationStatus: 'awaiting_review',
        verifiedBy: null,
        verifiedAt: null,
        rejectionReason: null,
        notes: 'Uploaded during onboarding',
        fileName: 'mot_pending.pdf',
      },
    ],
    restrictions: [],
    vorRecords: [],
    notes: [],
    auditEvents: [
      {
        id: 'vaud-3',
        action: 'Vehicle created',
        actor: 'Maria Santos',
        actorRole: 'Fleet administrator',
        createdAt: daysFromNow(-5),
        previousValue: null,
        newValue: 'awaiting_onboarding',
        reason: 'New EV accessible minibus',
        sourceApplication: 'command',
      },
    ],
    createdAt: daysFromNow(-5),
    updatedAt: daysAgo(0),
  }),
].map((p) => {
  const { release: _r, releaseDecision: _d, status: _s, nearestExpiryDate: _n, nearestExpiryLabel: _l, ...rest } = p
  return buildProfile({
    ...rest,
    checks: seedChecksForVehicle(rest.id),
    defects: seedDefectsForVehicle(rest.id),
    workOrders: seedWorkOrdersForVehicle(rest.id),
    retorqueTasks: rest.id === 'veh-3' ? [createRetorqueTask(['fl', 'fr'], 'Dave Wilson', 3)] : [],
    onboarding: seedOnboardingForVehicle(rest.id),
    damageRecords: seedDamageForVehicle(rest.id),
    downtimeEvents: seedDowntimeForVehicle(rest.id),
  })
})

let profiles = [...SEED_PROFILES]

function nextRef() {
  return `VYV-${String(vehicleSeq + 1).padStart(3, '0')}`
}

function audit(action: string, actor: string, actorRole: string, prev: string | null, next: string | null, reason?: string): VehicleAuditEvent {
  return {
    id: `vaud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action,
    actor,
    actorRole,
    createdAt: now(),
    previousValue: prev,
    newValue: next,
    reason: reason ?? null,
    sourceApplication: 'command',
  }
}

function computeSummary(list: VehicleProfile[]): VehicleDirectorySummary {
  const active = list.filter((v) => v.lifecycleStatus === 'active')
  const WARN = 30
  const warnThreshold = Date.now() + WARN * 24 * 60 * 60 * 1000

  return {
    totalActive: active.length,
    availableNow: list.filter((v) => v.operationalStatus === 'available').length,
    currentlyAllocated: list.filter((v) => ['allocated', 'in_service', 'reserved'].includes(v.operationalStatus)).length,
    inService: list.filter((v) => v.operationalStatus === 'in_service').length,
    vor: list.filter((v) => v.operationalStatus === 'vor').length,
    inMaintenance: list.filter((v) => ['in_workshop', 'awaiting_parts', 'under_inspection'].includes(v.operationalStatus)).length,
    checksOverdue: list.filter((v) => v.checksOverdue).length,
    complianceExpiring: list.filter((v) => v.complianceStatus === 'expiring_soon').length,
    motDue: list.filter((v) => v.motExpiry && new Date(v.motExpiry).getTime() < warnThreshold && new Date(v.motExpiry).getTime() > Date.now()).length,
    tachographDue: list.filter(
      (v) =>
        v.tachographCalibrationExpiry &&
        new Date(v.tachographCalibrationExpiry).getTime() < warnThreshold &&
        new Date(v.tachographCalibrationExpiry).getTime() > Date.now(),
    ).length,
    wheelRetorqueDue: list.filter(
      (v) => v.wheelRetorqueDueAt && new Date(v.wheelRetorqueDueAt).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).length,
    unknownLocation: list.filter((v) => v.yardStatus === 'unknown_location').length,
  }
}

export const mockVehiclesApi = {
  enrichWithTelematics(
    profile: VehicleProfile,
    duty: { lastLatitude?: number | null; lastLongitude?: number | null; lastPositionAt?: string | null; vehicle?: { id: string } | null } | null,
  ): VehicleProfile {
    const telematics = mockTelematicsFromDuty(
      profile.id,
      duty,
      profile.fuelLevelPercent,
      profile.batteryLevelPercent,
      profile.mileage,
    )
    if (!telematics) return profile
    return syncVehicleProfile({ ...profile, telematics })
  },

  list(): VehicleProfile[] {
    void ingestDriverPlatformEvents()
    return profiles.map((p) => syncVehicleProfile(p))
  },

  get(id: string): VehicleProfile | null {
    void ingestDriverPlatformEvents()
    const p = profiles.find((v) => v.id === id)
    return p ? syncVehicleProfile(p) : null
  },

  summary(): VehicleDirectorySummary {
    return computeSummary(this.list())
  },

  create(input: CreateVehicleInput, actorName: string): VehicleProfile {
    vehicleSeq += 1
    const id = `veh-${vehicleSeq}`
    const depotName = input.homeDepotId === 'depot-croydon' ? 'Croydon Depot' : 'Wembley Depot'
    const profile = buildProfile({
      id,
      reference: nextRef(),
      registrationNumber: input.registrationNumber.toUpperCase(),
      previousRegistrations: [],
      vin: input.vin ?? null,
      fleetNumber: input.fleetNumber ?? null,
      make: input.make,
      model: input.model,
      modelYear: null,
      vehicleCategory: input.vehicleCategory,
      colour: null,
      ownershipType: input.ownershipType ?? 'owned',
      ownerName: null,
      homeDepotId: input.homeDepotId,
      homeDepotName: depotName,
      currentDepotId: input.homeDepotId,
      currentDepotName: depotName,
      currentLocationLabel: null,
      parkingBay: null,
      seatingCapacity: input.seatingCapacity,
      wheelchairCapacity: input.wheelchairCapacity ?? 0,
      standingCapacity: 0,
      fuelType: input.fuelType ?? 'diesel',
      fuelLevelPercent: null,
      batteryLevelPercent: null,
      mileage: null,
      lifecycleStatus: 'awaiting_onboarding',
      operationalStatus: 'under_inspection',
      complianceStatus: 'awaiting_verification',
      yardStatus: 'in_yard',
      readinessStatus: 'ready',
      capabilities: caps(),
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
      dateAddedToFleet: new Date().toISOString().slice(0, 10),
      documents: [],
      restrictions: [],
      vorRecords: [],
      notes: [],
      auditEvents: [audit('Vehicle created', actorName, 'Fleet administrator', null, input.registrationNumber)],
      onboarding: createInitialOnboarding(),
      createdAt: now(),
      updatedAt: now(),
    })
    const withEvent = attachPlatformEvent(
      profile,
      'vehicle.created',
      `Vehicle ${input.registrationNumber} created`,
      actorName,
      'command',
      { registrationNumber: input.registrationNumber },
    )
    profiles = [...profiles, withEvent]
    return withEvent
  },

  update(id: string, input: UpdateVehicleInput, actorName: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const depotName =
      input.homeDepotId === 'depot-croydon'
        ? 'Croydon Depot'
        : input.homeDepotId === 'depot-wembley'
          ? 'Wembley Depot'
          : current.homeDepotName
    const updated = buildProfile({
      ...current,
      ...input,
      homeDepotName: input.homeDepotId ? depotName : current.homeDepotName,
      currentDepotName: input.currentDepotId ? depotName : current.currentDepotName,
      auditEvents: [
        ...current.auditEvents,
        audit('Vehicle updated', actorName, 'Fleet administrator', null, 'profile updated'),
      ],
    })
    profiles[idx] = updated
    return updated
  },

  markVor(id: string, input: MarkVehicleVorInput, actorName: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const vor: VehicleVorRecord = {
      id: `vor-${Date.now()}`,
      reason: input.reason,
      category: input.category,
      defectId: input.defectId ?? null,
      reportedAt: now(),
      reportedBy: actorName,
      location: input.location ?? null,
      recoveryRequired: input.recoveryRequired ?? false,
      resolvedAt: null,
      resolvedBy: null,
      resolutionReason: null,
    }
    const updated = buildProfile({
      ...current,
      operationalStatus: 'vor',
      yardStatus: 'workshop',
      vorRecords: [...current.vorRecords, vor],
      auditEvents: [
        ...current.auditEvents,
        audit('Marked VOR', actorName, 'Fleet administrator', current.operationalStatus, 'vor', input.reason),
      ],
    })
    const withEvent = attachPlatformEvent(updated, 'vehicle.marked_vor', `Marked VOR: ${input.reason}`, actorName, 'command', { reason: input.reason })
    profiles[idx] = withEvent
    return withEvent
  },

  returnToService(id: string, actorName: string, input: ReturnToServiceInput): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const blockers = canReturnToService(current, input)
    if (blockers.length > 0) throw new Error(blockers.join('; '))
    const updated = buildProfile({
      ...current,
      operationalStatus: 'available',
      yardStatus: 'in_yard',
      readinessStatus: 'ready',
      vorRecords: current.vorRecords.map((v) =>
        !v.resolvedAt ? { ...v, resolvedAt: now(), resolvedBy: actorName, resolutionReason: input.reason } : v,
      ),
      workOrders: current.workOrders.map((w) =>
        w.status === 'in_progress' || w.status === 'quality_check'
          ? { ...w, status: 'completed' as const, completedDate: daysFromNow(0), returnToServiceApproved: true }
          : w,
      ),
      auditEvents: [
        ...current.auditEvents,
        audit('Returned to service', actorName, 'Fleet administrator', 'vor', 'available', input.reason),
      ],
    })
    const withEvent = attachPlatformEvent(
      updated,
      'vehicle.returned_to_service',
      `Returned to service: ${input.reason}`,
      actorName,
      'command',
      { reason: input.reason },
    )
    profiles[idx] = withEvent
    return withEvent
  },

  reportDefect(id: string, input: CreateVehicleDefectInput, actorName: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const defect: VehicleDefectEntry = {
      id: `vdef-${Date.now()}`,
      category: input.category,
      component: input.component,
      description: input.description,
      severity: input.severity,
      status: input.severity === 'dangerous' ? 'vor' : 'open',
      source: input.source ?? 'admin_report',
      reportedBy: actorName,
      reportedAt: now(),
      mileage: input.mileage ?? current.mileage,
      location: input.location ?? current.currentLocationLabel,
      vorApplied: input.severity === 'dangerous',
      closedAt: null,
      closedBy: null,
      closureReason: null,
      triageStatus: 'pending',
      triagedBy: null,
      triagedAt: null,
      linkedWorkOrderId: null,
      symptoms: input.symptoms ?? null,
      passengersOnboard: input.passengersOnboard ?? null,
      safeToMove: input.safeToMove ?? null,
      recoveryRequired: input.recoveryRequired ?? null,
      affectsAccessibility: input.affectsAccessibility ?? null,
    }
    const withDefect = applyDefectToProfile(current, defect)
    const updated = buildProfile({
      ...withDefect,
      auditEvents: [...current.auditEvents, audit('Defect reported', actorName, 'Fleet administrator', null, defect.severity, input.description)],
    })
    const withEvent = attachPlatformEvent(
      updated,
      'vehicle.defect_reported',
      `Defect reported: ${input.description}`,
      actorName,
      'command',
      { severity: defect.severity },
    )
    profiles[idx] = withEvent
    if (input.markVor && withEvent.operationalStatus !== 'vor') {
      return this.markVor(id, { reason: input.description, category: input.category, defectId: defect.id }, actorName)
    }
    return withEvent
  },

  closeDefect(id: string, defectId: string, actorName: string, reason: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const withClosed = closeDefectOnProfile(current, defectId, actorName, reason)
    const updated = buildProfile({
      ...withClosed,
      auditEvents: [...current.auditEvents, audit('Defect closed', actorName, 'Fleet administrator', defectId, 'closed', reason)],
    })
    profiles[idx] = updated
    return updated
  },

  completeDefectRepair(id: string, defectId: string, input: import('@/lib/vehicles/types').CompleteDefectRepairInput, actorName: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const defect = current.defects.find((d) => d.id === defectId)
    if (!defect) throw new Error('Defect not found')
    const summary = `${input.diagnosis}. Work: ${input.workPerformed}`
    const withRepair = completeRepairOnDefect(current, defectId, actorName, summary)
    const updated = buildProfile({
      ...withRepair,
      auditEvents: [...current.auditEvents, audit('Repair completed', actorName, 'Maintenance', defectId, input.repairType ?? 'permanent', input.notes)],
    })
    profiles[idx] = updated
    return updated
  },

  verifyDefect(id: string, defectId: string, input: import('@/lib/vehicles/types').VerifyDefectInput, actorName: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const defect = current.defects.find((d) => d.id === defectId)
    if (!defect) throw new Error('Defect not found')
    let profile = verifyDefectOnProfile(current, defectId, actorName, input.result, input.level, input.notes ?? null)
    if (input.result === 'pass') {
      profile = closeDefectOnProfile(profile, defectId, actorName, 'permanently_repaired')
    } else {
      profile = reopenDefectOnProfile(profile, defectId, input.notes ?? 'Verification failed')
    }
    const updated = buildProfile({
      ...profile,
      auditEvents: [
        ...current.auditEvents,
        audit(
          input.result === 'pass' ? 'Verification passed' : 'Verification failed',
          actorName,
          'Maintenance',
          defectId,
          input.result,
          input.method,
        ),
      ],
    })
    profiles[idx] = updated
    return updated
  },

  reopenDefect(id: string, defectId: string, actorName: string, reason: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const withReopen = reopenDefectOnProfile(current, defectId, reason)
    const updated = buildProfile({
      ...withReopen,
      auditEvents: [...current.auditEvents, audit('Defect reopened', actorName, 'Maintenance', defectId, 'reopened', reason)],
    })
    profiles[idx] = updated
    return updated
  },

  addRestriction(id: string, input: import('@/lib/vehicles/types').ApplyVehicleRestrictionInput, actorName: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const restriction = {
      id: `vr-${Date.now()}`,
      type: input.type,
      label: input.label,
      reason: input.reason,
      status: 'active' as const,
      createdAt: now(),
      createdBy: actorName,
      liftedAt: null,
      liftedBy: null,
      defectId: input.defectId ?? null,
      expiresAt: input.expiresAt ?? null,
    }
    const updated = buildProfile({
      ...current,
      restrictions: [...current.restrictions, restriction],
      auditEvents: [...current.auditEvents, audit('Restriction applied', actorName, 'Operations', null, input.label, input.reason)],
    })
    profiles[idx] = updated
    return updated
  },

  liftRestriction(id: string, restrictionId: string, actorName: string, reason?: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const updated = buildProfile({
      ...current,
      restrictions: current.restrictions.map((r) =>
        r.id === restrictionId
          ? { ...r, status: 'lifted' as const, liftedAt: now(), liftedBy: actorName }
          : r,
      ),
      auditEvents: [...current.auditEvents, audit('Restriction lifted', actorName, 'Operations', restrictionId, 'lifted', reason)],
    })
    profiles[idx] = updated
    return updated
  },

  uploadDefectEvidence(
    id: string,
    defectId: string,
    input: import('@/lib/defects/types').UploadDefectEvidenceInput,
    actorName: string,
  ): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const item = {
      id: `dev-${Date.now()}`,
      kind: input.kind,
      label: input.label,
      uploadedBy: actorName,
      capturedAt: now(),
      source: 'command',
    }
    const updated = buildProfile({
      ...current,
      defects: current.defects.map((d) =>
        d.id === defectId ? { ...d, evidence: [...(d.evidence ?? []), item] } : d,
      ),
      auditEvents: [...current.auditEvents, audit('Evidence uploaded', actorName, 'Fleet administrator', defectId, input.kind, input.label)],
    })
    profiles[idx] = updated
    return updated
  },

  addDefectNote(id: string, defectId: string, note: string, actorName: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const updated = buildProfile({
      ...current,
      notes: [...current.notes, { id: `vnote-${Date.now()}`, body: note, createdAt: now(), createdBy: actorName }],
      auditEvents: [...current.auditEvents, audit('Defect note added', actorName, 'Fleet administrator', defectId, 'note', note)],
    })
    profiles[idx] = updated
    return updated
  },

  yardCheckInOut(id: string, input: YardCheckInOutInput, actorName: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const updated = buildProfile({
      ...current,
      yardStatus: input.action === 'check_in' ? 'checked_in' : 'checked_out',
      parkingBay: input.parkingBay ?? current.parkingBay,
      mileage: input.mileage ?? current.mileage,
      fuelLevelPercent: input.fuelLevelPercent ?? current.fuelLevelPercent,
      batteryLevelPercent: input.batteryLevelPercent ?? current.batteryLevelPercent,
      currentLocationLabel: input.action === 'check_in' ? `${current.currentDepotName} — checked in` : 'Checked out',
      auditEvents: [
        ...current.auditEvents,
        audit(input.action === 'check_in' ? 'Checked in' : 'Checked out', actorName, 'Yard manager', null, input.action),
      ],
    })
    const withEvent = attachPlatformEvent(
      updated,
      input.action === 'check_in' ? 'vehicle.checked_in' : 'vehicle.checked_out',
      input.action === 'check_in' ? 'Vehicle checked in to yard' : 'Vehicle checked out from yard',
      actorName,
      'yard',
      { action: input.action },
    )
    profiles[idx] = withEvent
    return withEvent
  },

  createWorkOrder(id: string, input: CreateWorkOrderInput, actorName: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const order = normalizeWorkOrder({
      id: `wo-${Date.now()}`,
      type: input.type,
      title: input.title,
      status: 'requested',
      scheduledDate: input.scheduledDate ?? null,
      provider: input.provider ?? null,
      defectId: input.defectId ?? null,
      notes: input.notes ?? null,
      creationSource: 'command',
      managerName: actorName,
      createdAt: now(),
      createdBy: actorName,
    })
    const updated = buildProfile({
      ...current,
      workOrders: [...current.workOrders, order],
      operationalStatus: input.type === 'repair' ? 'in_workshop' : current.operationalStatus,
      auditEvents: [...current.auditEvents, audit('Work order created', actorName, 'Maintenance', null, input.title)],
    })
    profiles[idx] = updated
    return updated
  },

  completeWorkOrder(id: string, workOrderId: string, actorName: string, actualCost?: number): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const updated = buildProfile({
      ...current,
      workOrders: current.workOrders.map((w) =>
        w.id === workOrderId
          ? { ...w, status: 'completed' as const, completedDate: daysFromNow(0), actualCost: actualCost ?? w.actualCost }
          : w,
      ),
      auditEvents: [...current.auditEvents, audit('Work order completed', actorName, 'Maintenance', workOrderId, 'completed')],
    })
    profiles[idx] = updated
    return updated
  },

  completeRetorque(id: string, taskId: string, actorName: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const updated = buildProfile({
      ...current,
      retorqueTasks: current.retorqueTasks.map((t) =>
        t.id === taskId ? { ...t, status: 'completed' as const, completedAt: now() } : t,
      ),
      wheelRetorqueDueAt: null,
      wheelLayout: current.wheelLayout.map((w) => ({ ...w, retorqueDueAt: null, retorqueOverdue: false })),
      auditEvents: [...current.auditEvents, audit('Re-torque completed', actorName, 'Maintenance', taskId, 'completed')],
    })
    profiles[idx] = updated
    return updated
  },

  getFleetIntelligence() {
    return computeFleetIntelligence(this.list())
  },

  uploadDocument(id: string, input: UploadVehicleDocumentInput, actorName: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const doc: VehicleDocument = {
      id: `vdoc-${Date.now()}`,
      requirementType: input.requirementType,
      label: input.label,
      referenceNumber: input.referenceNumber ?? null,
      issuingOrganisation: null,
      issueDate: input.issueDate ?? null,
      expiryDate: input.expiryDate ?? null,
      verificationStatus: 'uploaded',
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: null,
      notes: null,
      fileName: input.fileName,
    }
    const withDoc = applyVerifiedDocumentToProfile(current, doc)
    const updated = buildProfile({
      ...withDoc,
      auditEvents: [...current.auditEvents, audit('Document uploaded', actorName, 'Fleet administrator', null, input.label)],
    })
    profiles[idx] = updated
    return updated
  },

  verifyDocument(id: string, documentId: string, actorName: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const documents = current.documents.map((d) =>
      d.id === documentId
        ? { ...d, verificationStatus: 'verified' as const, verifiedBy: actorName, verifiedAt: now() }
        : d,
    )
    let profile = { ...current, documents }
    for (const d of documents.filter((x) => x.id === documentId)) {
      profile = applyVerifiedDocumentToProfile(profile, d)
    }
    const updated = buildProfile({
      ...profile,
      auditEvents: [...current.auditEvents, audit('Document verified', actorName, 'Compliance manager', null, documentId)],
    })
    profiles[idx] = updated
    return updated
  },

  advanceOnboardingStage(id: string, stageId: OnboardingStageId, actorName: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const stage = current.onboarding.stages.find((s) => s.id === stageId)
    if (!stage) throw new Error('Unknown onboarding stage')
    if (stage.status === 'complete') throw new Error('Stage already complete')
    if (current.onboarding.currentStage !== stageId && stage.status !== 'in_progress') {
      throw new Error('Complete stages in order')
    }

    const otherRegs = profiles
      .filter((v) => v.id !== id)
      .map((v) => v.registrationNumber.toUpperCase())
    const blockers = validateOnboardingStage(current, stageId, otherRegs)
    if (blockers.length > 0) throw new Error(blockers.join('; '))

    const onboarding = advanceOnboarding(current.onboarding, stageId, actorName)
    let lifecycleStatus = current.lifecycleStatus
    let operationalStatus = current.operationalStatus
    let complianceStatus = current.complianceStatus

    if (stageId === 'release_review') {
      lifecycleStatus = 'active'
      operationalStatus = 'available'
      complianceStatus = current.complianceStatus === 'awaiting_verification' ? 'compliant' : current.complianceStatus
    }

    let updated = buildProfile({
      ...current,
      onboarding,
      lifecycleStatus,
      operationalStatus,
      complianceStatus,
      auditEvents: [
        ...current.auditEvents,
        audit(`Onboarding: ${stage.label}`, actorName, 'Fleet administrator', null, 'complete'),
      ],
    })

    updated = attachPlatformEvent(
      updated,
      stageId === 'release_review' ? 'vehicle.onboarding_completed' : 'vehicle.onboarding_stage_completed',
      stageId === 'release_review' ? 'Onboarding completed — vehicle approved for service' : `Onboarding stage complete: ${stage.label}`,
      actorName,
      'command',
      { stageId },
    )

    if (stageId === 'release_review' && !updated.release.canAllocate) {
      updated = attachPlatformEvent(
        updated,
        'vehicle.release_blocked',
        updated.release.summary,
        null,
        'command',
        { releaseDecision: updated.release.releaseDecision },
      )
    }

    profiles[idx] = updated
    return updated
  },

  reportDamage(id: string, input: ReportDamageInput, actorName: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const record: VehicleDamageRecord = {
      id: `vdmg-${Date.now()}`,
      zone: input.zone,
      zoneLabel: zoneLabel(input.zone),
      description: input.description,
      classification: input.classification ?? 'likely_new',
      severity: input.severity ?? 'minor',
      reportedAt: now(),
      reportedBy: actorName,
      sourceApplication: 'command',
      imageFileName: input.imageFileName ?? null,
      imageDataUrl: input.imageDataUrl ?? null,
      baseline: input.baseline ?? false,
      linkedDefectId: null,
    }
    const updated = buildProfile({
      ...current,
      damageRecords: [...current.damageRecords, record],
      auditEvents: [...current.auditEvents, audit('Damage recorded', actorName, 'Fleet administrator', null, record.zoneLabel, input.description)],
    })
    const withEvent = attachPlatformEvent(
      updated,
      'vehicle.damage_reported',
      `Damage on ${record.zoneLabel}: ${input.description}`,
      actorName,
      'command',
      { zone: input.zone, baseline: record.baseline },
    )
    profiles[idx] = withEvent
    return withEvent
  },

  updateEquipment(id: string, input: UpdateVehicleEquipmentInput, actorName: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const updated = buildProfile({
      ...current,
      equipment: current.equipment.map((e) =>
        e.id === input.equipmentId
          ? {
              ...e,
              assigned: input.assigned ?? e.assigned,
              serviceable: input.serviceable ?? e.serviceable,
              inDate: input.inDate ?? e.inDate,
              lastCheckedAt: now(),
            }
          : e,
      ),
      auditEvents: [
        ...current.auditEvents,
        audit('Equipment updated', actorName, 'Fleet administrator', input.equipmentId, 'updated'),
      ],
    })
    profiles[idx] = updated
    return updated
  },

  recordCheck(id: string, input: RecordVehicleCheckInput, actorName: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const entry = {
      id: `chk-${Date.now()}`,
      checkType: input.checkType,
      checkDate: now(),
      result: input.result,
      performedBy: actorName,
      sourceApplication: 'command' as const,
      mileage: input.mileage ?? current.mileage,
      notes: input.notes ?? null,
      defectIds: [] as string[],
    }
    const updated = buildProfile({
      ...current,
      checks: [entry, ...current.checks],
      lastCheckAt: now(),
      lastCheckType: input.checkType,
      auditEvents: [...current.auditEvents, audit('Check recorded', actorName, 'Fleet administrator', null, input.checkType)],
    })
    profiles[idx] = updated
    return updated
  },

  triageDefect(id: string, defectId: string, input: TriageDefectInput, actorName: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const defect = current.defects.find((d) => d.id === defectId)
    if (!defect) throw new Error('Defect not found')
    if (defect.severity === 'dangerous' && input.severity && input.severity !== 'dangerous' && actorName !== 'Tom Harris') {
      throw new Error('Cannot downgrade safety-critical defect without authorised review')
    }

    let profile = buildProfile({
      ...current,
      defects: current.defects.map((d) =>
        d.id === defectId
          ? {
              ...d,
              triageStatus: input.triageStatus,
              triagedBy: actorName,
              triagedAt: now(),
              severity: input.severity ?? d.severity,
              status: input.triageStatus === 'deferred' ? 'awaiting_repair' as const : d.status,
            }
          : d,
      ),
      auditEvents: [...current.auditEvents, audit('Defect triaged', actorName, 'Maintenance', defectId, input.triageStatus, input.notes)],
    })
    profiles[idx] = profile

    if (input.createWorkOrder) {
      profile = this.createWorkOrder(id, {
        type: 'repair',
        title: `Repair: ${defect.component}`,
        defectId,
        provider: 'Fleet Workshop',
        notes: input.notes,
      }, actorName)
      const wo = profile.workOrders[profile.workOrders.length - 1]
      if (wo) {
        profile = buildProfile({
          ...profile,
          defects: profile.defects.map((d) => (d.id === defectId ? { ...d, linkedWorkOrderId: wo.id } : d)),
        })
        profiles[idx] = profile
      }
    }

    if (input.markVor && profile.operationalStatus !== 'vor') {
      profile = this.markVor(id, { reason: input.notes ?? 'Defect triage', category: defect.category, defectId }, actorName)
    }

    profiles[idx] = profile
    return profile
  },

  updateWorkOrder(id: string, workOrderId: string, input: UpdateWorkOrderInput, actorName: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const existing = current.workOrders.find((w) => w.id === workOrderId)
    if (!existing) throw new Error('Work order not found')
    if (input.status && !canTransitionWorkOrder(existing.status, input.status)) {
      throw new Error(`Cannot transition from ${existing.status} to ${input.status}`)
    }

    const workOrders = current.workOrders.map((w) =>
      w.id === workOrderId
        ? normalizeWorkOrder({
            ...w,
            ...input,
            completedDate: input.status === 'completed' ? daysFromNow(0) : w.completedDate,
            actualCost: input.status === 'completed' ? (input.labourCost ?? 0) + (input.partsCost ?? w.partsCost ?? 0) : w.actualCost,
          })
        : w,
    )

    let downtimeEvents = current.downtimeEvents
    if (input.status === 'in_progress') {
      downtimeEvents = [...downtimeEvents, { id: `dt-${Date.now()}`, stage: 'work_started' as const, occurredAt: now(), actorName, notes: null }]
    }
    if (input.status === 'awaiting_parts') {
      downtimeEvents = [...downtimeEvents, { id: `dt-${Date.now()}-p`, stage: 'parts_requested' as const, occurredAt: now(), actorName, notes: null }]
    }
    if (input.status === 'completed') {
      downtimeEvents = [...downtimeEvents, { id: `dt-${Date.now()}-c`, stage: 'repair_completed' as const, occurredAt: now(), actorName, notes: null }]
    }

    let defects = current.defects
    if (existing.defectId && input.status) {
      defects = defects.map((d) => {
        if (d.id !== existing.defectId) return d
        if (input.status === 'in_progress') return { ...d, status: 'in_repair' as const }
        if (input.status === 'awaiting_parts') return { ...d, status: 'in_repair' as const }
        if (input.status === 'quality_check' || input.status === 'completed') {
          return {
            ...d,
            status: 'awaiting_verification' as const,
            repairCompletedAt: d.repairCompletedAt ?? now(),
            repairCompletedBy: d.repairCompletedBy ?? actorName,
            repairSummary: d.repairSummary ?? existing.diagnosis ?? 'Repair completed via work order',
          }
        }
        return d
      })
    }

    const updated = buildProfile({
      ...current,
      workOrders,
      defects,
      downtimeEvents,
      operationalStatus: input.status === 'completed' ? current.operationalStatus : current.operationalStatus,
      auditEvents: [...current.auditEvents, audit('Work order updated', actorName, 'Maintenance', workOrderId, input.status ?? 'updated')],
    })
    profiles[idx] = updated
    return updated
  },

  addWorkOrderPart(id: string, workOrderId: string, input: AddWorkOrderPartInput, actorName: string): VehicleProfile {
    const idx = profiles.findIndex((v) => v.id === id)
    if (idx < 0) throw new Error('Vehicle not found')
    const current = profiles[idx]!
    const line = {
      id: `wop-${Date.now()}`,
      partName: input.partName,
      partNumber: input.partNumber ?? null,
      quantity: input.quantity,
      unitCost: input.unitCost,
      supplierId: input.supplierId ?? null,
    }
    const workOrders = current.workOrders.map((w) => {
      if (w.id !== workOrderId) return w
      const parts = [...w.parts, line]
      const partsCost = parts.reduce((s, p) => s + p.quantity * p.unitCost, 0)
      return normalizeWorkOrder({ ...w, parts, partsCost })
    })
    const updated = buildProfile({
      ...current,
      workOrders,
      auditEvents: [...current.auditEvents, audit('Part recorded', actorName, 'Maintenance', workOrderId, line.partName)],
    })
    profiles[idx] = updated
    return updated
  },

  listReleaseExceptions() {
    return this.list()
      .filter((v) => !v.release.canAllocate)
      .map((v) => {
        const primaryBlock = v.release.failures[0]?.message ?? v.release.summary
        return {
          id: `EX-VEH-${v.reference}`,
          severity: v.release.releaseDecision === 'blocked' ? ('high' as const) : ('medium' as const),
          title: `Vehicle release blocked — ${v.registrationNumber}`,
          category: 'vehicle' as const,
          relatedRecord: v.reference,
          relatedHref: `/vehicles/${v.id}`,
          depot: v.currentDepotName,
          raisedAt: v.updatedAt,
          ageMinutes: Math.max(1, Math.round((Date.now() - new Date(v.updatedAt).getTime()) / 60000)),
          slaMinutesRemaining: v.release.releaseDecision === 'blocked' ? 60 : null,
          owner: null,
          status: 'new' as const,
          lastUpdate: v.updatedAt,
          recommendedAction: primaryBlock,
        }
      })
  },
}
