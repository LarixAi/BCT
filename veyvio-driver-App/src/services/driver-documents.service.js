import { getSupabaseClient } from "@/lib/supabase/client";
import { friendlyOnboardingError } from "@/lib/onboarding-errors";
import { OnboardingUploadError } from "@/lib/onboarding-upload-error";
import { normalizeDocumentStatus } from "@/lib/onboarding-status";
import { getCommandApiBaseUrl } from "@/lib/command-api";
import { hasAllRequiredDocuments, STEP_DOCUMENT_TYPES } from "@/lib/onboarding-document-requirements";
import {
  listDocumentsViaCommand,
  submitDocumentViaCommand,
} from "@/services/command-driver-ops.service";

/** Statuses that mean a file is on record for the driver UI. */
export const ON_FILE_DOC_STATUSES = new Set(["pending", "approved", "valid", "expiring_soon"]);

const DRIVER_DOC_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/octet-stream",
]);

function normalizeDriverDocMimeType(file) {
  const raw = String(file?.type ?? "").toLowerCase();
  if (DRIVER_DOC_MIME_TYPES.has(raw)) {
    if (raw === "application/octet-stream" || raw === "image/heic" || raw === "image/heif") {
      return "image/jpeg";
    }
    return raw;
  }
  if (!raw || raw === "image/jpg") return "image/jpeg";
  if (raw.startsWith("image/")) return "image/jpeg";
  if (raw === "application/pdf") return "application/pdf";
  const name = String(file?.name ?? "").toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".heic") || name.endsWith(".heif")) return "image/jpeg";
  return "image/jpeg";
}

async function readFileAsArrayBuffer(file) {
  if (typeof file.arrayBuffer === "function") {
    try {
      return await file.arrayBuffer();
    } catch {
      // Capacitor WebView sometimes throws — fall through to FileReader.
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the selected file"));
    reader.readAsArrayBuffer(file);
  });
}

async function readUploadFileBody(file) {
  if (!file) {
    throw new OnboardingUploadError("No file was selected. Please choose a photo or PDF and try again.", {
      phase: "storage",
      storageUploaded: false,
    });
  }

  const buffer = await readFileAsArrayBuffer(file);
  if (!buffer?.byteLength) {
    throw new OnboardingUploadError("The selected file appears empty. Please choose another photo and try again.", {
      phase: "storage",
      storageUploaded: false,
    });
  }

  return {
    body: buffer,
    contentType: normalizeDriverDocMimeType(file),
    safeName: String(file.name ?? "document.jpg").replace(/[^a-zA-Z0-9._-]/g, "_") || "document.jpg",
  };
}

async function getAuthenticatedUserId(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function logDriverDocumentAction(supabase, payload) {
  const actorUserId = await getAuthenticatedUserId(supabase);
  if (!actorUserId) return;
  const { error } = await supabase.from("fleet_audit_logs").insert({
    actor_portal: "driver",
    actor_user_id: actorUserId,
    ...payload,
  });
  if (error) console.warn("fleet_audit_logs insert failed:", error.message);
}

function isCameraStyleFilename(name) {
  return /^\d{10,}\.(jpe?g|png|webp|heic|heif)$/i.test(String(name ?? "").trim());
}

function friendlyDocumentTitle(documentType) {
  const label = String(documentType ?? "")
    .replace(/_/g, " ")
    .trim();
  return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : "Document";
}

export function documentDisplayName(doc) {
  if (!doc) return "";
  const explicit = doc.displayName && !isCameraStyleFilename(doc.displayName) ? doc.displayName : "";
  if (explicit) return explicit;

  const fromFileName = doc.file_name ?? doc.fileName ?? "";
  if (fromFileName && !isCameraStyleFilename(fromFileName)) return fromFileName;

  const segment = String(doc.storage_path ?? "").split("/").pop() ?? "";
  if (segment) {
    const dash = segment.indexOf("-");
    const tail = dash >= 0 ? segment.slice(dash + 1) : segment;
    if (tail && !isCameraStyleFilename(tail)) return tail;
  }

  return `${friendlyDocumentTitle(doc.document_type ?? doc.requirementType)} photo`;
}

export function mapDocumentRow(doc) {
  return {
    ...doc,
    reviewStatus: normalizeDocumentStatus(doc.status),
    displayName: documentDisplayName(doc),
  };
}

function mapCommandDocumentRow(doc) {
  const status = String(doc.verificationStatus ?? "uploaded");
  const mappedStatus =
    status === "verified"
      ? "approved"
      : status === "awaiting_review" || status === "uploaded"
        ? "pending"
        : status === "rejected"
          ? "rejected"
          : status === "expired" || status === "expiring_soon"
            ? status
            : "pending";

  return mapDocumentRow({
    id: doc.id,
    document_type: doc.requirementType,
    requirementType: doc.requirementType,
    verificationStatus: status,
    storage_path: doc.fileName ?? doc.label,
    file_name: doc.fileName ?? null,
    status: mappedStatus,
    created_at: doc.createdAt,
    expires_on: doc.expiryDate,
    rejection_reason: doc.rejectionReason,
    displayName: doc.fileName || doc.label,
    sourceApp: doc.sourceApp ?? "DRIVER",
  });
}

function findDocumentForStep(documents, stepKey) {
  const types = STEP_DOCUMENT_TYPES[stepKey] ?? [];
  return (documents ?? []).find((d) => types.includes(d.document_type)) ?? null;
}

/** Build onboarding hub maps from Command or legacy document rows. */
export function buildDriverDocumentMaps(documents) {
  const documentsByType = {};
  for (const doc of documents ?? []) {
    if (!ON_FILE_DOC_STATUSES.has(doc.status)) continue;
    if (!documentsByType[doc.document_type]) {
      documentsByType[doc.document_type] = { ...doc, displayName: documentDisplayName(doc) };
    }
  }

  const documentsByStep = {};
  for (const stepKey of Object.keys(STEP_DOCUMENT_TYPES)) {
    const doc = findDocumentForStep(documents, stepKey);
    documentsByStep[stepKey] =
      hasAllRequiredDocuments(stepKey, documentsByType) && doc && ON_FILE_DOC_STATUSES.has(doc.status)
        ? { ...doc, displayName: documentDisplayName(doc) }
        : null;
  }

  return { documentsByType, documentsByStep };
}

export async function loadDriverDocumentMaps(driverId) {
  const documents = await loadDriverDocuments(driverId);
  return { documents, ...buildDriverDocumentMaps(documents) };
}

export async function loadDriverDocuments(driverId) {
  const command = await listDocumentsViaCommand();
  if (command.ok) {
    return (command.documents ?? []).map(mapCommandDocumentRow);
  }

  const supabase = getSupabaseClient();

  const { data: rpcRows, error: rpcError } = await supabase.rpc("driver_list_own_documents");
  if (!rpcError) {
    const parsed = typeof rpcRows === "string" ? JSON.parse(rpcRows) : rpcRows;
    if (Array.isArray(parsed)) {
      return parsed.map(mapDocumentRow);
    }
  } else {
    console.warn("[driver-documents] driver_list_own_documents:", rpcError.message);
  }

  const { data, error } = await supabase
    .from("documents")
    .select("id, document_type, storage_path, status, created_at, expires_on")
    .eq("driver_id", driverId)
    .eq("bucket_id", "driver-documents")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapDocumentRow);
}

function resolveUploadTarget(driverOrId, organisationIdOrPayload, maybePayload) {
  if (typeof driverOrId === "object" && driverOrId?.id) {
    return { driver: driverOrId, payload: organisationIdOrPayload };
  }
  return {
    driver: { id: driverOrId, organisationId: organisationIdOrPayload },
    payload: maybePayload,
  };
}

/**
 * Upload or replace a driver onboarding document.
 * Always sets status to pending (pending_review semantically) — never approved.
 */
export async function uploadDriverDocument(driverOrId, organisationIdOrPayload, maybePayload) {
  const { driver, payload } = resolveUploadTarget(driverOrId, organisationIdOrPayload, maybePayload);
  const { documentType, file, expiryDate, referenceNumber } = payload ?? {};
  const { body, contentType, safeName } = await readUploadFileBody(file);

  const command = await submitDocumentViaCommand(
    {
      requirementType: documentType,
      documentType,
      label: String(documentType ?? "").replace(/_/g, " "),
      fileName: safeName,
      expiryDate: expiryDate ?? null,
      referenceNumber: referenceNumber ?? null,
      notes: "Submitted from Veyvio Driver for operator review.",
    },
    { body, contentType, fileName: safeName },
  );
  if (command.ok) {
    return {
      storagePath: command.document?.storagePath ?? null,
      documentType,
      reviewStatus: "pending_review",
      displayName: safeName,
      status: "pending",
      commandDocumentId: command.document?.id,
    };
  }

  if (getCommandApiBaseUrl()) {
    throw new OnboardingUploadError(command.message ?? "We couldn't upload your document. Please try again.", {
      phase: "storage",
      storageUploaded: false,
    });
  }

  const supabase = getSupabaseClient();
  const driverId = driver.id;
  const organisationId = driver.organisationId ?? null;

  const { data: pathResult, error: pathError } = await supabase.rpc("driver_build_document_storage_path", {
    p_document_type: documentType,
    p_filename: safeName,
  });

  if (pathError) {
    throw new OnboardingUploadError(friendlyOnboardingError(pathError, "upload"), {
      phase: "storage",
      storageUploaded: false,
      cause: pathError,
    });
  }

  if (pathResult?.ok === false) {
    throw new OnboardingUploadError(friendlyOnboardingError(new Error(pathResult.message ?? "Could not prepare upload"), "upload"), {
      phase: "storage",
      storageUploaded: false,
    });
  }

  const storagePath = pathResult?.storage_path;
  if (!storagePath) {
    throw new OnboardingUploadError("Could not prepare document upload. Please sign out and try again.", {
      phase: "storage",
      storageUploaded: false,
    });
  }

  const { error: uploadError } = await supabase.storage.from("driver-documents").upload(storagePath, body, {
    upsert: true,
    contentType,
  });
  if (uploadError) {
    throw new OnboardingUploadError(friendlyOnboardingError(uploadError, "upload"), {
      phase: "storage",
      storageUploaded: false,
      cause: uploadError,
    });
  }

  const { data: rpcResult, error: rpcError } = await supabase.rpc("driver_upsert_driver_document", {
    p_document_type: documentType,
    p_storage_path: storagePath,
    p_expires_on: null,
  });

  if (rpcError) {
    throw new OnboardingUploadError(friendlyOnboardingError(rpcError, "upload-metadata"), {
      phase: "metadata",
      storageUploaded: true,
      cause: rpcError,
    });
  }

  if (rpcResult?.ok === false) {
    throw new OnboardingUploadError(friendlyOnboardingError(new Error(rpcResult.message ?? "Could not save document"), "upload-metadata"), {
      phase: "metadata",
      storageUploaded: true,
    });
  }

  await logDriverDocumentAction(supabase, {
    organisation_id: pathResult.organisation_id ?? organisationId,
    entity_table: "documents",
    entity_id: pathResult.driver_id ?? driverId,
    action: "driver_document_uploaded",
    reason: `Uploaded ${documentType}`,
    metadata: { document_type: documentType, source: "driver_mobile", storage_path: storagePath, review_status: "pending_review" },
  });

  return { storagePath, documentType, reviewStatus: "pending_review", displayName: safeName, status: "pending" };
}

export async function markDocumentPendingReview(driverId, documentType) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("documents")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("driver_id", driverId)
    .eq("document_type", documentType)
    .eq("bucket_id", "driver-documents");
  if (error) throw error;
}
