import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionHeader } from "@/components/yard/primitives";
import { YardMap } from "@/components/yard/YardMap";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/yard/map")({
  head: () => ({
    meta: [
      { title: "Yard Map — Veyvio Yard" },
      { name: "description", content: "Live bay occupancy map across all depot zones." },
    ],
  }),
  component: YardMapPage,
});

function YardMapPage() {
  return (
    <div className="space-y-4 animate-in-up pb-4">
      <Link to="/yard" className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
        <ArrowLeft className="size-3" /> Yard Inventory
      </Link>
      <SectionHeader title="Yard Map" sub="live bay occupancy" />
      <YardMap />
    </div>
  );
}
