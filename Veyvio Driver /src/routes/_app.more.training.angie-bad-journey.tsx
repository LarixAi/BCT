import { createFileRoute, Link } from "@tanstack/react-router";
import { AngieBadJourneyPanel } from "@/components/driver/passengers/AngieBadJourneyPanel";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";

export const Route = createFileRoute("/_app/more/training/angie-bad-journey")({
  head: () => ({ meta: [{ title: "Angie's journey — Veyvio Driver" }] }),
  component: AngieBadJourneyPage,
});

function AngieBadJourneyPage() {
  return (
    <MoreSubpageLayout title="Angie's perspective" backTo="/more/training">
      <div className="space-y-4">
        <header className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Passenger centred journeys</p>
          <h2 className="font-display text-lg font-extrabold tracking-tight">A difficult journey</h2>
        </header>

        <AngieBadJourneyPanel />

        <p className="text-center text-sm text-muted">
          <Link to="/duties/duty_3/passengers/pax_angie" className="font-bold text-link">
            Open Angie&apos;s operational profile
          </Link>
        </p>
      </div>
    </MoreSubpageLayout>
  );
}
