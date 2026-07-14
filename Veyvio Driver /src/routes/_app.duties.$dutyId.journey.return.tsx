import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { JourneyMap } from "@/components/driver/journey/JourneyMap";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/journey/return")({
  head: () => ({ meta: [{ title: "Return to depot — Veyvio Driver" }] }),
  component: ReturnDepotPage,
});

function ReturnDepotPage() {
  const { dutyId } = Route.useParams();
  const duty = useDriverStore((s) => s.getDuty(dutyId));

  return (
    <div className="animate-in-up space-y-4">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Return to depot</p>
        <h1 className="font-display text-xl font-extrabold">{duty?.reportingLocation ?? "Depot"}</h1>
        <p className="mt-1 text-sm text-muted">
          Park {duty?.vehicle?.registrationNumber} in bay · keys to office
        </p>
      </header>
      <div className="relative">
        <JourneyMap dutyId={dutyId} className="h-40" />
        <div className="absolute inset-x-3 bottom-3 rounded-md bg-accent px-3 py-2 text-xs font-bold text-white">
          Bay D03 · 4 min · Arrive shortly
        </div>
      </div>
      <Button asChild size="lg" className="h-12 w-full font-bold uppercase tracking-widest">
        <Link to={`/duties/${dutyId}/nav`}>Navigate to depot</Link>
      </Button>
      <div className="rounded-md border border-border bg-card p-3 text-sm text-muted">
        Next duty may start later today — check Trips for assignments.
      </div>
      <Button asChild variant="outline" className="w-full">
        <Link to="/trips">Back to trips</Link>
      </Button>
    </div>
  );
}
