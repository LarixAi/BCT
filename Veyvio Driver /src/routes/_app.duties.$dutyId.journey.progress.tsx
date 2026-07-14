import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TripRouteTimeline } from "@/components/driver/trips/TripRouteTimeline";
import { stopProgressLabel, stopsWithProgress } from "@/domain/journey/journey-helpers";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/journey/progress")({
  head: () => ({ meta: [{ title: "Stop progress — Veyvio Driver" }] }),
  component: JourneyProgressPage,
});

function JourneyProgressPage() {
  const { dutyId } = Route.useParams();
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  if (!duty) return null;

  return (
    <div className="animate-in-up space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Stop progress</p>
          <h1 className="font-display text-xl font-extrabold">{duty.routeName} · {stopProgressLabel(duty)}</h1>
          <p className="mt-1 text-sm text-muted">Depot start → depot return</p>
        </div>
        <Badge variant="ok">On time</Badge>
      </header>
      <TripRouteTimeline stops={stopsWithProgress(duty)} title="Full route with addresses" />
      <Button asChild size="lg" className="h-12 w-full font-bold uppercase tracking-widest">
        <Link to={`/duties/${dutyId}/nav`}>Open navigation</Link>
      </Button>
    </div>
  );
}
