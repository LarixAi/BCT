import { Link } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VehicleCheckSession, VehicleChecksHome } from "@/types/vehicle-check";
import { opsCheckOutcomeLabel, toOpsCheckOutcome } from "@/domain/vehicle-check/check-outcomes";

export function CheckResultScreen({
  session,
  home,
}: {
  session: VehicleCheckSession;
  home: VehicleChecksHome;
}) {
  const outcome = session.outcome;
  const opsOutcome = outcome ? toOpsCheckOutcome(outcome) : null;

  if (outcome === "nil_defects") {
    return (
      <div className="space-y-4">
        <header className="rounded-xl border border-ok/30 bg-ok/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ok">
            {opsOutcome ? opsCheckOutcomeLabel(opsOutcome) : "Released"}
          </p>
          <h1 className="font-display text-xl font-extrabold">Vehicle ready for service</h1>
          <p className="mt-2 text-sm text-muted">
            Check for {home.vehicle.registration} completed at{" "}
            {session.completedAt
              ? new Date(session.completedAt).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
            . This release applies only to this vehicle and assignment.
          </p>
        </header>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Vehicle</span>
            <span className="font-mono font-medium">{home.vehicle.registration}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Outcome</span>
            <span className="font-medium text-ok">
              {opsOutcome ? opsCheckOutcomeLabel(opsOutcome) : "Released — no defects"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Check reference</span>
            <span className="font-mono text-xs">{session.checkReference}</span>
          </div>
        </dl>

        <div className="space-y-2">
          {home.dutyId && (
            <Button asChild className="h-12 w-full">
              <Link to={`/duties/${home.dutyId}`}>Return to duty hub</Link>
            </Button>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link to="/checks">Return to checks</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/checks/history">View check record</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (outcome === "defect_awaiting_review") {
    const defect = session.defects[0];
    return (
      <div className="space-y-4">
        <header className="rounded-xl border border-warn/30 bg-warn/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-warn">
            {opsCheckOutcomeLabel("HELD_PENDING_REVIEW")}
          </p>
          <h1 className="font-display text-xl font-extrabold">Defect awaiting review</h1>
          <p className="mt-2 text-sm">Your defect has been sent to Operations and the yard.</p>
          <p className="mt-1 text-sm font-medium text-warn">
            Do not start a journey until Operations releases this vehicle.
          </p>
        </header>

        {defect && (
          <div className="rounded-lg border border-border p-3 text-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-muted">Issue</p>
            <p className="mt-1 font-medium">{defect.description}</p>
          </div>
        )}

        <div className="space-y-2">
          <Button className="h-12 w-full">
            <Phone className="size-4" />
            Contact Operations
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/checks/history">View report</Link>
          </Button>
        </div>
      </div>
    );
  }

  const defect = session.defects.find((d) => d.severity === "safety_critical") ?? session.defects[0];
  const offline = outcome === "offline_blocked" || session.syncStatus === "offline_saved";

  return (
    <div className="space-y-4">
      <header className="rounded-xl border border-vor/40 bg-vor/10 p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-vor">Do not drive</p>
        <h1 className="font-display text-xl font-extrabold text-vor">
          {offline
            ? opsCheckOutcomeLabel("CHECK_SUBMISSION_PENDING_SYNC")
            : opsCheckOutcomeLabel("VOR")}
        </h1>
        <p className="mt-2 text-sm">
          {offline
            ? "Your defect has been saved on this device. Do not drive this vehicle. Call Operations now."
            : "A safety-critical defect has been reported. This vehicle is VOR until Operations and Maintenance release it."}
        </p>
      </header>

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Vehicle</span>
          <span className="font-mono font-medium">{home.vehicle.registration}</span>
        </div>
        {defect && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted">Issue</p>
            <p className="mt-1 font-medium">{defect.description}</p>
          </div>
        )}
      </dl>

      <div className="space-y-2">
        <Button variant="destructive" className="h-12 w-full">
          <Phone className="size-4" />
          Call Yard
        </Button>
        <Button variant="outline" className="w-full">
          Request replacement vehicle
        </Button>
        {offline && (
          <Button variant="secondary" className="w-full">
            Try syncing again
          </Button>
        )}
      </div>
    </div>
  );
}
