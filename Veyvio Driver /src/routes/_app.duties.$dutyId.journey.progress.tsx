import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FocusedPageShell } from "@/components/driver/shells/FocusedPageShell";
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

  if (!duty) {
    return (
      <FocusedPageShell title="Stop progress" backTo={`/duties/${dutyId}/journey/active`} backLabel="Journey">
        <p className="text-sm text-muted">Loading…</p>
      </FocusedPageShell>
    );
  }

  return (
    <FocusedPageShell
      title={`${duty.routeName} · ${stopProgressLabel(duty)}`}
      subtitle="Depot start → depot return"
      backTo={`/duties/${dutyId}/journey/active`}
      backLabel="Journey"
      eyebrow="Stop progress"
      footer={
        <div className="space-y-2">
          <Button asChild size="lg" className="h-12 w-full font-bold uppercase tracking-widest">
            <Link to={`/duties/${dutyId}/nav`}>Open navigation</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full text-muted">
            <Link to={`/duties/${dutyId}/journey/active`}>Back to journey</Link>
          </Button>
        </div>
      }
    >
      <div className="animate-in-up space-y-4">
        <div className="flex justify-end">
          <Badge variant="ok">On time</Badge>
        </div>
        <TripRouteTimeline stops={stopsWithProgress(duty)} title="Full route with addresses" />
      </div>
    </FocusedPageShell>
  );
}
