import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpenJourneyShell } from "@/components/driver/journey/OpenJourneyShell";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/journey/open/complete")({
  head: () => ({ meta: [{ title: "Journey opened — Veyvio Driver" }] }),
  component: OpenJourneyCompletePage,
});

function OpenJourneyCompletePage() {
  const { dutyId } = Route.useParams();
  const duty = useDriverStore((s) => s.getDuty(dutyId));

  if (!duty) return <p className="p-4 text-sm text-muted">Loading duty…</p>;

  const openedAt = duty.startedAt
    ? new Date(duty.startedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <OpenJourneyShell
      step={4}
      routeLabel={duty.routeName}
      backTo="/"
      backLabel="Home"
      footer={
        <Button asChild size="lg" className="h-12 w-full font-bold uppercase tracking-widest">
          <Link to={`/duties/${dutyId}/journey/active`}>Go to active journey</Link>
        </Button>
      }
    >
      <div className="flex min-h-[280px] animate-in-up flex-col items-center justify-center text-center">
        <div className="grid size-12 place-items-center rounded-full bg-ok/10 text-ok">
          <CheckCircle2 className="size-7" strokeWidth={2.5} />
        </div>
        <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">Journey opened</h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
          {duty.routeName} is now in service on {duty.vehicle?.registrationNumber ?? "your vehicle"}. Your duty
          record started at {openedAt}.
        </p>
      </div>
    </OpenJourneyShell>
  );
}
