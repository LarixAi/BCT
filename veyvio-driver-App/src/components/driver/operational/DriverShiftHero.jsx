import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { formatDutyElapsed, formatDutyDuration } from "@/services/duty-timeline.service";
import { formatUkTime } from "@/lib/uk-locale";
import { formatWorkingHours } from "@/services/working-time.service";
import { op } from "@/lib/driver-operational-theme";

function formatSignOnTime(iso) {
  if (!iso) return null;
  return formatUkTime(iso);
}

export default function DriverShiftHero({
  dutyState,
  workingTime,
  dispatchLabel,
  dispatchBlocked,
  vehicleRegistration,
}) {
  const signedOn = Boolean(dutyState?.isSignedOn);
  const shiftEnded = Boolean(dutyState?.isShiftEnded);
  const [elapsed, setElapsed] = useState("0:00");

  useEffect(() => {
    if (!signedOn || !dutyState?.shift?.signOnAt || dutyState.shift.signOffAt) return undefined;
    const tick = () => setElapsed(formatDutyElapsed(dutyState.shift.signOnAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [signedOn, dutyState?.shift?.signOnAt, dutyState?.shift?.signOffAt]);

  const durationLabel = shiftEnded
    ? formatDutyDuration(dutyState.shift.signOnAt, dutyState.shift.signOffAt)
    : signedOn
      ? elapsed
      : null;

  const reg =
    dutyState?.primaryVehicle?.registration ??
    vehicleRegistration ??
    null;

  return (
    <Link
      to="/duty"
      className={`block p-4 min-h-[44px] ${op.card} active:bg-muted/60 border-l-4 ${
        signedOn ? "border-l-emerald-500" : shiftEnded ? "border-l-muted-foreground/40" : "border-l-[#1eaeae]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">My duty</p>
          <p className="text-2xl font-bold tabular-nums mt-0.5 text-foreground">
            {durationLabel ?? "Not signed on"}
          </p>
          <p className="text-sm text-muted-foreground mt-1 leading-snug">
            {signedOn ? (
              <>
                Since {formatSignOnTime(dutyState.shift.signOnAt)}
                {reg ? ` · ${reg}` : ""}
              </>
            ) : shiftEnded ? (
              <>
                Shift ended {formatSignOnTime(dutyState.shift.signOffAt)}
                {reg ? ` · ${reg}` : ""}
              </>
            ) : dutyState?.scheduledStartLabel || dutyState?.scheduledStart ? (
              <>
                Next duty {dutyState.scheduledStartLabel ?? dutyState.scheduledStart}
                {dutyState?.nextTrip?.name ? ` · ${dutyState.nextTrip.name}` : ""}
                {reg ? ` · ${reg}` : ""}
              </>
            ) : (
              "No duty published for today yet"
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span
              className={`text-xs font-medium rounded-full px-2.5 py-1 border ${
                dispatchBlocked
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-[#8ec63f]/10 border-[#8ec63f]/25 text-[#6fa82e]"
              }`}
            >
              {dispatchLabel}
            </span>
            {workingTime ? (
              <span className="text-xs font-medium rounded-full px-2.5 py-1 border border-border bg-muted/50 text-foreground">
                {formatWorkingHours(workingTime.projectedHours)} this week ·{" "}
                {formatWorkingHours(workingTime.remainingHours)} left
              </span>
            ) : null}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-[#1eaeae] shrink-0 mt-1" aria-hidden />
      </div>
    </Link>
  );
}
