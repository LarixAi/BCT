import {
  BookOpen,
  Car,
  ClipboardCheck,
  CreditCard,
  FileCheck,
  HeartPulse,
  Home,
  IdCard,
  Shield,
  User,
  UserCheck,
  Wrench,
} from "lucide-react";
import { isStepCompleteForProgress, normalizeStepStatus } from "@/lib/onboarding-status";
import { getLocalCompletedOnboardingSteps } from "@/lib/onboarding-progress-store";

export const ONBOARDING_STEP_KEYS_ORDER = [
  "personal_profile",
  "emergency_contact",
  "right_to_work",
  "driving_licence",
  "dvla_check",
  "dqc_cpc",
  "tacho_card",
  "dbs_safeguarding",
  "medical_declaration",
  "driver_handbook",
  "vehicle_check_training",
  "defect_policy",
  "review_submit",
];

/** Ordered onboarding tasks shown on the hub checklist. */
export const ONBOARDING_TASKS = [
  {
    id: "create_account",
    stepKey: null,
    title: "Create your account",
    description: "Sign in with the email your transport team invited",
    icon: UserCheck,
    alwaysComplete: true,
    required: true,
  },
  {
    id: "profile",
    stepKey: "personal_profile",
    title: "Personal profile",
    description: "Phone number and date of birth",
    icon: User,
    required: true,
  },
  {
    id: "address-emergency",
    stepKey: "emergency_contact",
    title: "Address & emergency contact",
    description: "Where you live and who to call in an emergency",
    icon: Home,
    required: true,
  },
  {
    id: "right-to-work",
    stepKey: "right_to_work",
    title: "Right to work",
    description: "Proof you can work in the UK",
    icon: ClipboardCheck,
    required: true,
    documentStepKey: "right_to_work",
  },
  {
    id: "licence",
    stepKey: "driving_licence",
    title: "Driving licence",
    description: "Licence details plus front and back photos",
    icon: IdCard,
    required: true,
    documentStepKey: "driving_licence",
  },
  {
    id: "dvla",
    stepKey: "dvla_check",
    title: "DVLA licence check",
    description: "Share your DVLA check code",
    icon: FileCheck,
    required: true,
  },
  {
    id: "dqc",
    stepKey: "dqc_cpc",
    title: "DQC / CPC card",
    description: "DQC details plus front and back card photos",
    icon: CreditCard,
    required: true,
    documentStepKey: "dqc_cpc",
  },
  {
    id: "tachograph",
    stepKey: "tacho_card",
    title: "Tachograph card",
    description: "Digital tachograph card number and expiry",
    icon: Car,
    required: true,
  },
  {
    id: "dbs",
    stepKey: "dbs_safeguarding",
    title: "DBS / safeguarding",
    description: "Enhanced DBS certificate for school transport work",
    icon: Shield,
    required: true,
    requirementKey: "dbs",
    documentStepKey: "dbs_safeguarding",
  },
  {
    id: "medical",
    stepKey: "medical_declaration",
    title: "Medical / fitness declaration",
    description: "Confirm you are fit to drive",
    icon: HeartPulse,
    required: true,
  },
  {
    id: "handbook",
    stepKey: "driver_handbook",
    title: "Driver handbook",
    description: "Read and accept key fleet policies",
    icon: BookOpen,
    required: true,
  },
  {
    id: "training",
    stepKey: "vehicle_check_training",
    title: "Vehicle check training",
    description: "How daily walkaround checks work in the app",
    icon: Wrench,
    required: true,
  },
  {
    id: "defect-policy",
    stepKey: "defect_policy",
    title: "Defect & incident reporting",
    description: "How to report vehicle defects and incidents",
    icon: FileCheck,
    required: true,
  },
  {
    id: "review",
    stepKey: "review_submit",
    title: "Submit for admin review",
    description: "Send everything to your transport team",
    icon: ClipboardCheck,
    required: true,
  },
];

export function getVisibleTasks(driver, requirements = {}) {
  const requiresDbs = requirements.requiresDbs ?? Boolean(driver?.canDoSchoolRuns);
  return ONBOARDING_TASKS.filter((task) => {
    if (task.requirementKey === "dbs" || task.id === "dbs") {
      return requiresDbs;
    }
    return true;
  });
}

function stepRecordForTask(task, stepsByKey) {
  if (!task.stepKey) return null;
  return stepsByKey.get(task.stepKey) ?? null;
}

function isTaskComplete(task, stepsByKey, extras = {}) {
  if (task.alwaysComplete) return true;

  const completedKeys = extras.completedStepKeys ?? new Set();
  if (task.stepKey && completedKeys.has(task.stepKey)) return true;

  if (task.documentStepKey && extras.documentsByStep?.[task.documentStepKey]) return true;

  const admin = extras.adminProvided ?? {};
  if (task.id === "profile" && admin.phone && admin.dateOfBirth) return true;
  if (task.id === "address-emergency" && admin.addressLine1 && admin.contactName && admin.emergencyPhone) {
    return true;
  }
  if (task.id === "licence" && admin.licenceExpiry) return true;
  if (task.id === "dvla" && admin.dvlaCheckCode) return true;
  if (task.id === "dqc" && admin.dqcNumber && admin.cpcExpiry) return true;
  if (task.id === "dbs" && admin.dbsExpiry) return true;
  if (task.id === "tachograph" && extras.tachographComplete) return true;

  const record = stepRecordForTask(task, stepsByKey);
  if (!record) return false;
  if (isStepCompleteForProgress(record.status, record.review_status ?? record.reviewStatus)) return true;
  if (task.id === "tachograph" && extras.tachographComplete) return true;
  return false;
}

function isTaskRejected(task, stepsByKey, resubmitItems) {
  if (task.alwaysComplete) return false;
  const record = stepRecordForTask(task, stepsByKey);
  if (!record) {
    if (resubmitItems?.length && task.id !== "review") {
      return taskMatchesResubmit(task, resubmitItems);
    }
    return false;
  }
  const canonical = normalizeStepStatus(record.status, record.review_status ?? record.reviewStatus);
  if (canonical === "action_required" || record.status === "rejected") return true;
  return taskMatchesResubmit(task, resubmitItems);
}

function taskMatchesResubmit(task, resubmitItems) {
  const map = {
    profile: "personal_profile",
    "address-emergency": "emergency_contact",
    licence: "driving_licence",
    dvla: "driving_licence",
    dqc: "dqc_cpc",
    dbs: "dbs_safeguarding",
    "right-to-work": "right_to_work",
    medical: "medical_declaration",
    handbook: "policies",
    training: "vehicle_check_training",
    "defect-policy": "policies",
    tachograph: "dqc_cpc",
  };
  const resubmitIds = new Set(resubmitItems);
  const mapped = map[task.id];
  if (mapped && resubmitIds.has(mapped)) return true;
  for (const item of resubmitItems) {
    if (task.stepKey === item) return true;
  }
  return false;
}

function isTaskEditable(task, { isEditable, resubmitRequestedItems, stepsByKey }) {
  if (isEditable) {
    if (!resubmitRequestedItems?.length) return true;
    return isTaskRejected(task, stepsByKey, resubmitRequestedItems) || !isTaskComplete(task, stepsByKey, {});
  }
  return isTaskRejected(task, stepsByKey, resubmitRequestedItems);
}

/**
 * Resolve UI status for hub rows.
 * While the driver is still editing (`isEditable`), finished steps show as completed (green).
 * Orange "pending review" is only for after formal submit, when the hub is read-only.
 */
export function resolveTaskUiStatus(task, { steps, resubmitRequestedItems = [], isEditable, extras = {} }) {
  const stepsByKey = new Map(
    (steps ?? []).map((s) => [s.stepKey, { ...s, reviewStatus: s.review_status ?? s.reviewStatus }]),
  );

  if (task.alwaysComplete) return "approved";

  const record = stepRecordForTask(task, stepsByKey);
  const reviewStatus = record?.review_status ?? record?.reviewStatus;
  const canonical = record ? normalizeStepStatus(record.status, reviewStatus) : "not_started";

  if (canonical === "approved" || reviewStatus === "approved" || record?.status === "verified") {
    return "approved";
  }

  if (isTaskRejected(task, stepsByKey, resubmitRequestedItems)) {
    return "action_required";
  }

  if (isTaskComplete(task, stepsByKey, extras)) {
    // Formal admin wait only when the driver can no longer edit (submitted / pending screen).
    if (!isEditable) return "pending_review";
    return "completed";
  }

  const visible = extras.visibleTasks ?? ONBOARDING_TASKS;
  const idx = visible.findIndex((t) => t.id === task.id);
  if (idx <= 0) return "ready";

  for (let i = 0; i < idx; i += 1) {
    const prev = visible[i];
    if (!prev.required) continue;
    if (!isTaskComplete(prev, stepsByKey, extras) && !isTaskRejected(prev, stepsByKey, resubmitRequestedItems)) {
      return "locked";
    }
  }

  const firstIncomplete = visible.find(
    (t) =>
      t.required &&
      !isTaskComplete(t, stepsByKey, extras) &&
      !isTaskRejected(t, stepsByKey, resubmitRequestedItems),
  );

  if (firstIncomplete?.id === task.id) return "ready";
  if (!isTaskEditable(task, { isEditable, resubmitRequestedItems, stepsByKey })) return "locked";
  return "locked";
}

export function buildTaskExtras({ visibleTasks, documentsByStep, form, prefill, state }) {
  const driverId = prefill?.driverId ?? state?.driverId;
  const serverKeys = state?.serverCompletedStepKeys ?? prefill?.serverCompletedStepKeys ?? [];
  const localKeys =
    prefill?.localCompletedStepKeys ??
    (driverId ? getLocalCompletedOnboardingSteps(driverId) : []);
  return {
    visibleTasks,
    documentsByStep,
    tachographComplete: Boolean(form.tachoCardNumber?.trim() && form.tachoCardExpiry),
    adminProvided: prefill?.adminProvided ?? {},
    completedStepKeys: new Set([...serverKeys, ...localKeys]),
  };
}

export function countCompletedTasks(driver, state, prefill, requirements = {}) {
  const visible = getVisibleTasks(driver, requirements);
  const extras = buildTaskExtras({
    visibleTasks: visible,
    documentsByStep: prefill?.documentsByStep ?? {},
    form: prefill?.form ?? {},
    prefill,
    state,
  });
  const isEditable = state?.isEditable !== false;

  let completed = 0;
  let awaitingReview = 0;
  for (const task of visible) {
    const ui = resolveTaskUiStatus(task, {
      steps: state?.steps,
      resubmitRequestedItems: state?.resubmitRequestedItems ?? [],
      isEditable,
      extras,
    });
    if (ui === "pending_review") awaitingReview += 1;
    if (["completed", "pending_review", "approved"].includes(ui)) completed += 1;
  }

  return { completed, awaitingReview, total: visible.length };
}

export function findNextReadyTask(driver, state, prefill, requirements = {}) {
  const visible = getVisibleTasks(driver, requirements);
  const extras = buildTaskExtras({
    visibleTasks: visible,
    documentsByStep: prefill?.documentsByStep ?? {},
    form: prefill?.form ?? {},
    prefill,
    state,
  });
  for (const task of visible) {
    const status = resolveTaskUiStatus(task, {
      steps: state?.steps,
      resubmitRequestedItems: state?.resubmitRequestedItems ?? [],
      isEditable: state?.isEditable !== false,
      extras,
    });
    if (status === "ready" || status === "action_required") return task;
  }
  return null;
}

export function taskRoute(id) {
  if (id === "create_account") return "/onboarding";
  if (id === "review") return "/onboarding/review";
  return `/onboarding/${id}`;
}

export function getPreviousRequiredStepKeys(stepKey, requirements = {}) {
  const requiresDbs = requirements.requiresDbs ?? true;
  const order = ONBOARDING_STEP_KEYS_ORDER.filter((key) => {
    if (key === "dbs_safeguarding" && !requiresDbs) return false;
    return true;
  });
  const idx = order.indexOf(stepKey);
  if (idx <= 0) return [];
  return order.slice(0, idx);
}
