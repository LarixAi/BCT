import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useDriverStore } from "@/store/driver";
import { formatTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { FocusedPageShell } from "@/components/driver/shells/FocusedPageShell";
import { getActiveJourney } from "@/domain/journey/journey-helpers";

export const Route = createFileRoute("/_app/duties/$dutyId/run")({
  head: () => ({ meta: [{ title: "Route — Veyvio Driver" }] }),
  component: DutyRunPage,
});

function DutyRunPage() {
  const { dutyId } = Route.useParams();
  const navigate = useNavigate();
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const stops = duty ? (getActiveJourney(duty, duty.activeJourneyId)?.stops ?? []) : [];

  return (
    <FocusedPageShell
      title="Route"
      backLabel="Duties"
      onBack={() =>
        void navigate({ to: "/trips", search: { demo: "normal", dutyId } })
      }
      eyebrow={duty?.routeName ?? "Stops"}
      subtitle="Planned stops on the focused journey."
    >
      <ol className="animate-in-up space-y-2">
        {stops.length === 0 ? (
          <p className="text-sm text-muted">No stops available for this duty yet.</p>
        ) : null}
        {stops.map((stop) => (
          <li
            key={stop.id}
            className="flex items-start gap-3 rounded-[14px] border border-border bg-background p-3"
          >
            <span className="font-mono text-xs text-muted">{stop.stopOrder}</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{stop.name}</p>
              <p className="text-xs text-muted">{formatTime(stop.plannedArrival)}</p>
            </div>
            <Badge variant={stop.status === "arrived" ? "ok" : "default"}>
              {stop.status.replace(/_/g, " ")}
            </Badge>
          </li>
        ))}
      </ol>
    </FocusedPageShell>
  );
}
