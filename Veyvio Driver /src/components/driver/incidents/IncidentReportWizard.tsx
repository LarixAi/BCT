import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, Phone } from "lucide-react";
import {
  DRIVER_CATEGORY_OPTIONS,
  categoryLabel,
  getInitialFormFields,
  type IncidentCategoryCode,
} from "@veyvio/incidents";
import { AuthPrimaryButton } from "@/components/auth/AuthLayout";
import { HomeCard } from "@/components/driver/home/HomeCard";
import { TriStateField } from "@/components/driver/incidents/TriStateField";
import { Button } from "@/components/ui/button";
import { useIncidentStore } from "@/store/incidents";

type WizardStep = "category" | "context" | "immediate" | "review";

export function IncidentReportWizard({ presetCategory }: { presetCategory?: IncidentCategoryCode }) {
  const navigate = useNavigate();
  const createDraft = useIncidentStore((s) => s.createDraft);
  const updateDraftField = useIncidentStore((s) => s.updateDraftField);
  const confirmDraftContext = useIncidentStore((s) => s.confirmDraftContext);
  const submitInitialReport = useIncidentStore((s) => s.submitInitialReport);
  const activeDraftId = useIncidentStore((s) => s.activeDraftId);
  const draft = useIncidentStore((s) => (activeDraftId ? s.drafts[activeDraftId] : null));

  const [step, setStep] = useState<WizardStep>(presetCategory ? "context" : "category");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (presetCategory && !activeDraftId) {
      createDraft(presetCategory);
    }
  }, [presetCategory, activeDraftId, createDraft]);

  const initialFields = useMemo(
    () => (draft ? getInitialFormFields(draft.categoryCode) : []),
    [draft],
  );

  if (!draft) {
    return (
      <div className="space-y-4">
        <HomeCard tone="amber">
          <p className="font-semibold">Start a new incident report</p>
          <p className="mt-2 text-sm text-muted">Select what happened. Veyvio will link your current vehicle and journey automatically.</p>
        </HomeCard>
        <div className="space-y-2">
          {DRIVER_CATEGORY_OPTIONS.map((option) => (
            <button
              key={option.code}
              type="button"
              className="w-full rounded-xl border border-border bg-card p-4 text-left hover:bg-secondary/40"
              onClick={() => {
                createDraft(option.code);
                setStep("context");
              }}
            >
              <p className="text-sm font-semibold">{option.label}</p>
              <p className="mt-1 text-xs text-muted">{option.description}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  async function handleSubmit() {
    if (!activeDraftId) return;
    setSubmitting(true);
    const result = await submitInitialReport(activeDraftId);
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    toast.success("Emergency report sent to control");
    navigate({ to: "/incidents/$incidentId", params: { incidentId: result.recordId } });
  }

  return (
    <div className="space-y-4">
      <HomeCard tone="red">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-vor" aria-hidden />
          <div>
            <p className="font-semibold">Call 999 first if anyone is in immediate danger.</p>
            <a href="tel:999" className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-link">
              <Phone className="size-4" aria-hidden />
              Emergency — 999
            </a>
          </div>
        </div>
      </HomeCard>

      {step === "context" && (
        <>
          <p className="text-sm text-muted">
            Confirm the details Veyvio already knows. You should not need to retype registration or run references.
          </p>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs text-muted">Incident type</p>
              <p className="text-sm font-semibold">{categoryLabel(draft.categoryCode)}</p>
            </div>
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs text-muted">Current vehicle</p>
              <p className="text-sm font-semibold">{draft.operationalContext.vehicleRegistration ?? "No vehicle linked"}</p>
            </div>
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs text-muted">Current journey</p>
              <p className="text-sm font-semibold">{draft.operationalContext.runReference ?? "No active run linked"}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-muted">Reporting depot</p>
              <p className="text-sm font-semibold">{draft.operationalContext.depotName ?? "Depot not set"}</p>
            </div>
          </div>
          <p className="text-sm font-medium">Is this the correct vehicle, journey and location?</p>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" onClick={() => { confirmDraftContext(activeDraftId!, true); setStep("immediate"); }}>
              Yes
            </Button>
            <Button type="button" variant="outline" onClick={() => toast.message("Contact control to correct journey details before submitting.")}>
              Something is incorrect
            </Button>
          </div>
        </>
      )}

      {step === "immediate" && (
        <>
          <p className="text-sm text-muted">Answer what you know now. Unknown is safer than guessing.</p>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Is anyone in immediate danger?</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "yes", label: "Yes" },
                { value: "emergency_contacted", label: "Emergency services contacted" },
                { value: "no", label: "No" },
                { value: "unknown", label: "Unknown" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateDraftField(activeDraftId!, "immediateDanger", option.value)}
                  className={`min-h-12 rounded-xs border px-3 text-left text-sm font-medium ${
                    draft.immediateDanger.value === option.value
                      ? "border-link bg-link/10"
                      : "border-border bg-card hover:bg-secondary/50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
          {initialFields
            .filter((field) => field.key !== "immediateDanger")
            .map((field) => (
              <TriStateField
                key={field.key}
                label={field.label}
                value={draft.answers[field.key]?.value as import("@veyvio/incidents").TriStateAnswer | undefined}
                onChange={(value) => updateDraftField(activeDraftId!, field.key, value)}
                helpText={field.helpText}
              />
            ))}
          <label className="block space-y-2">
            <span className="text-sm font-semibold">What happened?</span>
            <textarea
              className="min-h-24 w-full rounded-xs border border-border bg-card px-3 py-2 text-sm"
              value={draft.summary}
              onChange={(event) => updateDraftField(activeDraftId!, "summary", event.target.value)}
              placeholder="Short description for control"
            />
          </label>
          <AuthPrimaryButton type="button" onClick={() => setStep("review")}>
            Review emergency report
          </AuthPrimaryButton>
        </>
      )}

      {step === "review" && (
        <>
          <HomeCard tone="teal">
            <p className="font-semibold">Initial safety report</p>
            <p className="mt-2 text-sm text-muted">
              This creates the incident in Admin Command immediately. You can add photos, witnesses, and full details afterwards.
            </p>
          </HomeCard>
          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <p><span className="text-muted">Type:</span> {categoryLabel(draft.categoryCode)}</p>
            <p className="mt-2"><span className="text-muted">Vehicle:</span> {draft.operationalContext.vehicleRegistration ?? "—"}</p>
            <p className="mt-2"><span className="text-muted">Summary:</span> {draft.summary || "—"}</p>
          </div>
          <AuthPrimaryButton type="button" disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? "Sending to control…" : "Submit emergency report"}
          </AuthPrimaryButton>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("immediate")}>
            Back
          </Button>
        </>
      )}
    </div>
  );
}
