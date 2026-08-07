import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PsvIncidentReportWizard from "@/components/driver/incidents/PsvIncidentReportWizard";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import { op } from "@/lib/driver-operational-theme";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { getSosOption } from "@/lib/tflIncidentTypes";
import { submitIncidentWithOutbox } from "@/services/driver-ops-outbox.service";

export default function DriverSupabaseIncidentReport({ driver }) {
  const navigate = useNavigate();
  const { state: routeState } = useLocation();
  const { session } = useDriverSupabaseAuth();
  const sosOption = getSosOption(routeState?.sosType);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [queued, setQueued] = useState(false);
  const [receiptReference, setReceiptReference] = useState("");

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

    const isSafeguarding =
      Boolean(form?.isSafeguarding) ||
      String(form?.incidentType ?? "").toLowerCase().includes("safeguarding") ||
      String(sosContext?.sosType ?? "").toLowerCase().includes("safeguarding");

    const commandResult = await submitIncidentWithOutbox(driver, session, {
      description,
      incidentType: form?.incidentType || sosContext?.sosType || "general",
      severity: form?.severity || (isSafeguarding ? "critical" : "medium"),
      isSafeguarding,
      occurredAt: form?.occurredAt || new Date().toISOString(),
      location: form?.location || {},
      vehicleId: form?.vehicleId,
    });

    setSubmitting(false);
    if (!commandResult.ok) {
      setError(commandResult.message ?? "Incident could not be submitted.");
      return { ok: false };
    }

    const incident = commandResult.incident ?? {};
    setReceiptReference(
      incident.receiptReference ||
        incident.incident_reference ||
        incident.incidentReference ||
        "",
    );

    setQueued(Boolean(commandResult.queued));
    setDone(true);
    return { ok: true };
  };

  if (done) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center">
        <h2 className="text-xl font-bold text-foreground">Report submitted</h2>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          {queued
            ? "Incident saved on this device — will reach Command when connection returns."
            : "Your transport manager has been notified. Your submission is locked and cannot be edited."}
        </p>
        {receiptReference ? (
          <p className="mt-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
            Reference: <span className="font-semibold tabular-nums">{receiptReference}</span>
          </p>
        ) : null}
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
