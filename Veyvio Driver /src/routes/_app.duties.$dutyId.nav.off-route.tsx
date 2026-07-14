import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { NavShell } from "@/components/driver/journey/NavShell";

export const Route = createFileRoute("/_app/duties/$dutyId/nav/off-route")({
  head: () => ({ meta: [{ title: "Off route — Veyvio Driver" }] }),
  component: NavOffRoutePage,
});

function NavOffRoutePage() {
  const { dutyId } = Route.useParams();

  return (
    <NavShell dutyId={dutyId} eta="—" nextStop="Off route" mapHighlight="off-route">
      <div className="space-y-4">
        <p className="text-sm font-bold text-vor">Return to scheduled route</p>
        <p className="text-sm text-muted">You are off the planned path. Recenter or report a road issue.</p>
        <Button asChild size="lg" className="h-12 w-full font-bold uppercase tracking-widest">
          <Link to={`/duties/${dutyId}/nav`}>Recenter on route</Link>
        </Button>
        <Link to={`/duties/${dutyId}/journey/delay`} className="block text-center text-xs font-bold uppercase tracking-widest text-muted">
          Report road issue
        </Link>
      </div>
    </NavShell>
  );
}
