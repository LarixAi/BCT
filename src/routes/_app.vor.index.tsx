import { createFileRoute, Link } from "@tanstack/react-router";
import { useYard } from "@/store/yard";
import { RegPlate, EmptyState } from "@/components/yard/primitives";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { HubOpsPageLayout } from "@/features/hub/HubOpsPageLayout";
import { hubInsetCardClass } from "@/features/hub/HubContentPrimitives";
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
    <HubOpsPageLayout title="VOR board" description={yardCopy.vor.expansion}>
      <DashboardSurface>
        {cases.length === 0 ? (
          <EmptyState title={yardCopy.empty.noVorCases} />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
            {COLUMNS.map(col => {
              const list = cases.filter(c => c.lifecycle === col);
              return (
                <div key={col} className="overflow-hidden rounded-xl border border-[#eaecf0] bg-white">
                  <div className="flex items-center justify-between border-b border-[#eaecf0] px-3 py-2">
                    <span className="text-sm font-semibold text-ink">{col}</span>
                    <span className="font-mono text-xs text-[#667085]">{list.length}</span>
                  </div>
                  <div className="min-h-[80px] space-y-2 p-2">
                    {list.map(c => {
                      const v = vehicles.find(x => x.id === c.vehicleId);
                      return (
                        <Link
                          key={c.id}
                          to="/vor/$caseId"
                          params={{ caseId: c.id }}
                          className={`block ${hubInsetCardClass} hover:border-[#b42318]`}
                        >
                          {v && <RegPlate reg={v.reg} tone="vor" className="text-xs" />}
                          <p className="mt-1 line-clamp-2 text-xs text-[#667085]">{c.reason}</p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashboardSurface>
    </HubOpsPageLayout>
  );
}
