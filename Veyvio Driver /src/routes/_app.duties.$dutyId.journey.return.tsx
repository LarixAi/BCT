import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { FocusedPageShell } from "@/components/driver/shells/FocusedPageShell";
import { JourneyMap } from "@/components/driver/journey/JourneyMap";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/journey/return")({
  head: () => ({ meta: [{ title: "Return to depot — Veyvio Driver" }] }),
  component: ReturnDepotPage,
});

function ReturnDepotPage() {
  const { dutyId } = Route.useParams();
  const duty = useDriverStore((s) => s.getDuty(dutyId));

  if (!duty) {
    return (
      <FocusedPageShell title="Return to depot" backTo="/trips" backLabel="Duties">
        <p className="text-sm text-muted">Loading…</p>
      </FocusedPageShell>
    );
  }

  return (
    <FocusedPageShell
      title={duty.reportingLocation ?? "Depot"}
      subtitle={`Park ${duty.vehicle?.registrationNumber ?? "vehicle"} in bay · keys to office`}
      backTo="/trips"
      backLabel="Duties"
      eyebrow="Return to depot"
      footer={
        <div className="space-y-2">
          <Button asChild size="lg" className="h-12 w-full font-bold uppercase tracking-widest">
            <Link to={`/duties/${dutyId}/nav`}>Navigate to depot</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full text-muted">
            <Link to="/trips">Back to trips</Link>
          </Button>
        </div>
      }
    >
      <div className="animate-in-up space-y-4">
        <div className="relative">
          <JourneyMap dutyId={dutyId} className="h-40" />
          <div className="absolute inset-x-3 bottom-3 rounded-md bg-accent px-3 py-2 text-xs font-bold text-white">
            Bay D03 · 4 min · Arrive shortly
          </div>
        </div>
        <div className="rounded-md border border-border bg-card p-3 text-sm text-muted">
          Next duty may start later today — check Trips for assignments.
        </div>
      </div>
    </FocusedPageShell>
  );
}
