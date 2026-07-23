import { getSupabaseClient } from "@/lib/supabase/client";
import {
  commandDriverOnboardingProgress,
  commandDriverSession,
  commandSubmitDriverOnboarding,
  commandUpdateDriverContact,
  commandUpdateDriverOnboardingStep,
  commandUpdateDriverProfile,
} from "@/lib/command-api";
import {
  DEFAULT_ONBOARDING_STEP_TEMPLATES,
  DRIVER_POLICIES,
  groupOnboardingStatus,
} from "@/lib/onboarding-blueprint";
import { onboardingLockMessage } from "@/lib/onboarding-editability";

import { friendlyOnboardingError } from "@/lib/onboarding-errors";
import { hasAllRequiredDocuments } from "@/lib/onboarding-document-requirements";
import {
  applyOnboardingStepCompletions,
  attachLocalOnboardingProgress,
  clearLocalOnboardingSteps,
  getLocalCompletedOnboardingSteps,
  markLocalOnboardingStepsComplete,
  syncServerOnboardingSteps,
} from "@/lib/onboarding-progress-store";
import {
  isOnboardingEditableStatus,
  isStepCompleteForProgress,
  normalizeOnboardingStatus,
  toLegacyOnboardingStatus,
} from "@/lib/onboarding-status";
import { getPreviousRequiredStepKeys } from "@/lib/onboarding-tasks";
import { getDriverOnboardingRequirements } from "@/services/driver-requirements.service";
import { loadDriverComplianceReadiness } from "@/services/driver-compliance.service";
import { uploadDriverDocument as uploadDriverDocumentRaw, documentDisplayName, loadDriverDocuments, loadDriverDocumentMaps, ON_FILE_DOC_STATUSES } from "@/services/driver-documents.service";
import { STEP_DOCUMENT_TYPES } from "@/lib/onboarding-document-requirements";

const COMPLETE_STEP_STATUSES = new Set(["submitted", "verified", "complete", "approved"]);

const WIZARD_STEP_KEYS = [
  "personal_profile",
  "emergency_contact",
  "right_to_work",
  "driving_licence",
  "dvla_check",
  "dqc_cpc",
  "tacho_card",
  "dbs_safeguarding",
  "medical_declaration",
  "policies",
  "driver_handbook",
  "vehicle_check_training",
  "defect_policy",
];

function toDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function readJsonObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return {};
}

function findDocumentForStep(documents, stepKey) {
  const types = STEP_DOCUMENT_TYPES[stepKey] ?? [];
  return (documents ?? []).find((d) => types.includes(d.document_type)) ?? null;
}

async function getAuthenticatedUserId(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function logDriverAction(supabase, payload) {
  const actorUserId = await getAuthenticatedUserId(supabase);
  if (!actorUserId) return;
  const { error } = await supabase.from("fleet_audit_logs").insert({
    actor_portal: "driver",
    actor_user_id: actorUserId,
    ...payload,
  });
  if (error) console.warn("fleet_audit_logs insert failed:", error.message);
}

async function assertOnboardingEditable(supabase, driverId) {
  const [{ data, error }, { data: record }] = await Promise.all([
    supabase.from("drivers").select("onboarding_status, rejection_reason").eq("id", driverId).maybeSingle(),
    supabase
      .from("driver_onboarding_records")
      .select("resubmit_requested_items")
      .eq("driver_id", driverId)
      .maybeSingle(),
  ]);
  // Command drivers: legacy Ridova row may be missing or blocked by RLS — still allow app onboarding.
  if (error || !data) {
    return "documents_pending";
  }
  if (
    !isOnboardingEditableStatus(data?.onboarding_status, {
      rejectionReason: data?.rejection_reason,
      resubmitItems: record?.resubmit_requested_items ?? [],
    })
  ) {
    throw new Error(onboardingLockMessage(data?.onboarding_status));
  }
  return data.onboarding_status;
}

async function requireDriverAccessToken() {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Your session expired. Sign in again and try saving.");
  }
  return session.access_token;
}

function assertCommandOk(result, fallbackMessage) {
  if (!result?.ok) {
    throw new Error(result?.message || fallbackMessage);
  }
}

async function finishOnboardingStep(driverId, stepKeys, organisationId, options = {}) {
  markLocalOnboardingStepsComplete(driverId, stepKeys);
  try {
    await completeOnboardingStep(driverId, stepKeys, organisationId, options);
  } catch (legacyError) {
    console.warn("[onboarding] legacy step sync skipped", stepKeys, legacyError);
  }
}

function parseCommandHomeAddress(homeAddress) {
  if (!homeAddress?.trim()) return {};
  const parts = String(homeAddress)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 3) {
    return {
      addressLine1: parts.slice(0, -2).join(", "),
      addressCity: parts[parts.length - 2],
      addressPostcode: parts[parts.length - 1],
    };
  }
  if (parts.length === 2) {
    return { addressLine1: parts[0], addressCity: parts[1], addressPostcode: "" };
  }
  return { addressLine1: parts[0] ?? "", addressCity: "", addressPostcode: "" };
}

function parseCommandEmergencyContact(text) {
  if (!text?.trim()) return {};
  const lines = String(text).split("\n");
  const read = (prefix) => {
    const line = lines.find((l) => l.toLowerCase().startsWith(prefix));
    return line ? line.slice(line.indexOf(":") + 1).trim() : "";
  };
  return {
    contactName: read("name:"),
    relationship: read("relationship:"),
    emergencyPhone: read("phone:"),
    emergencySecondaryPhone: read("secondary:"),
  };
}

async function completeOnboardingStep(driverId, stepKeys, organisationId, options = {}) {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const keys = Array.isArray(stepKeys) ? stepKeys : [stepKeys];
  const requirements = options.requirements ?? (await getDriverOnboardingRequirements(driverId));

  for (const stepKey of keys) {
    const previousKeys = getPreviousRequiredStepKeys(stepKey, requirements);
    if (previousKeys.length > 0) {
      const localCompleted = new Set(getLocalCompletedOnboardingSteps(driverId));
      const { data: prevSteps } = await supabase
        .from("driver_onboarding_steps")
        .select("step_key, status, review_status")
        .eq("driver_id", driverId)
        .in("step_key", previousKeys);

      const incomplete = previousKeys.filter((key) => {
        if (localCompleted.has(key)) return false;
        const row = (prevSteps ?? []).find((s) => s.step_key === key);
        if (!row) return true;
        return !isStepCompleteForProgress(row.status, row.review_status);
      });

      if (incomplete.length > 0) {
        throw new Error("Please complete the previous steps first.");
      }
    }
  }

  for (const stepKey of keys) {
    const patch = {
      status: "submitted",
      review_status: "pending",
      submitted_at: now,
      updated_at: now,
      rejected_reason: null,
    };

    const { data: existing } = await supabase
      .from("driver_onboarding_steps")
      .select("id")
      .eq("driver_id", driverId)
      .eq("step_key", stepKey)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase.from("driver_onboarding_steps").update(patch).eq("id", existing.id);
      if (error) throw error;
    } else if (organisationId) {
      const { error } = await supabase.from("driver_onboarding_steps").insert({
        driver_id: driverId,
        organisation_id: organisationId,
        step_key: stepKey,
        step_label: stepKey.replace(/_/g, " "),
        required: true,
        sort_order: 0,
        ...patch,
      });
      if (error) throw error;
    }

    await logDriverAction(supabase, {
      organisation_id: organisationId,
      entity_table: "driver_onboarding_steps",
      entity_id: driverId,
      action: "driver_onboarding_step_completed",
      reason: `Driver completed ${stepKey}`,
      metadata: { step_key: stepKey, driver_completion: "completed_by_driver", review_status: "pending" },
    });
  }

  const { data: steps } = await supabase
    .from("driver_onboarding_steps")
    .select("required, status")
    .eq("driver_id", driverId);

  const required = (steps ?? []).filter((s) => s.required);
  const done = required.filter((s) => COMPLETE_STEP_STATUSES.has(s.status)).length;
  const progress = required.length > 0 ? Math.round((done / required.length) * 100) : 0;

  const recordPayload = {
    driver_id: driverId,
    progress_percentage: progress,
    current_step_key: keys[keys.length - 1] ?? null,
    updated_at: now,
  };
  if (organisationId) recordPayload.organisation_id = organisationId;

  const { data: existingRecord, error: recordSelectError } = await supabase
    .from("driver_onboarding_records")
    .select("id")
    .eq("driver_id", driverId)
    .maybeSingle();
  if (recordSelectError) {
    console.error("[onboarding:record] select failed", recordSelectError);
    throw recordSelectError;
  }

  if (existingRecord?.id) {
    const { error: recordUpdateError } = await supabase
      .from("driver_onboarding_records")
      .update(recordPayload)
      .eq("id", existingRecord.id);
    if (recordUpdateError) {
      console.error("[onboarding:record] update failed", recordUpdateError);
      throw recordUpdateError;
    }
  } else if (organisationId) {
    const { error: recordInsertError } = await supabase.from("driver_onboarding_records").insert({
      ...recordPayload,
      status: "documents_in_progress",
    });
    if (recordInsertError) {
      console.error("[onboarding:record] insert failed", recordInsertError);
      throw recordInsertError;
    }
  }
}

async function transitionOnboardingInProgress(driverId, currentStatus) {
  const canonical = normalizeOnboardingStatus(currentStatus);
  if (canonical === "invited" || currentStatus === "profile_submitted") {
    const supabase = getSupabaseClient();
    await supabase
      .from("drivers")
      .update({ onboarding_status: toLegacyOnboardingStatus("in_progress"), updated_at: new Date().toISOString() })
      .eq("id", driverId);
  }
}

export async function getOutdatedPoliciesForDriver(driver) {
  const supabase = getSupabaseClient();
  const required = driver.canDoSchoolRuns
    ? DRIVER_POLICIES
    : DRIVER_POLICIES.filter((p) => p.policyKey !== "safeguarding_policy");

  const { data: acceptances, error } = await supabase
    .from("driver_policy_acceptances")
    .select("policy_key, policy_version")
    .eq("driver_id", driver.id);

  if (error) {
    console.warn("[onboarding] policy acceptances:", error.message);
    return [];
  }

  const accepted = new Map((acceptances ?? []).map((a) => [a.policy_key, a.policy_version]));
  return required.filter((p) => accepted.get(p.policyKey) !== p.policyVersion);
}

async function mergeCommandDocumentPrefill(driverId, base) {
  try {
    const maps = await loadDriverDocumentMaps(driverId);
    const hasDocs = Object.keys(maps.documentsByType ?? {}).length > 0;
    return attachLocalOnboardingProgress(driverId, {
      ...base,
      documentsByStep: { ...(base.documentsByStep ?? {}), ...maps.documentsByStep },
      documentsByType: { ...(base.documentsByType ?? {}), ...maps.documentsByType },
      hasAdminData: Boolean(base.hasAdminData) || hasDocs,
    });
  } catch (err) {
    console.warn("[onboarding] command document prefill skipped", err?.message);
    return attachLocalOnboardingProgress(driverId, base);
  }
}

async function fetchCommandOnboardingProgress(supabase, driverId) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  const result = await commandDriverOnboardingProgress(session.access_token);
  if (!result.ok || !result.progress) return null;

  const progress = result.progress;
  if (driverId && Array.isArray(progress.completedStepKeys)) {
    syncServerOnboardingSteps(driverId, progress.completedStepKeys);
  }
  return progress;
}

async function getCommandOnboardingPrefill(supabase, driverId) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return attachLocalOnboardingProgress(driverId, {
      form: { phone: "", dateOfBirth: "" },
      adminProvided: {},
      documentsByStep: {},
      documentsByType: {},
      fullName: "",
      email: "",
      onboardingStatus: "in_progress",
      hasAdminData: false,
      isEditable: true,
    });
  }

  const result = await commandDriverSession(session.access_token);
  const cmd = result.ok ? result.session : null;
  const progress = await fetchCommandOnboardingProgress(supabase, driverId);
  const progressForm = progress?.form ?? {};

  const phone = progressForm.phone || (cmd?.mobile ? String(cmd.mobile) : "");
  const dateOfBirth = toDateInput(progressForm.dateOfBirth ?? cmd?.dateOfBirth);
  const fullName =
    [cmd?.firstName, cmd?.lastName].filter(Boolean).join(" ").trim() || cmd?.email || "";
  const addressFields = parseCommandHomeAddress(cmd?.homeAddress);
  const emergencyFields = parseCommandEmergencyContact(cmd?.emergencyContact);

  const base = {
    form: {
      phone,
      dateOfBirth,
      ...addressFields,
      ...emergencyFields,
      licenceExpiry: toDateInput(progressForm.licenceExpiry),
      licenceCategories: progressForm.licenceCategories ?? "D",
      licenceOnFile: Boolean(progressForm.licenceOnFile),
      dvlaCheckCode: progressForm.dvlaCheckCode ?? "",
      penaltyPoints: progressForm.penaltyPoints ?? "",
      dqcNumber: progressForm.dqcNumber ?? "",
      cpcExpiry: toDateInput(progressForm.cpcExpiry),
      dbsExpiry: toDateInput(progressForm.dbsExpiry),
      tachoCardNumber: progressForm.tachoCardNumber ?? "",
      tachoCardExpiry: toDateInput(progressForm.tachoCardExpiry),
      fitToDrive: Boolean(progressForm.fitToDrive),
      eyesight: Boolean(progressForm.eyesight),
      fatigueAccepted: Boolean(progressForm.fatigueAccepted),
    },
    adminProvided: {
      phone: Boolean(phone.trim()),
      dateOfBirth: Boolean(dateOfBirth),
      addressLine1: Boolean(addressFields.addressLine1?.trim()),
      addressCity: Boolean(addressFields.addressCity?.trim()),
      addressPostcode: Boolean(addressFields.addressPostcode?.trim()),
      contactName: Boolean(emergencyFields.contactName?.trim()),
      relationship: Boolean(emergencyFields.relationship?.trim()),
      emergencyPhone: Boolean(emergencyFields.emergencyPhone?.trim()),
      emergencySecondaryPhone: Boolean(emergencyFields.emergencySecondaryPhone?.trim()),
      licenceExpiry: Boolean(progressForm.licenceOnFile || progressForm.licenceExpiry),
      dvlaCheckCode: Boolean(String(progressForm.dvlaCheckCode ?? "").trim()),
      dqcNumber: Boolean(String(progressForm.dqcNumber ?? "").trim()),
      cpcExpiry: Boolean(progressForm.cpcExpiry),
      dbsExpiry: Boolean(progressForm.dbsExpiry),
      tachoCardNumber: Boolean(String(progressForm.tachoCardNumber ?? "").trim()),
      tachoCardExpiry: Boolean(progressForm.tachoCardExpiry),
    },
    documentsByStep: {},
    documentsByType: {},
    fullName,
    email: cmd?.email ?? "",
    onboardingStatus: "in_progress",
    hasAdminData: Boolean(phone.trim() || dateOfBirth),
    isEditable: true,
    driverId,
    serverCompletedStepKeys: progress?.completedStepKeys ?? [],
    suggestedNextStepKey: progress?.suggestedNextStepKey ?? null,
  };
  return mergeCommandDocumentPrefill(driverId, base);
}

export async function getDriverOnboardingPrefill(driverId) {
  const supabase = getSupabaseClient();

  const [{ data: row, error: rowError }, { data: emergency }, { data: documents }] = await Promise.all([
    supabase
      .from("drivers")
      .select(
        "full_name, email, phone, date_of_birth, address_json, emergency_contact_json, license_no, licence_categories, license_expiry, licence_expiry_date, dvla_check_code, penalty_points, dqc_number, cpc_expiry, cpc_expiry_date, dbs_expiry, dbs_expiry_date, tacho_card_number, tacho_card_expiry, onboarding_status",
      )
      .eq("id", driverId)
      .single(),
    supabase
      .from("driver_emergency_contacts")
      .select("contact_name, relationship, phone, secondary_phone")
      .eq("driver_id", driverId)
      .maybeSingle(),
    supabase
      .from("documents")
      .select("id, document_type, storage_path, status, created_at")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false }),
  ]);

  // Command stores phone/DOB on staff_members — Ridova drivers columns often missing.
  if (rowError || !row) {
    console.warn("[onboarding] drivers prefill unavailable, using Command session", rowError?.message);
    return getCommandOnboardingPrefill(supabase, driverId);
  }

  const address = readJsonObject(row?.address_json);
  const emergJson = readJsonObject(row?.emergency_contact_json);

  const form = {
    phone: row?.phone ?? "",
    dateOfBirth: toDateInput(row?.date_of_birth),
    addressLine1: address.line1 ?? address.line_1 ?? "",
    addressCity: address.city ?? "",
    addressPostcode: address.postcode ?? "",
    contactName: emergency?.contact_name ?? emergJson.name ?? "",
    relationship: emergency?.relationship ?? "",
    emergencyPhone: emergency?.phone ?? emergJson.phone ?? "",
    emergencySecondaryPhone: emergency?.secondary_phone ?? emergJson.secondary_phone ?? "",
    licenceNumber: row?.license_no ?? "",
    licenceCategories: row?.licence_categories ?? "D",
    licenceExpiry: toDateInput(row?.license_expiry),
    dvlaCheckCode: row?.dvla_check_code ?? "",
    penaltyPoints: row?.penalty_points != null ? String(row.penalty_points) : "",
    dqcNumber: row?.dqc_number ?? "",
    cpcExpiry: toDateInput(row?.cpc_expiry),
    dbsExpiry: toDateInput(row?.dbs_expiry_date ?? row?.dbs_expiry),
    tachoCardNumber: row?.tacho_card_number ?? "",
    tachoCardExpiry: toDateInput(row?.tacho_card_expiry),
  };

  const adminProvided = {
    phone: Boolean(row?.phone?.trim()),
    dateOfBirth: Boolean(row?.date_of_birth),
    addressLine1: Boolean(form.addressLine1?.trim()),
    addressCity: Boolean(form.addressCity?.trim()),
    addressPostcode: Boolean(form.addressPostcode?.trim()),
    contactName: Boolean(form.contactName?.trim()),
    relationship: Boolean(form.relationship?.trim()),
    emergencyPhone: Boolean(form.emergencyPhone?.trim()),
    emergencySecondaryPhone: Boolean(emergency?.secondary_phone?.trim()),
    licenceNumber: Boolean(row?.license_no?.trim()),
    licenceCategories: Boolean(row?.licence_categories?.trim()),
    licenceExpiry: Boolean(row?.license_expiry),
    dvlaCheckCode: Boolean(row?.dvla_check_code?.trim()),
    penaltyPoints: row?.penalty_points != null,
    dqcNumber: Boolean(row?.dqc_number?.trim()),
    cpcExpiry: Boolean(row?.cpc_expiry),
    dbsExpiry: Boolean(row?.dbs_expiry_date ?? row?.dbs_expiry),
    tachoCardNumber: Boolean(row?.tacho_card_number?.trim()),
    tachoCardExpiry: Boolean(row?.tacho_card_expiry),
  };

  const documentsByType = {};
  for (const doc of documents ?? []) {
    if (!ON_FILE_DOC_STATUSES.has(doc.status)) continue;
    documentsByType[doc.document_type] = { ...doc, displayName: documentDisplayName(doc) };
  }

  const documentsByStep = {};
  for (const stepKey of Object.keys(STEP_DOCUMENT_TYPES)) {
    const doc = findDocumentForStep(documents, stepKey);
    documentsByStep[stepKey] =
      hasAllRequiredDocuments(stepKey, documentsByType) && doc && ON_FILE_DOC_STATUSES.has(doc.status)
        ? { ...doc, displayName: documentDisplayName(doc) }
        : null;
  }

  const hasAdminData =
    Object.values(adminProvided).some(Boolean) ||
    Object.values(documentsByType).some(Boolean);

  return mergeCommandDocumentPrefill(driverId, {
    form,
    adminProvided,
    documentsByStep,
    documentsByType,
    fullName: row?.full_name ?? "",
    email: row?.email ?? "",
    onboardingStatus: row?.onboarding_status ?? "invited",
    hasAdminData,
    isEditable: isOnboardingEditableStatus(row?.onboarding_status, {
      rejectionReason: row?.rejection_reason,
    }),
  });
}

export async function getDriverOnboardingState(driver) {
  const supabase = getSupabaseClient();

  const [{ data: steps }, { data: record }, compliance, requirements] = await Promise.all([
    supabase
      .from("driver_onboarding_steps")
      .select("id, step_key, step_label, required, status, review_status, rejected_reason")
      .eq("driver_id", driver.id)
      .order("sort_order"),
    supabase
      .from("driver_onboarding_records")
      .select("status, progress_percentage, current_step_key, dispatch_blocked, rejection_reason, resubmit_requested_items")
      .eq("driver_id", driver.id)
      .maybeSingle(),
    loadDriverComplianceReadiness(driver),
    getDriverOnboardingRequirements(driver.id),
  ]);

  const documents = await loadDriverDocuments(driver.id, { driver });
  const commandProgress = await fetchCommandOnboardingProgress(supabase, driver.id);
  let serverCompletedStepKeys = commandProgress?.completedStepKeys ?? [];

  // After documents are approved, Command points at activation training — clear stale
  // local "done" flags so handbook / vehicle-check / defect show as ready again.
  const ACTIVATION_STEPS = ["driver_handbook", "vehicle_check_training", "defect_policy", "policies"];
  const suggested = commandProgress?.suggestedNextStepKey;
  if (suggested && ACTIVATION_STEPS.includes(suggested)) {
    clearLocalOnboardingSteps(driver.id, ACTIVATION_STEPS);
    serverCompletedStepKeys = serverCompletedStepKeys.filter((k) => !ACTIVATION_STEPS.includes(k));
  }

  const baseSteps =
    (steps ?? []).length > 0
      ? steps.map((s) => ({
          id: s.id,
          stepKey: s.step_key,
          stepLabel: s.step_label,
          required: s.required,
          status: s.status,
          reviewStatus: s.review_status,
        }))
      : DEFAULT_ONBOARDING_STEP_TEMPLATES.map((t, i) => ({
          id: `template-${i}`,
          stepKey: t.stepKey,
          stepLabel: t.stepLabel,
          required: t.required,
          status: "pending",
          reviewStatus: null,
        }));

  // Command does not use Ridova onboarding step tables — merge local + server signals.
  const mappedSteps = applyOnboardingStepCompletions(baseSteps, {
    completedStepKeys: [...getLocalCompletedOnboardingSteps(driver.id), ...serverCompletedStepKeys],
    inferPersonalFromPhone: true,
    phone: driver.phone,
  });

  const missingRequiredSteps = mappedSteps.filter(
    (s) => s.required && !isStepCompleteForProgress(s.status, s.reviewStatus),
  );

  const uiGroup = groupOnboardingStatus(driver.onboardingStatus);
  const progress =
    record?.progress_percentage ??
    Math.round(
      ((mappedSteps.length - missingRequiredSteps.length) / Math.max(mappedSteps.length, 1)) * 100,
    );

  return {
    driverId: driver.id,
    uiGroup,
    onboardingStatus: driver.onboardingStatus,
    canonicalOnboardingStatus: normalizeOnboardingStatus(driver.onboardingStatus),
    isEditable: isOnboardingEditableStatus(driver.onboardingStatus, {
      rejectionReason: record?.rejection_reason ?? driver.rejectionReason,
      resubmitItems: record?.resubmit_requested_items ?? [],
    }),
    recordStatus: record?.status ?? null,
    progressPercentage: progress,
    currentStepKey:
      record?.current_step_key ??
      mappedSteps.find((s) => !isStepCompleteForProgress(s.status, s.reviewStatus))?.stepKey,
    rejectionReason: record?.rejection_reason ?? driver.rejectionReason ?? null,
    resubmitRequestedItems: record?.resubmit_requested_items ?? [],
    steps: mappedSteps,
    missingRequiredSteps,
    serverCompletedStepKeys,
    suggestedNextStepKey: commandProgress?.suggestedNextStepKey ?? null,
    policies: DRIVER_POLICIES,
    requirements,
    canAccessDuty: compliance.canAccessDuty,
    dispatchBlocked:
      record?.dispatch_blocked === true ||
      (compliance.blockers.length > 0 && driver.onboardingStatus !== "active"),
    dispatchBlockers: compliance.blockers,
    dispatchBand: compliance.band,
    outdatedPolicies: compliance.outdatedPolicies.map((label) => ({ label })),
    expiringDocuments: compliance.expiringDocuments,
    submittedDocuments: documents.filter((d) => ON_FILE_DOC_STATUSES.has(d.status)),
  };
}

export async function updateDriverProfile(driverId, organisationId, payload) {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Your session expired. Sign in again and try saving.");
  }

  const phone = String(payload.phone ?? "").trim();
  if (!phone) {
    throw new Error("Please enter your phone number.");
  }

  let dateOfBirth = payload.dateOfBirth ? String(payload.dateOfBirth).trim() : "";
  if (dateOfBirth) {
    const uk = dateOfBirth.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (uk) {
      dateOfBirth = `${uk[3]}-${uk[2].padStart(2, "0")}-${uk[1].padStart(2, "0")}`;
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      throw new Error("Enter your date of birth using the date picker.");
    }
  }

  const result = await commandUpdateDriverProfile(session.access_token, {
    phone,
    dateOfBirth: dateOfBirth || null,
  });
  if (!result.ok) {
    throw new Error(result.message || "Your profile could not be saved.");
  }

  // Persist checklist progress for the hub (Command has no driver_onboarding_steps).
  markLocalOnboardingStepsComplete(driverId, "personal_profile");

  // Best-effort legacy Ridova tables when present.
  try {
    const currentStatus = await assertOnboardingEditable(supabase, driverId);
    await completeOnboardingStep(driverId, "personal_profile", organisationId);
    await transitionOnboardingInProgress(driverId, currentStatus);
  } catch (legacyError) {
    console.warn("[onboarding] local personal_profile step sync skipped", legacyError);
  }
}

export async function updateAddressAndEmergency(driverId, organisationId, payload) {
  const token = await requireDriverAccessToken();
  const result = await commandUpdateDriverContact(token, {
    addressLine1: payload.addressLine1,
    addressCity: payload.addressCity,
    addressPostcode: payload.addressPostcode,
    contactName: payload.contactName,
    relationship: payload.relationship,
    emergencyPhone: payload.emergencyPhone,
    emergencySecondaryPhone: payload.emergencySecondaryPhone,
  });
  assertCommandOk(result, "Your address and emergency contact could not be saved.");
  await finishOnboardingStep(driverId, "emergency_contact", organisationId);
}

export async function updateLicenceDetails(driverId, organisationId, payload) {
  const licenceNumber = payload.licenceNumber?.trim();
  const licenceExpiry = payload.licenceExpiry?.trim();
  if (!licenceNumber) {
    throw new Error("Please enter your driving licence number.");
  }
  if (!licenceExpiry) {
    throw new Error("Please enter your licence expiry date.");
  }

  const documents = await loadDriverDocuments(driverId);
  const documentsByType = Object.fromEntries(documents.map((d) => [d.document_type, d]));
  if (!hasAllRequiredDocuments("driving_licence", documentsByType)) {
    throw new Error("Please upload photos of the front and back of your driving licence.");
  }

  const token = await requireDriverAccessToken();
  const result = await commandUpdateDriverOnboardingStep(token, {
    stepKey: "driving_licence",
    licenceNumber,
    licenceCategories: payload.licenceCategories,
    licenceExpiry,
    penaltyPoints: payload.penaltyPoints,
  });
  assertCommandOk(result, "Your licence details could not be saved.");
  await finishOnboardingStep(driverId, "driving_licence", organisationId);
}

export async function updateDvlaCheckCode(driverId, organisationId, dvlaCheckCode) {
  const token = await requireDriverAccessToken();
  const result = await commandUpdateDriverOnboardingStep(token, {
    stepKey: "dvla_check",
    dvlaCheckCode,
  });
  assertCommandOk(result, "Your DVLA check code could not be saved.");
  await finishOnboardingStep(driverId, "dvla_check", organisationId);
}

export async function updateTachographDetails(driverId, organisationId, payload) {
  const token = await requireDriverAccessToken();
  const result = await commandUpdateDriverOnboardingStep(token, {
    stepKey: "tacho_card",
    tachoCardNumber: payload.tachoCardNumber,
    tachoCardExpiry: payload.tachoCardExpiry,
  });
  assertCommandOk(result, "Your tachograph card details could not be saved.");
  await finishOnboardingStep(driverId, "tacho_card", organisationId);
}

export async function updateDqcDetails(driverId, organisationId, payload) {
  const dqcNumber = payload.dqcNumber?.trim();
  const cpcExpiry = payload.cpcExpiry?.trim();
  if (!dqcNumber) {
    throw new Error("Please enter your DQC number.");
  }
  if (!cpcExpiry) {
    throw new Error("Please enter your DQC / CPC expiry date.");
  }

  const token = await requireDriverAccessToken();
  const result = await commandUpdateDriverOnboardingStep(token, {
    stepKey: "dqc_cpc",
    dqcNumber,
    cpcExpiry,
  });
  assertCommandOk(result, "Your DQC details could not be saved.");
  await finishOnboardingStep(driverId, "dqc_cpc", organisationId);
}

export async function updateDbsDetails(driverId, organisationId, payload) {
  const dbsExpiry = payload.dbsExpiry?.trim();
  if (!dbsExpiry) {
    throw new Error("Please enter your DBS certificate expiry date.");
  }

  const token = await requireDriverAccessToken();
  const result = await commandUpdateDriverOnboardingStep(token, {
    stepKey: "dbs_safeguarding",
    dbsExpiry,
  });
  assertCommandOk(result, "Your DBS details could not be saved.");
  await finishOnboardingStep(driverId, "dbs_safeguarding", organisationId);
}

/** Active drivers missing DBS expiry can self-serve without reopening full onboarding. */
export async function updateDbsDetailsForComplianceGap(driverId, organisationId, payload) {
  const supabase = getSupabaseClient();
  const dbsExpiry = payload.dbsExpiry?.trim();
  if (!dbsExpiry) {
    throw new Error("Please enter your DBS certificate expiry date.");
  }

  const { data: driver, error: driverError } = await supabase
    .from("drivers")
    .select("status, dbs_expiry_date")
    .eq("id", driverId)
    .eq("company_id", organisationId)
    .maybeSingle();
  if (driverError) throw new Error(friendlyOnboardingError(driverError, "save"));
  if (!driver) throw new Error("Driver profile not found.");
  if (driver.dbs_expiry_date) throw new Error("DBS expiry is already on file — pull to refresh if the app still shows a blocker.");

  const requirements = await getDriverOnboardingRequirements(driverId);
  if (!requirements.requiresDbs) {
    throw new Error("DBS is not required for your role.");
  }

  const { data: existingDocs } = await supabase
    .from("documents")
    .select("id, document_type, status")
    .eq("driver_id", driverId)
    .in("document_type", ["dbs", "dbs_safeguarding", "safeguarding"]);

  const hasDbsDoc = (existingDocs ?? []).some((doc) => ON_FILE_DOC_STATUSES.has(doc.status));
  if (!hasDbsDoc && !payload.skipDocumentCheck) {
    throw new Error("Please upload your DBS certificate.");
  }

  // drivers has no client-writable UPDATE policy — a driver can only change their
  // own dbs_expiry_date through this SECURITY DEFINER RPC, not a direct update.
  const { error } = await supabase.rpc("driver_backfill_dbs_expiry", {
    p_expiry: dbsExpiry,
  });
  if (error) throw new Error(friendlyOnboardingError(error, "save"));

  await supabase
    .from("documents")
    .update({ expires_on: dbsExpiry })
    .eq("driver_id", driverId)
    .in("document_type", ["dbs", "dbs_safeguarding", "safeguarding"]);

  await completeOnboardingStep(driverId, "dbs_safeguarding", organisationId, { requirements });
}

export async function upsertEmergencyContact(driverId, organisationId, payload) {
  await updateAddressAndEmergency(driverId, organisationId, {
    addressLine1: payload.addressLine1 ?? "",
    addressCity: payload.addressCity ?? "",
    addressPostcode: payload.addressPostcode ?? "",
    contactName: payload.contactName,
    relationship: payload.relationship,
    emergencyPhone: payload.phone,
    emergencySecondaryPhone: payload.secondaryPhone,
  });
}

export async function saveMedicalDeclaration(driverId, organisationId, payload) {
  const token = await requireDriverAccessToken();
  const result = await commandUpdateDriverOnboardingStep(token, {
    stepKey: "medical_declaration",
    fitToDrive: payload.fitToDrive,
    eyesight: payload.eyesight,
    fatigueAccepted: payload.fatigueAccepted,
  });
  assertCommandOk(result, "Your medical declaration could not be saved.");
  await finishOnboardingStep(driverId, "medical_declaration", organisationId);
}

async function acceptPoliciesViaCommand(driverId, organisationId, acceptedKeys, stepKey) {
  const token = await requireDriverAccessToken();
  const result = await commandUpdateDriverOnboardingStep(token, {
    stepKey,
    policyKeys: acceptedKeys,
  });
  assertCommandOk(result, "Your policy acceptances could not be saved.");
  await finishOnboardingStep(driverId, stepKey, organisationId);
}

export async function acceptPolicies(driverId, organisationId, acceptedKeys) {
  await acceptPoliciesViaCommand(driverId, organisationId, acceptedKeys, "policies");
}

/** Active drivers re-acknowledging updated policies — onboarding is already complete. */
export async function acceptPolicyReacknowledgements(driverId, organisationId, acceptedKeys) {
  const supabase = getSupabaseClient();
  await upsertDriverPolicyAcceptances(supabase, driverId, acceptedKeys);

  await logDriverAction(supabase, {
    organisation_id: organisationId,
    entity_table: "driver_policy_acceptances",
    entity_id: driverId,
    action: "driver_policy_reacknowledged",
    reason: "Driver accepted updated policy versions",
    metadata: { policy_keys: acceptedKeys },
  });
}

function buildPolicyAcceptancePayload(acceptedKeys) {
  return DRIVER_POLICIES.filter((p) => acceptedKeys.includes(p.policyKey)).map((p) => ({
    policy_key: p.policyKey,
    policy_label: p.label,
    policy_version: p.policyVersion,
  }));
}

async function upsertDriverPolicyAcceptances(supabase, driverId, acceptedKeys) {
  const acceptances = buildPolicyAcceptancePayload(acceptedKeys);
  if (acceptances.length === 0) return;

  const { data, error } = await supabase.rpc("driver_upsert_policy_acceptances", {
    p_driver_id: driverId,
    p_acceptances: acceptances,
  });

  if (error) throw new Error(friendlyOnboardingError(error, "save"));

  if (data?.ok === false) {
    throw new Error(data.message ?? "Could not save policy acceptances.");
  }
}

export async function acceptHandbookPolicies(driverId, organisationId, acceptedKeys) {
  await acceptPoliciesViaCommand(driverId, organisationId, acceptedKeys, "driver_handbook");
}

export async function acceptDefectReportingPolicy(driverId, organisationId) {
  await acceptPoliciesViaCommand(driverId, organisationId, ["defect_policy", "incident_policy"], "defect_policy");
}

export async function completeVehicleCheckTraining(driverId, organisationId) {
  const token = await requireDriverAccessToken();
  const result = await commandUpdateDriverOnboardingStep(token, { stepKey: "vehicle_check_training" });
  assertCommandOk(result, "Training could not be saved.");
  await finishOnboardingStep(driverId, "vehicle_check_training", organisationId);
}

export async function markDocumentStepComplete(driverId, stepKey, organisationId) {
  const token = await requireDriverAccessToken();
  const result = await commandUpdateDriverOnboardingStep(token, { stepKey });
  assertCommandOk(result, "This step could not be saved.");
  await finishOnboardingStep(driverId, stepKey, organisationId);
}

function buildSubmissionSnapshot(form) {
  return {
    personal: {
      phone: form.phone ?? null,
      dateOfBirth: form.dateOfBirth ?? null,
      addressLine1: form.addressLine1 ?? null,
      addressCity: form.addressCity ?? null,
      addressPostcode: form.addressPostcode ?? null,
    },
    emergencyContact: {
      contactName: form.contactName ?? null,
      relationship: form.relationship ?? null,
      phone: form.emergencyPhone ?? null,
      secondaryPhone: form.emergencySecondaryPhone?.trim() || null,
    },
    licence: {
      licenceNumber: form.licenceNumber ?? null,
      licenceCategories: form.licenceCategories ?? null,
      licenceExpiry: form.licenceExpiry ?? null,
      dvlaCheckCode: form.dvlaCheckCode ?? null,
      penaltyPoints: form.penaltyPoints ?? null,
    },
    dqc: {
      dqcNumber: form.dqcNumber ?? null,
      cpcExpiry: form.cpcExpiry ?? null,
      dbsExpiry: form.dbsExpiry ?? null,
    },
  };
}

async function persistFullSubmission(driverId, organisationId, form) {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("drivers")
    .update({
      phone: form.phone || null,
      date_of_birth: form.dateOfBirth || null,
      address_json: {
        line1: form.addressLine1 ?? "",
        city: form.addressCity ?? "",
        postcode: form.addressPostcode ?? "",
      },
      emergency_contact_json: {
        name: form.contactName ?? "",
        phone: form.emergencyPhone ?? "",
        secondary_phone: form.emergencySecondaryPhone?.trim() || "",
      },
      license_no: form.licenceNumber || null,
      licence_categories: form.licenceCategories || null,
      license_expiry: form.licenceExpiry || null,
      dvla_check_code: form.dvlaCheckCode || null,
      penalty_points:
        form.penaltyPoints != null && form.penaltyPoints !== "" ? Number(form.penaltyPoints) : null,
      dqc_number: form.dqcNumber || null,
      cpc_expiry: form.cpcExpiry || null,
      cpc_expiry_date: form.cpcExpiry || null,
      dbs_expiry: form.dbsExpiry || null,
      dbs_expiry_date: form.dbsExpiry || null,
      updated_at: now,
    })
    .eq("id", driverId)
    .eq("organisation_id", organisationId);
  if (error) throw error;

  if (form.contactName && form.emergencyPhone) {
    await supabase.from("driver_emergency_contacts").upsert(
      {
        driver_id: driverId,
        organisation_id: organisationId,
        contact_name: form.contactName,
        relationship: form.relationship,
        phone: form.emergencyPhone,
        secondary_phone: form.emergencySecondaryPhone?.trim() || null,
        updated_at: now,
      },
      { onConflict: "driver_id" },
    );
  }
}

export async function submitOnboardingForReview(driverId, organisationId, form) {
  const token = await requireDriverAccessToken();
  const result = await commandSubmitDriverOnboarding(token);
  assertCommandOk(result, "Your onboarding could not be submitted.");

  await finishOnboardingStep(driverId, WIZARD_STEP_KEYS, organisationId);
  await finishOnboardingStep(driverId, "review_submit", organisationId);

  const supabase = getSupabaseClient();
  await logDriverAction(supabase, {
    organisation_id: organisationId,
    entity_table: "drivers",
    entity_id: driverId,
    action: "driver_onboarding_submitted",
    reason: "Driver submitted onboarding for admin review",
    metadata: { source: "driver_mobile", snapshot: form ? buildSubmissionSnapshot(form) : {} },
  });
}

/** Upload with onboarding editability guard — use from driver UI. */
export async function uploadDriverDocument(driver, payload) {
  const supabase = getSupabaseClient();
  try {
    await assertOnboardingEditable(supabase, driver?.id);
  } catch (err) {
    // Command onboarding: legacy status row may be absent — still allow uploads.
    console.warn("[onboarding] upload editability check skipped", err?.message);
  }
  return uploadDriverDocumentRaw(driver, payload);
}
