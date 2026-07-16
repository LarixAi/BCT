import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JourneyFlowShell } from "@/components/driver/journey/JourneyFlowShell";
import { useDriverStore } from "@/store/driver";

const FUEL_LEVELS = ["Full", "Three quarters", "Half", "Quarter", "Low"];

export const Route = createFileRoute("/_app/duties/$dutyId/journey/end/")({
  head: () => ({ meta: [{ title: "End readings — Veyvio Driver" }] }),
  component: EndJourneyReadingsPage,
});

function EndJourneyReadingsPage() {
  const { dutyId } = Route.useParams();
  const navigate = useNavigate();
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const draft = useDriverStore((s) => s.openJourneyDrafts[dutyId]);
  const setEndJourneyDraft = useDriverStore((s) => s.setEndJourneyDraft);

  const [odometer, setOdometer] = useState(String((duty?.vehicle?.mileage ?? 0) + 32));
  const [fuelLevel, setFuelLevel] = useState("Three quarters");

  if (!duty?.vehicle) return null;

  return (
    <JourneyFlowShell
      kind="end"
      step={1}
      total={3}
      routeLabel={duty.routeName}
      backTo={`/duties/${dutyId}/journey/active`}
      backLabel="Back"
      footer={
        <Button
          size="lg"
          className="h-12 w-full font-bold uppercase tracking-widest"
          onClick={() => {
            setEndJourneyDraft(dutyId, { odometer, fuelLevel, handoverNote: "" });
            void navigate({ to: `/duties/${dutyId}/journey/end/confirm` });
          }}
        >
          Continue
        </Button>
      }
    >
      <div className="animate-in-up space-y-4">
        <header>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">End readings</h1>
          <p className="mt-1 text-sm text-muted">
            {duty.routeName} · {duty.vehicle.registrationNumber}
          </p>
        </header>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="end-odo">Odometer (km)</Label>
            <Input id="end-odo" value={odometer} onChange={(e) => setOdometer(e.target.value)} className="h-12 font-mono" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-fuel">Fuel level</Label>
            <select
              id="end-fuel"
              value={fuelLevel}
              onChange={(e) => setFuelLevel(e.target.value)}
              className="flex h-12 w-full rounded-md border border-input bg-card px-3 text-sm"
            >
              {FUEL_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
        {draft && (
          <div className="rounded-md border border-border bg-card p-3 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Start readings (recorded at open)</p>
            <p className="mt-1">{draft.odometer} km · {draft.fuelLevel}</p>
          </div>
        )}
      </div>
    </JourneyFlowShell>
  );
}
