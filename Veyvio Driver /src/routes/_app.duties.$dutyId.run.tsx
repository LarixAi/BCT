import { createFileRoute } from "@tanstack/react-router";
import { useDriverStore } from "@/store/driver";
import { formatTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getActiveJourney } from "@/domain/journey/journey-helpers";

export const Route = createFileRoute("/_app/duties/$dutyId/run")({
  head: () => ({ meta: [{ title: "Route — Veyvio Driver" }] }),
  component: DutyRunPage,
});

function DutyRunPage() {
  const { dutyId } = Route.useParams();
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const stops = duty ? (getActiveJourney(duty, duty.activeJourneyId)?.stops ?? []) : [];

  return (
    <div className="animate-in-up space-y-4">
      <h1 className="font-display text-xl font-extrabold">Route</h1>
      <ol className="space-y-2">
        {stops.map((stop) => (
          <li key={stop.id} className="flex items-start gap-3 rounded-xs border border-border bg-card p-3">
            <span className="font-mono text-xs text-muted">{stop.stopOrder}</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{stop.name}</p>
              <p className="text-xs text-muted">{formatTime(stop.plannedArrival)}</p>
            </div>
            <Badge variant={stop.status === "arrived" ? "ok" : "default"}>{stop.status.replace(/_/g, " ")}</Badge>
          </li>
        ))}
      </ol>
    </div>
  );
}
