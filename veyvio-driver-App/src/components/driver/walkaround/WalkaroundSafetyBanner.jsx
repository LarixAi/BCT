import { Link } from "react-router-dom";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatUkDateTime } from "@/lib/uk-locale";
import { op } from "@/lib/driver-operational-theme";

function formatTime(value) {
  return formatUkDateTime(value);
}

export default function WalkaroundSafetyBanner({ safety, loading }) {
  if (loading) {
    return (
      <div className={`${op.card} p-4 flex items-center gap-2 text-sm text-muted-foreground`}>
        <Loader2 className="w-4 h-4 animate-spin" /> Loading safety status…
      </div>
    );
  }

  if (!safety?.registration) {
    return (
      <div className={`${op.card} p-4`}>
        <p className="font-semibold text-foreground">No vehicle assigned</p>
        <p className="text-sm text-muted-foreground mt-1">Contact dispatch to assign a vehicle for today.</p>
      </div>
    );
  }

  if (safety.vehicleBlocked) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <p className="font-bold text-red-900">Vehicle blocked</p>
        <p className="text-sm text-red-800 mt-1">{safety.message}</p>
        <p className="text-xs text-red-800 mt-2">Vehicle: {safety.registration}</p>
        <Button asChild variant="outline" className="w-full mt-3 h-10 border-red-200 text-red-900">
          <Link to="/contact">Contact transport manager</Link>
        </Button>
      </div>
    );
  }

  if (safety.checkComplete) {
    const nilOk = safety.result === "nil_defect" || safety.result === "passed";
    const resultText =
      safety.resultLabel ??
      (safety.result === "nil_defect" ? "Nil defects" : safety.result === "failed" ? "Defects reported" : "Complete");

    return (
      <div className={`rounded-2xl border p-4 ${nilOk ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        <p className={`font-semibold ${nilOk ? "text-emerald-900" : "text-amber-900"}`}>Today&apos;s safety status</p>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Result</dt>
            <dd className="font-medium">{resultText}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Vehicle checked</dt>
            <dd className="font-medium">{safety.checkedRegistration ?? safety.registration}</dd>
          </div>
          {safety.checkOnDifferentVehicle && safety.assignedRegistration ? (
            <p className="text-xs text-emerald-800 mt-1">
              Assigned vehicle for jobs: {safety.assignedRegistration}
            </p>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Walkaround started</dt>
            <dd className="font-medium">{formatTime(safety.startedAt ?? safety.submittedAt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Route start</dt>
            <dd className="font-medium">{safety.routeStartAllowed ? "Allowed" : "Blocked"}</dd>
          </div>
        </dl>
        {safety.submittedAt && safety.submittedAt !== safety.startedAt ? (
          <p className="text-xs mt-2 opacity-80">Submitted {formatTime(safety.submittedAt)}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
          {safety.checkId ? (
            <Link to={`/check/history/${safety.checkId}`} className="text-[#1eaeae]">
              View today&apos;s check
            </Link>
          ) : null}
          <Link to="/check/history" className="text-[#1eaeae]">
            All check history
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <div className={op.iconWrapLime}>
          <ClipboardCheck className={`w-5 h-5 ${op.iconLime}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-950">Vehicle check required</p>
          <p className="text-sm text-amber-900 mt-1 leading-relaxed">
            Complete today&apos;s walkaround before starting{ safety.routeName ? ` ${safety.routeName}` : " your job"}.
          </p>
          <dl className="mt-2 text-xs text-amber-900 space-y-0.5">
            <div>Vehicle: <span className="font-semibold">{safety.registration}</span></div>
            {safety.routeName ? <div>Route: {safety.routeName}</div> : null}
            {safety.depotName ? <div>Depot: {safety.depotName}</div> : null}
          </dl>
        </div>
      </div>
      <Button asChild className={`w-full mt-4 h-11 ${op.primaryBtn}`}>
        <Link to="/check" className="flex items-center justify-center gap-2">
          <ClipboardCheck className="w-4 h-4" /> Start walkaround check
        </Link>
      </Button>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button asChild variant="outline" className="h-10 text-xs">
          <Link to="/defects">Report in-service defect</Link>
        </Button>
        <Button asChild variant="outline" className="h-10 text-xs">
          <Link to="/jobs">View jobs</Link>
        </Button>
      </div>
      <div className="mt-2">
        <Link to="/check/history" className="text-xs text-[#1eaeae] font-medium">
          View my submitted checks
        </Link>
      </div>
    </div>
  );
}
