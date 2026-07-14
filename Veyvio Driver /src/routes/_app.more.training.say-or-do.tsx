import { createFileRoute } from "@tanstack/react-router";
import { SayOrDoScenariosPanel } from "@/components/driver/passengers/SayOrDoScenariosPanel";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";

export const Route = createFileRoute("/_app/more/training/say-or-do")({
  head: () => ({ meta: [{ title: "What would you say or do? — Veyvio Driver" }] }),
  component: SayOrDoPage,
});

function SayOrDoPage() {
  return (
    <MoreSubpageLayout title="What would you say or do?" backTo="/more/training">
      <div className="space-y-4">
        <header className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Passenger centred journeys</p>
          <h2 className="font-display text-lg font-extrabold tracking-tight">Choose your response</h2>
        </header>

        <SayOrDoScenariosPanel />
      </div>
    </MoreSubpageLayout>
  );
}
