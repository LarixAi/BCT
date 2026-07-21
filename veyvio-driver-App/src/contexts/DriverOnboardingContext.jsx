import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  getDriverOnboardingPrefill,
  getDriverOnboardingState,
  uploadDriverDocument,
} from "@/services/onboarding.service";
import { loadDriverDocumentMaps } from "@/services/driver-documents.service";
import { getDriverOnboardingRequirements } from "@/services/driver-requirements.service";
import { friendlyOnboardingError } from "@/lib/onboarding-errors";
import { OnboardingUploadError } from "@/lib/onboarding-upload-error";
import { buildTaskExtras, countCompletedTasks, findNextReadyTask, getVisibleTasks, resolveTaskUiStatus } from "@/lib/onboarding-tasks";
import { onboardingStatusLabel } from "@/lib/onboarding-status";
import { dispatchReadinessLabel } from "@/lib/dispatch-readiness";
import { DEFAULT_ONBOARDING_STEP_TEMPLATES } from "@/lib/onboarding-blueprint";
import { mergeOnboardingFormFromPrefill } from "@/lib/onboarding-form-merge";
import { withTimeout } from "@/lib/withTimeout";

const EMPTY_FORM = {
  phone: "",
  dateOfBirth: "",
  addressLine1: "",
  addressCity: "",
  addressPostcode: "",
  contactName: "",
  relationship: "",
  emergencyPhone: "",
  emergencySecondaryPhone: "",
  dbsExpiry: "",
  licenceNumber: "",
  licenceCategories: "D",
  licenceExpiry: "",
  dvlaCheckCode: "",
  penaltyPoints: "",
  dqcNumber: "",
  cpcExpiry: "",
  tachoCardNumber: "",
  tachoCardExpiry: "",
  fitToDrive: false,
  eyesight: false,
  fatigueAccepted: false,
};

const DriverOnboardingContext = createContext(null);

export function DriverOnboardingProvider({ driver, organisationId, onRefresh, children }) {
  const [state, setState] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const [requirements, setRequirements] = useState({ requiresDbs: driver.canDoSchoolRuns });
  const [form, setForm] = useState({ ...EMPTY_FORM, phone: driver.phone ?? "" });
  const [documentsByStep, setDocumentsByStep] = useState({});
  const [documentsByType, setDocumentsByType] = useState({});
  const [acceptedPolicies, setAcceptedPolicies] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploadByStep, setUploadByStep] = useState({});

  const load = useCallback(async () => {
    const emptyPrefill = {
      form: {},
      documentsByStep: {},
      documentsByType: {},
      fullName: driver.fullName,
      adminProvided: {},
      hasAdminData: false,
    };
    const emptyState = {
      steps: DEFAULT_ONBOARDING_STEP_TEMPLATES.map((t, i) => ({
        id: `template-${i}`,
        stepKey: t.stepKey,
        stepLabel: t.stepLabel,
        required: t.required,
        status: "pending",
        reviewStatus: null,
      })),
      isEditable: true,
      canonicalOnboardingStatus: driver.onboardingStatus ?? "in_progress",
      dispatchBand: "blocked",
      resubmitRequestedItems: [],
      rejectionReason: null,
    };

    const settled = await Promise.allSettled([
      withTimeout(getDriverOnboardingState(driver), 8000, null),
      withTimeout(getDriverOnboardingPrefill(driver.id), 8000, null),
      withTimeout(getDriverOnboardingRequirements(driver.id), 5000, null),
    ]);

    const onboardingState =
      settled[0].status === "fulfilled" && settled[0].value ? settled[0].value : emptyState;
    const prefillData =
      settled[1].status === "fulfilled" && settled[1].value ? settled[1].value : emptyPrefill;
    const req =
      settled[2].status === "fulfilled" && settled[2].value
        ? settled[2].value
        : { requiresDbs: Boolean(driver.canDoSchoolRuns) };

    if (settled[0].status === "rejected" || !settled[0].value) {
      console.warn(
        "[onboarding load] state unavailable — showing empty checklist",
        settled[0].status === "rejected" ? settled[0].reason : "timeout",
      );
    }
    if (settled[1].status === "rejected" || !settled[1].value) {
      console.warn(
        "[onboarding load] prefill unavailable",
        settled[1].status === "rejected" ? settled[1].reason : "timeout",
      );
    }

    setState(onboardingState);
    setPrefill(prefillData);
    setRequirements(req);
    setForm((prev) => mergeOnboardingFormFromPrefill(prev, prefillData.form ?? {}));
    setDocumentsByStep((prev) => ({ ...prev, ...(prefillData.documentsByStep ?? {}) }));
    setDocumentsByType((prev) => ({ ...prev, ...(prefillData.documentsByType ?? {}) }));
    return { onboardingState, prefillData, req };
  }, [driver]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .catch((err) => console.error("[onboarding load]", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const refresh = useCallback(
    async (options = {}) => {
      const { syncParent = true } = options;
      const result = await load();
      if (syncParent) await onRefresh?.();
      return result;
    },
    [load, onRefresh],
  );

  const visibleTasks = useMemo(() => getVisibleTasks(driver, requirements), [driver, requirements]);

  const taskExtras = useMemo(
    () =>
      buildTaskExtras({
        visibleTasks,
        documentsByStep,
        form,
        prefill,
        state,
      }),
    [visibleTasks, documentsByStep, form, prefill, state],
  );

  const getTaskStatus = useCallback(
    (task) =>
      resolveTaskUiStatus(task, {
        steps: state?.steps,
        resubmitRequestedItems: state?.resubmitRequestedItems ?? [],
        isEditable: state?.isEditable !== false,
        extras: taskExtras,
      }),
    [state, taskExtras],
  );

  const progress = useMemo(
    () => countCompletedTasks(driver, state, { ...prefill, documentsByStep, form }, requirements),
    [driver, state, prefill, documentsByStep, form, requirements],
  );

  const nextTask = useMemo(() => {
    const fromServer = prefill?.suggestedNextStepKey
      ? visibleTasks.find((t) => t.stepKey === prefill.suggestedNextStepKey)
      : null;
    if (fromServer) {
      const status = resolveTaskUiStatus(fromServer, {
        steps: state?.steps,
        resubmitRequestedItems: state?.resubmitRequestedItems ?? [],
        isEditable: state?.isEditable !== false,
        extras: taskExtras,
      });
      if (status === "ready" || status === "action_required") return fromServer;
    }
    return findNextReadyTask(driver, state, { ...prefill, documentsByStep, form }, requirements);
  }, [driver, state, prefill, documentsByStep, form, requirements, visibleTasks, taskExtras]);

  const isEditable = state?.isEditable !== false;
  const adminProvided = prefill?.adminProvided ?? {};
  const statusLabel = onboardingStatusLabel(state?.canonicalOnboardingStatus ?? "in_progress");
  const dispatchLabel = dispatchReadinessLabel(state?.dispatchBand ?? "blocked");

  async function handleUpload(documentType, _stepKey, file) {
    if (!file || !isEditable) return;
    setUploadByStep((prev) => ({
      ...prev,
      [documentType]: { status: "uploading", error: "" },
    }));
    try {
      await uploadDriverDocument(driver, { documentType, file });
      const docMaps = await loadDriverDocumentMaps(driver.id);
      setDocumentsByStep(docMaps.documentsByStep ?? {});
      setDocumentsByType(docMaps.documentsByType ?? {});
      setUploadByStep((prev) => ({
        ...prev,
        [documentType]: { status: "success", error: "" },
      }));
      // Sync checklist/documents only — avoid parent session refresh (can remount routes)
      // and preserve unsaved form fields on this screen.
      await refresh({ syncParent: false });
    } catch (err) {
      const context = err instanceof OnboardingUploadError && err.storageUploaded ? "upload-metadata" : "upload";
      const message =
        err instanceof OnboardingUploadError ? err.message : friendlyOnboardingError(err, context);
      setUploadByStep((prev) => ({
        ...prev,
        [documentType]: { status: "error", error: message },
      }));
    }
  }

  function clearUploadError(documentType) {
    setUploadByStep((prev) => ({
      ...prev,
      [documentType]: { status: "idle", error: "" },
    }));
  }

  function getUploadState(documentType) {
    return uploadByStep[documentType] ?? { status: "idle", error: "" };
  }

  function canOpenTask(task) {
    const status = getTaskStatus(task);
    if (status === "locked" || status === "pending_review" || status === "approved") return false;
    if (!isEditable && status !== "action_required") return false;
    return true;
  }

  const value = {
    driver,
    organisationId,
    state,
    prefill,
    requirements,
    form,
    setForm,
    documentsByStep,
    documentsByType,
    acceptedPolicies,
    setAcceptedPolicies,
    loading,
    refresh,
    visibleTasks,
    getTaskStatus,
    canOpenTask,
    progress,
    nextTask,
    isEditable,
    adminProvided,
    statusLabel,
    dispatchLabel,
    getUploadState,
    clearUploadError,
    handleUpload,
  };

  return <DriverOnboardingContext.Provider value={value}>{children}</DriverOnboardingContext.Provider>;
}

export function useDriverOnboarding() {
  const ctx = useContext(DriverOnboardingContext);
  if (!ctx) throw new Error("useDriverOnboarding must be used within DriverOnboardingProvider");
  return ctx;
}
