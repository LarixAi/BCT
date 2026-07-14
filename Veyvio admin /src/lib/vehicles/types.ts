/** Vehicle domain types — separate status dimensions per Veyvio Vehicle Management spec. */

export type LifecycleStatus =
  | 'draft'
  | 'awaiting_onboarding'
  | 'active'
  | 'temporarily_inactive'
  | 'sold'
  | 'returned_to_lessor'
  | 'written_off'
  | 'archived'

export type VehicleOperationalStatus =
  | 'available'
  | 'allocated'
  | 'in_service'
  | 'returning_to_depot'
  | 'awaiting_driver'
  | 'reserved'
  | 'vor'
  | 'under_inspection'
  | 'in_workshop'
  | 'awaiting_parts'
  | 'awaiting_recovery'

export type VehicleComplianceStatus =
  | 'compliant'
  | 'warning'
  | 'expiring_soon'
  | 'non_compliant'
  | 'not_applicable'
  | 'awaiting_verification'

export type YardStatus =
  | 'in_yard'
  | 'at_bay'
  | 'checked_out'
  | 'checked_in'
  | 'off_site_parking'
  | 'workshop'
  | 'recovery_compound'
  | 'external_contractor'
  | 'unknown_location'

export type ReadinessStatus =
  | 'ready'
  | 'cleaning_required'
  | 'fuelling_required'
  | 'charging_required'
  | 'equipment_replenishment_required'
  | 'deep_clean_required'
  | 'biohazard_clean_required'

export type ReleaseDecision =
  | 'released'
  | 'released_with_warning'
  | 'restricted_use'
  | 'blocked'
  | 'manual_authorisation_required'

export type FuelType = 'diesel' | 'petrol' | 'electric' | 'hybrid' | 'hydrogen'

export type OwnershipType = 'owned' | 'leased' | 'hire_purchase' | 'rental'

export type VehicleCategory = 'minibus' | 'accessible' | 'coach' | 'car' | 'mpv' | 'van'

export type DocumentVerificationStatus =
  | 'not_supplied'
  | 'uploaded'
  | 'awaiting_review'
  | 'verified'
  | 'rejected'
  | 'expired'

export type VehicleRestrictionType =
  | 'no_school'
  | 'no_wheelchair'
  | 'depot_only'
  | 'day_shift_only'
  | 'contract_only'

export interface VehicleCapability {
  key: string
  label: string
  enabled: boolean
}

export interface VehicleDocument {
  id: string
  requirementType: string
  label: string
  referenceNumber: string | null
  issuingOrganisation: string | null
  issueDate: string | null
  expiryDate: string | null
  verificationStatus: DocumentVerificationStatus
  verifiedBy: string | null
  verifiedAt: string | null
  rejectionReason: string | null
  notes: string | null
  fileName: string | null
}

export interface VehicleRestriction {
  id: string
  type: VehicleRestrictionType
  label: string
  reason: string
  status: 'active' | 'lifted'
  createdAt: string
  createdBy: string
  liftedAt: string | null
  liftedBy: string | null
  defectId?: string | null
  expiresAt?: string | null
}

export interface VehicleAuditEvent {
  id: string
  action: string
  actor: string
  actorRole: string
  createdAt: string
  previousValue: string | null
  newValue: string | null
  reason: string | null
  sourceApplication?: string
}

export interface VehicleNote {
  id: string
  body: string
  createdAt: string
  createdBy: string
}

export interface VehicleVorRecord {
  id: string
  reason: string
  category: string
  defectId: string | null
  reportedAt: string
  reportedBy: string
  location: string | null
  recoveryRequired: boolean
  resolvedAt: string | null
  resolvedBy: string | null
  resolutionReason: string | null
}

export interface ReleaseFailure {
  code: string
  message: string
  severity: 'block' | 'warning'
  category: 'lifecycle' | 'operational' | 'compliance' | 'yard' | 'readiness' | 'defect' | 'maintenance' | 'allocation'
  sourceRecordId?: string | null
}

export interface VehicleReleaseResult {
  releaseDecision: ReleaseDecision
  failures: ReleaseFailure[]
  warnings: ReleaseFailure[]
  canAllocate: boolean
  canLeaveYard: boolean
  canAcceptPassengers: boolean
  summary: string
  evaluatedAt: string
}

export interface VehicleProfile {
  id: string
  reference: string
  registrationNumber: string
  previousRegistrations: string[]
  vin: string | null
  fleetNumber: string | null
  make: string
  model: string
  modelYear: number | null
  vehicleCategory: VehicleCategory
  colour: string | null
  ownershipType: OwnershipType
  ownerName: string | null
  homeDepotId: string
  homeDepotName: string
  currentDepotId: string
  currentDepotName: string
  currentLocationLabel: string | null
  parkingBay: string | null
  seatingCapacity: number
  wheelchairCapacity: number
  standingCapacity: number
  fuelType: FuelType
  fuelLevelPercent: number | null
  batteryLevelPercent: number | null
  mileage: number | null
  lifecycleStatus: LifecycleStatus
  operationalStatus: VehicleOperationalStatus
  complianceStatus: VehicleComplianceStatus
  yardStatus: YardStatus
  readinessStatus: ReadinessStatus
  releaseDecision: ReleaseDecision
  capabilities: VehicleCapability[]
  motExpiry: string | null
  insuranceExpiry: string | null
  taxExpiry: string | null
  tachographCalibrationExpiry: string | null
  wheelRetorqueDueAt: string | null
  currentDriverId: string | null
  currentDriverName: string | null
  currentRunId: string | null
  currentRunReference: string | null
  nextDriverName: string | null
  nextRunReference: string | null
  nextDepartureTime: string | null
  lastCheckAt: string | null
  lastCheckType: string | null
  nextMaintenanceDate: string | null
  nextMaintenanceMileage: number | null
  openDefectCount: number
  criticalDefectCount: number
  checksOverdue: boolean
  dateAddedToFleet: string
  documents: VehicleDocument[]
  restrictions: VehicleRestriction[]
  vorRecords: VehicleVorRecord[]
  notes: VehicleNote[]
  auditEvents: VehicleAuditEvent[]
  checks: VehicleCheckEntry[]
  defects: VehicleDefectEntry[]
  workOrders: MaintenanceWorkOrder[]
  downtimeEvents: VehicleDowntimeEvent[]
  wheelLayout: WheelPositionState[]
  retorqueTasks: WheelRetorqueTask[]
  equipment: VehicleEquipmentItem[]
  tachograph: TachographRecord | null
  onboarding: VehicleOnboardingState
  damageRecords: VehicleDamageRecord[]
  telematics: VehicleTelematics | null
  platformEvents: VehiclePlatformEvent[]
  release: VehicleReleaseResult
  nearestExpiryDate: string | null
  nearestExpiryLabel: string | null
  /** Legacy single status for dispatch/bookings consumers */
  status: string
  createdAt: string
  updatedAt: string
}

export interface VehicleDirectorySummary {
  totalActive: number
  availableNow: number
  currentlyAllocated: number
  inService: number
  vor: number
  inMaintenance: number
  checksOverdue: number
  complianceExpiring: number
  motDue: number
  tachographDue: number
  wheelRetorqueDue: number
  unknownLocation: number
}

export interface CreateVehicleInput {
  registrationNumber: string
  fleetNumber?: string
  vin?: string
  make: string
  model: string
  vehicleCategory: VehicleCategory
  homeDepotId: string
  seatingCapacity: number
  wheelchairCapacity?: number
  fuelType?: FuelType
  ownershipType?: OwnershipType
}

export interface UpdateVehicleInput {
  registrationNumber?: string
  fleetNumber?: string
  vin?: string
  make?: string
  model?: string
  vehicleCategory?: VehicleCategory
  homeDepotId?: string
  currentDepotId?: string
  seatingCapacity?: number
  wheelchairCapacity?: number
  fuelType?: FuelType
  mileage?: number
  parkingBay?: string
  currentLocationLabel?: string
}

export interface MarkVehicleVorInput {
  reason: string
  category: string
  defectId?: string
  location?: string
  recoveryRequired?: boolean
}

export interface UploadVehicleDocumentInput {
  requirementType: string
  label: string
  fileName: string
  referenceNumber?: string
  issueDate?: string
  expiryDate?: string
}

export interface JobVehicleContext {
  wheelchairRequired?: boolean
  schoolContract?: boolean
  minSeatingCapacity?: number
  requiredCapabilities?: string[]
}

// --- Phase 2: Checks & defects ---

export type DefectSeverity = 'advisory' | 'minor' | 'major' | 'dangerous'

export type DefectStatus = 'open' | 'vor' | 'awaiting_repair' | 'in_repair' | 'awaiting_verification' | 'closed'

export type VehicleCheckType =
  | 'driver_pre_use'
  | 'driver_changeover'
  | 'yard_return'
  | 'yard_release'
  | 'pmi'
  | 'specialist_lift'
  | 'specialist_restraint'

export interface VehicleCheckEntry {
  id: string
  checkType: VehicleCheckType
  checkDate: string
  result: 'pass' | 'fail' | 'pass_with_advisory'
  performedBy: string
  sourceApplication: 'driver' | 'yard' | 'maintenance' | 'command'
  mileage: number | null
  notes: string | null
  defectIds: string[]
}

export interface VehicleDefectEntry {
  id: string
  category: string
  component: string
  description: string
  severity: DefectSeverity
  status: DefectStatus
  source: string
  reportedBy: string
  reportedAt: string
  mileage: number | null
  location: string | null
  vorApplied: boolean
  closedAt: string | null
  closedBy: string | null
  closureReason: string | null
  triageStatus: DefectTriageStatus
  triagedBy: string | null
  triagedAt: string | null
  linkedWorkOrderId: string | null
  evidence?: DefectEvidenceStored[]
  symptoms?: string | null
  passengersOnboard?: boolean | null
  safeToMove?: boolean | null
  recoveryRequired?: boolean | null
  affectsAccessibility?: boolean | null
  repairSummary?: string | null
  repairCompletedAt?: string | null
  repairCompletedBy?: string | null
  verificationLevel?: 1 | 2 | 3 | 4 | null
  verifiedAt?: string | null
  verifiedBy?: string | null
  verificationResult?: 'pass' | 'fail' | null
  verificationNotes?: string | null
}

export interface DefectEvidenceStored {
  id: string
  kind: 'photo' | 'video' | 'document'
  label: string
  uploadedBy: string
  capturedAt: string
  source: string
}

export type DefectTriageStatus = 'pending' | 'validated' | 'duplicate' | 'deferred' | 'rejected'

export interface CreateVehicleDefectInput {
  category: string
  component: string
  description: string
  severity: DefectSeverity
  source?: string
  location?: string
  mileage?: number
  markVor?: boolean
  symptoms?: string
  passengersOnboard?: boolean
  safeToMove?: boolean
  recoveryRequired?: boolean
  affectsAccessibility?: boolean
}

export interface TriageDefectInput {
  triageStatus: DefectTriageStatus
  severity?: DefectSeverity
  notes?: string
  createWorkOrder?: boolean
  markVor?: boolean
}

export interface CompleteDefectRepairInput {
  diagnosis: string
  workPerformed: string
  repairType?: 'permanent' | 'temporary' | 'adjustment' | 'replacement' | 'monitoring' | 'no_fault_found'
  notes?: string
}

export interface VerifyDefectInput {
  result: 'pass' | 'fail'
  level: 1 | 2 | 3 | 4
  method: string
  notes?: string
}

export interface ApplyVehicleRestrictionInput {
  type: VehicleRestrictionType
  label: string
  reason: string
  defectId?: string
  expiresAt?: string
}

export interface YardCheckInOutInput {
  action: 'check_in' | 'check_out'
  parkingBay?: string
  mileage?: number
  fuelLevelPercent?: number
  batteryLevelPercent?: number
  notes?: string
}

// --- Phase 3: Maintenance ---

export type WorkOrderStatus =
  | 'requested'
  | 'awaiting_review'
  | 'approved'
  | 'scheduled'
  | 'vehicle_awaiting_workshop'
  | 'in_progress'
  | 'awaiting_parts'
  | 'awaiting_authorisation'
  | 'quality_check'
  | 'completed'
  | 'cancelled'

export interface WorkOrderPartLine {
  id: string
  partName: string
  partNumber: string | null
  quantity: number
  unitCost: number
  supplierId: string | null
}

export interface MaintenanceWorkOrder {
  id: string
  type: string
  title: string
  status: WorkOrderStatus
  scheduledDate: string | null
  targetCompletionDate: string | null
  completedDate: string | null
  provider: string | null
  estimatedCost: number | null
  actualCost: number | null
  labourCost: number | null
  partsCost: number | null
  labourHours: number | null
  defectId: string | null
  technicianName: string | null
  managerName: string | null
  creationSource: string
  diagnosis: string | null
  workCompleted: string | null
  notes: string | null
  roadTestRequired: boolean
  parts: WorkOrderPartLine[]
  returnToServiceApproved: boolean
  createdAt: string
  createdBy: string
}

export interface UpdateWorkOrderInput {
  status?: WorkOrderStatus
  technicianName?: string
  managerName?: string
  diagnosis?: string
  workCompleted?: string
  targetCompletionDate?: string
  labourHours?: number
  labourCost?: number
  partsCost?: number
  roadTestRequired?: boolean
}

export interface AddWorkOrderPartInput {
  partName: string
  partNumber?: string
  quantity: number
  unitCost: number
  supplierId?: string
}

export interface VehicleDowntimeEvent {
  id: string
  stage:
    | 'defect_reported'
    | 'vor_declared'
    | 'workshop_notified'
    | 'work_approved'
    | 'work_started'
    | 'parts_requested'
    | 'parts_received'
    | 'repair_completed'
    | 'inspection_completed'
    | 'released'
  occurredAt: string
  actorName: string | null
  notes: string | null
}

export interface CreateWorkOrderInput {
  type: string
  title: string
  scheduledDate?: string
  provider?: string
  defectId?: string
  notes?: string
}

export interface ReturnToServiceInput {
  reason: string
  postRepairCheckComplete: boolean
  wheelRetorqueComplete: boolean
  technicianSignOff: string
  checklist?: Record<string, boolean>
  repairType?: string
}

// --- Phase 5: Wheels & equipment ---

export interface WheelPositionState {
  position: string
  label: string
  tyreId: string | null
  treadDepthMm: number | null
  pressurePsi: number | null
  lastTorqueDate: string | null
  retorqueDueAt: string | null
  retorqueOverdue: boolean
  condition: 'good' | 'warning' | 'replace'
}

export interface WheelRetorqueTask {
  id: string
  positions: string[]
  initialTorqueAt: string
  dueAt: string
  completedAt: string | null
  technician: string
  status: 'pending' | 'completed' | 'overdue'
}

export interface VehicleEquipmentItem {
  id: string
  name: string
  category: 'fixed' | 'removable'
  assigned: boolean
  inDate: boolean
  serviceable: boolean
  expiryDate: string | null
  lastCheckedAt: string | null
}

// --- Phase 4: Tachograph ---

export interface TachographRecord {
  fitted: boolean
  type: 'analogue' | 'digital' | 'smart_gen1' | 'smart_gen2' | null
  make: string | null
  model: string | null
  serialNumber: string | null
  calibrationDate: string | null
  nextCalibrationDate: string | null
  calibrationCentre: string | null
  reviewRequired: boolean
  reviewReason: string | null
}

// --- Phase 6: Intelligence ---

export interface FleetIntelligenceSummary {
  totalVehicles: number
  averageDowntimeDays: number
  openDefects: number
  vorCount: number
  maintenanceSpendMtd: number
  checksPassRate: number
  firstTimeFixRate: number
  costPerMile: number
  vehiclesNeedingReplacement: number
}

export interface VehicleReleaseException {
  vehicleId: string
  reference: string
  registrationNumber: string
  releaseDecision: ReleaseDecision
  summary: string
  failures: ReleaseFailure[]
}

// --- Onboarding wizard ---

export type OnboardingStageId =
  | 'created'
  | 'identity_verified'
  | 'specification_complete'
  | 'documents_complete'
  | 'baseline_inspection'
  | 'equipment_inventory'
  | 'initial_inspection'
  | 'release_review'
  | 'approved'

export interface OnboardingStage {
  id: OnboardingStageId
  label: string
  description: string
  status: 'pending' | 'in_progress' | 'complete' | 'blocked'
  completedAt: string | null
  completedBy: string | null
}

export interface VehicleOnboardingState {
  currentStage: OnboardingStageId
  stages: OnboardingStage[]
  approvedAt: string | null
  approvedBy: string | null
}

// --- Body damage ---

export type DamageZone =
  | 'front_bumper'
  | 'bonnet'
  | 'windscreen'
  | 'roof'
  | 'driver_front'
  | 'driver_centre'
  | 'driver_rear'
  | 'passenger_front'
  | 'passenger_centre'
  | 'passenger_rear'
  | 'rear'
  | 'doors'
  | 'mirrors'
  | 'lights'
  | 'wheels'
  | 'interior'
  | 'wheelchair_area'

export type DamageClassification =
  | 'existing'
  | 'possible_deterioration'
  | 'likely_new'
  | 'unable_to_determine'

export interface VehicleDamageRecord {
  id: string
  zone: DamageZone
  zoneLabel: string
  description: string
  classification: DamageClassification
  severity: 'cosmetic' | 'minor' | 'moderate' | 'severe'
  reportedAt: string
  reportedBy: string
  sourceApplication: 'yard' | 'driver' | 'command' | 'maintenance'
  imageFileName: string | null
  imageDataUrl: string | null
  baseline: boolean
  linkedDefectId: string | null
}

export interface ReportDamageInput {
  zone: DamageZone
  description: string
  classification?: DamageClassification
  severity?: VehicleDamageRecord['severity']
  baseline?: boolean
  imageFileName?: string
  imageDataUrl?: string
}

export interface UpdateVehicleEquipmentInput {
  equipmentId: string
  assigned?: boolean
  serviceable?: boolean
  inDate?: boolean
}

export interface RecordVehicleCheckInput {
  checkType: VehicleCheckType
  result: 'pass' | 'fail' | 'pass_with_advisory'
  notes?: string
  mileage?: number
}

// --- Telematics ---

export interface VehicleTelematics {
  provider: string
  connected: boolean
  lastSyncAt: string | null
  latitude: number | null
  longitude: number | null
  speedMph: number | null
  heading: number | null
  ignitionOn: boolean
  odometerMiles: number | null
  fuelPercent: number | null
  batteryPercent: number | null
  gpsFreshnessSeconds: number | null
}

// --- Platform event bus ---

export type VehiclePlatformEventType =
  | 'vehicle.created'
  | 'vehicle.onboarding_completed'
  | 'vehicle.onboarding_stage_completed'
  | 'vehicle.location_changed'
  | 'vehicle.checked_out'
  | 'vehicle.checked_in'
  | 'vehicle.defect_reported'
  | 'vehicle.marked_vor'
  | 'vehicle.returned_to_service'
  | 'vehicle.damage_reported'
  | 'vehicle.release_blocked'
  | 'vehicle.telematics_synced'

export interface VehiclePlatformEvent {
  id: string
  type: VehiclePlatformEventType
  vehicleId: string
  summary: string
  payload: Record<string, string | number | boolean | null>
  sourceApplication: 'command' | 'yard' | 'driver' | 'maintenance' | 'telematics'
  actorName: string | null
  createdAt: string
}
