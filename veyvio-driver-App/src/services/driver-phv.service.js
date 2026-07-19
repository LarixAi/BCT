import { getSupabaseClient } from "@/lib/supabase/client";
import { friendlyOnboardingError } from "@/lib/onboarding-errors";
import { OnboardingUploadError } from "@/lib/onboarding-upload-error";
import { VEHICLE_DOCUMENT_CHECKLIST } from "@/lib/vehicleDocumentChecklist";
import { hasCompletedVehicleCheckToday } from "@/services/vehicle-check.service";

const REQUIRED_PHV_DOC_TYPES = new Set(
  VEHICLE_DOCUMENT_CHECKLIST.filter((item) => !item.optional).flatMap((item) => item.documentTypes),
);

async function readFileAsArrayBuffer(file) {
  if (typeof file.arrayBuffer === "function") {
    try {
      return await file.arrayBuffer();
    } catch {
      // fall through
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsArrayBuffer(file);
  });
}

function normalizeMime(file) {
  const raw = String(file?.type ?? "").toLowerCase();
  if (raw === "application/pdf") return raw;
  if (raw.startsWith("image/")) return "image/jpeg";
  const name = String(file?.name ?? "").toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  return "image/jpeg";
}

export async function loadDriverPhvVehicle(driverId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select(
      "id, registration, make, model, vehicle_colour, phv_vehicle_licence_number, phv_vehicle_licence_expiry, can_be_used_for_phv, mot_expiry, insurance_expiry, hire_reward_insurance_expiry, status, dispatch_ready",
    )
    .eq("primary_driver_id", driverId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function loadDriverPhvCredentials(driverId) {
  const supabase = getSupabaseClient();
  const [{ data: driver }, { data: creds }] = await Promise.all([
    supabase
      .from("drivers")
      .select("phv_driver_licence_number, phv_driver_licence_expiry, license_no, can_do_private_hire")
      .eq("id", driverId)
      .maybeSingle(),
    supabase
      .from("driver_professional_credentials")
      .select("credential_type, credential_status, expiry_date")
      .eq("driver_id", driverId)
      .eq("credential_type", "PHV_PCO"),
  ]);

  return {
    driver,
    pcoCredential: creds?.[0] ?? null,
    pcoNumber: driver?.phv_driver_licence_number ?? driver?.license_no ?? null,
  };
}

export async function loadPhvVehicleDocuments(vehicleId) {
  if (!vehicleId) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, document_type, status, expires_on, created_at, storage_path")
    .eq("vehicle_id", vehicleId)
    .eq("bucket_id", "vehicle-documents")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertDriverPhvVehicle(driver, form) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("driver_upsert_phv_vehicle", {
    p_registration: form.registration,
    p_make: form.make,
    p_model: form.model,
    p_colour: form.colour || null,
    p_phv_vehicle_licence_number: form.phvVehicleLicenceNumber || null,
    p_phv_vehicle_licence_expiry: form.phvVehicleLicenceExpiry || null,
    p_seats: form.seats ? Number(form.seats) : 4,
  });

  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error(data?.message ?? "Could not save vehicle");
  return data;
}

export async function uploadPhvVehicleDocument(driver, vehicleId, { documentType, file, expiresOn = null }) {
  if (!vehicleId) throw new Error("Save your vehicle details first");

  const supabase = getSupabaseClient();
  const buffer = await readFileAsArrayBuffer(file);
  if (!buffer?.byteLength) throw new Error("The selected file is empty");

  const safeName = String(file.name ?? "document.jpg").replace(/[^a-zA-Z0-9._-]/g, "_") || "document.jpg";
  const storagePath = `${driver.organisationId}/${driver.id}/phv/${vehicleId}/${documentType}/${Date.now()}-${safeName}`;
  const contentType = normalizeMime(file);
  const now = new Date().toISOString();

  const { error: uploadError } = await supabase.storage.from("vehicle-documents").upload(storagePath, buffer, {
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

  const { data: driverRow } = await supabase
    .from("drivers")
    .select("home_depot_id")
    .eq("id", driver.id)
    .maybeSingle();

  const { error: docError } = await supabase.from("documents").insert({
    organisation_id: driver.organisationId,
    depot_id: driverRow?.home_depot_id ?? null,
    vehicle_id: vehicleId,
    document_type: documentType,
    bucket_id: "vehicle-documents",
    storage_path: storagePath,
    status: "pending",
    visibility: "admin_only",
    expires_on: expiresOn || null,
    created_at: now,
    updated_at: now,
  });

  if (docError) throw new Error(docError.message);
  return { storagePath, documentType };
}

export async function loadPcoComplianceStatus() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("driver_get_pco_compliance_status");
  if (error) throw new Error(error.message);
  if (data?.ok === false) throw new Error(data.message ?? "Could not load PCO compliance status");
  return data;
}

export async function saveDriverPcoBadge({ pcoNumber, pcoExpiry }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("driver_save_pco_badge", {
    p_pco_number: pcoNumber,
    p_pco_expiry: pcoExpiry || null,
  });
  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error(data.message ?? "Could not save PCO badge");
  return data;
}

export async function submitPcoComplianceForReview() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("driver_submit_pco_compliance_for_review");
  if (error) throw new Error(error.message);
  if (!data?.ok) {
    const missing = Array.isArray(data?.missing_items) ? data.missing_items.join("; ") : data?.message;
    throw new Error(missing ?? "Could not submit for review");
  }
  return data;
}

export async function evaluatePcoSubmissionReadiness(status) {
  const missing = status?.missing_items ?? [];
  const submission = status?.submission;
  const canSubmit = Boolean(status?.can_submit);
  const awaitingReview = submission?.status === "submitted";
  const approved = submission?.status === "approved";
  const rejected = submission?.status === "rejected" || submission?.status === "changes_requested";

  return {
    canSubmit,
    awaitingReview,
    approved,
    rejected,
    missing,
    submission,
    blockers: missing,
  };
}
export async function evaluatePcoDispatchReadiness(driver) {
  const [vehicle, credentials, complianceStatus] = await Promise.all([
    loadDriverPhvVehicle(driver.id),
    loadDriverPhvCredentials(driver.id),
    loadPcoComplianceStatus().catch(() => null),
  ]);

  const checkDone = vehicle
    ? await hasCompletedVehicleCheckToday(driver, { vehicleId: vehicle.id })
    : false;

  const blockers = [];
  const warnings = [];

  if (!credentials.driver?.can_do_private_hire) {
    blockers.push("PCO private hire is not enabled on your profile — contact your operator.");
  }
  if (!credentials.pcoNumber) {
    blockers.push("Add your TfL PCO driver badge number.");
  }

  const submission = complianceStatus?.submission;
  if (!submission || submission.status !== "approved") {
    if (submission?.status === "submitted") {
      blockers.push("Your PCO package is awaiting compliance review.");
    } else if (submission?.status === "rejected" || submission?.status === "changes_requested") {
      blockers.push("Update your PCO documents and submit again for review.");
    } else {
      blockers.push("Submit your PCO badge, vehicle and documents for compliance review.");
    }
  }

  if (vehicle && !vehicle.dispatch_ready) {
    blockers.push("Your PCO vehicle must be approved by compliance before going online.");
  }

  if (!vehicle) {
    blockers.push("Register your PCO vehicle below.");
  } else {
    if (!vehicle.phv_vehicle_licence_number) {
      blockers.push("Enter your vehicle PHV licence number.");
    }
    if (!vehicle.can_be_used_for_phv) {
      blockers.push("Vehicle is not marked for PCO private hire use.");
    }

    const docs = await loadPhvVehicleDocuments(vehicle.id);
    const uploadedTypes = new Set(docs.map((d) => d.document_type));
    for (const docType of REQUIRED_PHV_DOC_TYPES) {
      if (!uploadedTypes.has(docType)) {
        blockers.push(`Upload ${docType.replace(/_/g, " ")}.`);
      }
    }
  }

  if (!checkDone) {
    blockers.push("Complete today's vehicle check on your PCO vehicle before going online.");
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    vehicle,
    credentials,
    checkDone,
    complianceStatus,
  };
}

/** @deprecated use evaluatePcoDispatchReadiness */
export const evaluatePhvGoOnlineReadiness = evaluatePcoDispatchReadiness;

export const PHV_VEHICLE_DOC_OPTIONS = VEHICLE_DOCUMENT_CHECKLIST.filter((item) => !item.optional).map((item) => ({
  value: item.documentTypes[0],
  label: item.shortLabel,
  description: item.description,
}));
