import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { DriverDefectAssessment } from "@veyvio/ops";
import { driverAssessmentToProvisionalOutcome } from "@veyvio/ops";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useDriverStore } from "@/store/driver";
import { enqueueDriverMutation } from "@/platform/driver/enqueue-driver-mutation";
import { getSessionSnapshot } from "@/platform/auth/session-store";

const DEFECT_TYPES = ["Tyre", "Lights", "Doors", "Mirrors", "Interior", "Other"];

const ASSESSMENTS: { id: DriverDefectAssessment; label: string; hint: string }[] = [
  { id: "cosmetic", label: "Cosmetic", hint: "Does not affect safe operation" },
  { id: "operational", label: "Operational", hint: "May restrict use — Ops to classify" },
  { id: "safety_critical", label: "Safety-critical", hint: "Provisional hold / VOR until Ops confirm" },
  { id: "unsure", label: "Unsure", hint: "Held pending Operations review" },
];

export const Route = createFileRoute("/_app/duties/$dutyId/journey/defect")({
  head: () => ({ meta: [{ title: "Report defect — Veyvio Driver" }] }),
  component: JourneyDefectPage,
});

function JourneyDefectPage() {
  const { dutyId } = Route.useParams();
  const navigate = useNavigate();
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const [type, setType] = useState("Doors");
  const [description, setDescription] = useState(
    "Near-side rear door slow to close — latch catches intermittently.",
  );
  const [assessment, setAssessment] = useState<DriverDefectAssessment>("operational");
  const [submitting, setSubmitting] = useState(false);

  if (!duty?.vehicle) return null;

  const provisional = driverAssessmentToProvisionalOutcome(assessment);

  async function submit() {
    setSubmitting(true);
    try {
      await enqueueDriverMutation(
        "defect.report",
        {
          dutyId,
          vehicleId: duty!.vehicle!.id,
          defectType: type,
          description,
          driverAssessment: assessment,
          provisionalOutcome: provisional,
          reportedBy: getSessionSnapshot().user?.id,
          reportedAt: new Date().toISOString(),
          opsClassification: null,
        },
        `defect.${dutyId}.${Date.now()}`,
      );
      void navigate({ to: `/duties/${dutyId}/journey/active` });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-in-up space-y-4">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Report defect on journey</p>
        <p className="mt-1 font-mono text-lg font-extrabold">{duty.vehicle.registrationNumber}</p>
        <p className="text-sm text-muted">
          Your assessment is provisional. Operations sets the final classification (held / VOR / released).
        </p>
      </header>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Defect type</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEFECT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-md border px-3 py-2 text-[10px] font-bold uppercase tracking-wide ${
                type === t ? "border-accent bg-accent text-white" : "border-border bg-card"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="desc">Description</Label>
        <textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
        />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Your assessment</p>
        <div className="mt-2 space-y-2">
          {ASSESSMENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAssessment(a.id)}
              className={`w-full rounded-md border px-3 py-3 text-left ${
                assessment === a.id ? "border-link bg-driver-blue-soft" : "border-border bg-card"
              }`}
            >
              <p className="text-sm font-bold">{a.label}</p>
              <p className="text-xs text-muted">{a.hint}</p>
            </button>
          ))}
        </div>
      </div>
      <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted">
        Provisional outcome: {provisional.replace(/_/g, " ")}. Final VOR/held status is set by Operations —
        not this app alone.
      </p>
      <Button
        size="lg"
        className="h-12 w-full font-bold uppercase tracking-widest"
        disabled={submitting}
        onClick={() => void submit()}
      >
        Submit defect report
      </Button>
      <Button asChild variant="ghost" className="w-full">
        <Link to={`/duties/${dutyId}/journey/active`}>Cancel</Link>
      </Button>
    </div>
  );
}
