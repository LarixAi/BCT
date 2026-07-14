import type { IncidentCategoryCode } from "./categories";

export type IncidentSeverity = "critical" | "high" | "medium" | "low" | "near_miss";

export type IncidentStatus =
  | "draft"
  | "submitted"
  | "awaiting_triage"
  | "immediate_response"
  | "contained"
  | "under_investigation"
  | "awaiting_evidence"
  | "awaiting_external"
  | "corrective_actions_open"
  | "pending_final_review"
  | "closed"
  | "reopened"
  | "cancelled_duplicate";

export type ReportingChannel =
  | "driver_app"
  | "yard_app"
  | "staff_portal"
  | "admin"
  | "customer"
  | "school"
  | "police"
  | "telematics"
  | "anonymous";

export type ConfidentialityLevel =
  | "standard"
  | "restricted"
  | "safeguarding"
  | "medical"
  | "data_protection";

export type FieldSource = "DRIVER" | "ADMIN" | "SYSTEM" | "TELEMATICS" | "WITNESS";

export type FieldConfidence = "CONFIRMED" | "REPORTED" | "UNCONFIRMED";

export type TriStateAnswer = "yes" | "no" | "unknown" | "not_yet_confirmed" | "not_applicable";

export type ImmediateDangerStatus = "yes" | "emergency_contacted" | "no" | "unknown";

export type DriverReportStage = "draft" | "initial_submitted" | "completing" | "complete";

export type DriverFacingStatus =
  | "draft"
  | "sending"
  | "submitted"
  | "received_by_control"
  | "more_information_requested"
  | "under_review"
  | "action_being_taken"
  | "closed";

export interface IncidentFieldValue<T> {
  value: T;
  source: FieldSource;
  enteredByUserId?: string;
  enteredAt: string;
  confidence?: FieldConfidence;
}

export interface IncidentLocation {
  label: string;
  latitude?: number;
  longitude?: number;
  accuracyMetres?: number;
  driverConfirmed?: boolean;
}

export interface IncidentReporter {
  userId: string;
  driverId?: string;
  name: string;
  role: "driver" | "escort" | "staff" | "admin" | "customer" | "system";
}

export interface IncidentPerson {
  id: string;
  passengerId?: string;
  name: string;
  role: "passenger" | "driver" | "escort" | "staff" | "witness" | "third_party";
  injuryStatus?: TriStateAnswer;
  welfareNotes?: string;
}

export interface IncidentAction {
  id: string;
  action: string;
  completedAt: string;
  completedByUserId?: string;
  notes?: string;
}

export type EvidenceCategory =
  | "vehicle_damage_photo"
  | "location_photo"
  | "road_condition_photo"
  | "passenger_area_photo"
  | "video"
  | "dashcam_reference"
  | "witness_statement"
  | "driver_statement"
  | "police_document"
  | "other";

export interface IncidentEvidence {
  id: string;
  category: EvidenceCategory;
  mimeType: string;
  originalFilename?: string;
  captureTime: string;
  uploadTime?: string;
  uploadedByUserId: string;
  gps?: { latitude: number; longitude: number; accuracyMetres?: number };
  fileHash?: string;
  confidentialityLevel: ConfidentialityLevel;
  localOnly?: boolean;
}

export interface OperationalImpact {
  journeyCanContinue?: TriStateAnswer;
  reasonCannotContinue?: string;
  passengersOnboard?: TriStateAnswer;
  passengerCount?: number;
  vehicleSafePosition?: TriStateAnswer;
  vehicleDriveable?: TriStateAnswer;
}

export interface IncidentCorrection {
  id: string;
  fieldKey: string;
  previousSummary: string;
  correctionText: string;
  enteredByUserId: string;
  enteredAt: string;
}

export interface IncidentInformationRequest {
  id: string;
  prompt: string;
  fieldKey: string;
  options?: TriStateAnswer[];
  requestedAt: string;
  requestedByUserId: string;
  answeredAt?: string;
  answer?: IncidentFieldValue<unknown>;
}

export interface IncidentOperationalContext {
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehicleRegistration?: string;
  tripId?: string;
  runId?: string;
  runReference?: string;
  bookingId?: string;
  depotId?: string;
  depotName?: string;
  passengerManifest?: { passengerId: string; name: string }[];
  deviceId?: string;
  appVersion?: string;
  onlineAtSubmission?: boolean;
  lastVehicleCheckId?: string;
  openDefectIds?: string[];
}

export interface DriverIncidentSubmission {
  localIncidentId: string;
  idempotencyKey: string;
  categoryCode: IncidentCategoryCode;
  severity: IncidentSeverity;
  stage: DriverReportStage;
  schemaVersion: number;
  formDefinitionVersion: number;
  driverAppVersion: string;
  reportingChannel: ReportingChannel;
  occurredAt?: string;
  discoveredAt?: string;
  reportedAt: string;
  locallyCapturedAt?: string;
  location?: IncidentLocation;
  reporter: IncidentReporter;
  operationalContext: IncidentOperationalContext;
  contextConfirmed: boolean;
  summary: string;
  description?: string;
  immediateDanger: IncidentFieldValue<ImmediateDangerStatus>;
  emergencyAssistanceRequired?: IncidentFieldValue<TriStateAnswer>;
  injuryReported?: IncidentFieldValue<TriStateAnswer>;
  missingPersonReported?: IncidentFieldValue<TriStateAnswer>;
  fireOrSmoke?: IncidentFieldValue<TriStateAnswer>;
  answers: Record<string, IncidentFieldValue<unknown>>;
  peopleInvolved: IncidentPerson[];
  immediateActions: IncidentAction[];
  evidence: IncidentEvidence[];
  operationalImpact?: OperationalImpact;
  confidentialityLevel: ConfidentialityLevel;
  linkedDefectRequested?: boolean;
  linkedIncidentAndDefect?: boolean;
}

/** Core incident record shape — API persistence contract. */
export interface Incident {
  id: string;
  tenantId: string;
  incidentReference: string;
  categoryCode: IncidentCategoryCode;
  subcategoryCode?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  occurredAt?: string;
  discoveredAt?: string;
  reportedAt: string;
  acknowledgedAt?: string;
  location?: IncidentLocation;
  reporter: IncidentReporter;
  reportingChannel: ReportingChannel;
  driverId?: string;
  vehicleId?: string;
  tripId?: string;
  runId?: string;
  bookingId?: string;
  depotId?: string;
  summary: string;
  description?: string;
  immediateDangerStatus: ImmediateDangerStatus;
  emergencyServicesStatus?: TriStateAnswer;
  peopleInvolved: IncidentPerson[];
  immediateActions: IncidentAction[];
  evidence: IncidentEvidence[];
  operationalImpact?: OperationalImpact;
  confidentialityLevel: ConfidentialityLevel;
  driverReport?: {
    stage: DriverReportStage;
    completenessScore: number;
    formDefinitionVersion: number;
    schemaVersion: number;
    driverAppVersion: string;
    originalAnswers: Record<string, IncidentFieldValue<unknown>>;
    corrections: IncidentCorrection[];
    informationRequests: IncidentInformationRequest[];
    offlineCapture?: {
      occurredAt: string;
      locallySubmittedAt: string;
      connectionRestoredAt?: string;
      serverReceivedAt: string;
    };
  };
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
}

export const INCIDENT_SCHEMA_VERSION = 2;
export const INCIDENT_FORM_DEFINITION_VERSION = 1;
