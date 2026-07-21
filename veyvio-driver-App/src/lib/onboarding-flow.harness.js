import { DEFAULT_ONBOARDING_STEP_TEMPLATES } from "@/lib/onboarding-blueprint";
import { applyOnboardingStepCompletions } from "@/lib/onboarding-progress-store";
import { ONBOARDING_TASKS, getVisibleTasks } from "@/lib/onboarding-tasks";

/** Standard non-school driver onboarding order (DBS hidden). */
export const ONBOARDING_FLOW_STEP_KEYS = [
  "personal_profile",
  "emergency_contact",
  "right_to_work",
  "driving_licence",
  "dvla_check",
  "dqc_cpc",
  "tacho_card",
  "medical_declaration",
  "driver_handbook",
  "vehicle_check_training",
  "defect_policy",
  "review_submit",
];

export const ONBOARDING_FLOW_TASK_IDS = [
  "profile",
  "address-emergency",
  "right-to-work",
  "licence",
  "dvla",
  "dqc",
  "tachograph",
  "medical",
  "handbook",
  "training",
  "defect-policy",
  "review",
];

export function makeOnboardingTestDriver(overrides = {}) {
  return {
    id: "drv_onboarding_e2e",
    fullName: "Alex Driver",
    email: "alex.driver@example.com",
    phone: "",
    onboardingStatus: "documents_pending",
    status: "pending",
    canDoSchoolRuns: false,
    organisationId: "org_test",
    ...overrides,
  };
}

export function makeOnboardingTestForm(overrides = {}) {
  return {
    phone: "07700900123",
    dateOfBirth: "1990-05-15",
    addressLine1: "1 Depot Road",
    addressCity: "Wembley",
    addressPostcode: "HA9 0AA",
    contactName: "Sam Driver",
    relationship: "Partner",
    emergencyPhone: "07700900456",
    emergencySecondaryPhone: "",
    licenceNumber: "DRIVER123456",
    licenceCategories: "D",
    licenceExpiry: "2028-06-01",
    dvlaCheckCode: "CHK1234567890",
    penaltyPoints: "0",
    dqcNumber: "DQC998877",
    cpcExpiry: "2027-12-01",
    tachoCardNumber: "TACHO123456",
    tachoCardExpiry: "2029-01-01",
    dbsExpiry: "",
    fitToDrive: true,
    eyesight: true,
    fatigueAccepted: true,
    ...overrides,
  };
}

export function makeOnboardingDocumentMaps({ withFiles = false } = {}) {
  if (!withFiles) {
    return { documentsByStep: {}, documentsByType: {} };
  }
  const pending = { status: "pending", storage_path: "driver-docs/test.jpg" };
  return {
    documentsByType: {
      right_to_work: pending,
      licence_front: pending,
      licence_back: pending,
      dqc_front: pending,
      dqc_back: pending,
    },
    documentsByStep: {
      right_to_work: pending,
      driving_licence: pending,
      dqc_cpc: pending,
    },
  };
}

export function buildOnboardingStepsFromCompleted(completedStepKeys = []) {
  const base = DEFAULT_ONBOARDING_STEP_TEMPLATES.map((t, i) => ({
    id: `template-${i}`,
    stepKey: t.stepKey,
    stepLabel: t.stepLabel,
    required: t.required,
    status: "pending",
    reviewStatus: null,
  }));
  return applyOnboardingStepCompletions(base, {
    completedStepKeys,
    inferPersonalFromPhone: false,
  });
}

export function buildOnboardingScenario({
  driver = makeOnboardingTestDriver(),
  completedStepKeys = [],
  requirements = { requiresDbs: false },
  form = makeOnboardingTestForm(),
  documents = makeOnboardingDocumentMaps(),
} = {}) {
  const visibleTasks = getVisibleTasks(driver, requirements);
  const steps = buildOnboardingStepsFromCompleted(completedStepKeys);
  const state = {
    driverId: driver.id,
    steps,
    isEditable: true,
    resubmitRequestedItems: [],
    serverCompletedStepKeys: [],
    canonicalOnboardingStatus: "in_progress",
    dispatchBand: "blocked",
  };
  const prefill = {
    driverId: driver.id,
    form,
    adminProvided: {},
    localCompletedStepKeys: completedStepKeys,
    serverCompletedStepKeys: [],
    documentsByStep: documents.documentsByStep,
    documentsByType: documents.documentsByType,
  };
  return { driver, requirements, state, prefill, visibleTasks };
}

export function taskIdForStepKey(stepKey) {
  const task = ONBOARDING_TASKS.find((t) => t.stepKey === stepKey);
  return task?.id ?? null;
}
