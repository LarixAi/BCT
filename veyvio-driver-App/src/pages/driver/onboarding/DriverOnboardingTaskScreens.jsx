import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingFormShell from "@/components/driver/onboarding/OnboardingFormShell";
import DocumentUploadCard from "@/components/driver/onboarding/DocumentUploadCard";
import OnboardingTaskRow from "@/components/driver/onboarding/OnboardingTaskRow";
import VehicleCheckTrainingGuide from "@/components/driver/onboarding/VehicleCheckTrainingGuide";
import {
  OnboardingFormField,
  OnboardingReadOnlyField,
  OnboardingToggleField,
} from "@/components/driver/onboarding/OnboardingFormField";
import { useDriverOnboarding } from "@/contexts/DriverOnboardingContext";
import { friendlyOnboardingError } from "@/lib/onboarding-errors";
import { VEHICLE_CHECK_TRAINING_ACKS } from "@/lib/dailyVehicleChecks";
import { CARD_DOCUMENT_UPLOADS, hasAllRequiredDocuments } from "@/lib/onboarding-document-requirements";
import { findNextReadyTask, taskRoute } from "@/lib/onboarding-tasks";
import { DRIVER_POLICIES } from "@/lib/onboarding-blueprint";
import DriverPolicyAcceptRow from "@/components/driver/policies/DriverPolicyAcceptRow";
import DriverPolicyViewer from "@/components/driver/policies/DriverPolicyViewer";
import {
  CardDocumentUploadSection,
  useCardDocumentUpload,
} from "@/components/driver/onboarding/CardDocumentUploadSection";
import {
  acceptDefectReportingPolicy,
  acceptHandbookPolicies,
  completeVehicleCheckTraining,
  saveMedicalDeclaration,
  submitOnboardingForReview,
  updateAddressAndEmergency,
  updateDriverProfile,
  updateDbsDetails,
  updateDqcDetails,
  updateDvlaCheckCode,
  updateLicenceDetails,
  updateTachographDetails,
  markDocumentStepComplete,
} from "@/services/onboarding.service";

function useTaskSave() {
  const { refresh, driver, form, documentsByStep, requirements } = useDriverOnboarding();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function run(saveFn, { backToHub = true, goToNext = true, onSuccess } = {}) {
    setPending(true);
    setError("");
    try {
      await saveFn();
      const result = await refresh();
      if (onSuccess) await onSuccess();
      if (goToNext) {
        const onboardingState = result?.onboardingState;
        const prefillData = result?.prefillData;
        const req = result?.req ?? requirements;
        const next = findNextReadyTask(
          driver,
          onboardingState,
          {
            ...(prefillData ?? {}),
            documentsByStep: prefillData?.documentsByStep ?? documentsByStep,
            form: { ...form, ...(prefillData?.form ?? {}) },
          },
          req,
        );
        if (next && next.id !== "create_account") {
          navigate(taskRoute(next.id));
          return;
        }
      }
      if (backToHub) navigate("/onboarding");
    } catch (err) {
      setError(friendlyOnboardingError(err, "save"));
    } finally {
      setPending(false);
    }
  }

  return { pending, error, run, setError };
}

const DOC_TYPES = {
  driving_licence: "driving_licence",
  dqc_cpc: "dqc",
  dbs_safeguarding: "dbs",
  right_to_work: "right_to_work",
};

function useDocUpload(stepKey) {
  const { documentsByStep, documentsByType, handleUpload, getUploadState, clearUploadError, isEditable } =
    useDriverOnboarding();
  const legacyType = DOC_TYPES[stepKey];
  const { status, error } = getUploadState(legacyType);
  return {
    doc: documentsByType[legacyType] ?? documentsByStep[stepKey],
    onFile: (file) => handleUpload(legacyType, stepKey, file),
    status,
    error,
    onRetry: () => clearUploadError(legacyType),
    readOnly: !isEditable,
    hasAllRequired: hasAllRequiredDocuments(stepKey, documentsByType),
  };
}

export function DriverProfileDetailsScreen() {
  const navigate = useNavigate();
  const { driver, organisationId, form, setForm, adminProvided, isEditable } = useDriverOnboarding();
  const { pending, error, run } = useTaskSave();

  return (
    <OnboardingFormShell
      title="Personal profile"
      helper="Confirm your contact details. Your name and email come from your invite."
      onBack={() => navigate("/onboarding")}
      onSecondary={() => navigate("/onboarding")}
      onPrimary={() => run(() => updateDriverProfile(driver.id, organisationId, form))}
      primaryPending={pending}
      primaryDisabled={!isEditable}
      error={error}
    >
      <OnboardingReadOnlyField label="Full name" value={driver.fullName} />
      <OnboardingReadOnlyField label="Email" value={driver.email} />
      <OnboardingFormField
        label="Phone"
        value={form.phone}
        onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
        adminProvided={adminProvided.phone}
        readOnly={!isEditable}
      />
      <OnboardingFormField
        label="Date of birth"
        type="date"
        value={form.dateOfBirth}
        onChange={(v) => setForm((f) => ({ ...f, dateOfBirth: v }))}
        adminProvided={adminProvided.dateOfBirth}
        readOnly={!isEditable}
      />
    </OnboardingFormShell>
  );
}

export function DriverAddressEmergencyScreen() {
  const navigate = useNavigate();
  const { driver, organisationId, form, setForm, adminProvided, isEditable } = useDriverOnboarding();
  const { pending, error, run } = useTaskSave();

  return (
    <OnboardingFormShell
      title="Address & emergency contact"
      helper="Where you live and who we should contact in an emergency."
      onBack={() => navigate("/onboarding")}
      onSecondary={() => navigate("/onboarding")}
      onPrimary={() => run(() => updateAddressAndEmergency(driver.id, organisationId, form))}
      primaryPending={pending}
      primaryDisabled={!isEditable}
      error={error}
    >
      <OnboardingFormField label="Address line 1" value={form.addressLine1} onChange={(v) => setForm((f) => ({ ...f, addressLine1: v }))} adminProvided={adminProvided.addressLine1} readOnly={!isEditable} />
      <OnboardingFormField label="City" value={form.addressCity} onChange={(v) => setForm((f) => ({ ...f, addressCity: v }))} adminProvided={adminProvided.addressCity} readOnly={!isEditable} />
      <OnboardingFormField label="Postcode" value={form.addressPostcode} onChange={(v) => setForm((f) => ({ ...f, addressPostcode: v }))} adminProvided={adminProvided.addressPostcode} readOnly={!isEditable} />
      <OnboardingFormField label="Emergency contact name" value={form.contactName} onChange={(v) => setForm((f) => ({ ...f, contactName: v }))} adminProvided={adminProvided.contactName} readOnly={!isEditable} />
      <OnboardingFormField label="Relationship" value={form.relationship} onChange={(v) => setForm((f) => ({ ...f, relationship: v }))} adminProvided={adminProvided.relationship} readOnly={!isEditable} />
      <OnboardingFormField label="Emergency phone" value={form.emergencyPhone} onChange={(v) => setForm((f) => ({ ...f, emergencyPhone: v }))} adminProvided={adminProvided.emergencyPhone} readOnly={!isEditable} />
      <OnboardingFormField label="Secondary phone (optional)" value={form.emergencySecondaryPhone} onChange={(v) => setForm((f) => ({ ...f, emergencySecondaryPhone: v }))} adminProvided={adminProvided.emergencySecondaryPhone} readOnly={!isEditable} placeholder="Another number if we cannot reach them" />
    </OnboardingFormShell>
  );
}

export function DriverLicenceScreen() {
  const navigate = useNavigate();
  const { driver, organisationId, form, setForm, adminProvided, isEditable, documentsByType } =
    useDriverOnboarding();
  const { pending, error, run, setError } = useTaskSave();
  const cardUploads = useCardDocumentUpload("driving_licence", CARD_DOCUMENT_UPLOADS.driving_licence);

  return (
    <OnboardingFormShell
      title="Driving licence details"
      helper="Enter your photocard details and upload clear photos of the front and back of your licence."
      onBack={() => navigate("/onboarding")}
      onSecondary={() => navigate("/onboarding")}
      onPrimary={() => {
        if (!hasAllRequiredDocuments("driving_licence", documentsByType)) {
          setError("Please upload photos of the front and back of your driving licence.");
          return;
        }
        if (!form.licenceNumber?.trim()) {
          setError("Please enter your licence number.");
          return;
        }
        if (!form.licenceExpiry?.trim()) {
          setError("Please enter your licence expiry date.");
          return;
        }
        run(() => updateLicenceDetails(driver.id, organisationId, form));
      }}
      primaryPending={pending}
      primaryDisabled={!isEditable}
      error={error}
    >
      <OnboardingFormField label="Licence number" value={form.licenceNumber} onChange={(v) => setForm((f) => ({ ...f, licenceNumber: v }))} adminProvided={adminProvided.licenceNumber} readOnly={!isEditable} />
      <OnboardingFormField label="Categories" value={form.licenceCategories} onChange={(v) => setForm((f) => ({ ...f, licenceCategories: v }))} adminProvided={adminProvided.licenceCategories} readOnly={!isEditable} />
      <OnboardingFormField label="Expiry date" type="date" value={form.licenceExpiry} onChange={(v) => setForm((f) => ({ ...f, licenceExpiry: v }))} adminProvided={adminProvided.licenceExpiry} readOnly={!isEditable} />
      <OnboardingFormField label="Penalty points" value={form.penaltyPoints} onChange={(v) => setForm((f) => ({ ...f, penaltyPoints: v }))} adminProvided={adminProvided.penaltyPoints} readOnly={!isEditable} />
      <CardDocumentUploadSection uploads={cardUploads} />
    </OnboardingFormShell>
  );
}

export function DriverDvlaCheckScreen() {
  const navigate = useNavigate();
  const { driver, organisationId, form, setForm, adminProvided, isEditable } = useDriverOnboarding();
  const { pending, error, run } = useTaskSave();

  return (
    <OnboardingFormShell
      title="DVLA licence check"
      helper="Generate a check code on GOV.UK and enter it here so your transport team can verify your licence."
      onBack={() => navigate("/onboarding")}
      onSecondary={() => navigate("/onboarding")}
      onPrimary={() => run(() => updateDvlaCheckCode(driver.id, organisationId, form.dvlaCheckCode))}
      primaryPending={pending}
      primaryDisabled={!isEditable}
      error={error}
    >
      <OnboardingFormField label="DVLA check code" value={form.dvlaCheckCode} onChange={(v) => setForm((f) => ({ ...f, dvlaCheckCode: v }))} adminProvided={adminProvided.dvlaCheckCode} readOnly={!isEditable} placeholder="e.g. ABC1234567890" />
    </OnboardingFormShell>
  );
}

export function DriverDqcCpcScreen() {
  const navigate = useNavigate();
  const { driver, organisationId, form, setForm, adminProvided, isEditable, documentsByType } =
    useDriverOnboarding();
  const { pending, error, run, setError } = useTaskSave();
  const cardUploads = useCardDocumentUpload("dqc_cpc", CARD_DOCUMENT_UPLOADS.dqc_cpc);

  return (
    <OnboardingFormShell
      title="DQC / CPC card"
      helper="Enter your Driver Qualification Card details and upload clear photos of the front and back."
      onBack={() => navigate("/onboarding")}
      onSecondary={() => navigate("/onboarding")}
      onPrimary={() => {
        if (!hasAllRequiredDocuments("dqc_cpc", documentsByType)) {
          setError("Please upload photos of the front and back of your DQC / CPC card.");
          return;
        }
        if (!form.dqcNumber?.trim()) {
          setError("Please enter your DQC number.");
          return;
        }
        if (!form.cpcExpiry?.trim()) {
          setError("Please enter your DQC / CPC expiry date.");
          return;
        }
        run(() => updateDqcDetails(driver.id, organisationId, form));
      }}
      primaryPending={pending}
      primaryDisabled={!isEditable}
      error={error}
    >
      <OnboardingFormField label="DQC number" value={form.dqcNumber} onChange={(v) => setForm((f) => ({ ...f, dqcNumber: v }))} adminProvided={adminProvided.dqcNumber} readOnly={!isEditable} />
      <OnboardingFormField label="DQC / CPC expiry" type="date" value={form.cpcExpiry} onChange={(v) => setForm((f) => ({ ...f, cpcExpiry: v }))} adminProvided={adminProvided.cpcExpiry} readOnly={!isEditable} />
      <CardDocumentUploadSection uploads={cardUploads} />
    </OnboardingFormShell>
  );
}

export function DriverTachographCardScreen() {
  const navigate = useNavigate();
  const { driver, organisationId, form, setForm, adminProvided, isEditable } = useDriverOnboarding();
  const { pending, error, run } = useTaskSave();

  return (
    <OnboardingFormShell
      title="Tachograph card"
      helper="Enter your digital tachograph card number and expiry date."
      onBack={() => navigate("/onboarding")}
      onSecondary={() => navigate("/onboarding")}
      onPrimary={() => run(() => updateTachographDetails(driver.id, organisationId, form))}
      primaryPending={pending}
      primaryDisabled={!isEditable}
      error={error}
    >
      <OnboardingFormField label="Tachograph card number" value={form.tachoCardNumber} onChange={(v) => setForm((f) => ({ ...f, tachoCardNumber: v }))} adminProvided={adminProvided.tachoCardNumber} readOnly={!isEditable} />
      <OnboardingFormField label="Card expiry" type="date" value={form.tachoCardExpiry} onChange={(v) => setForm((f) => ({ ...f, tachoCardExpiry: v }))} adminProvided={adminProvided.tachoCardExpiry} readOnly={!isEditable} />
    </OnboardingFormShell>
  );
}

export function DriverDbsSafeguardingScreen() {
  const navigate = useNavigate();
  const { driver, organisationId, form, setForm, adminProvided, isEditable } = useDriverOnboarding();
  const { pending, error, run, setError } = useTaskSave();
  const upload = useDocUpload("dbs_safeguarding");

  return (
    <OnboardingFormShell
      title="DBS / safeguarding"
      helper="Enter your DBS certificate expiry date and upload your enhanced DBS certificate for school transport work."
      onBack={() => navigate("/onboarding")}
      onSecondary={() => navigate("/onboarding")}
      onPrimary={() => {
        if (!form.dbsExpiry?.trim()) {
          setError("Please enter your DBS certificate expiry date.");
          return;
        }
        if (!upload.doc) {
          setError("Please upload your DBS certificate.");
          return;
        }
        run(() => updateDbsDetails(driver.id, organisationId, form));
      }}
      primaryPending={pending}
      primaryDisabled={!isEditable}
      error={error}
    >
      <OnboardingFormField label="DBS certificate expiry" type="date" value={form.dbsExpiry} onChange={(v) => setForm((f) => ({ ...f, dbsExpiry: v }))} adminProvided={adminProvided.dbsExpiry} readOnly={!isEditable} />
      <DocumentUploadCard label="Upload DBS certificate" document={upload.doc} onFile={upload.onFile} status={upload.status} error={upload.error} onRetry={upload.onRetry} readOnly={upload.readOnly} />
    </OnboardingFormShell>
  );
}

export function DriverRightToWorkScreen() {
  const navigate = useNavigate();
  const { driver, organisationId, isEditable } = useDriverOnboarding();
  const { pending, error, run, setError } = useTaskSave();
  const upload = useDocUpload("right_to_work");

  return (
    <OnboardingFormShell
      title="Right to work"
      helper="Upload proof that you are allowed to work in the UK."
      onBack={() => navigate("/onboarding")}
      onSecondary={() => navigate("/onboarding")}
      onPrimary={() => {
        if (!upload.doc) {
          setError("Please upload your right-to-work document.");
          return;
        }
        run(() => markDocumentStepComplete(driver.id, "right_to_work", organisationId));
      }}
      primaryPending={pending}
      primaryDisabled={!isEditable}
      error={error}
    >
      <DocumentUploadCard label="Upload right to work document" document={upload.doc} onFile={upload.onFile} status={upload.status} error={upload.error} onRetry={upload.onRetry} readOnly={upload.readOnly} />
    </OnboardingFormShell>
  );
}

export function DriverMedicalDeclarationScreen() {
  const navigate = useNavigate();
  const { driver, organisationId, form, setForm, isEditable } = useDriverOnboarding();
  const { pending, error, run, setError } = useTaskSave();

  return (
    <OnboardingFormShell
      title="Medical / fitness declaration"
      helper="Confirm you meet the medical and fitness standards to drive passengers."
      onBack={() => navigate("/onboarding")}
      onSecondary={() => navigate("/onboarding")}
      onPrimary={() => {
        if (!form.fitToDrive || !form.eyesight || !form.fatigueAccepted) {
          setError("Please confirm all declarations before continuing.");
          return;
        }
        run(() =>
          saveMedicalDeclaration(driver.id, organisationId, {
            fitToDrive: form.fitToDrive,
            eyesight: form.eyesight,
            medicationDeclared: false,
            conditionDeclared: false,
            fatigueAccepted: form.fatigueAccepted,
          }),
        );
      }}
      primaryPending={pending}
      primaryDisabled={!isEditable}
      error={error}
    >
      <OnboardingToggleField label="I confirm I am fit to drive" checked={form.fitToDrive} onChange={(v) => setForm((f) => ({ ...f, fitToDrive: v }))} disabled={!isEditable} />
      <OnboardingToggleField label="I confirm my eyesight meets the required standard" checked={form.eyesight} onChange={(v) => setForm((f) => ({ ...f, eyesight: v }))} disabled={!isEditable} />
      <OnboardingToggleField label="I accept the fatigue / fitness to drive policy" checked={form.fatigueAccepted} onChange={(v) => setForm((f) => ({ ...f, fatigueAccepted: v }))} disabled={!isEditable} />
    </OnboardingFormShell>
  );
}

const HANDBOOK_POLICY_KEYS = [
  "driver_handbook",
  "safeguarding_policy",
  "vehicle_check_policy",
  "data_protection_policy",
  "mobile_phone_policy",
  "fatigue_policy",
];

export function DriverPolicyAcknowledgementScreen() {
  const navigate = useNavigate();
  const { driver, organisationId, acceptedPolicies, setAcceptedPolicies, isEditable } = useDriverOnboarding();
  const { pending, error, run, setError } = useTaskSave();
  const [viewedPolicies, setViewedPolicies] = useState(() => new Set());
  const [openPolicyKey, setOpenPolicyKey] = useState(null);

  const policies = DRIVER_POLICIES.filter((p) =>
    driver.canDoSchoolRuns ? HANDBOOK_POLICY_KEYS.includes(p.policyKey) : HANDBOOK_POLICY_KEYS.filter((k) => k !== "safeguarding_policy").includes(p.policyKey),
  );

  const acceptedSet = new Set(
    Object.entries(acceptedPolicies ?? {})
      .filter(([, v]) => v)
      .map(([k]) => k),
  );

  return (
    <>
      <OnboardingFormShell
        title="Driver handbook"
        helper="Read each policy, then accept them all before you drive."
        onBack={() => navigate("/onboarding")}
        onSecondary={() => navigate("/onboarding")}
        onPrimary={() => {
          const keys = policies.filter((p) => acceptedPolicies[p.policyKey]).map((p) => p.policyKey);
          if (keys.length < policies.length) {
            setError("Please read and accept all policies to continue.");
            return;
          }
          run(() => acceptHandbookPolicies(driver.id, organisationId, keys));
        }}
        primaryPending={pending}
        primaryDisabled={!isEditable}
        error={error}
      >
        <div className={`divide-y divide-border rounded-2xl border border-border overflow-hidden`}>
          {policies.map((p) => (
            <DriverPolicyAcceptRow
              key={p.policyKey}
              policy={p}
              viewed={viewedPolicies}
              accepted={acceptedSet}
              onRead={setOpenPolicyKey}
              onAccept={(key, checked) =>
                setAcceptedPolicies((prev) => ({ ...prev, [key]: checked }))
              }
              disabled={!isEditable}
            />
          ))}
        </div>
      </OnboardingFormShell>
      {openPolicyKey != null ? (
        <DriverPolicyViewer
          policyKey={openPolicyKey}
          onClose={() => setOpenPolicyKey(null)}
          onMarkRead={(key) => setViewedPolicies((prev) => new Set(prev).add(key))}
        />
      ) : null}
    </>
  );
}

export function DriverTrainingChecklistScreen() {
  const navigate = useNavigate();
  const { driver, organisationId, isEditable } = useDriverOnboarding();
  const { pending, error, run, setError } = useTaskSave();
  const [trainingAcks, setTrainingAcks] = useState(() =>
    Object.fromEntries(VEHICLE_CHECK_TRAINING_ACKS.map((a) => [a.key, false])),
  );

  const allAcknowledged = VEHICLE_CHECK_TRAINING_ACKS.every((a) => trainingAcks[a.key]);
  const ackItems = VEHICLE_CHECK_TRAINING_ACKS.map((a) => ({ ...a, checked: trainingAcks[a.key] }));

  return (
    <OnboardingFormShell
      title="Vehicle check training"
      helper="Learn how daily walkaround checks work in the driver app — you'll use this every shift before going on duty."
      onBack={() => navigate("/onboarding")}
      onSecondary={() => navigate("/onboarding")}
      onPrimary={() => {
        if (!allAcknowledged) {
          setError("Please confirm all four statements before continuing.");
          return;
        }
        run(() => completeVehicleCheckTraining(driver.id, organisationId));
      }}
      primaryPending={pending}
      primaryDisabled={!isEditable || !allAcknowledged}
      error={error}
      footerNote="Your first real check will be on the home screen after admin approval."
    >
      <VehicleCheckTrainingGuide
        acknowledgments={ackItems}
        onAckChange={(key, value) => setTrainingAcks((prev) => ({ ...prev, [key]: value }))}
        readOnly={!isEditable}
      />
    </OnboardingFormShell>
  );
}

export function DriverDefectPolicyScreen() {
  const navigate = useNavigate();
  const { driver, organisationId, acceptedPolicies, setAcceptedPolicies, isEditable } = useDriverOnboarding();
  const { pending, error, run, setError } = useTaskSave();

  return (
    <OnboardingFormShell
      title="Defect reporting policy"
      helper="Confirm you understand how to report vehicle defects to keep passengers safe."
      onBack={() => navigate("/onboarding")}
      onSecondary={() => navigate("/onboarding")}
      onPrimary={() => {
        if (!acceptedPolicies.defect_policy) {
          setError("Please accept the defect reporting policy.");
          return;
        }
        run(() => acceptDefectReportingPolicy(driver.id, organisationId));
      }}
      primaryPending={pending}
      primaryDisabled={!isEditable}
      error={error}
    >
      <OnboardingToggleField
        label="I have read and accept the defect reporting policy"
        checked={Boolean(acceptedPolicies.defect_policy)}
        onChange={(v) => setAcceptedPolicies((prev) => ({ ...prev, defect_policy: v }))}
        disabled={!isEditable}
      />
      <OnboardingToggleField
        label="I understand incident reporting requirements"
        checked={Boolean(acceptedPolicies.incident_policy)}
        onChange={(v) => setAcceptedPolicies((prev) => ({ ...prev, incident_policy: v }))}
        disabled={!isEditable}
      />
    </OnboardingFormShell>
  );
}

export function DriverOnboardingReviewScreen({ onSubmitted }) {
  const navigate = useNavigate();
  const { driver, organisationId, form, visibleTasks, getTaskStatus, canOpenTask, isEditable, refresh } = useDriverOnboarding();
  const { pending, error, run, setError } = useTaskSave();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const incomplete = visibleTasks.filter(
    (t) => t.required && t.id !== "review" && !["completed", "approved", "pending_review"].includes(getTaskStatus(t)),
  );

  return (
    <OnboardingFormShell
      title="Submit for admin review"
      helper="Check everything looks correct. After you submit, your details will be locked until the transport team approves you."
      onBack={() => navigate("/onboarding")}
      onSecondary={() => navigate("/onboarding")}
      primaryDisabled={false}
      primaryLabel={
        pending
          ? "Submitting…"
          : !isEditable
            ? "Already submitted — refresh status"
            : "Submit for admin review"
      }
      onPrimary={() => {
        if (incomplete.length > 0) {
          setError(`Please complete: ${incomplete.map((t) => t.title).join(", ")}`);
          return;
        }
        if (!isEditable) {
          void refresh().then(() => onSubmitted?.());
          return;
        }
        void run(() => submitOnboardingForReview(driver.id, organisationId, form), {
          backToHub: false,
          goToNext: false,
          onSuccess: onSubmitted,
        });
      }}
      primaryPending={pending}
      error={error}
      footerNote={
        incomplete.length > 0
          ? "Tap any incomplete task below to open it, then return here to submit."
          : undefined
      }
    >
      <div className="space-y-3 text-sm">
        <ReviewRow label="Phone" value={form.phone} />
        <ReviewRow label="Address" value={[form.addressLine1, form.addressCity, form.addressPostcode].filter(Boolean).join(", ")} />
        <ReviewRow label="Emergency contact" value={`${form.contactName} — ${form.emergencyPhone}`} />
        {form.emergencySecondaryPhone ? (
          <ReviewRow label="Emergency secondary phone" value={form.emergencySecondaryPhone} />
        ) : null}
        <ReviewRow label="Licence" value={form.licenceNumber} />
        <ReviewRow label="DQC" value={form.dqcNumber} />
        {form.dbsExpiry ? <ReviewRow label="DBS expiry" value={form.dbsExpiry} /> : null}
      </div>
      <div className="pt-4 space-y-3 border-t border-border">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Onboarding checklist</p>
          <p className="text-xs text-muted-foreground mt-1">Tap a task to open it and complete or review your answers.</p>
        </div>
        <div className="rounded-xl border border-border overflow-hidden bg-background">
          {visibleTasks
            .filter((t) => t.id !== "review")
            .map((task) => (
              <OnboardingTaskRow
                key={task.id}
                task={task}
                status={getTaskStatus(task)}
                disabled={!canOpenTask(task)}
                onPress={() => {
                  if (!canOpenTask(task)) return;
                  navigate(taskRoute(task.id));
                }}
              />
            ))}
        </div>
      </div>
      {incomplete.length > 0 ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-amber-900 text-xs leading-relaxed">
            {incomplete.length} task{incomplete.length === 1 ? "" : "s"} still need attention before you can submit.
          </p>
        </div>
      ) : null}
    </OnboardingFormShell>
  );
}

function ReviewRow({ label, value }) {
  if (!value?.trim()) return null;
  return (
    <div className="rounded-lg bg-muted/40 border border-border px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}
