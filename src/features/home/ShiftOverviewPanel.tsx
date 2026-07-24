import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import type { OperationalPlan } from "@/types/yard";
import type { Trip, Vehicle } from "@/types/yard";
import { ThickProgressBar } from "./HomeDashboardPrimitives";

type TimelineItem = {
  id: string;
  date: string;
  title: string;
  done: boolean;
  to: string;
};

type Props = {
  nextTrip?: Trip;
  nextTripVehicle?: Vehicle;
  departureProgress: number;
  operationalPlan?: OperationalPlan | null;
  timeline: TimelineItem[];
  openTaskCount: number;
};

export function ShiftOverviewPanel({
  nextTrip,
  nextTripVehicle,
  departureProgress,
  operationalPlan,
  timeline,
  openTaskCount,
}: Props) {
  const title = nextTrip ? `${nextTrip.code} · ${nextTrip.service}` : "No active run";
  const subtitle = nextTrip
    ? `${nextTrip.departAt} departure${nextTripVehicle ? ` · ${nextTripVehicle.reg}` : ""}`
    : "Waiting for published duties";

  return (
    <section className="flex h-full flex-col rounded-2xl border border-[#e4e7ec] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-ink">Shift overview</h2>
          <span className="rounded-md bg-[#f2f4f7] px-1.5 py-0.5 text-[11px] font-semibold text-[#475467]">
            {openTaskCount}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="grid size-8 place-items-center rounded-lg border border-[#e4e7ec] text-[#98a2b3]">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" className="grid size-8 place-items-center rounded-lg border border-[#e4e7ec] text-[#98a2b3]">
            <ChevronRight className="size-4" />
          </button>
          <Link to="/departure-line" className="grid size-8 place-items-center rounded-lg border border-[#e4e7ec] text-[#667085]">
            <ExternalLink className="size-4" />
          </Link>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-[#667085]">
        <span className="grid size-6 place-items-center rounded-md bg-command-50 text-[10px] font-bold text-command-700">
          VY
        </span>
        Veyvio Yard · {operationalPlan?.operationalDate ?? "Today"}
      </div>

      <h3 className="mt-2 text-xl font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-[#667085]">{subtitle}</p>

      <p className="mt-3 text-sm leading-relaxed text-[#667085]">
        {nextTrip?.ready
          ? "Run is ready for release. Driver and vehicle checks are clear for departure."
          : nextTrip?.blockers[0]
            ? `Blocked: ${nextTrip.blockers.join(", ")}. Resolve before release.`
            : "Monitor departures, staging order and open depot tasks from this panel."}
      </p>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-ink">Progress</span>
          <span className="font-semibold tabular-nums text-ink">{departureProgress}%</span>
        </div>
        <ThickProgressBar value={departureProgress} />
      </div>

      <div className="mt-6 border-t border-[#eaecf0] pt-5">
        <h4 className="text-sm font-semibold text-ink">Work timeline</h4>
        <ol className="mt-4 space-y-4">
          {timeline.length === 0 ? (
            <li className="text-sm text-[#667085]">No milestones scheduled yet.</li>
          ) : (
            timeline.map((item, index) => (
              <li key={item.id} className="relative flex gap-3 pl-1">
                {index < timeline.length - 1 && (
                  <span className="absolute left-[11px] top-7 h-[calc(100%+4px)] w-px border-l border-dashed border-[#d0d5dd]" />
                )}
                <span
                  className={`relative z-10 mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-md border ${
                    item.done
                      ? "border-ink bg-ink text-white"
                      : "border-[#d0d5dd] bg-white text-transparent"
                  }`}
                >
                  {item.done ? "✓" : ""}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#98a2b3]">{item.date}</p>
                  <p className="mt-0.5 text-sm font-medium text-ink">{item.title}</p>
                </div>
                <Link
                  to={item.to}
                  className="inline-flex shrink-0 items-center gap-1 self-start rounded-lg border border-[#e4e7ec] px-2.5 py-1.5 text-xs font-medium text-ink"
                >
                  View
                  <ArrowUpRight className="size-3" />
                </Link>
              </li>
            ))
          )}
        </ol>
      </div>
    </section>
  );
}
