import { useNavigate } from "@tanstack/react-router";
import { DutyPrepChecklist } from "@/components/driver/duty/DutyPrepChecklist";
import { PassengerManifestHomeCard } from "@/components/driver/passengers/PassengerPickupBrief";
import {
  resolveSheetPrimaryMode,
  useDutyPrepActions,
} from "@/features/duty/use-duty-prep-actions";
import { navigateSheetHref } from "@/features/duty/navigate-sheet-href";
import type { DutiesSheetSize, DutiesWorkspaceView } from "@/domain/trips/duties-workspace-view";
import { uniquePassengerIdsFromDuty } from "@/domain/passenger/passenger-profiles";
import { cn } from "@/lib/utils";

export function DutiesWorkspaceDutyPanel({
  dutyId,
  view,
  sheetSize,
}: {
  dutyId?: string;
  view: DutiesWorkspaceView;
  sheetSize: DutiesSheetSize;
}) {
  const navigate = useNavigate();
  const {
    duty,
    acting,
    fitDeclared,
    setFitDeclared,
    prepSteps,
    gates,
    acknowledge,
    verifyVehicle,
    clockIn,
  } = useDutyPrepActions(dutyId);

  const primaryMode = resolveSheetPrimaryMode(view.stage, duty ?? undefined);
  const passengerIds = duty ? uniquePassengerIdsFromDuty(duty.runs) : [];
  const showFitGate = view.stage === "clock_in";
  const clockBlocked =
    showFitGate && (!fitDeclared || (gates ? !gates.clockGate.allowed : true));

  async function onPrimaryMutation() {
    if (primaryMode.kind !== "mutation") return;
    if (primaryMode.action === "ack") await acknowledge();
    if (primaryMode.action === "verify") await verifyVehicle();
    if (primaryMode.action === "clock") await clockIn();
  }

  function onPrimaryHref(href: string) {
    navigateSheetHref(navigate, href);
  }

  const primaryBusy =
    (primaryMode.kind === "mutation" && primaryMode.action === "ack" && acting === "ack") ||
    (primaryMode.kind === "mutation" && primaryMode.action === "verify" && acting === "verify") ||
    (primaryMode.kind === "mutation" && primaryMode.action === "clock" && acting === "clock");

  const primaryDisabled =
    primaryMode.kind === "disabled" ||
    primaryBusy ||
    (primaryMode.kind === "mutation" && primaryMode.action === "clock" && clockBlocked) ||
    (primaryMode.kind === "mutation" && primaryMode.action === "verify" && !duty?.vehicle);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto px-[18px] pt-4">
        <div
          className={cn(
            "mb-2.5 inline-flex items-center rounded-full px-2.5 py-1.5 text-xs font-extrabold",
            view.toneClass === "ready" && "bg-[#ECFDF3] text-ok",
            view.toneClass === "warn" && "bg-[#FFF7ED] text-warn",
            view.toneClass === "critical" && "bg-[#FEF3F2] text-vor",
            !view.toneClass && "bg-driver-blue-soft text-link",
          )}
        >
          {view.toneLabel}
        </div>

        <h2 className="font-display text-[25px] font-extrabold leading-[1.08] tracking-[-0.035em]">
          {view.title}
        </h2>
        <p className="mt-2 text-sm leading-snug text-muted">{view.copy}</p>

        {view.showPrepProgress && sheetSize !== "collapsed" && sheetSize !== "expanded" ? (
          <div className="mt-[18px] grid grid-cols-5 gap-2">
            {(prepSteps.length ? prepSteps : view.prepSteps).map((step) => (
              <div key={step.id} className="min-w-0">
                <div
                  className={cn(
                    "mb-1.5 h-[5px] rounded-full bg-[#E4E7EC]",
                    step.done && "bg-ok",
                    step.current && "bg-link",
                  )}
                />
                <span
                  className={cn(
                    "block text-center text-[9px] leading-tight text-muted",
                    step.done && "font-bold text-ok",
                    step.current && "font-extrabold text-link",
                  )}
                >
                  {shortPrepLabel(step.id)}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {sheetSize !== "collapsed" ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="border-t border-border pt-2.5">
              <span className="block text-[11px] text-muted">{view.meta1.label}</span>
              <span className="mt-1 block text-sm font-extrabold">{view.meta1.value}</span>
            </div>
            <div className="border-t border-border pt-2.5">
              <span className="block text-[11px] text-muted">{view.meta2.label}</span>
              <span className="mt-1 block text-sm font-extrabold tabular-nums">{view.meta2.value}</span>
            </div>
          </div>
        ) : null}

        {showFitGate ? (
          <label className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-[#F9FAFB] p-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-4 shrink-0"
              checked={fitDeclared}
              onChange={(e) => setFitDeclared(e.target.checked)}
            />
            <span>
              I am fit and able to work, hold the required credentials for this duty, and will not
              drive if impairment or fatigue could affect safety.
            </span>
          </label>
        ) : null}

        {showFitGate && gates && !gates.clockGate.allowed && gates.clockGate.reason ? (
          <p className="mt-2 text-sm text-vor">{gates.clockGate.reason}</p>
        ) : null}

        {sheetSize === "expanded" ? (
          <div className="mt-5 space-y-5 pb-3">
            {(prepSteps.length ? prepSteps : view.prepSteps).length > 0 ? (
              <DutyPrepChecklist
                steps={prepSteps.length ? prepSteps : view.prepSteps}
                variant="sheet"
              />
            ) : null}

            {dutyId &&
            passengerIds.length > 0 &&
            duty?.lifecycleStatus !== "in_progress" ? (
              <PassengerManifestHomeCard dutyId={dutyId} passengerIds={passengerIds} />
            ) : null}

            {view.detailRows.length > 0 ? (
              <div className="border-t border-border pt-[18px]">
                <h3 className="mb-2.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-muted">
                  Duty details
                </h3>
                {view.detailRows.map((row) => (
                  <SheetRow key={row.title} {...row} onNavigate={(h) => navigateSheetHref(navigate, h)} />
                ))}
              </div>
            ) : null}

            {view.journeyRows.length > 0 ? (
              <div className="border-t border-border pt-[18px]">
                <h3 className="mb-2.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-muted">
                  Journeys
                </h3>
                {view.journeyRows.map((row) => (
                  <SheetRow key={row.title} {...row} onNavigate={(h) => navigateSheetHref(navigate, h)} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Sticky footer — secondary rows then primary (nav is docked below workspace) */}
      <div className="flex-none border-t border-border bg-white px-[18px] pb-4 pt-3">
        {sheetSize !== "collapsed" ? (
          <div className="mb-2.5 grid grid-cols-2 gap-2.5">
            {view.secondary1.href ? (
              <button
                type="button"
                onClick={() => navigateSheetHref(navigate, view.secondary1.href!)}
                className="flex min-h-11 items-center justify-center rounded-xl border border-border bg-white text-[13px] font-bold"
              >
                {view.secondary1.label}
              </button>
            ) : (
              <span className="flex min-h-11 items-center justify-center rounded-xl border border-border text-[13px] font-bold text-muted">
                {view.secondary1.label}
              </span>
            )}
            {view.secondary2.href ? (
              <button
                type="button"
                onClick={() => navigateSheetHref(navigate, view.secondary2.href!)}
                className="flex min-h-11 items-center justify-center rounded-xl border border-border bg-white text-[13px] font-bold"
              >
                {view.secondary2.label}
              </button>
            ) : (
              <span className="flex min-h-11 items-center justify-center rounded-xl border border-border text-[13px] font-bold text-muted">
                {view.secondary2.label}
              </span>
            )}
          </div>
        ) : null}

        {primaryMode.kind === "href" ? (
          <button
            type="button"
            onClick={() => onPrimaryHref(primaryMode.href)}
            className={cn(
              "flex min-h-[52px] w-full items-center justify-center rounded-[14px] text-sm font-extrabold uppercase tracking-wide text-white",
              view.primaryTone === "ready" && "bg-ok",
              view.primaryTone === "warn" && "bg-warn",
              view.primaryTone === "critical" && "bg-vor",
              !view.primaryTone && "bg-accent",
            )}
          >
            {view.primaryLabel}
          </button>
        ) : (
          <button
            type="button"
            disabled={primaryDisabled}
            onClick={() => void onPrimaryMutation()}
            className={cn(
              "flex min-h-[52px] w-full items-center justify-center rounded-[14px] text-sm font-extrabold uppercase tracking-wide text-white disabled:opacity-50",
              view.primaryTone === "ready" && "bg-ok",
              view.primaryTone === "warn" && "bg-warn",
              view.primaryTone === "critical" && "bg-vor",
              !view.primaryTone && "bg-accent",
            )}
          >
            {primaryBusy ? "Working…" : view.primaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function shortPrepLabel(id: string): string {
  switch (id) {
    case "acknowledge":
      return "Acknowledge";
    case "vehicle":
      return "Vehicle";
    case "check":
      return "Check";
    case "clock_in":
      return "Clock in";
    case "journey":
      return "Journey";
    default:
      return id;
  }
}

function SheetRow({
  title,
  subtitle,
  badge,
  href,
  onNavigate,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  href?: string;
  onNavigate: (href: string) => void;
}) {
  const body = (
    <>
      <span className="min-w-0">
        <strong className="block text-sm font-bold">{title}</strong>
        <span className="mt-0.5 block text-xs text-muted">{subtitle}</span>
      </span>
      {badge ? <b className="self-center text-xs font-bold text-link">{badge}</b> : null}
    </>
  );

  if (href) {
    return (
      <button
        type="button"
        onClick={() => onNavigate(href)}
        className="grid w-full grid-cols-[1fr_auto] gap-3 border-b border-border py-3.5 text-left"
      >
        {body}
      </button>
    );
  }

  return <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-border py-3.5">{body}</div>;
}
