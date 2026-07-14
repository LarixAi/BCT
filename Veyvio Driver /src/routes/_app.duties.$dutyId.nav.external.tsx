import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { NavShell } from "@/components/driver/journey/NavShell";
import { getHeadingStop } from "@/domain/journey/journey-helpers";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/nav/external")({
  head: () => ({ meta: [{ title: "External maps — Veyvio Driver" }] }),
  component: NavExternalPage,
});

function NavExternalPage() {
  const { dutyId } = Route.useParams();
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const stop = duty ? getHeadingStop(duty) : null;

  return (
    <NavShell dutyId={dutyId} eta="2 min" nextStop={stop?.name.split("—")[0]?.trim() ?? "Destination"}>
      <div className="space-y-4">
        <h1 className="font-display text-xl font-extrabold">Open in maps app</h1>
        <p className="text-sm text-muted">Hand off to Google Maps or Apple Maps for turn-by-turn guidance.</p>
        <div className="grid gap-2">
          <Button variant="outline" className="h-12 w-full font-bold">
            Google Maps
          </Button>
          <Button variant="outline" className="h-12 w-full font-bold">
            Apple Maps
          </Button>
        </div>
        <Button asChild variant="ghost" className="w-full">
          <Link to={`/duties/${dutyId}/nav`}>Back to in-app navigation</Link>
        </Button>
      </div>
    </NavShell>
  );
}
