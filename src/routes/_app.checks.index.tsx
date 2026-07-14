import { createFileRoute, Link } from "@tanstack/react-router";
import { useYard } from "@/store/yard";
import { VehicleCard, SectionHeader, EmptyState } from "@/components/yard/primitives";
import { yardCopy } from "@/copy/yard-messages";
import { Button } from "@/components/ui/button";
import { ClipboardCheck } from "lucide-react";
import { CHECK_TYPE_LABELS } from "@/domain/yard/check-templates";
import { SAFETY_OUTCOME_LABEL, SAFETY_OUTCOME_TONE } from "@/domain/yard/check-outcome";

export const Route = createFileRoute("/_app/checks/")({
  head: () => ({
    meta: [
      { title: "Yard Checks — Veyvio Yard" },
      { name: "description", content: "Vehicles awaiting yard checks and recent check outcomes." },
    ],
  }),
  component: ChecksList,
});

function ChecksList() {
  const vehicles = useYard(s => s.vehicles);
  const checks = useYard(s => s.yardChecks);
  const queue = vehicles.filter(v => v.status === "Awaiting Check");

  return (
    <div className="space-y-6 animate-in-up">
      <SectionHeader title={`Awaiting Check · ${queue.length}`} />
      {queue.length === 0 ? <EmptyState title={yardCopy.empty.nothingAwaitingCheck} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {queue.map(v => (
            <div key={v.id} className="space-y-2">
              <VehicleCard v={v} nextAction="Yard check" />
              <Link to="/yard/$vehicleId/check" params={{ vehicleId: v.id }}>
                <Button className="w-full bg-accent hover:bg-accent/90 text-white uppercase tracking-widest font-bold text-xs">
                  <ClipboardCheck className="size-4" /> Start Check
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}

      <section>
        <SectionHeader title="Recent Checks" />
        <div className="bg-white border border-border rounded-xs mt-3">
          {checks.length === 0 ? <p className="p-4 text-xs text-muted">No checks completed this session.</p> :
            checks.slice(0, 12).map(c => {
              const v = vehicles.find(x => x.id === c.vehicleId);
              return (
                <Link
                  key={c.id}
                  to="/checks/$checkId"
                  params={{ checkId: c.id }}
                  className="flex items-center justify-between gap-3 p-3 border-b border-border last:border-b-0 hover:bg-secondary/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-bold">{v?.reg}</span>
                      <span className="text-muted">{v?.bayId}</span>
                    </div>
                    <div className="text-[10px] text-muted mt-0.5">
                      {CHECK_TYPE_LABELS[c.checkType].label} · {new Date(c.completedAt).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-xs border shrink-0 ${SAFETY_OUTCOME_TONE[c.safetyOutcome]}`}>
                    {SAFETY_OUTCOME_LABEL[c.safetyOutcome]}
                  </span>
                </Link>
              );
            })
          }
        </div>
      </section>
    </div>
  );
}
