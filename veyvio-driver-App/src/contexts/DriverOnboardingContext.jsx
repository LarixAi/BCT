import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  getDriverOnboardingPrefill,
  getDriverOnboardingState,
  uploadDriverDocument,
} from "@/services/onboarding.service";
import { getDriverOnboardingRequirements } from "@/services/driver-requirements.service";
import { friendlyOnboardingError } from "@/lib/onboarding-errors";
import { OnboardingUploadError } from "@/lib/onboarding-upload-error";
import { countCompletedTasks, findNextReadyTask, getVisibleTasks, resolveTaskUiStatus } from "@/lib/onboarding-tasks";
import { onboardingStatusLabel } from "@/lib/onboarding-status";
import { dispatchReadinessLabel } from "@/lib/dispatch-readiness";

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
    const [onboardingState, prefillData, req] = await Promise.all([
      getDriverOnboardingState(driver),
      getDriverOnboardingPrefill(driver.id),
      getDriverOnboardingRequirements(driver.id),
    ]);
    setState(onboardingState);
    setPrefill(prefillData);
    setRequirements(req);
    setForm((prev) => ({ ...prev, ...prefillData.form }));
    setDocumentsByStep(prefillData.documentsByStep ?? {});
    setDocumentsByType(prefillData.documentsByType ?? {});
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

  const refresh = useCallback(async () => {
    const result = await load();
    await onRefresh?.();
    return result;
  }, [load, onRefresh]);

  const visibleTasks = useMemo(() => getVisibleTasks(driver, requirements), [driver, requirements]);

  const taskExtras = useMemo(
    () => ({
      visibleTasks,
      documentsByStep,
      tachographComplete: Boolean(form.tachoCardNumber?.trim() && form.tachoCardExpiry),
    }),
    [visibleTasks, documentsByStep, form.tachoCardNumber, form.tachoCardExpiry],
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

  const nextTask = useMemo(
    () => findNextReadyTask(driver, state, { ...prefill, documentsByStep, form }, requirements),
    [driver, state, prefill, documentsByStep, form, requirements],
  );

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
      const prefillData = await getDriverOnboardingPrefill(driver.id);
      setDocumentsByStep(prefillData.documentsByStep ?? {});
      setDocumentsByType(prefillData.documentsByType ?? {});
      setUploadByStep((prev) => ({
        ...prev,
        [documentType]: { status: "success", error: "" },
      }));
      await refresh();
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
