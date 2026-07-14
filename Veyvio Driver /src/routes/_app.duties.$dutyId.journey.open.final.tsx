import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OpenJourneyShell } from "@/components/driver/journey/OpenJourneyShell";
import { formatTime } from "@/lib/utils";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/journey/open/final")({
  head: () => ({ meta: [{ title: "Open journey — Veyvio Driver" }] }),
  component: OpenJourneyFinalPage,
});

function OpenJourneyFinalPage() {
  const { dutyId } = Route.useParams();
  const navigate = useNavigate();
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const draft = useDriverStore((s) => s.openJourneyDrafts[dutyId]);
  const completeOpenJourney = useDriverStore((s) => s.completeOpenJourney);
  const [confirmed, setConfirmed] = useState(false);
  const [opening, setOpening] = useState(false);

  if (!duty?.vehicle) return <p className="p-4 text-sm text-muted">Loading duty…</p>;

  async function handleOpen() {
    if (!confirmed) return;
    setOpening(true);
    try {
      await completeOpenJourney(dutyId);
      void navigate({ to: "/duties/$dutyId/journey/open/complete", params: { dutyId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open journey");
    } finally {
      setOpening(false);
    }
  }

  const summaryParts = [
    duty.vehicleCheck.status === "cleared" || duty.vehicleCheck.status === "submitted"
      ? "Walkaround signed"
      : null,
    draft?.odometer ? `Odometer ${draft.odometer} km` : null,
    `Depart ${formatTime(duty.startTime)} from ${duty.reportingLocation}`,
  ].filter(Boolean);

  return (
    <OpenJourneyShell
      step={4}
      routeLabel={duty.routeName}
      backTo={`/duties/${dutyId}/journey/open/readings`}
      backLabel="Back"
    >
      <div className="animate-in-up space-y-4">
        <header>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Ready to open journey</h1>
          <p className="mt-1 text-sm text-muted">
            Opening {duty.routeName} starts this journey only. Your duty clock-in stays separate.
          </p>
        </header>

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Opening</p>
              <p className="mt-1 font-display text-lg font-extrabold">{duty.routeName}</p>
              <p className="mt-2 font-mono text-base font-extrabold">{duty.vehicle.registrationNumber}</p>
            </div>
            <Badge variant="ok">Ready</Badge>
          </div>
          {summaryParts.length > 0 && (
            <p className="mt-3 text-sm leading-relaxed text-muted">{summaryParts.join(" · ")}</p>
          )}
        </section>

        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 size-4 rounded-xs border-border"
          />
          I confirm the vehicle is safe and ready for this journey.
        </label>

        <Button
          size="lg"
          className="h-12 w-full font-bold uppercase tracking-widest"
          disabled={!confirmed || opening}
          onClick={() => void handleOpen()}
        >
          {opening ? "Opening…" : "Open journey"}
        </Button>
      </div>
    </OpenJourneyShell>
  );
}
