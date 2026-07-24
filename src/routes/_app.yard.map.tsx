import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LiveYardMap } from "@/features/yard-map/LiveYardMap";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { useYard } from "@/store/yard";

export const Route = createFileRoute("/_app/yard/map")({
  head: () => ({
    meta: [
      { title: "Live Yard Map — Veyvio Yard" },
      { name: "description", content: "Interactive depot map with live bay occupancy." },
    ],
  }),
  component: YardMapPage,
});

function YardMapPage() {
  const [layoutEditing, setLayoutEditing] = useState(false);
  const depotName = useTenancyStore(s => s.depotName);
  const yardLayout = useYard(s => s.yardLayout);
  const yardMapEnabled = useYard(s => s.yardMapEnabled);

  const title = depotName ? `${depotName} map` : "Yard map";
  const subtitle =
    "Interactive spatial map with live bay occupancy — tan minibuses, orange MPVs, LIFO bays marked.";

  return (
    <div className={layoutEditing ? "pb-0" : "animate-in-up space-y-4 pb-4"}>
      {!layoutEditing ? (
        <header>
          <h1 className="font-display text-xl font-extrabold tracking-tight text-ink">{title}</h1>
          <p className="mt-0.5 text-sm text-[#667085]">{subtitle}</p>
        </header>
      ) : null}
      {yardMapEnabled || yardLayout ? (
        <LiveYardMap onEditModeChange={setLayoutEditing} />
      ) : (
        <p className="text-sm text-[#667085]">Spatial map is loading for this depot. Sync again if this persists.</p>
      )}
    </div>
  );
}
