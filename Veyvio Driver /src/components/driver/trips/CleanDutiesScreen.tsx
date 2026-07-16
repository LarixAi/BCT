import { Link } from "@tanstack/react-router";
import { ChevronRight, LocateFixed } from "lucide-react";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { JourneyMap } from "@/components/driver/journey/JourneyMap";
import { JourneyMapPlaceholder } from "@/components/driver/journey/JourneyMapPlaceholder";
import { AppOperationalBanners } from "@/components/driver/shells/AppOperationalBanners";
import { TripsCompletedTab } from "@/components/driver/trips/TripsCompletedTab";
import { TripsTabBar } from "@/components/driver/trips/TripsTabBar";
import { TripsUpcomingTab } from "@/components/driver/trips/TripsUpcomingTab";
import { statusStripClass } from "@/domain/home/clean-home-view";
import {
  assignmentTypeLabel,
  statusLabel,
} from "@/domain/trips/trip-helpers";
import { buildCleanDutiesView } from "@/domain/trips/clean-duties-view";
import { formatTime, cn } from "@/lib/utils";
import type { DriverAssignment, OperationalAlert, TripsTab } from "@/types/trips";
import type { TripsPageState } from "@/types/trips";
import type { TripsTodayFilter } from "@/types/driver-filters";
import { matchesTripsAssignmentFilter } from "@/domain/driver/assignment-filters";
import { TRIPS_TODAY_FILTERS } from "@/types/driver-filters";
import { FilterChipBar } from "@/components/driver/shared/FilterChipBar";
import { OperationalAlertCard } from "@/components/driver/trips/OperationalAlertCard";

export function CleanDutiesScreen({
  assignments,
  alerts,
  upcoming,
  completed,
  activeTab,
  onTabChange,
  todayFilter,
  onTodayFilterChange,
  completedFilter,
  onCompletedFilterChange,
}: {
  assignments: DriverAssignment[];
  alerts: OperationalAlert[];
  upcoming: Record<string, DriverAssignment[]>;
  completed: Record<string, DriverAssignment[]>;
  activeTab: TripsTab;
  onTabChange: (tab: TripsTab) => void;
  todayFilter: TripsTodayFilter;
  onTodayFilterChange: (filter: TripsTodayFilter) => void;
  completedFilter: TripsPageState["completedFilter"];
  onCompletedFilterChange: (filter: TripsPageState["completedFilter"]) => void;
}) {
  const filteredToday = assignments.filter((a) => matchesTripsAssignmentFilter(a, todayFilter));
  const view = buildCleanDutiesView(filteredToday, alerts);

  return (
    <div className="min-h-[calc(100dvh-7rem)] bg-[#F4F6F8] text-foreground">
      <div
        className={cn(
          "flex w-full items-center justify-between gap-3 px-5 text-left text-white",
          "min-h-[3.5rem] pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]",
          statusStripClass(view.tone),
        )}
        role="status"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="size-2.5 shrink-0 rounded-full bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.2)]" />
          <span className="truncate text-sm font-bold tracking-tight">{view.statusLabel}</span>
        </span>
        <ChevronRight className="size-7 shrink-0 opacity-90" strokeWidth={1.5} />
      </div>

      <section className="bg-white px-5 pb-4 pt-4">
        <div className="mb-5">
          <BrandWordmark size="chrome" layout="stacked" theme="on-light" align="left" />
          <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-link">
            Duties
          </p>
        </div>
        <h1 className="font-display text-[clamp(1.75rem,6vw,2.5rem)] font-extrabold leading-[1.05] tracking-[-0.04em] text-accent">
          {view.headline}
        </h1>
        <p className="mt-2.5 text-base leading-snug text-muted">{view.subhead}</p>
        <div className="mt-5">
          <TripsTabBar active={activeTab} onChange={onTabChange} />
        </div>
      </section>

      <div className="space-y-3 px-5 pt-4 empty:hidden">
        <AppOperationalBanners flush />
      </div>

      {activeTab === "today" && (
        <section className="space-y-5 px-5 pb-6 pt-4">
          <FilterChipBar
            label="Today's duty filters"
            size="sm"
            options={TRIPS_TODAY_FILTERS}
            active={todayFilter}
            onChange={onTodayFilterChange}
          />

          {view.alerts.map((alert) => (
            <OperationalAlertCard key={alert.id} alert={alert} />
          ))}

          <div
            className="relative h-[min(52vw,290px)] overflow-hidden rounded-[22px] border border-border/70 bg-[#E9EEF4] shadow-[inset_0_0_0_1px_rgba(16,24,40,0.06)]"
            aria-label={view.mapLabel}
          >
            {view.mapDutyId ? (
              <JourneyMap
                dutyId={view.mapDutyId}
                preview
                hideStatusOverlay
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <JourneyMapPlaceholder className="absolute inset-0 h-full w-full" />
            )}
            {view.mapDutyId ? (
              <Link
                to="/duties/$dutyId/nav"
                params={{ dutyId: view.mapDutyId }}
                className="absolute inset-0 z-[450]"
                aria-label={`${view.mapLabel} — open navigation`}
              />
            ) : null}
            <div className="pointer-events-none absolute left-3.5 top-3.5 z-[500] inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2.5 text-[13px] font-bold shadow-md">
              <span className="size-2 rounded-full bg-ok" />
              {view.mapLabel}
            </div>
            {view.mapDutyId ? (
              <Link
                to="/duties/$dutyId/nav"
                params={{ dutyId: view.mapDutyId }}
                aria-label="Open map / navigation"
                className="absolute bottom-3.5 right-3.5 z-[500] grid size-11 place-items-center rounded-2xl bg-white text-link shadow-md"
              >
                <LocateFixed className="size-5" />
              </Link>
            ) : null}
          </div>

          <article className="rounded-[22px] border border-border bg-white p-5 shadow-[0_8px_24px_rgba(16,24,40,0.08)]">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.13em] text-link">
              {view.eyebrow}
            </p>
            <h2 className="mt-1.5 font-display text-2xl font-extrabold leading-tight tracking-tight">
              {view.primaryTitle}
            </h2>
            <p className="mt-2 text-sm leading-snug text-muted">{view.primaryCopy}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="border-t border-border pt-3">
                <span className="block text-xs text-muted">{view.meta1.label}</span>
                <span className="mt-1 block text-sm font-bold">{view.meta1.value}</span>
              </div>
              <div className="border-t border-border pt-3">
                <span className="block text-xs text-muted">{view.meta2.label}</span>
                <span className="mt-1 block text-sm font-bold tabular-nums">{view.meta2.value}</span>
              </div>
            </div>
            {view.primaryHref ? (
              <Link
                to={view.primaryHref}
                className="mt-4 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-accent text-sm font-extrabold uppercase tracking-widest text-white"
              >
                {view.primaryButton}
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="mt-4 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-accent/50 text-sm font-extrabold uppercase tracking-widest text-white"
              >
                {view.primaryButton}
              </button>
            )}
          </article>

          {(view.remaining.length > 0 || view.completed.length > 0) && (
            <div>
              <p className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.12em] text-muted">
                Today’s schedule
              </p>
              <div className="overflow-hidden border-t border-border bg-white">
                {view.remaining.map((assignment) => (
                  <DutyScheduleRow key={assignment.id} assignment={assignment} />
                ))}
                {view.completed.map((assignment) => (
                  <DutyScheduleRow key={assignment.id} assignment={assignment} muted />
                ))}
              </div>
            </div>
          )}

          {filteredToday.length === 0 && view.alerts.length === 0 && (
            <p className="text-sm text-muted">No duties match this filter for today.</p>
          )}
        </section>
      )}

      {activeTab === "upcoming" && (
        <section className="px-5 pb-6 pt-4">
          <TripsUpcomingTab grouped={upcoming} />
        </section>
      )}

      {activeTab === "completed" && (
        <section className="px-5 pb-6 pt-4">
          <TripsCompletedTab
            grouped={completed}
            filter={completedFilter}
            onFilterChange={onCompletedFilterChange}
          />
        </section>
      )}
    </div>
  );
}

function DutyScheduleRow({
  assignment,
  muted = false,
}: {
  assignment: DriverAssignment;
  muted?: boolean;
}) {
  const href = assignment.primaryActionHref ?? `/trips/${assignment.id}`;
  const title = assignment.runName ?? assignmentTypeLabel(assignment.assignmentType);

  return (
    <Link
      to={href}
      className={cn(
        "grid min-h-[78px] w-full grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-1 py-3.5 text-left active:bg-[#FAFBFC]",
        muted && "opacity-70",
      )}
    >
      <span className="font-mono text-sm font-bold tabular-nums text-accent">
        {formatTime(assignment.scheduledStart)}
      </span>
      <span className="min-w-0">
        <p className="text-[15px] font-bold">{title}</p>
        <p className="mt-0.5 truncate text-[13px] leading-snug text-muted">
          {assignment.origin} → {assignment.destination}
        </p>
        <p className="mt-0.5 text-[12px] capitalize text-muted">{statusLabel(assignment.status)}</p>
      </span>
      <ChevronRight className="size-5 text-[#98A2B3]" strokeWidth={1.5} />
    </Link>
  );
}
