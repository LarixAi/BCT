import { createFileRoute, Link } from "@tanstack/react-router";
import { useYard } from "@/store/yard";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { HubOpsPageLayout } from "@/features/hub/HubOpsPageLayout";
import { hubListPanelClass } from "@/features/hub/HubContentPrimitives";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_app/movements")({
  head: () => ({
    meta: [
      { title: "Movement Log — Veyvio Yard" },
      { name: "description", content: "Recent vehicle movements across the depot with actor and timestamp." },
    ],
  }),
  component: MovementsPage,
});

function MovementsPage() {
  const movements = useYard(s => s.movements);
  const vehicles = useYard(s => s.vehicles);

  return (
    <HubOpsPageLayout title="Movement log" description="Recent yard movements with time and attribution.">
      <DashboardSurface>
        <div className={hubListPanelClass}>
          {movements.map(m => {
            const v = vehicles.find(x => x.id === m.vehicleId);
            return (
              <Link
                key={m.id}
                to="/yard/$vehicleId"
                params={{ vehicleId: m.vehicleId }}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4 transition-colors hover:bg-[#fcfcfd]"
              >
                <span className="w-16 truncate font-mono text-xs font-bold text-ink">{v?.reg ?? "—"}</span>
                <div className="flex min-w-0 items-center gap-2 text-xs">
                  <span className="font-mono">{m.fromBayId}</span>
                  <ArrowRight className="size-3 shrink-0 text-[#667085]" />
                  <span className="font-mono">{m.toBayId}</span>
                  <span className="hidden truncate text-[#667085] sm:inline">· {m.reason}</span>
                </div>
                <span className="font-mono text-xs text-[#667085]">
                  {new Date(m.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </Link>
            );
          })}
        </div>
      </DashboardSurface>
    </HubOpsPageLayout>
  );
}
