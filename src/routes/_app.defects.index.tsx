import { createFileRoute, Link } from "@tanstack/react-router";
import { useYard } from "@/store/yard";
import { RegPlate, SectionHeader, EmptyState } from "@/components/yard/primitives";
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
    <div className="space-y-6 animate-in-up">
      <section className="space-y-4">
        <SectionHeader title={`Open Defects · ${open.length}`} />
        {open.length === 0 ? <EmptyState title={yardCopy.empty.noOpenDefects} /> : (
          <div className="space-y-2">
            {open.map(d => (
              <DefectRow key={d.id} defect={d} vehicle={vehicles.find(x => x.id === d.vehicleId)} />
            ))}
          </div>
        )}
      </section>

      {resolved.length > 0 && (
        <section className="space-y-4">
          <SectionHeader title="Recently resolved" />
          <div className="space-y-2">
            {resolved.map(d => (
              <DefectRow key={d.id} defect={d} vehicle={vehicles.find(x => x.id === d.vehicleId)} resolved />
            ))}
          </div>
        </section>
      )}
    </div>
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
  const sevCls = d.severity === "Safety-critical" ? "bg-vor text-white" : d.severity === "Major" ? "bg-warn text-black" : "bg-secondary text-foreground";
  return (
    <Link
      to="/defects/$defectId"
      params={{ defectId: d.id }}
      className={`block bg-white border p-3 rounded-xs hover:border-accent ${resolved ? "border-ok/30 opacity-80" : "border-border"}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          {v && <RegPlate reg={v.reg} tone={v.status === "VOR" ? "vor" : "default"} />}
          <span className="text-xs font-bold uppercase tracking-wider">{d.category}</span>
        </div>
        <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-sm tracking-widest ${sevCls}`}>{d.severity}</span>
      </div>
      <p className="text-xs text-muted">{d.notes}</p>
      {d.auditFinding && !resolved && (
        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-warn">Missed on driver check · manager audit</p>
      )}
      {d.vorCaseId && !resolved && (
        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-vor">VOR opened · {d.vorCaseId}</p>
      )}
      {resolved && d.resolvedAt && (
        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-ok">
          Resolved · {new Date(d.resolvedAt).toLocaleDateString("en-GB")}
        </p>
      )}
    </Link>
  );
}
