import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ONBOARDING_STEP_TEMPLATES } from "@/lib/onboarding-blueprint";
import {
  ONBOARDING_FLOW_STEP_KEYS,
  ONBOARDING_FLOW_TASK_IDS,
  buildOnboardingScenario,
  makeOnboardingDocumentMaps,
  makeOnboardingTestDriver,
  makeOnboardingTestForm,
  taskIdForStepKey,
} from "@/lib/onboarding-flow.harness";
import {
  attachLocalOnboardingProgress,
  getLocalCompletedOnboardingSteps,
  markLocalOnboardingStepsComplete,
} from "@/lib/onboarding-progress-store";
import {
  countCompletedTasks,
  findNextReadyTask,
  getVisibleTasks,
  resolveTaskUiStatus,
  taskRoute,
} from "@/lib/onboarding-tasks";
import { loadDriverDocuments } from "@/services/driver-documents.service";

const commandMocks = vi.hoisted(() => ({
  commandUpdateDriverProfile: vi.fn(async () => ({ ok: true })),
  commandUpdateDriverContact: vi.fn(async () => ({ ok: true })),
  commandUpdateDriverOnboardingStep: vi.fn(async () => ({ ok: true })),
  commandSubmitDriverOnboarding: vi.fn(async () => ({ ok: true })),
  commandDriverOnboardingProgress: vi.fn(async () => ({ ok: true, progress: { completedStepKeys: [] } })),
  commandDriverSession: vi.fn(async () => ({ ok: true, session: {} })),
}));

vi.mock("@/lib/command-api", () => commandMocks);

vi.mock("@/services/driver-documents.service", () => ({
  loadDriverDocuments: vi.fn(async () => []),
  loadDriverDocumentMaps: vi.fn(async () => makeOnboardingDocumentMaps({ withFiles: true })),
  documentDisplayName: (doc) => doc.document_type ?? "Document",
  ON_FILE_DOC_STATUSES: new Set(["pending", "approved", "valid", "expiring_soon"]),
  uploadDriverDocument: vi.fn(),
}));

vi.mock("@/services/driver-compliance.service", () => ({
  loadDriverComplianceReadiness: vi.fn(async () => ({
    blockers: [],
    outdatedPolicies: [],
    canAccessDuty: false,
    band: "blocked",
    expiringDocuments: [],
  })),
}));

vi.mock("@/services/driver-requirements.service", () => ({
  getDriverOnboardingRequirements: vi.fn(async () => ({ requiresDbs: false })),
}));

function supabaseChain(result = { data: null, error: { message: "missing" } }) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    maybeSingle: async () => result,
    single: async () => result,
    insert: async () => ({ error: null }),
    update: async () => ({ error: null }),
    upsert: async () => ({ error: null }),
  };
  return chain;
}

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: { access_token: "test-token", user: { id: "user-1" } } } }),
      getUser: async () => ({ data: { user: { id: "user-1" } } }),
    },
    from: () => supabaseChain(),
    rpc: async () => ({ data: { ok: true }, error: null }),
  }),
}));

function setupLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

describe("e2e: driver onboarding checklist", () => {
  beforeEach(() => {
    setupLocalStorage();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("maps every hub task to a router path", () => {
    const driver = makeOnboardingTestDriver();
    const tasks = getVisibleTasks(driver, { requiresDbs: false });
    for (const task of tasks) {
      const route = taskRoute(task.id);
      expect(route).toMatch(/^\/onboarding/);
    }
    expect(taskRoute("profile")).toBe("/onboarding/profile");
    expect(taskRoute("review")).toBe("/onboarding/review");
  });

  it("unlocks steps in order for a standard (non-DBS) driver", () => {
    const driver = makeOnboardingTestDriver({ canDoSchoolRuns: false });
    const requirements = { requiresDbs: false };
    const docs = makeOnboardingDocumentMaps();
    const form = makeOnboardingTestForm({ tachoCardNumber: "", tachoCardExpiry: "" });

    for (let i = 0; i < ONBOARDING_FLOW_STEP_KEYS.length; i += 1) {
      const completed = ONBOARDING_FLOW_STEP_KEYS.slice(0, i);
      const { state, prefill } = buildOnboardingScenario({
        driver,
        completedStepKeys: completed,
        requirements,
        form,
        documents: docs,
      });

      const next = findNextReadyTask(driver, state, prefill, requirements);
      const expectedTaskId = ONBOARDING_FLOW_TASK_IDS[i];
      expect(next?.id, `after ${completed.length} steps`).toBe(expectedTaskId);
      expect(taskIdForStepKey(ONBOARDING_FLOW_STEP_KEYS[i])).toBe(expectedTaskId);
    }

    const allDone = buildOnboardingScenario({
      driver,
      completedStepKeys: ONBOARDING_FLOW_STEP_KEYS,
      requirements,
      form,
      documents: docs,
    });
    expect(findNextReadyTask(driver, allDone.state, allDone.prefill, requirements)).toBeNull();
  });

  it("marks the hub complete when every required step is done", () => {
    const driver = makeOnboardingTestDriver();
    const requirements = { requiresDbs: false };
    const { state, prefill } = buildOnboardingScenario({
      completedStepKeys: ONBOARDING_FLOW_STEP_KEYS.filter((k) => k !== "review_submit"),
      requirements,
    });

    const progress = countCompletedTasks(driver, state, prefill, requirements);
    const visibleCount = getVisibleTasks(driver, requirements).length;
    expect(progress.completed).toBe(visibleCount - 1);
    expect(progress.total).toBe(visibleCount);

    const reviewTask = getVisibleTasks(driver, requirements).find((t) => t.id === "review");
    const reviewStatus = resolveTaskUiStatus(reviewTask, {
      steps: state.steps,
      resubmitRequestedItems: [],
      isEditable: true,
      extras: {
        visibleTasks: getVisibleTasks(driver, requirements),
        documentsByStep: prefill.documentsByStep,
        tachographComplete: true,
        adminProvided: {},
        completedStepKeys: new Set(
          ONBOARDING_FLOW_STEP_KEYS.filter((k) => k !== "review_submit"),
        ),
      },
    });
    expect(reviewStatus).toBe("ready");
  });

  it("persists local step completion for the hub after Command saves", () => {
    const driverId = "drv_local_progress";
    const driver = makeOnboardingTestDriver({ id: driverId });
    markLocalOnboardingStepsComplete(driverId, ["personal_profile", "emergency_contact"]);

    const prefill = attachLocalOnboardingProgress(driverId, { form: {} });
    expect(prefill.localCompletedStepKeys).toEqual(["personal_profile", "emergency_contact"]);

    const { state, prefill: scenarioPrefill } = buildOnboardingScenario({
      driver,
      completedStepKeys: getLocalCompletedOnboardingSteps(driverId),
    });

    const profileTask = getVisibleTasks(driver, { requiresDbs: false }).find((t) => t.id === "profile");
    const status = resolveTaskUiStatus(profileTask, {
      steps: state.steps,
      resubmitRequestedItems: [],
      isEditable: true,
      extras: {
        visibleTasks: getVisibleTasks(driver, { requiresDbs: false }),
        documentsByStep: scenarioPrefill.documentsByStep,
        tachographComplete: false,
        adminProvided: {},
        completedStepKeys: new Set(getLocalCompletedOnboardingSteps(driverId)),
      },
    });
    expect(status).toBe("completed");
  });

  it("hides DBS for drivers who do not do school runs", () => {
    const driver = makeOnboardingTestDriver({ canDoSchoolRuns: false });
    const tasks = getVisibleTasks(driver, { requiresDbs: false });
    expect(tasks.some((t) => t.id === "dbs")).toBe(false);

    const schoolDriver = makeOnboardingTestDriver({ canDoSchoolRuns: true });
    const schoolTasks = getVisibleTasks(schoolDriver, { requiresDbs: true });
    expect(schoolTasks.some((t) => t.id === "dbs")).toBe(true);
  });
});

describe("e2e: driver onboarding — service saves", () => {
  beforeEach(() => {
    setupLocalStorage();
    vi.clearAllMocks();
    vi.mocked(loadDriverDocuments).mockResolvedValue([
      { document_type: "licence_front", status: "pending" },
      { document_type: "licence_back", status: "pending" },
      { document_type: "dqc_front", status: "pending" },
      { document_type: "dqc_back", status: "pending" },
      { document_type: "right_to_work", status: "pending" },
    ]);
  });

  it("walks every onboarding save through Command API and local progress", async () => {
    const {
      updateDriverProfile,
      updateAddressAndEmergency,
      updateLicenceDetails,
      updateDvlaCheckCode,
      updateDqcDetails,
      updateTachographDetails,
      saveMedicalDeclaration,
      acceptHandbookPolicies,
      completeVehicleCheckTraining,
      acceptDefectReportingPolicy,
      submitOnboardingForReview,
      markDocumentStepComplete,
    } = await import("@/services/onboarding.service");

    const driverId = "drv_service_e2e";
    const orgId = "org_test";
    const form = makeOnboardingTestForm();

    await updateDriverProfile(driverId, orgId, form);
    await updateAddressAndEmergency(driverId, orgId, form);
    await markDocumentStepComplete(driverId, "right_to_work", orgId);
    await updateLicenceDetails(driverId, orgId, form);
    await updateDvlaCheckCode(driverId, orgId, form.dvlaCheckCode);
    await updateDqcDetails(driverId, orgId, form);
    await updateTachographDetails(driverId, orgId, form);
    await saveMedicalDeclaration(driverId, orgId, {
      fitToDrive: true,
      eyesight: true,
      fatigueAccepted: true,
    });
    await acceptHandbookPolicies(driverId, orgId, [
      "driver_handbook",
      "vehicle_check_policy",
      "data_protection_policy",
      "mobile_phone_policy",
      "fatigue_policy",
    ]);
    await completeVehicleCheckTraining(driverId, orgId);
    await acceptDefectReportingPolicy(driverId, orgId);
    await submitOnboardingForReview(driverId, orgId, form);

    expect(commandMocks.commandUpdateDriverProfile).toHaveBeenCalled();
    expect(commandMocks.commandUpdateDriverContact).toHaveBeenCalled();
    expect(commandMocks.commandUpdateDriverOnboardingStep.mock.calls.length).toBeGreaterThanOrEqual(6);
    expect(commandMocks.commandSubmitDriverOnboarding).toHaveBeenCalled();

    const localKeys = getLocalCompletedOnboardingSteps(driverId);
    expect(localKeys).toContain("personal_profile");
    expect(localKeys).toContain("emergency_contact");
    expect(localKeys).toContain("review_submit");
    expect(localKeys.length).toBeGreaterThanOrEqual(DEFAULT_ONBOARDING_STEP_TEMPLATES.length);
  });
});
