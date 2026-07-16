import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Home,
  List,
  LocateFixed,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import { JourneyMap } from "@/components/driver/journey/JourneyMap";
import { JourneyMapPlaceholder } from "@/components/driver/journey/JourneyMapPlaceholder";
import { DutiesWorkspaceDutyPanel } from "@/components/driver/trips/DutiesWorkspaceDutyPanel";
import {
  buildDutiesWorkspaceView,
  type DutiesSheetSize,
} from "@/domain/trips/duties-workspace-view";
import { useDutiesSheetDrag } from "@/features/duty/use-duties-sheet-drag";
import { useWorkspaceMapChrome } from "@/features/duty/use-workspace-map-chrome";
import {
  assignmentTypeLabel,
  findActiveAssignment,
  findNextAssignment,
  formatScheduleDate,
} from "@/domain/trips/trip-helpers";
import { reconcileReleasedCheckToDriver } from "@/domain/vehicle-check/complete-check-flow";
import { formatTime as formatClock, cn } from "@/lib/utils";
import { useDriverStore } from "@/store/driver";
import { useVehicleCheckStore } from "@/store/vehicle-check";
import type { DriverAssignment, TripsSchedulePayload } from "@/types/trips";

export function DutiesWorkspaceScreen({
  schedule,
  initialDutyId,
}: {
  schedule: TripsSchedulePayload;
  /** From `/trips?dutyId=` — focus that duty in the sheet */
  initialDutyId?: string;
}) {
  const loadDuty = useDriverStore((s) => s.loadDuty);
  const activeDutyId = useDriverStore((s) => s.activeDutyId);
  const [sheetSize, setSheetSize] = useState<DutiesSheetSize>("medium");
  const [listOpen, setListOpen] = useState(false);
  const [focusedDutyId, setFocusedDutyId] = useState<string | undefined>(initialDutyId);
  const [mapEpoch, setMapEpoch] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const { maxExpandedHeight, topChromeStyle, fabBottom } = useWorkspaceMapChrome(rootRef);
  const { dragging, liveHeight, bindDrag } = useDutiesSheetDrag(sheetSize, setSheetSize, {
    maxExpandedHeight,
  });

  useEffect(() => {
    if (initialDutyId) setFocusedDutyId(initialDutyId);
  }, [initialDutyId]);

  const focusAssignment = useMemo(() => {
    const today = schedule.today;
    const active = findActiveAssignment(today);
    const next = active ? undefined : findNextAssignment(today);
    if (focusedDutyId) {
      return (
        today.find((a) => a.dutyId === focusedDutyId) ??
        today.find((a) => a.id === focusedDutyId) ??
        active ??
        next
      );
    }
    if (activeDutyId) {
      return today.find((a) => a.dutyId === activeDutyId) ?? active ?? next;
    }
    return active ?? next ?? today.find((a) => a.dutyId) ?? today[0];
  }, [schedule.today, focusedDutyId, activeDutyId]);

  const dutyId =
    focusedDutyId ??
    focusAssignment?.dutyId ??
    activeDutyId ??
    schedule.today.find((a) => a.dutyId)?.dutyId;

  // Subscribe so Acknowledge / prep mutations refresh the sheet (fresher of store vs mock)
  const duty = useDriverStore((s) => (dutyId ? s.getDuty(dutyId) : null)) ?? undefined;
  const checksHome = useVehicleCheckStore((s) => s.checksHome);
  const checkSession = useVehicleCheckStore((s) => s.activeSession);

  useEffect(() => {
    if (dutyId) void loadDuty(dutyId);
  }, [dutyId, loadDuty]);

  // If Checks already completed, fold that into the duty sheet immediately
  useEffect(() => {
    reconcileReleasedCheckToDriver(checksHome, checkSession);
  }, [checksHome, checkSession, dutyId]);

  const view = buildDutiesWorkspaceView(duty ?? undefined, focusAssignment);

  useEffect(() => {
    if (view.stage === "check" || view.stage === "clock_in" || view.stage === "waiting") {
      setSheetSize((s) => (s === "collapsed" ? "medium" : s));
    }
  }, [view.stage]);

  useEffect(() => {
    if (!dragging) setMapEpoch((n) => n + 1);
  }, [sheetSize, dragging]);

  const mapControlsBottom = fabBottom(liveHeight);

  function selectDuty(assignment: DriverAssignment) {
    if (assignment.dutyId) setFocusedDutyId(assignment.dutyId);
    setListOpen(false);
    setSheetSize("medium");
  }

  return (
    <div
      ref={rootRef}
      className="relative h-full min-h-0 w-full overflow-hidden bg-[#E8EEF4] text-foreground"
    >
      <div className="absolute inset-0">
        {view.mapDutyId ? (
          <JourneyMap
            key={`${view.mapDutyId}-${mapEpoch}`}
            dutyId={view.mapDutyId}
            fullBleed
            hideStatusOverlay
            className="absolute inset-0 h-full w-full rounded-none"
          />
        ) : (
          <JourneyMapPlaceholder fullBleed className="absolute inset-0 h-full w-full" />
        )}
      </div>

      <div
        className="absolute left-0 right-0 z-20 grid grid-cols-[54px_1fr_54px] items-center gap-3 px-4"
        style={topChromeStyle}
      >
        <Link
          to="/"
          aria-label="Home"
          className="grid size-[54px] place-items-center rounded-full bg-white text-accent shadow-[0_10px_28px_rgba(16,24,40,0.2)]"
        >
          <Home className="size-7" strokeWidth={2} />
        </Link>
        <button
          type="button"
          onClick={() => setListOpen(true)}
          className="justify-self-center min-w-[170px] max-w-[230px] rounded-full bg-accent px-[18px] py-3 text-center text-white shadow-[0_10px_28px_rgba(16,24,40,0.22)]"
        >
          <strong className="block text-[15px] font-extrabold">{view.pillTitle}</strong>
          <span className="mt-0.5 block truncate text-[11px] text-white/70">{view.pillSub}</span>
        </button>
        <Link
          to="/more/support"
          aria-label="Safety and Operations"
          className="grid size-[54px] place-items-center rounded-full bg-white text-accent shadow-[0_10px_28px_rgba(16,24,40,0.2)]"
        >
          <ShieldCheck className="size-7" strokeWidth={2} />
        </Link>
      </div>

      {sheetSize !== "expanded" ? (
        <div
          className={cn(
            "absolute right-4 z-20 grid gap-3",
            !dragging && "transition-[bottom] duration-250",
          )}
          style={{ bottom: mapControlsBottom }}
        >
          {view.mapDutyId ? (
            <Link
              to="/duties/$dutyId/nav"
              params={{ dutyId: view.mapDutyId }}
              aria-label="Centre map / open navigation"
              className="grid size-[50px] place-items-center rounded-full bg-white text-link shadow-[0_10px_24px_rgba(16,24,40,0.18)]"
            >
              <LocateFixed className="size-6" />
            </Link>
          ) : (
            <span className="grid size-[50px] place-items-center rounded-full bg-white text-muted shadow-[0_10px_24px_rgba(16,24,40,0.18)]">
              <LocateFixed className="size-6" />
            </span>
          )}
          <Link
            to="/incidents/report"
            aria-label="Report issue"
            className="grid size-[50px] place-items-center rounded-full bg-white text-vor shadow-[0_10px_24px_rgba(16,24,40,0.18)]"
          >
            <AlertTriangle className="size-6" />
          </Link>
        </div>
      ) : null}

      <section
        className={cn(
          "absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-[28px] bg-white/98 shadow-[0_-12px_38px_rgba(16,24,40,0.18)]",
          !dragging && "transition-[height] duration-250 ease-out",
        )}
        style={{ height: liveHeight }}
        data-size={sheetSize}
      >
        <div
          {...bindDrag}
          className="flex-none touch-none select-none"
          role="slider"
          aria-label="Duty sheet height — swipe up or down"
          aria-valuetext={sheetSize}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setSheetSize((s) =>
                s === "collapsed" ? "medium" : s === "medium" ? "expanded" : "expanded",
              );
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSheetSize((s) =>
                s === "expanded" ? "medium" : s === "medium" ? "collapsed" : "collapsed",
              );
            }
          }}
        >
          <div className="grid h-10 w-full place-items-center">
            <span className="h-1.5 w-[52px] rounded-full bg-[#D0D5DD]" />
          </div>

          <div className="grid grid-cols-[48px_1fr_48px] items-center border-b border-border px-4 pb-3">
            <button
              type="button"
              aria-label="Show full duty details in sheet"
              onClick={(e) => {
                e.stopPropagation();
                setSheetSize("expanded");
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="grid size-[42px] place-items-center rounded-[14px] bg-[#F2F4F7] text-accent"
            >
              <Settings2 className="size-[23px]" />
            </button>
            <div className="pointer-events-none min-w-0 text-center">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">
                {view.stageLabel}
              </p>
              <p className="mt-0.5 truncate text-lg font-extrabold tracking-tight">{view.stageTitle}</p>
            </div>
            <button
              type="button"
              aria-label="Open duties list"
              onClick={(e) => {
                e.stopPropagation();
                setListOpen(true);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="grid size-[42px] place-items-center rounded-[14px] bg-[#F2F4F7] text-accent"
            >
              <List className="size-[23px]" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overscroll-contain">
          <DutiesWorkspaceDutyPanel dutyId={dutyId} view={view} sheetSize={sheetSize} />
        </div>
      </section>

      {listOpen ? (
        <div
          className="absolute inset-0 z-40 flex items-end bg-[rgba(11,21,38,0.45)]"
          role="dialog"
          aria-label="Duties list"
          onClick={(e) => {
            if (e.target === e.currentTarget) setListOpen(false);
          }}
        >
          <div className="max-h-[78%] w-full overflow-auto rounded-t-[28px] bg-white px-[18px] pb-6 pt-3.5 shadow-[0_-18px_45px_rgba(16,24,40,0.22)]">
            <header className="flex items-center justify-between py-1.5 pb-3.5">
              <h2 className="font-display text-2xl font-extrabold tracking-tight">Duties</h2>
              <button
                type="button"
                aria-label="Close duties list"
                onClick={() => setListOpen(false)}
                className="grid size-[42px] place-items-center rounded-full bg-[#F2F4F7]"
              >
                <X className="size-5" />
              </button>
            </header>

            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">
              Today · {formatScheduleDate(new Date().toISOString().slice(0, 10))}
            </p>
            {schedule.today.map((assignment) => (
              <DutyListRow
                key={assignment.id}
                assignment={assignment}
                active={assignment.dutyId === dutyId || assignment.id === focusAssignment?.id}
                onSelect={() => selectDuty(assignment)}
              />
            ))}

            <p className="mb-2 mt-[18px] text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">
              Upcoming
            </p>
            {Object.entries(schedule.upcoming)
              .sort(([a], [b]) => a.localeCompare(b))
              .flatMap(([date, items]) =>
                items.map((assignment) => (
                  <DutyListRow
                    key={assignment.id}
                    assignment={assignment}
                    subtitleOverride={`${formatScheduleDate(date)} · ${formatClock(assignment.scheduledStart)}`}
                    onSelect={() => selectDuty(assignment)}
                  />
                )),
              )}
            {Object.keys(schedule.upcoming).length === 0 ? (
              <p className="py-3 text-sm text-muted">No upcoming duties.</p>
            ) : null}

            <p className="mb-2 mt-[18px] text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">
              Completed
            </p>
            {Object.entries(schedule.completed)
              .sort(([a], [b]) => b.localeCompare(a))
              .flatMap(([date, items]) =>
                items.slice(0, 5).map((assignment) => (
                  <DutyListRow
                    key={assignment.id}
                    assignment={assignment}
                    done
                    subtitleOverride={`${formatScheduleDate(date)} · ${formatClock(assignment.scheduledStart)}`}
                    onSelect={() => selectDuty(assignment)}
                  />
                )),
              )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DutyListRow({
  assignment,
  active,
  done,
  subtitleOverride,
  onSelect,
}: {
  assignment: DriverAssignment;
  active?: boolean;
  done?: boolean;
  subtitleOverride?: string;
  onSelect: () => void;
}) {
  const title = assignment.runName ?? assignmentTypeLabel(assignment.assignmentType);
  const subtitle =
    subtitleOverride ??
    `${formatClock(assignment.scheduledStart)}${
      assignment.scheduledEnd ? `–${formatClock(assignment.scheduledEnd)}` : ""
    } · ${assignment.status.replace(/_/g, " ")}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="grid w-full grid-cols-[12px_1fr_auto] items-center gap-3 border-b border-border py-3.5 text-left"
    >
      <span
        className={cn(
          "size-2.5 rounded-full bg-[#98A2B3]",
          active && "bg-link",
          done && "bg-ok",
        )}
      />
      <span className="min-w-0">
        <strong className="block text-sm font-bold">{title}</strong>
        <span className="mt-0.5 block text-xs text-muted">{subtitle}</span>
      </span>
      <b className="text-xs font-bold text-link">{active ? "Open" : done ? "History" : "View"}</b>
    </button>
  );
}
