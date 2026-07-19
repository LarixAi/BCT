import {
  emptyEvidence,
  instantiatePmiChecklist,
  type PmiChecklistInstance,
} from '@/lib/maintenance/pmi-checklist'
import type { InspectionProviderRow, InspectionRecord } from './types'

const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
const dateAgo = (n: number) => daysAgo(n).slice(0, 10)

function base(
  partial: Omit<InspectionRecord, 'createdAt' | 'updatedAt' | 'evidenceSummary' | 'importFileName'> & {
    evidenceSummary?: string[]
    importFileName?: string | null
    createdAt?: string
    updatedAt?: string
  },
): InspectionRecord {
  return {
    ...partial,
    evidenceSummary: partial.evidenceSummary ?? [],
    importFileName: partial.importFileName ?? null,
    createdAt: partial.createdAt ?? daysAgo(14),
    updatedAt: partial.updatedAt ?? daysAgo(1),
  }
}

function cloneChecklist(source: PmiChecklistInstance): PmiChecklistInstance {
  return structuredClone(source)
}

function buildPartialFailChecklist(): PmiChecklistInstance {
  const checklist = instantiatePmiChecklist(undefined, daysAgo(1))
  checklist.inspectorName = 'Dave Wilson'
  checklist.items = checklist.items.map((item) => {
    if (['brakes-service', 'brakes-parking'].includes(item.templateItemId)) {
      return {
        ...item,
        result: 'fail' as const,
        notes: 'Pedal travel excessive — roller test required',
        evidence: emptyEvidence(),
      }
    }
    if (['steering', 'tyres', 'wheel-nuts', 'lights'].includes(item.templateItemId)) {
      return { ...item, result: 'pass' as const, notes: null, evidence: emptyEvidence() }
    }
    return item
  })
  return checklist
}

function buildCompletePassChecklist(opts: {
  inspectorName: string
  startedDaysAgo: number
  completedDaysAgo: number
  brakeFile: string
  advisoryExhaust?: boolean
}): PmiChecklistInstance {
  const checklist = instantiatePmiChecklist(undefined, daysAgo(opts.startedDaysAgo))
  checklist.inspectorName = opts.inspectorName
  checklist.completedAt = daysAgo(opts.completedDaysAgo)
  checklist.items = checklist.items.map((item) => {
    const needsBrake = ['brakes-service', 'brakes-parking'].includes(item.templateItemId)
    const advisory = opts.advisoryExhaust && item.templateItemId === 'exhaust'
    return {
      ...item,
      result: advisory ? ('advisory' as const) : ('pass' as const),
      notes: advisory ? 'Minor exhaust bracket corrosion' : null,
      evidence: needsBrake
        ? {
            kind: 'brake_print' as const,
            note: 'Roller brake readings attached',
            fileName: opts.brakeFile,
            recordedAt: daysAgo(opts.completedDaysAgo),
            recordedBy: opts.inspectorName,
          }
        : emptyEvidence(),
    }
  })
  return checklist
}

/** Mutable seed store for mock API. */
export function createInspectionSeed(): InspectionRecord[] {
  const overdueChecklist = buildPartialFailChecklist()
  const inProgressChecklist = cloneChecklist(buildPartialFailChecklist())
  const awaitingSignOffChecklist = buildCompletePassChecklist({
    inspectorName: 'Maria Santos',
    startedDaysAgo: 3,
    completedDaysAgo: 1,
    brakeFile: 'brake-print-st12.pdf',
  })
  const signedOffChecklist = buildCompletePassChecklist({
    inspectorName: 'Tom Harris',
    startedDaysAgo: 45,
    completedDaysAgo: 40,
    brakeFile: 'brake-ab12.pdf',
    advisoryExhaust: true,
  })

  return [
    base({
      id: 'insp-pmi-overdue',
      vehicleId: 'veh-4',
      registrationNumber: 'CD34 EFG',
      fleetNumber: 'F-031',
      vehicleType: 'minibus',
      depot: 'Wembley Depot',
      inspectionType: 'safety_pmi',
      intervalWeeks: 6,
      dueDate: dateAgo(12),
      bookedDate: dateAgo(5),
      odometer: 112400,
      scheduledMileage: 112500,
      provider: 'Fleet Workshop',
      inspectorName: 'Dave Wilson',
      bookingStatus: 'arrived',
      status: 'rectification_pending',
      outcome: 'rectification_required',
      operationalStatus: 'vor',
      previousInspectionDate: dateAgo(54),
      nextProjectedDate: daysFromNow(30),
      linkedDefects: [
        { defectId: 'vdef-1', component: 'Brake pedal', severity: 'safety_critical', status: 'open' },
      ],
      linkedWorkOrders: [
        { workOrderId: 'wo-4', title: 'Brake system repair', status: 'awaiting_authorisation' },
      ],
      checklist: overdueChecklist,
      evidenceSummary: ['Partial PMI checklist', 'Defect photos pending'],
      signedOffAt: null,
      signedOffBy: null,
      driverInstruction: 'Return to Wembley Depot — do not accept further duties until inspection signed off.',
      updatedAt: daysAgo(0),
    }),
    base({
      id: 'insp-pmi-progress',
      vehicleId: 'veh-5',
      registrationNumber: 'MN90 PQR',
      fleetNumber: 'F-045',
      vehicleType: 'coach',
      depot: 'Croydon Depot',
      inspectionType: 'safety_pmi',
      intervalWeeks: 8,
      dueDate: daysFromNow(0),
      bookedDate: daysFromNow(0),
      odometer: 198200,
      scheduledMileage: 200000,
      provider: 'Fleet Workshop',
      inspectorName: 'Dave Wilson',
      bookingStatus: 'in_progress',
      status: 'in_progress',
      outcome: 'pending',
      operationalStatus: 'workshop',
      previousInspectionDate: dateAgo(56),
      nextProjectedDate: daysFromNow(56),
      linkedDefects: [],
      linkedWorkOrders: [
        { workOrderId: 'wo-5b', title: 'PMI re-test — brake performance', status: 'quality_check' },
      ],
      checklist: inProgressChecklist,
      evidenceSummary: ['Brake items failed — print outstanding'],
      signedOffAt: null,
      signedOffBy: null,
      driverInstruction: 'Hand vehicle to workshop on arrival — PMI in progress.',
      createdAt: daysAgo(7),
      updatedAt: daysAgo(0),
    }),
    base({
      id: 'insp-pmi-signoff',
      vehicleId: 'veh-6',
      registrationNumber: 'ST12 UVW',
      fleetNumber: 'F-052',
      vehicleType: 'accessible',
      depot: 'Wembley Depot',
      inspectionType: 'safety_pmi',
      intervalWeeks: 8,
      dueDate: dateAgo(2),
      bookedDate: dateAgo(2),
      odometer: 12400,
      scheduledMileage: null,
      provider: 'Internal inspector',
      inspectorName: 'Maria Santos',
      bookingStatus: 'complete',
      status: 'awaiting_sign_off',
      outcome: 'pass_with_advisories',
      operationalStatus: 'available',
      previousInspectionDate: dateAgo(60),
      nextProjectedDate: daysFromNow(54),
      linkedDefects: [],
      linkedWorkOrders: [],
      checklist: awaitingSignOffChecklist,
      evidenceSummary: ['Brake performance print', 'Checklist complete'],
      signedOffAt: null,
      signedOffBy: null,
      driverInstruction: null,
      createdAt: daysAgo(10),
      updatedAt: daysAgo(1),
    }),
    base({
      id: 'insp-pmi-due7',
      vehicleId: 'veh-1',
      registrationNumber: 'AB12 CDE',
      fleetNumber: 'F-014',
      vehicleType: 'minibus',
      depot: 'Wembley Depot',
      inspectionType: 'safety_pmi',
      intervalWeeks: 8,
      dueDate: daysFromNow(5),
      bookedDate: daysFromNow(5),
      odometer: 88420,
      scheduledMileage: 90000,
      provider: 'Fleet Workshop',
      inspectorName: null,
      bookingStatus: 'booked',
      status: 'scheduled',
      outcome: 'pending',
      operationalStatus: 'in_service',
      previousInspectionDate: dateAgo(40),
      nextProjectedDate: daysFromNow(5),
      linkedDefects: [],
      linkedWorkOrders: [],
      checklist: null,
      evidenceSummary: [],
      signedOffAt: null,
      signedOffBy: null,
      driverInstruction: 'Return to depot by 17:00 the day before PMI.',
    }),
    base({
      id: 'insp-first-use',
      vehicleId: 'veh-6',
      registrationNumber: 'ST12 UVW',
      fleetNumber: 'F-052',
      vehicleType: 'accessible',
      depot: 'Wembley Depot',
      inspectionType: 'first_use',
      intervalWeeks: null,
      dueDate: dateAgo(90),
      bookedDate: dateAgo(90),
      odometer: 120,
      scheduledMileage: null,
      provider: 'Internal inspector',
      inspectorName: 'Tom Harris',
      bookingStatus: 'complete',
      status: 'signed_off',
      outcome: 'pass',
      operationalStatus: 'available',
      previousInspectionDate: null,
      nextProjectedDate: null,
      linkedDefects: [],
      linkedWorkOrders: [],
      checklist: null,
      evidenceSummary: ['First-use checklist PDF'],
      signedOffAt: dateAgo(90),
      signedOffBy: 'Tom Harris',
      importFileName: 'first-use-st12.pdf',
      driverInstruction: null,
      createdAt: daysAgo(100),
      updatedAt: daysAgo(90),
    }),
    base({
      id: 'insp-annual-prep',
      vehicleId: 'veh-2',
      registrationNumber: 'GH56 HIJ',
      fleetNumber: 'F-022',
      vehicleType: 'minibus',
      depot: 'Wembley Depot',
      inspectionType: 'annual_prep',
      intervalWeeks: null,
      dueDate: daysFromNow(3),
      bookedDate: daysFromNow(3),
      odometer: 62100,
      scheduledMileage: null,
      provider: 'DVSA approved test station',
      inspectorName: null,
      bookingStatus: 'booked',
      status: 'scheduled',
      outcome: 'pending',
      operationalStatus: 'in_service',
      previousInspectionDate: dateAgo(330),
      nextProjectedDate: daysFromNow(3),
      linkedDefects: [],
      linkedWorkOrders: [],
      checklist: null,
      evidenceSummary: [],
      signedOffAt: null,
      signedOffBy: null,
      driverInstruction: 'Present vehicle washed and fuelled for annual-test preparation.',
    }),
    base({
      id: 'insp-post-repair',
      vehicleId: 'veh-4',
      registrationNumber: 'CD34 EFG',
      fleetNumber: 'F-031',
      vehicleType: 'minibus',
      depot: 'Wembley Depot',
      inspectionType: 'post_repair',
      intervalWeeks: null,
      dueDate: daysFromNow(2),
      bookedDate: null,
      odometer: 112400,
      scheduledMileage: null,
      provider: 'Fleet Workshop',
      inspectorName: null,
      bookingStatus: 'unscheduled',
      status: 'due',
      outcome: 'pending',
      operationalStatus: 'vor',
      previousInspectionDate: null,
      nextProjectedDate: daysFromNow(2),
      linkedDefects: [
        { defectId: 'vdef-1', component: 'Brake pedal', severity: 'safety_critical', status: 'open' },
      ],
      linkedWorkOrders: [
        { workOrderId: 'wo-4', title: 'Brake system repair', status: 'awaiting_authorisation' },
      ],
      checklist: null,
      evidenceSummary: [],
      signedOffAt: null,
      signedOffBy: null,
      driverInstruction: 'Do not collect until post-repair inspection is signed off.',
    }),
    base({
      id: 'insp-rts',
      vehicleId: 'veh-3',
      registrationNumber: 'KL78 MNO',
      fleetNumber: 'F-028',
      vehicleType: 'minibus',
      depot: 'Croydon Depot',
      inspectionType: 'return_to_service',
      intervalWeeks: null,
      dueDate: daysFromNow(1),
      bookedDate: daysFromNow(1),
      odometer: 75400,
      scheduledMileage: null,
      provider: 'Internal inspector',
      inspectorName: null,
      bookingStatus: 'booked',
      status: 'prepared',
      outcome: 'pending',
      operationalStatus: 'available',
      previousInspectionDate: null,
      nextProjectedDate: daysFromNow(1),
      linkedDefects: [],
      linkedWorkOrders: [],
      checklist: null,
      evidenceSummary: [],
      signedOffAt: null,
      signedOffBy: null,
      driverInstruction: 'Yard will complete return verification after sign-off.',
    }),
    base({
      id: 'insp-failed-vor',
      vehicleId: 'veh-4',
      registrationNumber: 'CD34 EFG',
      fleetNumber: 'F-031',
      vehicleType: 'minibus',
      depot: 'Wembley Depot',
      inspectionType: 'intermediate',
      intervalWeeks: null,
      dueDate: dateAgo(20),
      bookedDate: dateAgo(20),
      odometer: 111800,
      scheduledMileage: null,
      provider: 'External Workshop',
      inspectorName: 'External tech',
      bookingStatus: 'complete',
      status: 'failed',
      outcome: 'fail_vor',
      operationalStatus: 'vor',
      previousInspectionDate: dateAgo(80),
      nextProjectedDate: daysFromNow(14),
      linkedDefects: [
        { defectId: 'vdef-1', component: 'Brake pedal', severity: 'safety_critical', status: 'open' },
      ],
      linkedWorkOrders: [],
      checklist: null,
      evidenceSummary: ['Fail sheet PDF'],
      signedOffAt: null,
      signedOffBy: null,
      importFileName: 'intermediate-fail-cd34.pdf',
      driverInstruction: 'Vehicle held VOR — do not drive.',
      createdAt: daysAgo(25),
      updatedAt: daysAgo(20),
    }),
    base({
      id: 'insp-pmi-signed',
      vehicleId: 'veh-1',
      registrationNumber: 'AB12 CDE',
      fleetNumber: 'F-014',
      vehicleType: 'minibus',
      depot: 'Wembley Depot',
      inspectionType: 'safety_pmi',
      intervalWeeks: 8,
      dueDate: dateAgo(40),
      bookedDate: dateAgo(40),
      odometer: 86200,
      scheduledMileage: 87000,
      provider: 'Fleet Workshop',
      inspectorName: 'Tom Harris',
      bookingStatus: 'complete',
      status: 'signed_off',
      outcome: 'pass_with_advisories',
      operationalStatus: 'in_service',
      previousInspectionDate: dateAgo(96),
      nextProjectedDate: daysFromNow(5),
      linkedDefects: [],
      linkedWorkOrders: [],
      checklist: signedOffChecklist,
      evidenceSummary: ['Brake print', 'Signed PMI certificate'],
      signedOffAt: dateAgo(40),
      signedOffBy: 'Tom Harris',
      driverInstruction: null,
      createdAt: daysAgo(50),
      updatedAt: daysAgo(40),
    }),
    base({
      id: 'insp-body',
      vehicleId: 'veh-3',
      registrationNumber: 'KL78 MNO',
      fleetNumber: 'F-028',
      vehicleType: 'minibus',
      depot: 'Croydon Depot',
      inspectionType: 'body_condition',
      intervalWeeks: null,
      dueDate: daysFromNow(14),
      bookedDate: null,
      odometer: 75400,
      scheduledMileage: null,
      provider: 'Yard',
      inspectorName: null,
      bookingStatus: 'unscheduled',
      status: 'due',
      outcome: 'pending',
      operationalStatus: 'available',
      previousInspectionDate: dateAgo(180),
      nextProjectedDate: daysFromNow(14),
      linkedDefects: [],
      linkedWorkOrders: [],
      checklist: null,
      evidenceSummary: [],
      signedOffAt: null,
      signedOffBy: null,
      driverInstruction: null,
    }),
  ]
}

export const INSPECTION_PROVIDERS: InspectionProviderRow[] = [
  {
    id: 'prov-internal',
    name: 'Fleet Workshop (internal)',
    type: 'internal',
    approved: true,
    services: ['Safety Inspection (PMI)', 'Post-repair', 'Return-to-service'],
    slaHours: 48,
    contactEmail: 'workshop@metrotransport.co.uk',
  },
  {
    id: 'prov-dvsa',
    name: 'DVSA approved test station',
    type: 'external',
    approved: true,
    services: ['Annual-test preparation', 'MOT'],
    slaHours: 72,
    contactEmail: 'bookings@teststation.example',
  },
  {
    id: 'prov-franchise',
    name: 'Mercedes Commercial',
    type: 'franchise',
    approved: true,
    services: ['Manufacturer inspection', 'Specialist equipment'],
    slaHours: 96,
    contactEmail: 'service@mercedes-commercial.example',
  },
]
