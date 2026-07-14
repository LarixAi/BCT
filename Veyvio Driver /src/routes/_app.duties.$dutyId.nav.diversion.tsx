import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NavShell } from "@/components/driver/journey/NavShell";

export const Route = createFileRoute("/_app/duties/$dutyId/nav/diversion")({
  head: () => ({ meta: [{ title: "Diversion — Veyvio Driver" }] }),
  component: NavDiversionPage,
});

function NavDiversionPage() {
  const { dutyId } = Route.useParams();

  return (
    <NavShell
      dutyId={dutyId}
      eta="4 min"
      nextStop="Parade Square"
      mapHighlight="diversion"
      footer={
        <div className="space-y-3">
          <Badge variant="default" className="border-warn/40 bg-warn/10 text-warn">
            Diversion active
          </Badge>
          <p className="text-sm font-bold">Dock Road closed — follow revised route</p>
          <p className="text-xs text-muted">Ops update · Skip Dock Road, serve Parade Square next.</p>
          <p className="text-sm font-bold">Follow diversion via Mersey Street · In 320 m</p>
          <Button asChild size="lg" className="h-12 w-full font-bold uppercase tracking-widest">
            <Link to={`/duties/${dutyId}/nav`}>Continue navigation</Link>
          </Button>
        </div>
      }
    />
  );
}
