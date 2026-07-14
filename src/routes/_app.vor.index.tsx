import { createFileRoute, Link } from "@tanstack/react-router";
import { useYard } from "@/store/yard";
import { RegPlate, SectionHeader, EmptyState } from "@/components/yard/primitives";
import { yardCopy } from "@/copy/yard-messages";
import type { VorLifecycle } from "@/types/yard";

const COLUMNS: VorLifecycle[] = ["Potential", "Awaiting Triage", "Confirmed", "Awaiting Recovery", "Under Repair"];

export const Route = createFileRoute("/_app/vor/")({
  head: () => ({
    meta: [
      { title: "VOR Board — Veyvio Yard" },
      { name: "description", content: "Vehicle-off-road triage board across lifecycle stages." },
    ],
  }),
  component: VorBoard,
});

function VorBoard() {
  const cases = useYard(s => s.vorCases);
  const vehicles = useYard(s => s.vehicles);

  return (
    <div className="space-y-4 animate-in-up">
      <SectionHeader title={`VOR Board · ${cases.length}`} />
      <p className="text-xs text-muted px-1">{yardCopy.vor.expansion}</p>
      {cases.length === 0 ? <EmptyState title={yardCopy.empty.noVorCases} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {COLUMNS.map(col => {
            const list = cases.filter(c => c.lifecycle === col);
            return (
              <div key={col} className="bg-white border border-border rounded-xs">
                <div className="border-b border-border p-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest">{col}</span>
                  <span className="text-[10px] font-mono text-muted">{list.length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-[80px]">
                  {list.map(c => {
                    const v = vehicles.find(x => x.id === c.vehicleId);
                    return (
                      <Link key={c.id} to="/vor/$caseId" params={{ caseId: c.id }} className="block border border-border rounded-xs p-2 hover:border-vor">
                        {v && <RegPlate reg={v.reg} tone="vor" className="text-xs" />}
                        <p className="text-[11px] text-muted mt-1 line-clamp-2">{c.reason}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
