import { createFileRoute, Link } from "@tanstack/react-router";
import { useYard } from "@/store/yard";
import { SectionHeader } from "@/components/yard/primitives";
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
    <div className="space-y-4 animate-in-up">
      <SectionHeader title={`Movement Log · ${movements.length}`} />
      <div className="bg-white border border-border rounded-xs overflow-hidden">
        {movements.map(m => {
          const v = vehicles.find(x => x.id === m.vehicleId);
          return (
            <Link key={m.id} to="/yard/$vehicleId" params={{ vehicleId: m.vehicleId }} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-3 border-b border-border last:border-b-0 hover:bg-secondary/50">
              <span className="font-mono text-xs font-bold w-16 truncate">{v?.reg ?? "—"}</span>
              <div className="flex items-center gap-2 text-xs min-w-0">
                <span className="font-mono">{m.fromBayId}</span>
                <ArrowRight className="size-3 text-muted shrink-0" />
                <span className="font-mono">{m.toBayId}</span>
                <span className="text-muted truncate hidden sm:inline">· {m.reason}</span>
              </div>
              <span className="text-[10px] text-muted font-mono">{new Date(m.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
