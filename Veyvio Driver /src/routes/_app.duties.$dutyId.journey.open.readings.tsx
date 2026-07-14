import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OpenJourneyShell } from "@/components/driver/journey/OpenJourneyShell";
import { useDriverStore } from "@/store/driver";

const FUEL_LEVELS = ["Full", "Three quarters", "Half", "Quarter", "Low"];

export const Route = createFileRoute("/_app/duties/$dutyId/journey/open/readings")({
  head: () => ({ meta: [{ title: "Start readings — Veyvio Driver" }] }),
  component: OpenJourneyReadingsPage,
});

function OpenJourneyReadingsPage() {
  const { dutyId } = Route.useParams();
  const navigate = useNavigate();
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const draft = useDriverStore((s) => s.openJourneyDrafts[dutyId]);
  const setOpenJourneyDraft = useDriverStore((s) => s.setOpenJourneyDraft);

  const [odometer, setOdometer] = useState(draft?.odometer ?? String(duty?.vehicle?.mileage ?? ""));
  const [fuelLevel, setFuelLevel] = useState(draft?.fuelLevel ?? "Three quarters");

  if (!duty?.vehicle) return <p className="p-4 text-sm text-muted">Loading duty…</p>;

  function continueToFinal(skip = false) {
    if (!skip) {
      setOpenJourneyDraft(dutyId, { odometer, fuelLevel });
    }
    void navigate({ to: "/duties/$dutyId/journey/open/final", params: { dutyId } });
  }

  return (
    <OpenJourneyShell
      step={3}
      routeLabel={duty.routeName}
      backTo={`/duties/${dutyId}/journey/open/confirm`}
      backLabel="Back"
    >
      <div className="animate-in-up space-y-4">
        <header>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Start readings</h1>
          <p className="mt-1 text-sm text-muted">
            Record opening mileage and fuel level for {duty.vehicle.registrationNumber}.
          </p>
        </header>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="odometer">Odometer (km)</Label>
            <Input
              id="odometer"
              inputMode="numeric"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              className="h-12 font-mono text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fuel">Fuel level</Label>
            <select
              id="fuel"
              value={fuelLevel}
              onChange={(e) => setFuelLevel(e.target.value)}
              className="flex h-12 w-full rounded-md border border-input bg-card px-3 text-sm"
            >
              {FUEL_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-3 text-sm text-muted">
          Last recorded: {duty.vehicle.mileage.toLocaleString()} km · Return to depot yesterday
        </div>

        <Button
          size="lg"
          className="h-12 w-full font-bold uppercase tracking-widest"
          onClick={() => continueToFinal(false)}
        >
          Continue
        </Button>
        <Button variant="ghost" className="w-full text-muted" onClick={() => continueToFinal(true)}>
          Skip for now
        </Button>
      </div>
    </OpenJourneyShell>
  );
}
