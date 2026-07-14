import type { ComplianceDocument, DocumentSideCapture, DocumentTypeId, DriverMorePayload } from "@/types/more";
import { applyDocumentCompliance } from "@/domain/more/document-compliance";

function approvedSides(
  frontFile: string,
  backFile?: string,
): DocumentSideCapture[] {
  const capturedAt = "2025-01-10T09:00:00.000Z";
  const sides: DocumentSideCapture[] = [
    { sideId: "front", status: "approved", fileName: frontFile, capturedAt },
  ];
  if (backFile) {
    sides.push({ sideId: "back", status: "approved", fileName: backFile, capturedAt });
  }
  return sides;
}

function renewalSides(typeId: DocumentTypeId): DocumentSideCapture[] {
  if (typeId === "driving_licence" || typeId === "driver_cpc") {
    return [
      { sideId: "front", status: "missing" },
      { sideId: "back", status: "missing" },
    ];
  }
  return [{ sideId: "full", status: "missing" }];
}

function buildDocument(
  document: Omit<ComplianceDocument, "sides"> & { sides?: DocumentSideCapture[] },
): ComplianceDocument {
  return applyDocumentCompliance({
    ...document,
    sides: document.sides ?? renewalSides(document.documentTypeId),
  });
}

export function buildMockDriverMore(): DriverMorePayload {
  const documents: ComplianceDocument[] = [
    buildDocument({
      id: "doc_licence",
      name: "Driving licence",
      documentTypeId: "driving_licence",
      category: "Licence",
      status: "expiring_soon",
      expiryDate: "2026-08-02",
      lastVerifiedDate: "2025-08-02",
      sides: renewalSides("driving_licence"),
    }),
    buildDocument({
      id: "doc_dbs",
      name: "DBS certificate",
      documentTypeId: "dbs_certificate",
      category: "Safeguarding",
      status: "expiring_soon",
      expiryDate: "2026-09-15",
      lastVerifiedDate: "2023-09-15",
      sides: renewalSides("dbs_certificate"),
    }),
    buildDocument({
      id: "doc_cpc",
      name: "Driver CPC",
      documentTypeId: "driver_cpc",
      category: "Qualification",
      status: "approved",
      expiryDate: "2027-11-20",
      lastVerifiedDate: "2025-11-20",
      sides: approvedSides("cpc-front.jpg", "cpc-back.jpg"),
    }),
    buildDocument({
      id: "doc_rtw",
      name: "Right-to-work evidence",
      documentTypeId: "right_to_work",
      category: "Compliance",
      status: "approved",
      lastVerifiedDate: "2025-01-10",
      sides: approvedSides("rtw-passport.jpg"),
    }),
    buildDocument({
      id: "doc_medical",
      name: "Medical declaration",
      documentTypeId: "medical_declaration",
      category: "Fitness to drive",
      status: "approved",
      expiryDate: "2026-12-01",
      lastVerifiedDate: "2024-12-01",
      sides: approvedSides("medical-declaration.pdf"),
    }),
    buildDocument({
      id: "doc_safeguarding",
      name: "Safeguarding certificate",
      documentTypeId: "safeguarding_certificate",
      category: "Training",
      status: "approved",
      expiryDate: "2026-06-30",
      lastVerifiedDate: "2024-06-30",
      sides: approvedSides("safeguarding-cert.jpg"),
    }),
  ];

  return {
    identity: {
      id: "DRV-1048",
      legalName: "Larone Laing",
      displayName: "Larone",
      initials: "LL",
      approvalStatus: "approved" as const,
      driverType: "school_transport" as const,
      companyName: "Ridgeway School Transport",
      depotName: "Wembley Depot",
      employmentStatus: "Approved contractor",
      startDate: "2024-03-12",
      lineManager: "Operations — Wembley",
      driverCategories: ["School transport", "Accessible minibus"],
    },
    personal: {
      legalName: "Larone Laing",
      displayName: "Larone",
      dateOfBirth: "12 August 1989",
      mobile: "+44 7700 900482",
      email: "larone.laing@example.com",
      homeAddress: "14 Meadow Lane, Wembley, HA9 8PQ",
      preferredContact: "mobile" as const,
      pronouns: "He/him",
    },
    emergencyContact: {
      name: "Jordan Laing",
      relationship: "Spouse",
      primaryPhone: "+44 7700 900123",
      alternativePhone: "+44 20 7946 0958",
      notes: "Available evenings and weekends",
    },
    complianceAlerts: [
      {
        id: "alert_licence",
        title: "Driving licence expires soon",
        description: "Upload renewed front and back images before 2 Aug 2026.",
        severity: "warning" as const,
        documentId: "doc_licence",
        href: "/more/documents/doc_licence",
      },
      {
        id: "alert_dbs",
        title: "DBS certificate requires renewal",
        description: "Upload your renewed DBS certificate for office review.",
        severity: "warning" as const,
        documentId: "doc_dbs",
        href: "/more/documents/doc_dbs",
      },
    ],
    documents,
    syncStatus: {
      online: true,
      lastSyncedAt: new Date().toISOString(),
      pendingUploads: 0,
      pendingVehicleChecks: 1,
      pendingDocuments: 0,
      cachedTrips: 4,
    },
  };
}

export function buildCompliantDriverMore(): DriverMorePayload {
  const base = buildMockDriverMore();
  return {
    ...base,
    complianceAlerts: [],
    documents: base.documents.map((document) =>
      document.id === "doc_licence" || document.id === "doc_dbs"
        ? applyDocumentCompliance({
            ...document,
            status: "approved",
            sides:
              document.documentTypeId === "driving_licence"
                ? approvedSides("licence-front.jpg", "licence-back.jpg")
                : approvedSides("dbs-certificate.pdf"),
          })
        : document,
    ),
    syncStatus: { ...base.syncStatus, pendingVehicleChecks: 0, pendingUploads: 0 },
  };
}

export function getDocumentById(documentId: string): ComplianceDocument | undefined {
  return buildMockDriverMore().documents.find((document) => document.id === documentId);
}

export const DEFAULT_NOTIFICATION_PREFS = {
  tripChanges: true,
  tripCancellations: true,
  operationsMessages: true,
  vehicleCheckReminders: true,
  complianceAlerts: true,
  emergencyAlerts: true,
  announcements: true,
  sound: true,
  vibration: true,
  push: true,
  email: false,
};

export const DEFAULT_ACCESSIBILITY_PREFS = {
  textSize: "default" as const,
  highContrast: false,
  reduceMotion: false,
  largerTouchTargets: false,
  screenReaderOptimised: false,
  hapticFeedback: true,
  preferredLanguage: "en-GB",
  readAloud: false,
};
