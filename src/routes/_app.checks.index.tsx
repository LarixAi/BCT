import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, ClipboardCheck, ClipboardList, ShieldAlert, Truck } from "lucide-react";
import { useYard } from "@/store/yard";
import { EmptyState } from "@/components/yard/primitives";
import { yardCopy } from "@/copy/yard-messages";
import { CHECK_TYPE_LABELS } from "@/domain/yard/check-templates";
import { SAFETY_OUTCOME_LABEL, SAFETY_OUTCOME_TONE } from "@/domain/yard/check-outcome";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { HubMetricCard, HubMetricStrip } from "@/features/hub/HubMetricCard";
import { HubPageHeader, hubPageShellClass } from "@/features/hub/HubPageHeader";

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
  const queue = useMemo(() => vehicles.filter(v => v.status === "Awaiting Check"), [vehicles]);
  const followUp = useMemo(
    () => checks.filter(c => c.safetyOutcome === "attention" || c.safetyOutcome === "hold" || c.safetyOutcome === "vor").length,
    [checks],
  );
  const cleared = useMemo(() => checks.filter(c => c.safetyOutcome === "ready").length, [checks]);

  return (
    <div className={hubPageShellClass}>
      <HubPageHeader
        title="Checks"
        description="Yard walkarounds due now and outcomes from this shift."
      />

      <HubMetricStrip>
        <HubMetricCard label="Awaiting check" value={queue.length} icon={ClipboardCheck} tone={queue.length > 0 ? "warn" : "default"} />
        <HubMetricCard label="Cleared" value={cleared} icon={ClipboardList} tone="ok" />
        <HubMetricCard label="Needs follow-up" value={followUp} icon={ShieldAlert} tone={followUp > 0 ? "vor" : "default"} />
        <HubMetricCard label="On depot" value={vehicles.length} icon={Truck} />
      </HubMetricStrip>

      <DashboardSurface>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">Awaiting check</h2>
            <p className="mt-0.5 text-sm text-[#667085]">{queue.length} vehicles need a yard walkaround</p>
          </div>
        </div>

        {queue.length === 0 ? (
          <EmptyState title={yardCopy.empty.nothingAwaitingCheck} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {queue.map(v => (
              <div
                key={v.id}
                className="rounded-xl border border-[#eaecf0] bg-[#fcfcfd] p-4 transition-colors hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-lg font-bold tabular-nums text-ink">{v.reg}</p>
                    <p className="mt-0.5 text-sm text-[#667085]">{v.bayId} · {v.type}</p>
                  </div>
                  <span className="rounded-full bg-[#fff6ed] px-2.5 py-1 text-xs font-medium text-[#c4320a]">
                    Check due
                  </span>
                </div>
                <Link
                  to="/yard/$vehicleId/check"
                  params={{ vehicleId: v.id }}
                  className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-white"
                >
                  <ClipboardCheck className="size-4" />
                  Start check
                </Link>
              </div>
            ))}
          </div>
        )}
      </DashboardSurface>

      <DashboardSurface>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">Recent checks</h2>
          <span className="text-xs text-[#667085]">{checks.length} this session</span>
        </div>

        {checks.length === 0 ? (
          <p className="text-sm text-[#667085]">No checks completed this session.</p>
        ) : (
          <ul className="divide-y divide-[#eaecf0]">
            {checks.slice(0, 12).map(c => {
              const v = vehicles.find(x => x.id === c.vehicleId);
              return (
                <li key={c.id}>
                  <Link
                    to="/checks/$checkId"
                    params={{ checkId: c.id }}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-[#fcfcfd]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold tabular-nums text-ink">{v?.reg}</span>
                        <span className="text-xs text-[#667085]">{v?.bayId}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-[#667085]">
                        {CHECK_TYPE_LABELS[c.checkType].label} ·{" "}
                        {new Date(c.completedAt).toLocaleString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${SAFETY_OUTCOME_TONE[c.safetyOutcome]}`}>
                        {SAFETY_OUTCOME_LABEL[c.safetyOutcome]}
                      </span>
                      <ChevronRight className="size-4 text-[#98a2b3]" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </DashboardSurface>
    </div>
  );
}
