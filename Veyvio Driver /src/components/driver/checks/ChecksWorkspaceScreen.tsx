import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Camera,
  History,
  Home,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  X,
} from "lucide-react";
import { VehicleCheckCanvas } from "@/components/driver/checks/VehicleCheckCanvas";
import {
  buildChecksWorkspaceView,
  type ChecksSheetSize,
} from "@/domain/vehicle-check/checks-workspace-view";
import { useDutiesSheetDrag } from "@/features/duty/use-duties-sheet-drag";
import { useWorkspaceMapChrome } from "@/features/duty/use-workspace-map-chrome";
import { cn } from "@/lib/utils";
import { useVehicleCheckStore } from "@/store/vehicle-check";
import type { VehicleChecksHome } from "@/types/vehicle-check";

const DEFECT_SEARCH = {
  mode: "check" as const,
  itemId: undefined,
  sectionId: undefined,
  component: "Vehicle defect",
  position: undefined,
  returnTo: "/checks",
};

const WALKAROUND_SEARCH = {
  section: undefined,
  item: undefined,
  step: undefined,
};

export function ChecksWorkspaceScreen({
  home,
  onStartCheck,
  onContinueCheck,
}: {
  home: VehicleChecksHome;
  onStartCheck: () => void;
  onContinueCheck?: () => void;
}) {
  const navigate = useNavigate();
  const activeSession = useVehicleCheckStore((s) => s.activeSession);
  const [sheetSize, setSheetSize] = useState<ChecksSheetSize>("medium");
  const [historyOpen, setHistoryOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { maxExpandedHeight, topChromeStyle, fabBottom } = useWorkspaceMapChrome(rootRef);
  const { dragging, liveHeight, bindDrag } = useDutiesSheetDrag(sheetSize, setSheetSize, {
    maxExpandedHeight,
  });

  const view = useMemo(
    () => buildChecksWorkspaceView(home, activeSession),
    [home, activeSession],
  );

  useEffect(() => {
    if (view.stage === "verify" || view.stage === "vor" || view.stage === "waiting") {
      setSheetSize((s) => (s === "collapsed" ? "medium" : s));
    }
  }, [view.stage]);

  const canvasActionsBottom = fabBottom(liveHeight);

  function goHref(href: string | undefined) {
    if (!href) return;
    if (href.startsWith("/trips")) {
      const dutyId = new URLSearchParams(href.split("?")[1] ?? "").get("dutyId") ?? undefined;
      void navigate({ to: "/trips", search: { demo: "normal", dutyId } });
      return;
    }
    if (href === "/checks/walkaround") {
      void navigate({ to: "/checks/walkaround", search: WALKAROUND_SEARCH });
      return;
    }
    if (href === "/checks/defect") {
      void navigate({ to: "/checks/defect", search: DEFECT_SEARCH });
      return;
    }
    if (href === "/checks/result") {
      void navigate({ to: "/checks/result", search: { demo: undefined } });
      return;
    }
    if (href === "/checks" || href === "/checks/") {
      void navigate({ to: "/checks", search: { demo: "normal" } });
      return;
    }
    void navigate({ to: href });
  }

  function runPrimary() {
    if (view.primaryAction === "start") {
      onStartCheck();
      return;
    }
    if (view.primaryAction === "continue") {
      if (onContinueCheck) onContinueCheck();
      else goHref(view.primaryHref);
      return;
    }
    goHref(view.primaryHref);
  }

  return (
    <div
      ref={rootRef}
      className="relative h-full min-h-0 w-full overflow-hidden bg-[#EEF2F6] text-foreground"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 52% 24%, rgba(47,107,255,0.12), transparent 28%), linear-gradient(180deg, #f9fbfd 0%, #eaf0f5 75%, #dfe6ed 100%)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(11,21,38,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(11,21,38,0.035) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "linear-gradient(to bottom, black, transparent 82%)",
          }}
        />
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
          onClick={() => setHistoryOpen(true)}
          className="min-w-[180px] max-w-[230px] justify-self-center rounded-full bg-accent px-[18px] py-2.5 text-center text-white shadow-[0_10px_28px_rgba(16,24,40,0.22)]"
        >
          <strong className="block text-[15px] font-extrabold tabular-nums tracking-wide">
            {view.pillTitle}
          </strong>
          <span className="mt-0.5 block truncate text-[11px] text-white/70">{view.pillSub}</span>
        </button>
        <Link
          to="/more/support"
          aria-label="Safety centre"
          className="grid size-[54px] place-items-center rounded-full bg-white text-accent shadow-[0_10px_28px_rgba(16,24,40,0.2)]"
        >
          <ShieldCheck className="size-7" strokeWidth={2} />
        </Link>
      </div>

      <VehicleCheckCanvas
        zones={view.zones}
        onZoneSelect={() => {
          if (view.stage === "verify") void navigate({ to: "/checks/verify" });
          else void navigate({ to: "/checks/walkaround", search: WALKAROUND_SEARCH });
        }}
      />

      {sheetSize !== "expanded" ? (
        <div
          className={cn(
            "absolute right-4 z-20 grid gap-3",
            !dragging && "transition-[bottom] duration-250",
          )}
          style={{ bottom: canvasActionsBottom }}
        >
          <Link
            to="/checks/defect"
            search={DEFECT_SEARCH}
            aria-label="Capture photo"
            className="grid size-[50px] place-items-center rounded-full bg-white text-link shadow-[0_10px_24px_rgba(16,24,40,0.18)]"
          >
            <Camera className="size-6" />
          </Link>
          <Link
            to="/checks/defect"
            search={DEFECT_SEARCH}
            aria-label="Report defect"
            className="grid size-[50px] place-items-center rounded-full bg-white text-vor shadow-[0_10px_24px_rgba(16,24,40,0.18)]"
          >
            <TriangleAlert className="size-6" />
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
          aria-label="Checks sheet height — swipe up or down"
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
              aria-label="Show full check details in sheet"
              onClick={(e) => {
                e.stopPropagation();
                setSheetSize("expanded");
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="grid size-[42px] place-items-center rounded-[14px] bg-[#F2F4F7] text-accent"
            >
              <SlidersHorizontal className="size-[23px]" />
            </button>
            <div className="pointer-events-none min-w-0 text-center">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">
                {view.stageLabel}
              </p>
              <p className="mt-0.5 truncate text-lg font-extrabold tracking-tight">
                {view.stageTitle}
              </p>
            </div>
            <button
              type="button"
              aria-label="Open previous checks"
              onClick={(e) => {
                e.stopPropagation();
                setHistoryOpen(true);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="grid size-[42px] place-items-center rounded-[14px] bg-[#F2F4F7] text-accent"
            >
              <History className="size-[23px]" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-[18px] pb-6 pt-4">
          <div
            className={cn(
              "mb-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-extrabold",
              view.toneClass === "ok" && "bg-[#ecfdf3] text-ok",
              view.toneClass === "warn" && "bg-[#fff7ed] text-warn",
              view.toneClass === "red" && "bg-[#fef3f2] text-vor",
              !view.toneClass && "bg-[#EFF6FF] text-link",
            )}
          >
            {view.toneLabel}
          </div>

          <h2 className="text-[25px] font-extrabold leading-[1.08] tracking-tight">{view.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{view.copy}</p>

          {sheetSize !== "collapsed" ? (
            <>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#E4E7EC]">
                <div
                  className="h-full rounded-full bg-link transition-[width] duration-250"
                  style={{ width: `${view.progressPct}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between gap-3 text-[11px] text-muted">
                <span>{view.progressText}</span>
                <span>{view.defectText}</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="border-t border-border pt-2.5">
                  <small className="block text-muted">{view.meta1.label}</small>
                  <strong className="mt-1 block text-sm">{view.meta1.value}</strong>
                </div>
                <div className="border-t border-border pt-2.5">
                  <small className="block text-muted">{view.meta2.label}</small>
                  <strong className="mt-1 block text-sm">{view.meta2.value}</strong>
                </div>
              </div>
            </>
          ) : null}

          <button
            type="button"
            onClick={runPrimary}
            className={cn(
              "mt-[18px] min-h-[52px] w-full rounded-[14px] bg-accent text-sm font-extrabold text-white",
              view.primaryTone === "ok" && "bg-ok",
              view.primaryTone === "warn" && "bg-warn",
              view.primaryTone === "red" && "bg-vor",
            )}
          >
            {view.primaryLabel}
          </button>

          {sheetSize !== "collapsed" ? (
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => goHref(view.secondary1.href)}
                className="grid min-h-11 place-items-center rounded-xl border border-border bg-white text-[13px] font-bold"
              >
                {view.secondary1.label}
              </button>
              <button
                type="button"
                onClick={() => goHref(view.secondary2.href)}
                className="grid min-h-11 place-items-center rounded-xl border border-border bg-white text-[13px] font-bold"
              >
                {view.secondary2.label}
              </button>
            </div>
          ) : null}

          {sheetSize === "expanded" ? (
            <div className="mt-[22px] space-y-[22px] border-t border-border pt-[18px]">
              <section>
                <h3 className="mb-2.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-muted">
                  Inspection sections
                </h3>
                {view.inspectionRows.map((row, index) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[34px_1fr_auto] items-center gap-2.5 border-b border-border py-3"
                  >
                    <span
                      className={cn(
                        "grid size-7 place-items-center rounded-full bg-[#F2F4F7] text-xs font-extrabold text-muted",
                        row.status === "done" && "bg-[#ecfdf3] text-ok",
                        row.status === "current" && "bg-[#EFF6FF] text-link",
                        row.status === "defect" && "bg-[#fef3f2] text-vor",
                      )}
                    >
                      {row.status === "done" ? "✓" : index + 1}
                    </span>
                    <span className="min-w-0">
                      <strong className="block text-sm">{row.title}</strong>
                      <span className="mt-0.5 block text-xs text-muted">{row.subtitle}</span>
                    </span>
                    <b
                      className={cn(
                        "text-xs font-bold text-link",
                        row.status === "done" && "text-ok",
                        row.status === "defect" && "text-vor",
                        row.status === "pending" && "text-muted",
                      )}
                    >
                      {row.badge}
                    </b>
                  </div>
                ))}
              </section>

              <section>
                <h3 className="mb-2.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-muted">
                  Assigned vehicle
                </h3>
                <div className="grid grid-cols-[34px_1fr_auto] items-center gap-2.5 border-b border-border py-3">
                  <span className="grid size-7 place-items-center rounded-full bg-[#F2F4F7] text-xs font-extrabold text-muted">
                    V
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm">
                      {home.vehicle.make} {home.vehicle.model}
                    </strong>
                    <span className="mt-0.5 block text-xs text-muted">
                      Fleet {home.vehicle.fleetNumber} · {home.vehicle.depotName}
                    </span>
                  </span>
                  <Link to="/checks/known-issues" className="text-xs font-bold text-link">
                    Details
                  </Link>
                </div>
                <div className="grid grid-cols-[34px_1fr_auto] items-center gap-2.5 border-b border-border py-3">
                  <span className="grid size-7 place-items-center rounded-full bg-[#F2F4F7] text-xs font-extrabold text-muted">
                    !
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm">Known bodywork</strong>
                    <span className="mt-0.5 block text-xs text-muted">
                      {home.knownIssues.cosmeticDamageCount} existing cosmetic record
                      {home.knownIssues.cosmeticDamageCount === 1 ? "" : "s"}
                    </span>
                  </span>
                  <Link to="/checks/known-issues" className="text-xs font-bold text-link">
                    Review
                  </Link>
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </section>

      {historyOpen ? (
        <div
          className="absolute inset-0 z-40 flex items-end bg-[rgba(11,21,38,0.45)]"
          role="dialog"
          aria-label="Previous checks"
          onClick={(e) => {
            if (e.target === e.currentTarget) setHistoryOpen(false);
          }}
        >
          <div className="max-h-[80%] w-full overflow-auto rounded-t-[28px] bg-white px-[18px] pb-6 pt-3.5 shadow-[0_-18px_45px_rgba(16,24,40,0.22)]">
            <header className="flex items-center justify-between py-1.5 pb-3.5">
              <h2 className="font-display text-2xl font-extrabold tracking-tight">
                Previous checks
              </h2>
              <button
                type="button"
                aria-label="Close previous checks"
                onClick={() => setHistoryOpen(false)}
                className="grid size-[42px] place-items-center rounded-full bg-[#F2F4F7]"
              >
                <X className="size-5" />
              </button>
            </header>

            {home.vehicle.lastCompletedCheck ? (
              <Link
                to="/checks/result"
                search={{ demo: undefined }}
                className="grid grid-cols-[1fr_auto] gap-3 border-b border-border py-3.5"
                onClick={() => setHistoryOpen(false)}
              >
                <span>
                  <strong className="block text-sm">
                    Today · {home.vehicle.lastCompletedCheck.completedAt}
                  </strong>
                  <span className="mt-0.5 block text-xs text-muted">
                    {home.vehicle.registration} ·{" "}
                    {home.vehicle.lastCompletedCheck.result === "nil_defects"
                      ? "Nil defects"
                      : "Defects reported"}{" "}
                    · {home.vehicle.lastCompletedCheck.odometer.toLocaleString()} miles
                  </span>
                </span>
                <b className="self-center text-xs font-bold text-link">View</b>
              </Link>
            ) : null}

            <Link
              to="/checks/history"
              className="grid grid-cols-[1fr_auto] gap-3 border-b border-border py-3.5"
              onClick={() => setHistoryOpen(false)}
            >
              <span>
                <strong className="block text-sm">Full check history</strong>
                <span className="mt-0.5 block text-xs text-muted">
                  Open previous vehicle checks for this duty cycle
                </span>
              </span>
              <b className="self-center text-xs font-bold text-link">Open</b>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
