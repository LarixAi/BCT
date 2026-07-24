import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Search,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { HubMetricCard, HubMetricStrip } from "@/features/hub/HubMetricCard";
import { HubPageHeader, hubPageShellClass } from "@/features/hub/HubPageHeader";
import { CHECK_TYPE_LABELS } from "@/domain/yard/check-templates";
import { SAFETY_OUTCOME_LABEL, SAFETY_OUTCOME_TONE } from "@/domain/yard/check-outcome";
import { isDemoDataSource } from "@/platform/yard/data-source";
import { useYard } from "@/store/yard";
import type { YardCheckType } from "@/types/yard-check";

const YARD_MANAGER_CHECK_TYPES: {
  type: YardCheckType;
  icon: typeof ClipboardCheck;
  tone?: "default" | "warn" | "ok" | "vor";
}[] = [
  { type: "start-of-day", icon: ClipboardCheck },
  { type: "yard-spot", icon: Search, tone: "warn" },
  { type: "scheduled-inspection", icon: Wrench },
  { type: "first-use", icon: ShieldAlert },
  { type: "return-to-service", icon: ClipboardList, tone: "ok" },
];

export function VehicleChecksHubPage() {
  const vehicles = useYard(s => s.vehicles);
  const checks = useYard(s => s.yardChecks);
  const dataSource = useYard(s => s.dataSource);
  const hydrated = useYard(s => s.hydrated);

  const awaiting = useMemo(() => vehicles.filter(v => v.status === "Awaiting Check"), [vehicles]);
  const followUp = useMemo(
    () => checks.filter(c => ["attention", "hold", "vor"].includes(c.safetyOutcome)).length,
    [checks],
  );
  const driverChecks = useMemo(
    () => checks.filter(c => c.by && !["Yard", "J. Miller", "kenny laing"].includes(c.by)),
    [checks],
  );

  const demo = isDemoDataSource(dataSource);

  return (
    <div className={hubPageShellClass}>
      <HubPageHeader
        title="Vehicle checks"
        description="Review driver walkarounds from Command and start yard inspections on depot vehicles."
        primaryAction={
          <Link
            to="/checks"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white sm:w-auto"
          >
            <ClipboardCheck className="size-4" />
            Yard checks queue
          </Link>
        }
      />

      {!hydrated ? (
        <DashboardSurface>
          <p className="text-sm text-[#667085]">Loading checks from depot sync…</p>
        </DashboardSurface>
      ) : null}

      {hydrated && demo ? (
        <DashboardSurface className="border-[#fed7aa] bg-[#fff7ed]">
          <p className="text-sm text-[#9a3412]">
            Demo data — sign into Command with a live depot to load driver walkarounds from the Driver app.
          </p>
        </DashboardSurface>
      ) : null}

      <HubMetricStrip>
        <HubMetricCard
          label="Awaiting yard check"
          value={awaiting.length}
          icon={ClipboardCheck}
          tone={awaiting.length > 0 ? "warn" : "default"}
        />
        <HubMetricCard label="Submitted checks" value={checks.length} icon={ClipboardList} />
        <HubMetricCard
          label="From drivers"
          value={driverChecks.length}
          icon={Search}
          tone={driverChecks.length > 0 ? "default" : "default"}
        />
        <HubMetricCard
          label="Needs follow-up"
          value={followUp}
          icon={ShieldAlert}
          tone={followUp > 0 ? "vor" : "default"}
        />
      </HubMetricStrip>

      <DashboardSurface>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-ink">Carry out a yard check</h2>
          <p className="mt-0.5 text-sm text-[#667085]">
            Yard manager walkarounds and pre-maintenance inspections start on the vehicle.
          </p>
        </div>

        {awaiting.length > 0 ? (
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            {awaiting.slice(0, 4).map(vehicle => (
              <div
                key={vehicle.id}
                className="rounded-xl border border-[#eaecf0] bg-[#fcfcfd] p-4"
              >
                <p className="font-mono text-lg font-bold tabular-nums text-ink">{vehicle.reg}</p>
                <p className="mt-0.5 text-sm text-[#667085]">
                  {vehicle.bayId} · {vehicle.type}
                </p>
                <Link
                  to="/yard/$vehicleId/check"
                  params={{ vehicleId: vehicle.id }}
                  className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-white"
                >
                  Start check
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-[#667085]">
            No vehicles are waiting for a check. Open a vehicle to run a scheduled or pre-maintenance inspection.
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {YARD_MANAGER_CHECK_TYPES.map(({ type, icon: Icon, tone }) => {
            const meta = CHECK_TYPE_LABELS[type];
            const target = awaiting[0] ?? vehicles.find(v => v.status === "Available");
            if (!target) return null;
            return (
              <Link
                key={type}
                to="/yard/$vehicleId/check"
                params={{ vehicleId: target.id }}
                search={{ type }}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#eaecf0] bg-[#fcfcfd] px-4 py-3 transition-colors hover:bg-white"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border ${
                      tone === "warn"
                        ? "border-[#fedf89] bg-[#fff6ed] text-[#c4320a]"
                        : tone === "ok"
                          ? "border-[#abefc6] bg-[#ecfdf3] text-[#027a48]"
                          : "border-[#e4e7ec] bg-[#f9fafb] text-[#667085]"
                    }`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{meta.label}</p>
                    <p className="mt-0.5 text-xs text-[#667085]">{meta.description}</p>
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-[#98a2b3]" />
              </Link>
            );
          })}
        </div>
      </DashboardSurface>

      <DashboardSurface>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">Submitted checks</h2>
            <p className="mt-0.5 text-sm text-[#667085]">
              Driver walkarounds and completed yard inspections from Command
            </p>
          </div>
          <span className="text-xs text-[#667085]">{checks.length} records</span>
        </div>

        {checks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#e4e7ec] px-4 py-10 text-center">
            <ClipboardCheck className="mx-auto size-8 text-[#98a2b3]" aria-hidden />
            <p className="mt-3 text-sm font-medium text-ink">No vehicle checks yet</p>
            <p className="mt-1 text-sm text-[#667085]">
              When a driver submits a walkaround on the Driver app, the full check with photos and answers appears here after sync.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#eaecf0]">
            {checks.slice(0, 20).map(check => {
              const vehicle = vehicles.find(v => v.id === check.vehicleId);
              return (
                <li key={check.id}>
                  <Link
                    to="/checks/$checkId"
                    params={{ checkId: check.id }}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-[#fcfcfd]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold tabular-nums text-ink">
                          {vehicle?.reg ?? "Vehicle"}
                        </span>
                        <span className="text-xs text-[#667085]">{check.by}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-[#667085]">
                        {CHECK_TYPE_LABELS[check.checkType].label} ·{" "}
                        {new Date(check.completedAt).toLocaleString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                        {check.sections.length > 0 ? ` · ${check.sections.length} sections` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${SAFETY_OUTCOME_TONE[check.safetyOutcome]}`}
                      >
                        {SAFETY_OUTCOME_LABEL[check.safetyOutcome]}
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
