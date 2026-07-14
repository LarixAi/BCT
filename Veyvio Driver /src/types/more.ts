export type DriverApprovalStatus =
  | "approved"
  | "approval_pending"
  | "documents_required"
  | "temporarily_restricted"
  | "suspended"
  | "inactive";

export type DriverType =
  | "psv_driver"
  | "phv_driver"
  | "school_transport"
  | "escort"
  | "passenger_assistant";

export type ComplianceSeverity = "information" | "warning" | "critical";

export type DocumentStatus =
  | "missing"
  | "draft"
  | "uploaded"
  | "uploading"
  | "pending_review"
  | "approved"
  | "rejected"
  | "expiring_soon"
  | "expired"
  | "replaced";

export type DocumentTypeId =
  | "driving_licence"
  | "dbs_certificate"
  | "driver_cpc"
  | "right_to_work"
  | "medical_declaration"
  | "safeguarding_certificate";

export type DocumentSideId = "front" | "back" | "full";

export type DocumentSideStatus =
  | "missing"
  | "uploading"
  | "pending_review"
  | "approved"
  | "rejected";

export interface DocumentSideCapture {
  sideId: DocumentSideId;
  status: DocumentSideStatus;
  fileName?: string;
  capturedAt?: string;
}

export interface DriverIdentity {
  id: string;
  legalName: string;
  displayName: string;
  initials: string;
  approvalStatus: DriverApprovalStatus;
  driverType: DriverType;
  companyName: string;
  depotName: string;
  employmentStatus: string;
  startDate?: string;
  lineManager?: string;
  driverCategories: string[];
}

export interface ComplianceAlert {
  id: string;
  title: string;
  description: string;
  severity: ComplianceSeverity;
  documentId?: string;
  href: string;
}

export interface ComplianceDocument {
  id: string;
  name: string;
  documentTypeId: DocumentTypeId;
  category: string;
  status: DocumentStatus;
  expiryDate?: string;
  lastVerifiedDate?: string;
  reviewState?: string;
  actionRequired?: string;
  sides: DocumentSideCapture[];
  lastUploadedFileName?: string;
  lastUploadedAt?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  primaryPhone: string;
  alternativePhone?: string;
  notes?: string;
}

export interface PersonalInformation {
  legalName: string;
  displayName: string;
  dateOfBirth: string;
  mobile: string;
  email: string;
  homeAddress: string;
  preferredContact: "mobile" | "email";
  pronouns?: string;
  accessibilityNotes?: string;
}

export interface NotificationPreferences {
  tripChanges: boolean;
  tripCancellations: boolean;
  operationsMessages: boolean;
  vehicleCheckReminders: boolean;
  complianceAlerts: boolean;
  emergencyAlerts: boolean;
  announcements: boolean;
  sound: boolean;
  vibration: boolean;
  push: boolean;
  email: boolean;
}

export interface AccessibilityPreferences {
  textSize: "default" | "large" | "extra_large";
  highContrast: boolean;
  reduceMotion: boolean;
  largerTouchTargets: boolean;
  screenReaderOptimised: boolean;
  hapticFeedback: boolean;
  preferredLanguage: string;
  readAloud: boolean;
}

export interface OfflineSyncStatus {
  online: boolean;
  lastSyncedAt?: string;
  pendingUploads: number;
  pendingVehicleChecks: number;
  pendingDocuments: number;
  cachedTrips: number;
}

export interface DriverMorePayload {
  identity: DriverIdentity;
  personal: PersonalInformation;
  emergencyContact: EmergencyContact;
  complianceAlerts: ComplianceAlert[];
  documents: ComplianceDocument[];
  syncStatus: OfflineSyncStatus;
}

export interface MoreMenuItem {
  label: string;
  href: string;
  badge?: string | number;
  description?: string;
}

export interface MoreMenuSection {
  id: string;
  title: string;
  items: MoreMenuItem[];
}
