import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getHeadingStop } from "@/domain/journey/journey-helpers";
import { formatTime } from "@/lib/utils";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/journey/note")({
  head: () => ({ meta: [{ title: "Journey note — Veyvio Driver" }] }),
  component: JourneyNotePage,
});

function JourneyNotePage() {
  const { dutyId } = Route.useParams();
  const navigate = useNavigate();
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const stop = duty ? getHeadingStop(duty) : null;
  const [note, setNote] = useState(
    "Passenger collected from side gate — main entrance closed for works.",
  );

  if (!duty) return null;

  return (
    <div className="animate-in-up space-y-4">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Journey note</p>
        <h1 className="font-display text-xl font-extrabold">{duty.routeName}</h1>
        <p className="mt-1 text-sm text-muted">Recorded on journey · synced when online</p>
      </header>
      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
        />
      </div>
      {stop && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Attach to stop (optional)</p>
          <div className="mt-2 rounded-md border-2 border-link bg-driver-blue-soft p-3 text-sm font-semibold">
            {stop.name.split("—")[0]?.trim()} · {formatTime(stop.plannedArrival)}
          </div>
        </div>
      )}
      <Button size="lg" className="h-12 w-full font-bold uppercase tracking-widest" onClick={() => navigate({ to: `/duties/${dutyId}/journey/active` })}>
        Save note
      </Button>
      <Button asChild variant="ghost" className="w-full">
        <Link to={`/duties/${dutyId}/journey/active`}>Cancel</Link>
      </Button>
    </div>
  );
}
