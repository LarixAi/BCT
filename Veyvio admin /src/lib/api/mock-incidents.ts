import { buildIncidentDetail, buildIncidentsHub } from '@/lib/incidents/aggregate'
import { incidentRef } from '@/lib/incidents/status'
import type {
  AcknowledgeIncidentInput,
  AddIncidentActionInput,
  AddIncidentUpdateInput,
  AssignIncidentInput,
  CloseIncidentInput,
  ContainIncidentInput,
  CreateDefectFromIncidentInput,
  CreateTelematicsIncidentInput,
  DriverIncidentSummary,
  EscalateIncidentInput,
  IncidentDetailRecord,
  IncidentLinkedEntities,
  IncidentsHubData,
  IncidentSettings,
  LinkIncidentEntitiesInput,
  MarkIncidentVehicleVorInput,
  RecordRegulatoryDecisionInput,
  ReopenIncidentInput,
  ProcessTelematicsFeedInput,
  ReportIncidentHubInput,
  RequestCctvPreservationInput,
  StoredIncident,
  SubmitIncidentToInsurerInput,
  TelematicsIncidentFeedItem,
  UpdateInvestigationInput,
  UpdatePersonWelfareInput,
  UploadIncidentEvidenceInput,
} from '@/lib/incidents/types'
import { DEFAULT_INCIDENT_SETTINGS } from '@/lib/incidents/settings'
import { rulesForTelematicsEvent, shouldAutoBlockVehicle } from '@/lib/incidents/automation'
import { defaultCctvAssetsForDepot } from '@/lib/incidents/cctv'
import { emitIncidentEvent } from '@/lib/incidents/events'
import { emptyLinkedEntities } from '@/lib/incidents/linking'
import { INCIDENT_INSURER_CONNECTORS, defaultInsurerSubmission, mockInsurerSubmit } from '@/lib/incidents/insurer'
import { mockVehiclesApi } from './mock-vehicles'
import { drainDriverIncidentsForAdmin } from '@veyvio/incidents'

const now = () => new Date().toISOString()
const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60_000).toISOString()
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60_000).toISOString()

function defaultSafetyControls(contained = false): StoredIncident['safetyControls'] {
  return {
    everyoneAccountedFor: null,
    medicalTreatmentOngoing: null,
    vehicleSafe: null,
    driverFitToContinue: null,
    locationSafe: null,
    passengersAwaitingTransport: null,
    criticalContactsNotified: null,
    evidencePreserved: null,
    isContained: contained,
  }
}

function timelineEntry(action: string, actor: string, at: string, detail?: string | null, isSystem = false): StoredIncident['timeline'][0] {
  return { id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, action, actorName: actor, occurredAt: at, detail: detail ?? null, isSystem }
}

const ENTITY_LOOKUP = {
  schools: { 'sch-1': 'Oakwood Primary School' } as Record<string, string>,
  contracts: { 'con-1': 'Oakwood Primary 2025/26', 'con-2': 'Riverside Day Centre' } as Record<string, string>,
  passengers: { 'pax-1': 'Oliver Taylor', 'pax-2': 'Amelia Chen', 'pax-3': 'George Williams' } as Record<string, string>,
  customers: { 'cust-1': 'Oakwood Primary' } as Record<string, string>,
}

function resolveLinkedEntities(
  input: Partial<LinkIncidentEntitiesInput> & Partial<ReportIncidentHubInput>,
  current: IncidentLinkedEntities = emptyLinkedEntities(),
): IncidentLinkedEntities {
  const linked = { ...current }
  if (input.schoolId !== undefined) {
    linked.schoolId = input.schoolId || null
    linked.schoolName = input.schoolId ? (ENTITY_LOOKUP.schools[input.schoolId] ?? input.schoolId) : null
  }
  if (input.contractId !== undefined) {
    linked.contractId = input.contractId || null
    linked.contractName = input.contractId ? (ENTITY_LOOKUP.contracts[input.contractId] ?? input.contractId) : null
    if (input.contractId === 'con-1') {
      linked.customerId = 'cust-1'
      linked.customerName = ENTITY_LOOKUP.customers['cust-1'] ?? null
    }
  }
  if (input.passengerIds !== undefined) {
    linked.passengerIds = input.passengerIds
    linked.passengerNames = input.passengerIds.map((id) => ENTITY_LOOKUP.passengers[id] ?? id)
  }
  if (input.manifestId !== undefined) {
    linked.manifestId = input.manifestId || null
    linked.manifestLabel = input.manifestLabel ?? linked.manifestLabel
    linked.manifestVersion = input.manifestVersion ?? linked.manifestVersion
    if (input.freezeManifest) linked.manifestFrozen = true
  }
  return linked
}

function seedTelematicsFeed(): TelematicsIncidentFeedItem[] {
  return [
    {
      id: 'tel-feed-1',
      vehicleId: 'veh-2',
      vehicleRegistration: 'GH56 HIJ',
      driverId: 'drv-2',
      eventType: 'collision_detected',
      location: 'Wembley Depot — exit lane',
      occurredAt: hoursAgo(0.15),
      telematicsReference: 'TEL-COLL-88421',
      processed: false,
      linkedIncidentId: null,
    },
    {
      id: 'tel-feed-2',
      vehicleId: 'veh-1',
      vehicleRegistration: 'AB12 CDE',
      driverId: 'drv-3',
      eventType: 'harsh_braking',
      location: 'North Circular A406',
      occurredAt: hoursAgo(0.4),
      telematicsReference: 'TEL-HB-77210',
      processed: false,
      linkedIncidentId: null,
    },
  ]
}

function seedIncidents(): StoredIncident[] {
  return [
    {
      id: 'inc-1',
      incidentRef: 'INC-2026-001',
      title: 'Passenger fall while boarding',
      description: 'Passenger AB fell while boarding vehicle VX21 ABC at Northfield School. First aid provided on site; parent collected passenger.',
      category: 'passenger_injury',
      severity: 'high',
      status: 'under_investigation',
      reportingSource: 'driver_app',
      reportedBy: 'Jane Smith',
      reportedAt: hoursAgo(3),
      occurredAt: hoursAgo(4),
      discoveredAt: hoursAgo(3.5),
      location: 'Northfield School, Wembley',
      depotId: 'depot-wembley',
      depotName: 'Wembley Depot',
      ownerName: 'Sarah Mitchell',
      ownerId: 'staff-1',
      vehicleId: 'veh-3',
      vehicleRegistration: 'KL78 MNO',
      fleetNumber: 'V003',
      driverId: 'drv-1',
      driverName: 'Jane Smith',
      runReference: 'RUN-2841',
      tripReference: 'TRIP-8821',
      bookingReference: null,
      isSafeguarding: false,
      isAcknowledged: true,
      acknowledgedAt: hoursAgo(2.5),
      acknowledgedBy: 'Tom Harris',
      confidentiality: 'standard',
      operationalSummary: 'At 15:42, passenger fell boarding KL78 MNO at Northfield School. First aid given; parent collected. Vehicle temporarily removed pending step inspection.',
      safetyControls: {
        everyoneAccountedFor: true,
        medicalTreatmentOngoing: false,
        vehicleSafe: false,
        driverFitToContinue: true,
        locationSafe: true,
        passengersAwaitingTransport: false,
        criticalContactsNotified: true,
        evidencePreserved: true,
        isContained: true,
      },
      timeline: [
        timelineEntry('Incident occurred', 'System', hoursAgo(4), null, true),
        timelineEntry('Driver contacted control', 'Jane Smith', hoursAgo(3.8)),
        timelineEntry('Incident created from Driver app', 'System', hoursAgo(3), null, true),
        timelineEntry('First aid provided', 'Jane Smith', hoursAgo(2.9)),
        timelineEntry('Parent contacted', 'Control room', hoursAgo(2.5)),
        timelineEntry('Incident acknowledged', 'Tom Harris', hoursAgo(2.5)),
        timelineEntry('Assigned to Safety Manager', 'Tom Harris', hoursAgo(2)),
      ],
      people: [
        { id: 'p-1', name: 'Passenger AB', role: 'passenger', injuryStatus: 'minor', injuryDescription: 'Bruising to left knee', firstAidProvided: true, welfareFollowUpRequired: true, isRestricted: true, hasMedicalDetails: true, medicalNotes: 'Parent declined ambulance — monitored on site' },
        { id: 'p-2', name: 'Jane Smith', role: 'driver', injuryStatus: 'none', welfareFollowUpRequired: false, isRestricted: false },
      ],
      immediateActions: [
        { id: 'ia-1', action: 'First aid provided', completedBy: 'Jane Smith', completedAt: hoursAgo(2.9), notes: null, confirmed: true },
        { id: 'ia-2', action: 'Parent informed', completedBy: 'Control room', completedAt: hoursAgo(2.5), notes: null, confirmed: true },
        { id: 'ia-3', action: 'Vehicle marked VOR', completedBy: 'Tom Harris', completedAt: hoursAgo(2), notes: 'Pending step inspection', confirmed: true },
      ],
      evidence: [
        { id: 'ev-1', kind: 'photo', label: 'Entrance step photograph', uploadedBy: 'Jane Smith', uploadedAt: hoursAgo(2.8), confidentiality: 'standard', source: 'driver_app' },
        { id: 'ev-2', kind: 'statement', label: 'Driver statement', uploadedBy: 'Jane Smith', uploadedAt: hoursAgo(2.5), confidentiality: 'standard', source: 'driver_app' },
      ],
      investigation: {
        scope: 'Determine cause of passenger fall and whether step condition contributed',
        investigatorName: 'Sarah Mitchell',
        targetCompletionDate: daysAgo(-3),
        confirmedFacts: ['Passenger fell during boarding', 'First aid administered', 'No ambulance required'],
        disputedInformation: [],
        immediateCauses: ['Passenger lost footing on step'],
        contributingFactors: ['Step surface condition under review'],
        underlyingCauses: [],
        findingsSummary: null,
      },
      regulatoryAssessments: [
        { id: 'reg-1', authority: 'riddor', label: 'RIDDOR', potentiallyRequired: null, decision: null, decidedBy: null, decidedAt: null, deadline: daysAgo(-10), externalReference: null, status: 'pending' },
        { id: 'reg-2', authority: 'insurer', label: 'Insurer', potentiallyRequired: true, decision: 'Notify within 24 hours', decidedBy: 'Sarah Mitchell', decidedAt: hoursAgo(2), deadline: hoursAgo(-20), externalReference: null, status: 'assessed' },
      ],
      correctiveActions: [
        { id: 'ca-1', title: 'Welfare follow-up call', description: 'Contact parent re passenger wellbeing', actionType: 'welfare_follow_up', ownerName: 'Sarah Mitchell', priority: 'high', dueDate: hoursAgo(-2), status: 'open', completedAt: null },
        { id: 'ca-2', title: 'Vehicle step inspection', description: 'Engineering inspection of entrance step', actionType: 'vehicle_repair', ownerName: 'Dave Wilson', priority: 'high', dueDate: daysAgo(-1), status: 'open', completedAt: null },
      ],
      linkedDefectId: null,
      linkedCheckId: 'chk-4',
      closureReason: null,
      closedBy: null,
      closedAt: null,
      vehicleStillOperational: false,
      driverStillAssigned: false,
      linkedEntities: {
        schoolId: 'sch-1',
        schoolName: 'Oakwood Primary School',
        contractId: 'con-1',
        contractName: 'Oakwood Primary 2025/26',
        customerId: 'cust-1',
        customerName: 'Oakwood Primary',
        passengerIds: ['pax-1'],
        passengerNames: ['Oliver Taylor'],
        manifestId: 'man-8821',
        manifestLabel: 'TRIP-8821 passenger manifest',
        manifestVersion: 3,
        manifestFrozen: false,
      },
      cctvAssets: defaultCctvAssetsForDepot('depot-wembley').map((c, i) =>
        i === 0 ? { ...c, clipRequested: true, clipRequestedAt: hoursAgo(2), preservedUntil: daysAgo(-28) } : c,
      ),
      insurerSubmission: defaultInsurerSubmission(),
      telematicsSnapshot: null,
      driverReport: {
        localIncidentId: 'inc_local_seed_1',
        stage: 'completing',
        completenessScore: 72,
        formDefinitionVersion: 1,
        schemaVersion: 2,
        driverAppVersion: '0.1.0',
        originalAnswers: {
          immediateDanger: { value: 'no', source: 'DRIVER', enteredAt: hoursAgo(3) },
          injuryReported: { value: 'yes', source: 'DRIVER', enteredAt: hoursAgo(3), confidence: 'REPORTED' },
          journeyCanContinue: { value: 'no', source: 'DRIVER', enteredAt: hoursAgo(3) },
          passengersOnboard: { value: 'yes', source: 'DRIVER', enteredAt: hoursAgo(3) },
        },
      },
    },
    {
      id: 'inc-2',
      incidentRef: 'INC-2026-002',
      title: 'Missing child at school stop',
      description: 'Child expected at Oakwood Primary stop not collected. Safeguarding protocol activated — location confirmed safe with school.',
      category: 'safeguarding',
      severity: 'critical',
      status: 'immediate_response',
      reportingSource: 'school',
      reportedBy: 'Oakwood Primary School',
      reportedAt: hoursAgo(1),
      occurredAt: hoursAgo(1.5),
      discoveredAt: hoursAgo(1),
      location: 'Oakwood Primary School',
      depotId: 'depot-wembley',
      depotName: 'Wembley Depot',
      ownerName: null,
      ownerId: null,
      vehicleId: 'veh-5',
      vehicleRegistration: 'MN90 PQR',
      fleetNumber: 'V005',
      driverId: 'drv-4',
      driverName: 'Robert Wilson',
      runReference: 'School Run 114',
      tripReference: null,
      bookingReference: null,
      isSafeguarding: true,
      isAcknowledged: false,
      acknowledgedAt: null,
      acknowledgedBy: null,
      confidentiality: 'safeguarding',
      operationalSummary: 'Missing passenger at school stop — safeguarding lead notified. Child located safe at school office. Senior acknowledgement required.',
      safetyControls: defaultSafetyControls(false),
      timeline: [
        timelineEntry('School reported missing passenger', 'Oakwood Primary', hoursAgo(1)),
        timelineEntry('Incident auto-classified critical', 'System', hoursAgo(1), 'Safeguarding', true),
        timelineEntry('Safeguarding lead alerted', 'System', hoursAgo(0.9), null, true),
      ],
      people: [
        { id: 'p-3', name: 'Child — restricted', role: 'passenger', injuryStatus: 'none', welfareFollowUpRequired: true, isRestricted: true },
        { id: 'p-4', name: 'Robert Wilson', role: 'driver', injuryStatus: 'none', welfareFollowUpRequired: false, isRestricted: false },
      ],
      immediateActions: [
        { id: 'ia-4', action: 'School contacted', completedBy: 'Control room', completedAt: hoursAgo(0.8), notes: 'Child located at school office', confirmed: true },
      ],
      evidence: [],
      investigation: { scope: null, investigatorName: null, targetCompletionDate: null, confirmedFacts: [], disputedInformation: [], immediateCauses: [], contributingFactors: [], underlyingCauses: [], findingsSummary: null },
      regulatoryAssessments: [
        { id: 'reg-3', authority: 'safeguarding', label: 'Safeguarding authority', potentiallyRequired: true, decision: null, decidedBy: null, decidedAt: null, deadline: hoursAgo(-4), externalReference: null, status: 'pending' },
        { id: 'reg-4', authority: 'school', label: 'School notification', potentiallyRequired: true, decision: 'School informed', decidedBy: 'Control room', decidedAt: hoursAgo(0.8), deadline: null, externalReference: null, status: 'submitted' },
      ],
      correctiveActions: [],
      linkedDefectId: null,
      linkedCheckId: null,
      closureReason: null,
      closedBy: null,
      closedAt: null,
      vehicleStillOperational: true,
      driverStillAssigned: true,
      linkedEntities: {
        schoolId: 'sch-1',
        schoolName: 'Oakwood Primary School',
        contractId: 'con-1',
        contractName: 'Oakwood Primary 2025/26',
        passengerIds: ['pax-2'],
        passengerNames: ['Amelia Chen'],
        manifestId: 'mf-114',
        manifestLabel: 'School Run 114 manifest',
        manifestVersion: 3,
        manifestFrozen: true,
        customerId: 'cust-1',
        customerName: 'Oakwood Primary',
      },
      cctvAssets: defaultCctvAssetsForDepot('depot-wembley'),
      insurerSubmission: null,
      telematicsSnapshot: null,
    },
    {
      id: 'inc-3',
      incidentRef: 'INC-2026-003',
      title: 'Nearside mirror contact with gate post',
      description: 'Minor wing mirror clipped gate post leaving Wembley Depot. No injuries, no passengers onboard.',
      category: 'vehicle_damage',
      severity: 'low',
      status: 'closed',
      reportingSource: 'yard_app',
      reportedBy: 'Maria Santos',
      reportedAt: daysAgo(3),
      occurredAt: daysAgo(3),
      discoveredAt: daysAgo(3),
      location: 'Wembley Depot',
      depotId: 'depot-wembley',
      depotName: 'Wembley Depot',
      ownerName: 'Fleet Lead',
      ownerId: null,
      vehicleId: 'veh-2',
      vehicleRegistration: 'GH56 HIJ',
      fleetNumber: 'V002',
      driverId: 'drv-2',
      driverName: 'Michael Patel',
      runReference: null,
      tripReference: null,
      bookingReference: null,
      isSafeguarding: false,
      isAcknowledged: true,
      acknowledgedAt: daysAgo(3),
      acknowledgedBy: 'Tom Harris',
      confidentiality: 'standard',
      operationalSummary: 'Minor depot damage — mirror replaced, driver retrained on reversing procedure.',
      safetyControls: { ...defaultSafetyControls(true), everyoneAccountedFor: true, vehicleSafe: true, locationSafe: true, evidencePreserved: true },
      timeline: [
        timelineEntry('Incident reported', 'Maria Santos', daysAgo(3)),
        timelineEntry('Investigation completed', 'Fleet Lead', daysAgo(1)),
        timelineEntry('Incident closed', 'Tom Harris', daysAgo(1), 'Permanently resolved'),
      ],
      people: [{ id: 'p-5', name: 'Michael Patel', role: 'driver', injuryStatus: 'none', welfareFollowUpRequired: false, isRestricted: false }],
      immediateActions: [{ id: 'ia-5', action: 'Area isolated', completedBy: 'Maria Santos', completedAt: daysAgo(3), notes: null, confirmed: true }],
      evidence: [{ id: 'ev-3', kind: 'photo', label: 'Mirror damage', uploadedBy: 'Maria Santos', uploadedAt: daysAgo(3), confidentiality: 'standard', source: 'yard_app' }],
      investigation: {
        scope: 'Depot manoeuvring incident',
        investigatorName: 'Fleet Lead',
        targetCompletionDate: daysAgo(1),
        confirmedFacts: ['Mirror contacted gate post during exit'],
        disputedInformation: [],
        immediateCauses: ['Insufficient clearance on exit route'],
        contributingFactors: ['Gate post position'],
        underlyingCauses: ['Depot layout risk not previously assessed'],
        findingsSummary: 'Mirror replaced. Reversing briefing scheduled for all depot drivers.',
      },
      regulatoryAssessments: [{ id: 'reg-5', authority: 'riddor', label: 'RIDDOR', potentiallyRequired: false, decision: 'Not reportable — no injury', decidedBy: 'Sarah Mitchell', decidedAt: daysAgo(2), deadline: null, externalReference: null, status: 'not_required' }],
      correctiveActions: [{ id: 'ca-3', title: 'Depot reversing briefing', description: 'Brief all Wembley drivers', actionType: 'driver_training', ownerName: 'Maria Santos', priority: 'medium', dueDate: daysAgo(-2), status: 'completed', completedAt: daysAgo(1) }],
      linkedDefectId: null,
      linkedCheckId: null,
      closureReason: 'Resolved — corrective actions complete',
      closedBy: 'Tom Harris',
      closedAt: daysAgo(1),
      vehicleStillOperational: false,
      driverStillAssigned: false,
    },
    {
      id: 'inc-4',
      incidentRef: 'INC-2026-004',
      title: 'Wheelchair ramp failure during accessible duty',
      description: 'Ramp failed to deploy at pickup. Passenger transferred to replacement accessible vehicle.',
      category: 'accessibility_failure',
      severity: 'high',
      status: 'corrective_actions_open',
      reportingSource: 'driver_app',
      reportedBy: 'Michael Patel',
      reportedAt: hoursAgo(8),
      occurredAt: hoursAgo(9),
      discoveredAt: hoursAgo(8),
      location: 'Croydon — Lansdowne Road',
      depotId: 'depot-croydon',
      depotName: 'Croydon Depot',
      ownerName: 'Dave Wilson',
      ownerId: null,
      vehicleId: 'veh-6',
      vehicleRegistration: 'ST12 UVW',
      fleetNumber: 'V006',
      driverId: 'drv-2',
      driverName: 'Michael Patel',
      runReference: 'RUN-1920',
      tripReference: null,
      bookingReference: 'BK-4401',
      isSafeguarding: false,
      isAcknowledged: true,
      acknowledgedAt: hoursAgo(7),
      acknowledgedBy: 'Tom Harris',
      confidentiality: 'standard',
      operationalSummary: 'Wheelchair ramp hydraulic failure — passenger transferred safely. Vehicle VOR pending repair.',
      safetyControls: { ...defaultSafetyControls(true), everyoneAccountedFor: true, passengersAwaitingTransport: false, criticalContactsNotified: true, evidencePreserved: true, vehicleSafe: false },
      timeline: [
        timelineEntry('Ramp failure reported', 'Michael Patel', hoursAgo(8)),
        timelineEntry('Replacement vehicle dispatched', 'Dispatch', hoursAgo(7.5)),
        timelineEntry('Defect created', 'System', hoursAgo(7), 'vdef-9', true),
      ],
      people: [
        { id: 'p-6', name: 'Wheelchair passenger', role: 'passenger', injuryStatus: 'none', welfareFollowUpRequired: true, isRestricted: true },
        { id: 'p-7', name: 'Michael Patel', role: 'driver', injuryStatus: 'none', welfareFollowUpRequired: false, isRestricted: false },
      ],
      immediateActions: [
        { id: 'ia-6', action: 'Replacement vehicle arranged', completedBy: 'Dispatch', completedAt: hoursAgo(7.5), notes: null, confirmed: true },
        { id: 'ia-7', action: 'Vehicle marked VOR', completedBy: 'Dave Wilson', completedAt: hoursAgo(7), notes: null, confirmed: true },
      ],
      evidence: [{ id: 'ev-4', kind: 'video', label: 'Ramp failure video', uploadedBy: 'Michael Patel', uploadedAt: hoursAgo(7.8), confidentiality: 'standard', source: 'driver_app' }],
      investigation: {
        scope: 'Equipment failure root cause',
        investigatorName: 'Dave Wilson',
        targetCompletionDate: daysAgo(-5),
        confirmedFacts: ['Hydraulic ramp failed to deploy'],
        disputedInformation: [],
        immediateCauses: ['Ramp hydraulic failure'],
        contributingFactors: ['Service interval may have been exceeded'],
        underlyingCauses: [],
        findingsSummary: null,
      },
      regulatoryAssessments: [{ id: 'reg-6', authority: 'customer', label: 'Customer notification', potentiallyRequired: true, decision: 'Customer informed', decidedBy: 'Dispatch', decidedAt: hoursAgo(7), deadline: null, externalReference: null, status: 'submitted' }],
      correctiveActions: [
        { id: 'ca-4', title: 'Ramp hydraulic repair', description: 'Workshop repair and test', actionType: 'vehicle_repair', ownerName: 'Dave Wilson', priority: 'immediate', dueDate: hoursAgo(-12), status: 'overdue', completedAt: null },
      ],
      linkedDefectId: 'vdef-9',
      linkedCheckId: null,
      closureReason: null,
      closedBy: null,
      closedAt: null,
      vehicleStillOperational: false,
      driverStillAssigned: false,
    },
    {
      id: 'inc-5',
      incidentRef: 'INC-2026-005',
      title: 'Near miss — pedestrian in depot yard',
      description: 'Vehicle reversing in yard — pedestrian stepped into path. Driver stopped in time. No contact made.',
      category: 'near_miss',
      severity: 'near_miss',
      status: 'awaiting_triage',
      reportingSource: 'yard_app',
      reportedBy: 'Maria Santos',
      reportedAt: hoursAgo(0.5),
      occurredAt: hoursAgo(0.6),
      discoveredAt: hoursAgo(0.5),
      location: 'Wembley Depot yard',
      depotId: 'depot-wembley',
      depotName: 'Wembley Depot',
      ownerName: null,
      ownerId: null,
      vehicleId: 'veh-1',
      vehicleRegistration: 'AB12 CDE',
      fleetNumber: 'V001',
      driverId: 'drv-3',
      driverName: 'James Cole',
      runReference: null,
      tripReference: null,
      bookingReference: null,
      isSafeguarding: false,
      isAcknowledged: false,
      acknowledgedAt: null,
      acknowledgedBy: null,
      confidentiality: 'standard',
      operationalSummary: null,
      safetyControls: defaultSafetyControls(false),
      timeline: [timelineEntry('Near miss reported', 'Maria Santos', hoursAgo(0.5))],
      people: [{ id: 'p-8', name: 'James Cole', role: 'driver', injuryStatus: 'none', welfareFollowUpRequired: false, isRestricted: false }],
      immediateActions: [],
      evidence: [],
      investigation: { scope: null, investigatorName: null, targetCompletionDate: null, confirmedFacts: [], disputedInformation: [], immediateCauses: [], contributingFactors: [], underlyingCauses: [], findingsSummary: null },
      regulatoryAssessments: [],
      correctiveActions: [],
      linkedDefectId: null,
      linkedCheckId: null,
      closureReason: null,
      closedBy: null,
      closedAt: null,
      vehicleStillOperational: true,
      driverStillAssigned: true,
    },
    {
      id: 'inc-6',
      incidentRef: 'INC-2026-006',
      title: 'Passenger manifest sent to wrong school',
      description: 'School transport manifest emailed to incorrect school contact. Contains pupil names and pickup addresses.',
      category: 'data_security',
      severity: 'high',
      status: 'awaiting_external',
      reportingSource: 'admin',
      reportedBy: 'Sarah Johnson',
      reportedAt: hoursAgo(20),
      occurredAt: hoursAgo(22),
      discoveredAt: hoursAgo(20),
      location: 'Command — remote',
      depotId: 'depot-wembley',
      depotName: 'Wembley Depot',
      ownerName: 'Data Protection Lead',
      ownerId: null,
      vehicleId: null,
      vehicleRegistration: null,
      fleetNumber: null,
      driverId: null,
      driverName: null,
      runReference: 'School Run 114',
      tripReference: null,
      bookingReference: null,
      isSafeguarding: false,
      isAcknowledged: true,
      acknowledgedAt: hoursAgo(19),
      acknowledgedBy: 'Sarah Johnson',
      confidentiality: 'data_protection',
      operationalSummary: 'Personal data sent to wrong recipient. DPO assessment in progress — 72-hour ICO clock running.',
      safetyControls: { ...defaultSafetyControls(true), evidencePreserved: true },
      timeline: [
        timelineEntry('Data breach discovered', 'Sarah Johnson', hoursAgo(20)),
        timelineEntry('DPO notified', 'System', hoursAgo(19.5), null, true),
        timelineEntry('ICO assessment started', 'Data Protection Lead', hoursAgo(19)),
      ],
      people: [],
      immediateActions: [
        { id: 'ia-8', action: 'Recipient asked to delete email', completedBy: 'Sarah Johnson', completedAt: hoursAgo(19.5), notes: 'Written confirmation received', confirmed: true },
        { id: 'ia-9', action: 'Access restricted', completedBy: 'IT Admin', completedAt: hoursAgo(19), notes: null, confirmed: true },
      ],
      evidence: [{ id: 'ev-5', kind: 'document', label: 'Email screenshot', uploadedBy: 'Sarah Johnson', uploadedAt: hoursAgo(19.8), confidentiality: 'data_protection', source: 'admin' }],
      investigation: {
        scope: 'How manifest was sent to wrong contact',
        investigatorName: 'Data Protection Lead',
        targetCompletionDate: daysAgo(-2),
        confirmedFacts: ['Manifest sent to wrong school email'],
        disputedInformation: [],
        immediateCauses: ['Incorrect contact selected'],
        contributingFactors: ['Similar school names in system'],
        underlyingCauses: [],
        findingsSummary: null,
      },
      regulatoryAssessments: [
        { id: 'reg-7', authority: 'ico', label: 'ICO assessment', potentiallyRequired: null, decision: null, decidedBy: null, decidedAt: null, deadline: hoursAgo(-52), externalReference: null, status: 'pending' },
      ],
      correctiveActions: [
        { id: 'ca-5', title: 'Contact verification procedure', description: 'Update manifest send workflow', actionType: 'policy_change', ownerName: 'Sarah Johnson', priority: 'high', dueDate: daysAgo(-5), status: 'open', completedAt: null },
      ],
      linkedDefectId: null,
      linkedCheckId: null,
      closureReason: null,
      closedBy: null,
      closedAt: null,
      vehicleStillOperational: false,
      driverStillAssigned: false,
      linkedEntities: {
        schoolId: 'sch-1',
        schoolName: 'Oakwood Primary School',
        contractId: 'con-1',
        contractName: 'Oakwood Primary 2025/26',
        passengerIds: ['pax-1', 'pax-2', 'pax-3'],
        passengerNames: ['Oliver Taylor', 'Amelia Chen', 'George Williams'],
        manifestId: 'mf-114',
        manifestLabel: 'School Run 114 manifest',
        manifestVersion: 3,
        manifestFrozen: true,
        customerId: 'cust-1',
        customerName: 'Oakwood Primary',
      },
      cctvAssets: defaultCctvAssetsForDepot('depot-wembley'),
      insurerSubmission: null,
      telematicsSnapshot: null,
    },
  ]
}

let incidents: StoredIncident[] = seedIncidents()
let incidentSettings: IncidentSettings = { ...DEFAULT_INCIDENT_SETTINGS }
let telematicsFeed: TelematicsIncidentFeedItem[] = seedTelematicsFeed()

export const mockIncidentsApi = {
  hub(): IncidentsHubData {
    this.ingestDriverQueue()
    return buildIncidentsHub(incidents, telematicsFeed)
  },

  /** Pull Driver-app reported incidents from the shared ingest bridge. */
  ingestDriverQueue(actorName = 'Driver app'): number {
    const queued = drainDriverIncidentsForAdmin()
    for (const input of queued) {
      this.report(input, input.driverName ?? actorName)
    }
    return queued.length
  },

  detail(id: string): IncidentDetailRecord | null {
    this.ingestDriverQueue()
    const inc = incidents.find((i) => i.id === id)
    if (!inc) return null
    return buildIncidentDetail(inc)
  },

  report(input: ReportIncidentHubInput, actorName: string): IncidentsHubData {
    if (input.updateType === 'completion' && input.driverReportMetadata) {
      const idx = incidents.findIndex(
        (incident) => incident.driverReport?.localIncidentId === input.driverReportMetadata!.localIncidentId,
      )
      if (idx >= 0) {
        const existing = incidents[idx]!
        incidents[idx] = {
          ...existing,
          description: input.description || existing.description,
          driverReport: input.driverReportMetadata,
          timeline: [
            ...existing.timeline,
            timelineEntry(
              'Driver completed follow-up report',
              actorName,
              now(),
              `${input.driverReportMetadata.completenessScore}% complete`,
            ),
          ],
          evidence: [
            ...existing.evidence,
            ...Object.keys(input.driverReportMetadata.originalAnswers)
              .filter((answerKey) => answerKey.startsWith('ev_'))
              .map((answerKey, i) => ({
                id: `ev-driver-${Date.now()}-${i}-${answerKey}`,
                kind: 'photo' as const,
                label: 'Driver evidence upload',
                uploadedBy: actorName,
                uploadedAt: now(),
                confidentiality: 'standard' as const,
                source: 'driver_app',
              })),
          ],
        }
        return this.hub()
      }
    }

    const id = `inc-${Date.now()}`
    const ref = incidentRef(id)
    const status = input.immediateDanger === 'yes' ? 'immediate_response' : 'awaiting_triage'
    const vehicle = input.vehicleId ? mockVehiclesApi.get(input.vehicleId) : null
    const immediateActions = (input.immediateActionsTaken ?? []).map((action, i) => ({
      id: `ia-new-${i}`,
      action,
      completedBy: actorName,
      completedAt: now(),
      notes: null,
      confirmed: true,
    }))

    let linkedDefectId: string | null = null
    if (input.createDefect && input.vehicleId) {
      const profile = mockVehiclesApi.reportDefect(
        input.vehicleId,
        {
          category: input.category === 'road_collision' || input.category === 'vehicle_damage' ? 'bodywork' : 'other',
          component: input.title.slice(0, 40),
          description: input.description,
          severity: input.severity === 'critical' || input.severity === 'high' ? 'major' : 'minor',
          source: 'incident',
          markVor: input.markVehicleVor,
        },
        actorName,
      )
      linkedDefectId = profile.defects[profile.defects.length - 1]?.id ?? null
    } else if (input.markVehicleVor && input.vehicleId) {
      mockVehiclesApi.markVor(input.vehicleId, { reason: input.description, category: input.category, defectId: linkedDefectId ?? undefined }, actorName)
    }

    const inc: StoredIncident = {
      id,
      incidentRef: ref,
      title: input.title,
      description: input.description,
      category: input.category,
      severity: input.severity,
      status,
      reportingSource: input.reportingSource ?? 'admin',
      reportedBy: actorName,
      reportedAt: now(),
      occurredAt: input.occurredAt,
      discoveredAt: now(),
      location: input.location,
      depotId: input.depotId ?? vehicle?.currentDepotId ?? 'depot-wembley',
      depotName: vehicle?.currentDepotName ?? (input.depotId === 'depot-croydon' ? 'Croydon Depot' : 'Wembley Depot'),
      ownerName: null,
      ownerId: null,
      vehicleId: input.vehicleId ?? null,
      vehicleRegistration: vehicle?.registrationNumber ?? null,
      fleetNumber: vehicle?.fleetNumber ?? null,
      driverId: input.driverId ?? null,
      driverName: input.driverName ?? null,
      runReference: input.runReference ?? null,
      tripReference: null,
      bookingReference: input.bookingReference ?? null,
      isSafeguarding: input.isSafeguarding ?? input.category === 'safeguarding',
      isAcknowledged: false,
      acknowledgedAt: null,
      acknowledgedBy: null,
      confidentiality: input.isSafeguarding ? 'safeguarding' : 'standard',
      operationalSummary: null,
      safetyControls: defaultSafetyControls(false),
      timeline: [
        timelineEntry('Incident reported', actorName, now(), input.reportingSource ?? 'admin'),
        ...(input.immediateDanger === 'yes' ? [timelineEntry('Immediate response activated', 'System', now(), null, true)] : []),
        ...(linkedDefectId ? [timelineEntry('Defect created from incident', 'System', now(), linkedDefectId, true)] : []),
      ],
      people: input.passengerInvolved
        ? [{ id: 'p-new', name: 'Passenger (details pending)', role: 'passenger' as const, injuryStatus: 'unknown' as const, welfareFollowUpRequired: true, isRestricted: false }]
        : [],
      immediateActions,
      evidence: [],
      investigation: { scope: null, investigatorName: null, targetCompletionDate: null, confirmedFacts: [], disputedInformation: [], immediateCauses: [], contributingFactors: [], underlyingCauses: [], findingsSummary: null },
      regulatoryAssessments: input.category === 'data_security'
        ? [{ id: `reg-${Date.now()}`, authority: 'ico', label: 'ICO assessment', potentiallyRequired: null, decision: null, decidedBy: null, decidedAt: null, deadline: new Date(Date.now() + 72 * 60 * 60_000).toISOString(), externalReference: null, status: 'pending' }]
        : [],
      correctiveActions: [],
      linkedDefectId,
      linkedCheckId: null,
      closureReason: null,
      closedBy: null,
      closedAt: null,
      vehicleStillOperational: !input.markVehicleVor,
      driverStillAssigned: true,
      linkedEntities: resolveLinkedEntities(input),
      cctvAssets: defaultCctvAssetsForDepot(input.depotId ?? vehicle?.currentDepotId ?? 'depot-wembley'),
      insurerSubmission: null,
      telematicsSnapshot: null,
      driverReport: input.driverReportMetadata,
    }
    incidents = [inc, ...incidents]
    emitIncidentEvent({
      type: 'incident.reported',
      incidentId: id,
      summary: `Incident reported: ${input.title}`,
      payload: { severity: input.severity, category: input.category },
      sourceApplication: 'command',
      actorName,
    })
    return this.hub()
  },

  acknowledge(input: AcknowledgeIncidentInput, actorName: string): IncidentDetailRecord {
    const idx = incidents.findIndex((i) => i.id === input.incidentId)
    if (idx < 0) throw new Error('Incident not found')
    const current = incidents[idx]!
    const updated: StoredIncident = {
      ...current,
      isAcknowledged: true,
      acknowledgedAt: now(),
      acknowledgedBy: actorName,
      status: current.status === 'immediate_response' ? 'immediate_response' : 'contained',
      safetyControls: { ...current.safetyControls, isContained: current.severity !== 'critical' },
      timeline: [...current.timeline, timelineEntry('Incident acknowledged', actorName, now(), input.notes)],
    }
    incidents[idx] = updated
    return buildIncidentDetail(updated)
  },

  assign(input: AssignIncidentInput, actorName: string): IncidentDetailRecord {
    const idx = incidents.findIndex((i) => i.id === input.incidentId)
    if (idx < 0) throw new Error('Incident not found')
    const current = incidents[idx]!
    const updated: StoredIncident = {
      ...current,
      ownerName: input.ownerName,
      status: current.status === 'awaiting_triage' || current.status === 'submitted' ? 'under_investigation' : current.status,
      timeline: [...current.timeline, timelineEntry('Incident assigned', actorName, now(), input.ownerName)],
      investigation: { ...current.investigation, investigatorName: input.ownerName },
    }
    incidents[idx] = updated
    return buildIncidentDetail(updated)
  },

  addUpdate(input: AddIncidentUpdateInput, actorName: string): IncidentDetailRecord {
    const idx = incidents.findIndex((i) => i.id === input.incidentId)
    if (idx < 0) throw new Error('Incident not found')
    const current = incidents[idx]!
    const updated: StoredIncident = {
      ...current,
      timeline: [...current.timeline, timelineEntry('Update added', actorName, now(), input.update)],
    }
    incidents[idx] = updated
    return buildIncidentDetail(updated)
  },

  addAction(input: AddIncidentActionInput, actorName: string): IncidentDetailRecord {
    const idx = incidents.findIndex((i) => i.id === input.incidentId)
    if (idx < 0) throw new Error('Incident not found')
    const current = incidents[idx]!
    const action = {
      id: `ca-${Date.now()}`,
      title: input.title,
      description: input.description,
      actionType: 'corrective',
      ownerName: input.ownerName,
      priority: input.priority,
      dueDate: input.dueDate,
      status: 'open' as const,
      completedAt: null,
    }
    const updated: StoredIncident = {
      ...current,
      status: 'corrective_actions_open',
      correctiveActions: [...current.correctiveActions, action],
      timeline: [...current.timeline, timelineEntry('Corrective action created', actorName, now(), input.title)],
    }
    incidents[idx] = updated
    return buildIncidentDetail(updated)
  },

  uploadEvidence(input: UploadIncidentEvidenceInput, actorName: string): IncidentDetailRecord {
    const idx = incidents.findIndex((i) => i.id === input.incidentId)
    if (idx < 0) throw new Error('Incident not found')
    const current = incidents[idx]!
    const item = {
      id: `ev-${Date.now()}`,
      kind: input.kind,
      label: input.label,
      uploadedBy: actorName,
      uploadedAt: now(),
      confidentiality: current.confidentiality === 'safeguarding' ? 'safeguarding' as const : 'standard' as const,
      source: 'command',
    }
    const updated: StoredIncident = {
      ...current,
      evidence: [...current.evidence, item],
      timeline: [...current.timeline, timelineEntry('Evidence uploaded', actorName, now(), input.label)],
    }
    incidents[idx] = updated
    return buildIncidentDetail(updated)
  },

  close(input: CloseIncidentInput, actorName: string): IncidentDetailRecord {
    const idx = incidents.findIndex((i) => i.id === input.incidentId)
    if (idx < 0) throw new Error('Incident not found')
    const current = incidents[idx]!
    const openCritical = current.correctiveActions.some((a) => a.status === 'open' || a.status === 'overdue')
    if (openCritical && current.severity === 'critical') {
      throw new Error('Critical corrective actions must be resolved before closure')
    }
    const updated: StoredIncident = {
      ...current,
      status: 'closed',
      closureReason: input.reason,
      closedBy: actorName,
      closedAt: now(),
      safetyControls: { ...current.safetyControls, isContained: true },
      timeline: [...current.timeline, timelineEntry('Incident closed', actorName, now(), input.notes ?? input.reason)],
    }
    incidents[idx] = updated
    return buildIncidentDetail(updated)
  },

  contain(input: ContainIncidentInput, actorName: string): IncidentDetailRecord {
    const idx = incidents.findIndex((i) => i.id === input.incidentId)
    if (idx < 0) throw new Error('Incident not found')
    const current = incidents[idx]!
    const updated: StoredIncident = {
      ...current,
      status: 'contained',
      safetyControls: {
        ...current.safetyControls,
        isContained: true,
        everyoneAccountedFor: input.everyoneAccountedFor ?? current.safetyControls.everyoneAccountedFor,
        vehicleSafe: input.vehicleSafe ?? current.safetyControls.vehicleSafe,
        driverFitToContinue: input.driverFitToContinue ?? current.safetyControls.driverFitToContinue,
        criticalContactsNotified: input.criticalContactsNotified ?? current.safetyControls.criticalContactsNotified,
        evidencePreserved: input.evidencePreserved ?? current.safetyControls.evidencePreserved,
      },
      timeline: [...current.timeline, timelineEntry('Incident contained', actorName, now(), input.notes)],
    }
    incidents[idx] = updated
    return buildIncidentDetail(updated)
  },

  escalate(input: EscalateIncidentInput, actorName: string): IncidentDetailRecord {
    const idx = incidents.findIndex((i) => i.id === input.incidentId)
    if (idx < 0) throw new Error('Incident not found')
    const current = incidents[idx]!
    const updated: StoredIncident = {
      ...current,
      severity: input.severity,
      status: input.severity === 'critical' ? 'immediate_response' : current.status,
      timeline: [...current.timeline, timelineEntry('Severity escalated', actorName, now(), `${current.severity} → ${input.severity}: ${input.reason}`)],
    }
    incidents[idx] = updated
    return buildIncidentDetail(updated)
  },

  reopen(input: ReopenIncidentInput, actorName: string): IncidentDetailRecord {
    const idx = incidents.findIndex((i) => i.id === input.incidentId)
    if (idx < 0) throw new Error('Incident not found')
    const current = incidents[idx]!
    const updated: StoredIncident = {
      ...current,
      status: 'reopened',
      closureReason: null,
      closedBy: null,
      closedAt: null,
      safetyControls: { ...current.safetyControls, isContained: false },
      timeline: [...current.timeline, timelineEntry('Incident reopened', actorName, now(), input.reason)],
    }
    incidents[idx] = updated
    return buildIncidentDetail(updated)
  },

  createDefect(input: CreateDefectFromIncidentInput, actorName: string): IncidentDetailRecord {
    const idx = incidents.findIndex((i) => i.id === input.incidentId)
    if (idx < 0) throw new Error('Incident not found')
    const current = incidents[idx]!
    if (!current.vehicleId) throw new Error('No vehicle linked to this incident')
    const profile = mockVehiclesApi.reportDefect(
      current.vehicleId,
      { category: 'bodywork', component: input.component, description: input.description, severity: 'major', source: 'incident' },
      actorName,
    )
    const defectId = profile.defects[profile.defects.length - 1]?.id ?? null
    const updated: StoredIncident = {
      ...current,
      linkedDefectId: defectId,
      timeline: [...current.timeline, timelineEntry('Defect created', actorName, now(), defectId)],
    }
    incidents[idx] = updated
    return buildIncidentDetail(updated)
  },

  markVehicleVor(input: MarkIncidentVehicleVorInput, actorName: string): IncidentDetailRecord {
    const idx = incidents.findIndex((i) => i.id === input.incidentId)
    if (idx < 0) throw new Error('Incident not found')
    const current = incidents[idx]!
    if (!current.vehicleId) throw new Error('No vehicle linked to this incident')
    mockVehiclesApi.markVor(current.vehicleId, { reason: input.reason, category: current.category, defectId: current.linkedDefectId ?? undefined }, actorName)
    const updated: StoredIncident = {
      ...current,
      vehicleStillOperational: false,
      safetyControls: { ...current.safetyControls, vehicleSafe: false },
      timeline: [...current.timeline, timelineEntry('Vehicle marked VOR', actorName, now(), input.reason)],
    }
    incidents[idx] = updated
    return buildIncidentDetail(updated)
  },

  recordRegulatoryDecision(input: RecordRegulatoryDecisionInput, actorName: string): IncidentDetailRecord {
    const idx = incidents.findIndex((i) => i.id === input.incidentId)
    if (idx < 0) throw new Error('Incident not found')
    const current = incidents[idx]!
    const updated: StoredIncident = {
      ...current,
      regulatoryAssessments: current.regulatoryAssessments.map((r) =>
        r.id === input.assessmentId
          ? {
              ...r,
              potentiallyRequired: input.potentiallyRequired,
              decision: input.decision,
              decidedBy: actorName,
              decidedAt: now(),
              externalReference: input.externalReference ?? r.externalReference,
              status: input.potentiallyRequired ? 'assessed' : 'not_required',
            }
          : r,
      ),
      timeline: [...current.timeline, timelineEntry('Regulatory assessment recorded', actorName, now(), input.decision)],
    }
    incidents[idx] = updated
    return buildIncidentDetail(updated)
  },

  updateInvestigation(input: UpdateInvestigationInput, actorName: string): IncidentDetailRecord {
    const idx = incidents.findIndex((i) => i.id === input.incidentId)
    if (idx < 0) throw new Error('Incident not found')
    const current = incidents[idx]!
    const updated: StoredIncident = {
      ...current,
      status: current.status === 'contained' || current.status === 'awaiting_triage' ? 'under_investigation' : current.status,
      investigation: {
        scope: input.scope ?? current.investigation.scope,
        investigatorName: input.investigatorName ?? current.investigation.investigatorName,
        targetCompletionDate: input.targetCompletionDate ?? current.investigation.targetCompletionDate,
        confirmedFacts: input.confirmedFacts ?? current.investigation.confirmedFacts,
        disputedInformation: input.disputedInformation ?? current.investigation.disputedInformation,
        immediateCauses: input.immediateCauses ?? current.investigation.immediateCauses,
        contributingFactors: input.contributingFactors ?? current.investigation.contributingFactors,
        underlyingCauses: input.underlyingCauses ?? current.investigation.underlyingCauses,
        findingsSummary: input.findingsSummary ?? current.investigation.findingsSummary,
      },
      timeline: [...current.timeline, timelineEntry('Investigation updated', actorName, now(), input.findingsSummary ?? 'Scope or causes updated')],
    }
    incidents[idx] = updated
    return buildIncidentDetail(updated)
  },

  updatePersonWelfare(input: UpdatePersonWelfareInput, actorName: string): IncidentDetailRecord {
    const idx = incidents.findIndex((i) => i.id === input.incidentId)
    if (idx < 0) throw new Error('Incident not found')
    const current = incidents[idx]!
    const updated: StoredIncident = {
      ...current,
      people: current.people.map((p) =>
        p.id === input.personId
          ? {
              ...p,
              injuryStatus: input.injuryStatus ?? p.injuryStatus,
              injuryDescription: input.injuryDescription ?? p.injuryDescription,
              firstAidProvided: input.firstAidProvided ?? p.firstAidProvided,
              ambulanceAttended: input.ambulanceAttended ?? p.ambulanceAttended,
              hospitalAttendance: input.hospitalAttendance ?? p.hospitalAttendance,
              contactNotified: input.contactNotified ?? p.contactNotified,
              welfareFollowUpRequired: input.welfareFollowUpRequired ?? p.welfareFollowUpRequired,
              hasMedicalDetails: input.medicalNotes != null || p.hasMedicalDetails,
              medicalNotes: input.medicalNotes ?? p.medicalNotes,
              vulnerabilityNotes: input.vulnerabilityNotes ?? p.vulnerabilityNotes,
            }
          : p,
      ),
      timeline: [...current.timeline, timelineEntry('Person record updated', actorName, now(), input.personId)],
    }
    incidents[idx] = updated
    return buildIncidentDetail(updated)
  },

  createFromTelematics(input: CreateTelematicsIncidentInput, actorName: string): IncidentsHubData {
    const vehicle = mockVehiclesApi.get(input.vehicleId)
    const severity = input.eventType === 'collision_detected' || input.eventType === 'rollover_detected' ? 'high' : 'near_miss'
    const category = input.eventType === 'collision_detected' ? 'road_collision' : 'near_miss'
    const title =
      input.eventType === 'collision_detected'
        ? 'Telematics collision alert'
        : input.eventType === 'rollover_detected'
          ? 'Telematics rollover alert'
          : 'Telematics harsh braking event'
    const hub = this.report(
      {
        immediateDanger: 'unknown',
        occurredAt: input.occurredAt,
        location: input.location,
        category,
        title,
        description: `Auto-created from telematics event ${input.telematicsReference}`,
        severity,
        reportingSource: 'telematics',
        vehicleId: input.vehicleId,
        driverId: input.driverId,
        driverName: vehicle ? undefined : undefined,
      },
      actorName,
    )
    if (shouldAutoBlockVehicle(severity, category) && input.vehicleId) {
      const created = incidents[0]
      if (created) {
        mockVehiclesApi.markVor(input.vehicleId, { reason: title, category }, actorName)
        incidents[0] = { ...created, vehicleStillOperational: false, driverStillAssigned: false }
      }
    }
    const rules = rulesForTelematicsEvent(input.eventType)
    if (incidents[0]) {
      const created = incidents[0]
      incidents[0] = {
        ...created,
        telematicsSnapshot: {
          eventType: input.eventType,
          reference: input.telematicsReference,
          occurredAt: input.occurredAt,
          latitude: null,
          longitude: null,
          speedMph: input.eventType === 'harsh_braking' ? 26 : null,
          preserved: true,
        },
        evidence: rules.length > 0
          ? [
              ...created.evidence,
              { id: `ev-tel-${Date.now()}`, kind: 'telematics', label: input.telematicsReference, uploadedBy: 'System', uploadedAt: now(), confidentiality: 'standard', source: 'telematics' },
            ]
          : created.evidence,
        timeline: rules.length > 0
          ? [...created.timeline, timelineEntry('Telematics automation applied', 'System', now(), rules.map((r) => r.name).join(', '), true)]
          : created.timeline,
      }
      emitIncidentEvent({
        type: 'incident.telematics_received',
        incidentId: created.id,
        summary: `Telematics event linked: ${input.telematicsReference}`,
        payload: { eventType: input.eventType, vehicleId: input.vehicleId },
        sourceApplication: 'telematics',
        actorName,
      })
    }
    return hub
  },

  linkEntities(input: LinkIncidentEntitiesInput, actorName: string): IncidentDetailRecord {
    const idx = incidents.findIndex((i) => i.id === input.incidentId)
    if (idx < 0) throw new Error('Incident not found')
    const current = incidents[idx]!
    const linkedEntities = resolveLinkedEntities(input, current.linkedEntities ?? emptyLinkedEntities())
    const updated: StoredIncident = {
      ...current,
      linkedEntities,
      bookingReference: input.bookingReference ?? current.bookingReference,
      timeline: [
        ...current.timeline,
        timelineEntry('Linked entities updated', actorName, now(), [
          linkedEntities.schoolName,
          linkedEntities.contractName,
          linkedEntities.manifestLabel,
        ].filter(Boolean).join(' · ') || 'Entities linked'),
      ],
    }
    incidents[idx] = updated
    emitIncidentEvent({
      type: 'incident.entities_linked',
      incidentId: current.id,
      summary: 'School, contract, or manifest links updated',
      payload: { schoolId: linkedEntities.schoolId, contractId: linkedEntities.contractId, manifestFrozen: linkedEntities.manifestFrozen },
      sourceApplication: 'command',
      actorName,
    })
    return buildIncidentDetail(updated)
  },

  requestCctvPreservation(input: RequestCctvPreservationInput, actorName: string): IncidentDetailRecord {
    const idx = incidents.findIndex((i) => i.id === input.incidentId)
    if (idx < 0) throw new Error('Incident not found')
    const current = incidents[idx]!
    const retentionHours = input.retentionHours ?? 72
    const preservedUntil = new Date(Date.now() + retentionHours * 60 * 60_000).toISOString()
    const asset = (current.cctvAssets ?? defaultCctvAssetsForDepot(current.depotId)).find((a) => a.id === input.assetId)
    if (!asset) throw new Error('CCTV asset not found')
    const cctvAssets = (current.cctvAssets ?? defaultCctvAssetsForDepot(current.depotId)).map((a) =>
      a.id === input.assetId
        ? { ...a, clipRequested: true, clipRequestedAt: now(), preservedUntil }
        : a,
    )
    const updated: StoredIncident = {
      ...current,
      cctvAssets,
      timeline: [...current.timeline, timelineEntry(`CCTV preservation requested — ${asset.label}`, actorName, now(), `Retained until ${new Date(preservedUntil).toLocaleString('en-GB')}`)],
    }
    incidents[idx] = updated
    emitIncidentEvent({
      type: 'incident.cctv_preserved',
      incidentId: current.id,
      summary: `CCTV clip preserved: ${asset.label}`,
      payload: { assetId: input.assetId, preservedUntil },
      sourceApplication: 'cctv',
      actorName,
    })
    return buildIncidentDetail(updated)
  },

  submitToInsurer(input: SubmitIncidentToInsurerInput, actorName: string): IncidentDetailRecord {
    const idx = incidents.findIndex((i) => i.id === input.incidentId)
    if (idx < 0) throw new Error('Incident not found')
    const current = incidents[idx]!
    const connector = INCIDENT_INSURER_CONNECTORS.find((c) => c.id === input.connectorId)
    if (!connector) throw new Error('Insurer connector not found')
    const base = current.insurerSubmission ?? defaultInsurerSubmission()
    const insurerSubmission = mockInsurerSubmit(
      { ...base, connectorId: connector.id, insurerName: connector.name },
      current.incidentRef,
    )
    const updated: StoredIncident = {
      ...current,
      insurerSubmission,
      timeline: [
        ...current.timeline,
        timelineEntry(`Submitted to ${connector.name}`, actorName, now(), insurerSubmission.externalReference),
      ],
    }
    incidents[idx] = updated
    emitIncidentEvent({
      type: 'incident.insurer_submitted',
      incidentId: current.id,
      summary: `Incident submitted to ${connector.name}`,
      payload: { connectorId: connector.id, externalReference: insurerSubmission.externalReference },
      sourceApplication: 'insurer',
      actorName,
    })
    return buildIncidentDetail(updated)
  },

  processTelematicsFeed(input: ProcessTelematicsFeedInput, actorName: string): IncidentsHubData {
    const item = telematicsFeed.find((f) => f.id === input.feedItemId)
    if (!item) throw new Error('Telematics feed item not found')
    if (item.processed) return this.hub()

    const hub = this.createFromTelematics(
      {
        vehicleId: item.vehicleId,
        driverId: item.driverId ?? undefined,
        eventType: item.eventType,
        location: item.location,
        occurredAt: item.occurredAt,
        telematicsReference: item.telematicsReference,
      },
      actorName,
    )
    const linkedId = incidents[0]?.id ?? null
    telematicsFeed = telematicsFeed.map((f) =>
      f.id === input.feedItemId ? { ...f, processed: true, linkedIncidentId: linkedId } : f,
    )
    return hub
  },

  driverIncidents(driverId: string): DriverIncidentSummary[] {
    return incidents
      .filter((i) => i.driverId === driverId)
      .map((i) => ({
        id: i.id,
        incidentRef: i.incidentRef,
        title: i.title,
        category: i.category,
        severity: i.severity,
        status: i.status,
        occurredAt: i.occurredAt,
        outcomeSummary: i.closureReason ?? i.operationalSummary,
        isAllegation: i.category === 'assault' || i.status === 'under_investigation',
        trainingActionRequired: i.correctiveActions.some((a) => a.actionType === 'driver_training' && a.status !== 'completed'),
      }))
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
  },

  getSettings(): IncidentSettings {
    return incidentSettings
  },

  updateSettings(settings: Partial<IncidentSettings>): IncidentSettings {
    incidentSettings = { ...incidentSettings, ...settings }
    return incidentSettings
  },

  list(): StoredIncident[] {
    return incidents
  },
}
