import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PsvIncidentReportWizard from "@/components/driver/incidents/PsvIncidentReportWizard";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import { op } from "@/lib/driver-operational-theme";
import { getSosOption } from "@/lib/tflIncidentTypes";
import { reportIncidentViaCommand } from "@/services/command-driver-ops.service";
import { reportDriverIncident } from "@/services/incidents.service";

export default function DriverSupabaseIncidentReport({ driver }) {
  const navigate = useNavigate();
  const { state: routeState } = useLocation();
  const sosOption = getSosOption(routeState?.sosType);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (form) => {
    setSubmitting(true);
    setError("");
    const sosContext =
      routeState?.sosType && routeState?.sosLabel
        ? { sosType: routeState.sosType, sosLabel: routeState.sosLabel }
        : null;

    const description =
      form?.description ||
      form?.whatHappened ||
      form?.summary ||
      [sosContext?.sosLabel, form?.incidentType].filter(Boolean).join(" — ") ||
      "Driver incident report";

    // Prefer Command so Admin Incidents hub receives the report.
    const commandResult = await reportIncidentViaCommand({
      description,
      incidentType: form?.incidentType || sosContext?.sosType || "general",
      severity: form?.severity || "medium",
      occurredAt: form?.occurredAt || new Date().toISOString(),
      location: form?.location || {},
      vehicleId: form?.vehicleId,
    });

    if (commandResult.ok) {
      setSubmitting(false);
      setDone(true);
      return { ok: true };
    }

    // Fallback to legacy Ridova path if Command endpoint is not deployed yet.
    const result = await reportDriverIncident(driver, { form, photos: form.photos, sosContext });
    setSubmitting(false);
    if (!result.ok) {
      setError(commandResult.message || result.message);
      return { ok: false };
    }
    setDone(true);
    return { ok: true };
  };

  if (done) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center">
        <h2 className="text-xl font-bold text-foreground">Report submitted</h2>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Your transport manager has been notified. Your submission is locked and cannot be edited.
        </p>
        <Button type="button" className={`mt-8 w-full max-w-xs ${op.primaryBtn}`} onClick={() => navigate("/")}>
          Back to home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <DriverOperationalHeader title="Report incident" subtitle="PSV incident report — 12 sections" backTo="/" />
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <PsvIncidentReportWizard
          driver={driver}
          routeState={routeState}
          sosOption={sosOption}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={error}
        />
      </div>
    </div>
  );
}
