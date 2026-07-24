import { createFileRoute, Link } from "@tanstack/react-router";
import { useYard } from "@/store/yard";
import { RegPlate, EmptyState } from "@/components/yard/primitives";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { HubOpsPageLayout } from "@/features/hub/HubOpsPageLayout";
import { yardCopy } from "@/copy/yard-messages";
import type { Defect, Vehicle } from "@/types/yard";

export const Route = createFileRoute("/_app/defects/")({
  head: () => ({
    meta: [
      { title: "Defects — Veyvio Yard" },
      { name: "description", content: "Open vehicle defects across the depot with severity and category." },
    ],
  }),
  component: DefectsList,
});

function DefectsList() {
  const defects = useYard(s => s.defects);
  const vehicles = useYard(s => s.vehicles);
  const open = defects.filter(d => !d.resolved);
  const resolved = defects.filter(d => d.resolved).slice(0, 8);

  return (
    <HubOpsPageLayout title="Defects" description="Open safety defects until resolved and evidenced.">
      <DashboardSurface>
        <h2 className="mb-4 text-lg font-semibold text-ink">Open defects · {open.length}</h2>
        {open.length === 0 ? (
          <EmptyState title={yardCopy.empty.noOpenDefects} />
        ) : (
          <div className="space-y-2">
            {open.map(d => (
              <DefectRow key={d.id} defect={d} vehicle={vehicles.find(x => x.id === d.vehicleId)} />
            ))}
          </div>
        )}
      </DashboardSurface>

      {resolved.length > 0 && (
        <DashboardSurface>
          <h2 className="mb-4 text-lg font-semibold text-ink">Recently resolved</h2>
          <div className="space-y-2">
            {resolved.map(d => (
              <DefectRow key={d.id} defect={d} vehicle={vehicles.find(x => x.id === d.vehicleId)} resolved />
            ))}
          </div>
        </DashboardSurface>
      )}
    </HubOpsPageLayout>
  );
}

function DefectRow({
  defect: d,
  vehicle: v,
  resolved = false,
}: {
  defect: Defect;
  vehicle?: Vehicle;
  resolved?: boolean;
}) {
  const sevCls =
    d.severity === "Safety-critical" ? "bg-[#fef3f2] text-[#b42318] border-[#fecdca]"
    : d.severity === "Major" ? "bg-[#fff6ed] text-[#c4320a] border-[#fddcab]"
    : "bg-[#f2f4f7] text-[#475467] border-[#e4e7ec]";
  return (
    <Link
      to="/defects/$defectId"
      params={{ defectId: d.id }}
      className={`block rounded-xl border border-[#eaecf0] bg-[#fcfcfd] p-4 transition-colors hover:bg-white ${resolved ? "opacity-80" : ""}`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {v && <RegPlate reg={v.reg} tone={v.status === "VOR" ? "vor" : "default"} />}
          <span className="text-xs font-semibold text-ink">{d.category}</span>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sevCls}`}>{d.severity}</span>
      </div>
      <p className="text-sm text-[#667085]">{d.notes}</p>
      {d.auditFinding && !resolved && (
        <p className="mt-2 text-xs font-medium text-[#c4320a]">Missed on driver check · manager audit</p>
      )}
      {d.vorCaseId && !resolved && (
        <p className="mt-2 text-xs font-medium text-[#b42318]">VOR opened · {d.vorCaseId}</p>
      )}
      {resolved && d.resolvedAt && (
        <p className="mt-2 text-xs font-medium text-[#027a48]">
          Resolved · {new Date(d.resolvedAt).toLocaleDateString("en-GB")}
        </p>
      )}
    </Link>
  );
}
