import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useDriverStore } from "@/store/driver";
import { driverCopy } from "@/copy/driver-messages";
import { canClockInDuty, canCompleteDuty } from "@/domain/duty/duty-state-machine";
import { getActiveJourney } from "@/domain/journey/journey-helpers";
import { getDriverEligibilityDecision, eligibilityGateCopy } from "@/domain/duty/driver-eligibility";
import { buildDutyPrepSteps, canShowAcknowledgeCard } from "@/domain/duty/duty-prep-steps";
import { DutyPrepChecklist } from "@/components/driver/duty/DutyPrepChecklist";
import { enqueueDriverMutation } from "@/platform/driver/enqueue-driver-mutation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTime } from "@/lib/utils";
import { uniquePassengerIdsFromDuty } from "@/domain/passenger/passenger-profiles";
import { PassengerManifestHomeCard } from "@/components/driver/passengers/PassengerPickupBrief";
import { SCHOOL_MORNING_JOURNEY } from "@veyvio/ops";
import { resetDutyPrepDemo } from "@/platform/dev/reset-duty-prep";
import { canSeedOperationalDemo } from "@/platform/dev/dev-guards";

export const Route = createFileRoute("/_app/duties/$dutyId/")({
  head: () => ({ meta: [{ title: "Duty — Veyvio Driver" }] }),
  component: DutyPage,
});

function DutyPage() {
  const { dutyId } = Route.useParams();
  const loadDuty = useDriverStore((s) => s.loadDuty);
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const [acting, setActing] = useState<string | null>(null);
  const [fitDeclared, setFitDeclared] = useState(false);

  useEffect(() => {
    void loadDuty(dutyId);
  }, [dutyId, loadDuty]);

  if (!duty) {
    return <p className="text-sm text-muted">Loading duty…</p>;
  }

  const activeRun = getActiveJourney(duty, duty.activeJourneyId);
  const nextStop = activeRun?.stops.find((s) => s.status !== "completed" && s.status !== "skipped");
  const completeGate = canCompleteDuty(duty);
  const passengerIds = uniquePassengerIdsFromDuty(duty.runs);
  const checkCleared = duty.vehicleCheck.status === "cleared" && duty.vehicleCheck.canStartDuty;
  const eligibility = getDriverEligibilityDecision();
  const eligibilityCopy = eligibilityGateCopy(eligibility);
  const clockGate = canClockInDuty({
    lifecycleStatus: duty.lifecycleStatus,
    vehicleVerified: duty.vehicleVerified,
    vehicleCheckCanStart: checkCleared,
    eligibility,
    alreadyClockedIn: Boolean(duty.clockedInAt),
  });
  const prepSteps = buildDutyPrepSteps(duty);
  const journeyHref = `/duties/${dutyId}/journey/open`;
  const displayRoute =
    duty.primaryJourneyId === SCHOOL_MORNING_JOURNEY.journeyId
      ? SCHOOL_MORNING_JOURNEY.displayName
      : duty.routeName;

  async function runAction(key: string, fn: () => Promise<void>) {
    setActing(key);
    try {
      await fn();
      await loadDuty(dutyId);
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="animate-in-up space-y-5">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{duty.reference}</p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">{driverCopy.duty.whatNext}</h1>
        <p className="mt-1 text-sm text-muted">{displayRoute}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="primary">{duty.lifecycleStatus.replace(/_/g, " ")}</Badge>
          {duty.clockedInAt && <Badge variant="ok">Clocked in</Badge>}
          {duty.vehicle && <Badge variant="default">{duty.vehicle.registrationNumber}</Badge>}
        </div>
      </header>

      <DutyPrepChecklist steps={prepSteps} />

      {duty.lifecycleStatus === "in_progress" && (
        <Card>
          <CardHeader>
            <CardTitle>Journey already in service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted">
              Prep is complete for this duty. Continue the active journey, or reset prep in DEV to walk the
              flow again.
            </p>
            <Button asChild className="h-12 w-full font-bold uppercase tracking-widest">
              <Link to={`/duties/${dutyId}/journey/active`}>Continue active journey</Link>
            </Button>
            {canSeedOperationalDemo() && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  resetDutyPrepDemo(dutyId);
                  void loadDuty(dutyId);
                }}
              >
                Reset prep (demo)
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {passengerIds.length > 0 && duty.lifecycleStatus !== "in_progress" && (
        <PassengerManifestHomeCard dutyId={dutyId} passengerIds={passengerIds} />
      )}

      {canShowAcknowledgeCard(duty) && (
        <Card>
          <CardHeader>
            <CardTitle>Acknowledge duty</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted">{duty.specialInstructions}</p>
            <Button
              className="h-12 w-full font-bold uppercase tracking-widest"
              disabled={acting === "ack"}
              onClick={() =>
                runAction("ack", () =>
                  enqueueDriverMutation("duty.acknowledge", { dutyId }, `duty.${dutyId}.ack`),
                )
              }
            >
              {driverCopy.buttons.acknowledgeDuty}
            </Button>
          </CardContent>
        </Card>
      )}

      {["ready", "acknowledged"].includes(duty.lifecycleStatus) && !duty.vehicleVerified && duty.vehicle && (
        <Card>
          <CardHeader>
            <CardTitle>Accept vehicle assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="font-mono font-bold">{duty.vehicle.registrationNumber}</p>
            <p>
              {duty.vehicle.make} {duty.vehicle.model} · {duty.vehicle.fleetNumber}
            </p>
            <p className="text-muted">{driverCopy.duty.vehicleVerifyRequired}</p>
            <Button
              className="h-12 w-full font-bold uppercase tracking-widest"
              disabled={acting === "verify"}
              onClick={() =>
                runAction("verify", () =>
                  enqueueDriverMutation("vehicle.verify", { dutyId, vehicleId: duty.vehicle!.id }),
                )
              }
            >
              {driverCopy.buttons.verifyVehicle}
            </Button>
          </CardContent>
        </Card>
      )}

      {duty.vehicleVerified && !checkCleared && duty.lifecycleStatus !== "completed" && (
        <Card>
          <CardHeader>
            <CardTitle>Vehicle check required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted">
              Open the walkaround for {duty.vehicle?.registrationNumber ?? "this vehicle"}. Completing
              another vehicle&apos;s check will not release this assignment.
            </p>
            {duty.vehicleCheck.pendingManagerAdvice && (
              <p className="text-sm text-warn">{driverCopy.duty.managerAdvice}</p>
            )}
            <Button asChild className="h-12 w-full font-bold uppercase tracking-widest">
              <Link to="/checks">Open vehicle check</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {eligibilityCopy.warning && (
        <p className="rounded-md border border-warn/30 bg-warn/5 px-3 py-2 text-sm text-warn">
          {eligibilityCopy.warning}
        </p>
      )}

      {["ready", "acknowledged"].includes(duty.lifecycleStatus) &&
        duty.vehicleVerified &&
        checkCleared &&
        !duty.clockedInAt && (
          <Card>
            <CardHeader>
              <CardTitle>Clock in — fit for duty</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted">
                Separate from the vehicle check: confirm you are fit and able to work before starting
                journeys on this duty.
              </p>
              <p className="text-xs text-muted">{eligibilityCopy.detail}</p>
              <label className="flex items-start gap-3 rounded-xs border border-border p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={fitDeclared}
                  onChange={(e) => setFitDeclared(e.target.checked)}
                />
                <span>
                  I am fit and able to work, hold the required credentials for this duty, and will not
                  drive if impairment or fatigue could affect safety.
                </span>
              </label>
              <Button
                className="h-14 w-full text-base font-bold uppercase tracking-widest"
                disabled={acting === "clock" || !fitDeclared || !clockGate.allowed}
                onClick={() =>
                  runAction("clock", () =>
                    enqueueDriverMutation(
                      "duty.clock_in",
                      { dutyId, fitForDutyDeclared: true },
                      `duty.${dutyId}.clock_in`,
                    ),
                  )
                }
              >
                Clock in to duty
              </Button>
              {!clockGate.allowed && clockGate.reason && (
                <p className="text-sm text-vor">{clockGate.reason}</p>
              )}
            </CardContent>
          </Card>
        )}

      {duty.clockedInAt && duty.lifecycleStatus !== "in_progress" && (
        <Card>
          <CardHeader>
            <CardTitle>Next journey</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted">
              You are clocked in. Start the next journey when ready — this does not start other journeys
              on the duty.
            </p>
            <Button asChild className="h-12 w-full font-bold uppercase tracking-widest">
              <Link to={journeyHref}>Open journey</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {duty.lifecycleStatus === "in_progress" && nextStop && (
        <Card>
          <CardHeader>
            <CardTitle>Next stop</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-display text-lg font-bold">{nextStop.name}</p>
            <p className="text-sm text-muted">{nextStop.address}</p>
            <p className="text-xs uppercase tracking-widest text-muted">
              Planned {formatTime(nextStop.plannedArrival)}
            </p>
            <Button
              className="w-full"
              disabled={acting === "arrive"}
              onClick={() =>
                runAction("arrive", () =>
                  enqueueDriverMutation("stop.arrive", {
                    dutyId,
                    stopId: nextStop.id,
                    arrivedAt: new Date().toISOString(),
                  }),
                )
              }
            >
              Mark arrival
            </Button>
          </CardContent>
        </Card>
      )}

      {duty.lifecycleStatus === "in_progress" && (
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            disabled={acting === "complete" || !completeGate.allowed}
            onClick={() =>
              runAction("complete", () =>
                enqueueDriverMutation("duty.complete", { dutyId }, `duty.${dutyId}.complete`),
              )
            }
          >
            {driverCopy.buttons.completeDuty}
          </Button>
          {!completeGate.allowed ? (
            <div className="rounded-md border border-warn/30 bg-warn/5 px-3 py-2 text-sm text-warn">
              <p className="font-bold">Cannot complete duty yet</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {completeGate.blockers.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
