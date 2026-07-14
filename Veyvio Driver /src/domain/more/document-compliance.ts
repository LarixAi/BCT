import { getDocumentTypeDefinition } from "@/domain/more/document-catalog";
import type {
  ComplianceDocument,
  DocumentSideCapture,
  DocumentSideId,
  DocumentSideStatus,
  DocumentStatus,
  DocumentTypeId,
} from "@/types/more";

const SUBMITTED_SIDE_STATUSES: DocumentSideStatus[] = [
  "uploading",
  "pending_review",
  "approved",
];

export function createEmptySides(typeId: DocumentTypeId): DocumentSideCapture[] {
  return getDocumentTypeDefinition(typeId).sides
    .filter((side) => side.required)
    .map((side) => ({ sideId: side.id, status: "missing" as const }));
}

export function ensureDocumentSides(document: ComplianceDocument): ComplianceDocument {
  if (document.sides.length > 0) return document;
  return { ...document, sides: createEmptySides(document.documentTypeId) };
}

export function getRequiredSides(typeId: DocumentTypeId) {
  return getDocumentTypeDefinition(typeId).sides.filter((side) => side.required);
}

export function getCaptureProgress(document: ComplianceDocument) {
  const required = getRequiredSides(document.documentTypeId);
  const submitted = required.filter((side) => {
    const capture = document.sides.find((item) => item.sideId === side.id);
    return capture && SUBMITTED_SIDE_STATUSES.includes(capture.status);
  });

  return {
    submitted: submitted.length,
    required: required.length,
    label:
      required.length > 1
        ? `${submitted.length} of ${required.length} sides captured`
        : submitted.length > 0
          ? "Evidence captured"
          : "Evidence required",
  };
}

export function documentNeedsEvidence(document: ComplianceDocument): boolean {
  if (["missing", "rejected", "expired", "draft"].includes(document.status)) return true;
  if (document.status === "expiring_soon") return true;
  if (document.actionRequired) return true;

  const progress = getCaptureProgress(document);
  return progress.submitted < progress.required;
}

export function getDocumentActionRequired(document: ComplianceDocument): string | undefined {
  if (!documentNeedsEvidence(document)) return undefined;

  const typeDef = getDocumentTypeDefinition(document.documentTypeId);
  const progress = getCaptureProgress(document);

  if (document.status === "rejected") {
    return "Resubmit evidence — office could not approve last upload";
  }

  if (document.status === "expired") {
    return `Upload renewed ${typeDef.category.toLowerCase()} evidence`;
  }

  if (progress.submitted === 0) {
    return typeDef.captureLabel;
  }

  if (progress.submitted < progress.required) {
    const missing = typeDef.sides
      .filter((side) => side.required)
      .filter((side) => {
        const capture = document.sides.find((item) => item.sideId === side.id);
        return !capture || !SUBMITTED_SIDE_STATUSES.includes(capture.status);
      })
      .map((side) => side.label.toLowerCase());

    return `Still needed: ${missing.join(" and ")}`;
  }

  if (document.status === "expiring_soon") {
    return "Renewal evidence awaiting review";
  }

  return undefined;
}

export function deriveDocumentStatus(document: ComplianceDocument): DocumentStatus {
  const required = getRequiredSides(document.documentTypeId);
  const captures = required.map(
    (side) => document.sides.find((item) => item.sideId === side.id)?.status ?? "missing",
  );

  if (captures.some((status) => status === "rejected")) return "rejected";
  if (captures.some((status) => status === "uploading")) return "uploading";

  const allSubmitted = captures.every((status) => SUBMITTED_SIDE_STATUSES.includes(status));
  const allApproved = captures.every((status) => status === "approved");
  const anyPending = captures.some((status) => status === "pending_review");

  if (allApproved) {
    if (document.status === "expiring_soon" || document.status === "expired") {
      return document.status;
    }
    return "approved";
  }

  if (allSubmitted && anyPending) return "pending_review";
  if (captures.some((status) => SUBMITTED_SIDE_STATUSES.includes(status))) return "draft";

  if (document.status === "expired") return "expired";
  if (document.status === "expiring_soon") return "expiring_soon";
  return "missing";
}

export function deriveReviewState(document: ComplianceDocument): string | undefined {
  const status = deriveDocumentStatus(document);
  const progress = getCaptureProgress(document);

  if (status === "uploading") return "Uploading evidence to operations…";
  if (status === "pending_review") return "Awaiting office review";
  if (status === "rejected") return "Office requested new evidence";
  if (status === "approved") return "Approved on file";
  if (progress.submitted > 0 && progress.submitted < progress.required) {
    return `${progress.label} — submit remaining sides`;
  }
  if (document.status === "expiring_soon") return "Renewal evidence needed before expiry";
  return undefined;
}

export function applyDocumentCompliance(document: ComplianceDocument): ComplianceDocument {
  const withSides = ensureDocumentSides(document);
  const status = deriveDocumentStatus(withSides);
  return {
    ...withSides,
    status,
    reviewState: deriveReviewState(withSides),
    actionRequired: getDocumentActionRequired(withSides),
  };
}

export function updateDocumentSide(
  document: ComplianceDocument,
  sideId: DocumentSideId,
  patch: Partial<DocumentSideCapture>,
): ComplianceDocument {
  const withSides = ensureDocumentSides(document);
  const sides = withSides.sides.map((side) =>
    side.sideId === sideId ? { ...side, ...patch } : side,
  );

  const missingSide = getRequiredSides(withSides.documentTypeId).find(
    (side) => side.id === sideId,
  );
  if (missingSide && !sides.some((side) => side.sideId === sideId)) {
    sides.push({ sideId, status: "missing", ...patch });
  }

  return applyDocumentCompliance({ ...withSides, sides });
}

export function allRequiredSidesSubmitted(document: ComplianceDocument): boolean {
  const progress = getCaptureProgress(document);
  return progress.submitted >= progress.required;
}
