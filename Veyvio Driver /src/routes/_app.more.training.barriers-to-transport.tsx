import { createFileRoute, Link } from "@tanstack/react-router";
import { BarriersToTransportPanel } from "@/components/driver/passengers/BarriersToTransportPanel";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";

export const Route = createFileRoute("/_app/more/training/barriers-to-transport")({
  head: () => ({ meta: [{ title: "Barriers to transport — Veyvio Driver" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    perspective: typeof search.perspective === "string" ? search.perspective : undefined,
  }),
  component: BarriersToTransportPage,
});

function BarriersToTransportPage() {
  const { perspective } = Route.useSearch();

  return (
    <MoreSubpageLayout title="Barriers to transport" backTo="/more/training">
      <div className="space-y-4">
        <header className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Passenger centred journeys</p>
          <h2 className="font-display text-lg font-extrabold tracking-tight">Hear from passengers and carers</h2>
        </header>

        <BarriersToTransportPanel initialPerspectiveId={perspective} />

        <p className="text-center text-sm text-muted">
          <Link to="/duties/duty_3/passengers" className="font-bold text-link">
            Review today&apos;s passenger profiles
          </Link>
        </p>
      </div>
    </MoreSubpageLayout>
  );
}
