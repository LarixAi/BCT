import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  advanceSwap,
  createSwapRequest,
  type VehicleSwapRequest,
  type VehicleSwapStatus,
} from "@veyvio/ops";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDriverStore } from "@/store/driver";
import { getSessionSnapshot } from "@/platform/auth/session-store";

const STEP_COPY: Record<VehicleSwapStatus, { title: string; detail: string }> = {
  requested: {
    title: "Swap requested",
    detail: "Operations has your request. Do not leave passengers until a replacement is approved.",
  },
  awaiting_ops: {
    title: "Waiting for Operations",
    detail: "A controller is finding a suitable replacement for remaining stops.",
  },
  replacement_identified: {
    title: "Replacement identified",
    detail: "WX21 FYV proposed · Bay D07. Confirm capacity and accessibility match.",
  },
  approved: {
    title: "Swap approved",
    detail: "Pause this journey on the current vehicle, then close readings before moving.",
  },
  paused: {
    title: "Journey paused",
    detail: "Current journey is paused. Close the old vehicle before verifying the replacement.",
  },
  old_vehicle_closed: {
    title: "Old vehicle closed",
    detail: "Proceed to the replacement vehicle and verify the assignment.",
  },
  replacement_verifying: {
    title: "Verify replacement",
    detail: "Confirm WX21 FYV is the assigned vehicle before starting its walkaround.",
  },
  replacement_checking: {
    title: "Walkaround required",
    detail: "Complete the vehicle check for WX21 FYV. The previous check does not carry over.",
  },
  resumed: {
    title: "Ready to resume",
    detail: "Replacement verified and checked. Resume remaining pick ups and drop offs.",
  },
  cancelled: {
    title: "Swap cancelled",
    detail: "This swap was cancelled. Continue on the original vehicle if Ops confirms.",
  },
  rejected: {
    title: "Swap rejected",
    detail: "Operations could not approve a swap. Contact control for next steps.",
  },
};

export const Route = createFileRoute("/_app/duties/$dutyId/journey/swap")({
  head: () => ({ meta: [{ title: "Vehicle swap — Veyvio Driver" }] }),
  component: JourneySwapPage,
});

function JourneySwapPage() {
  const { dutyId } = Route.useParams();
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const driverId = getSessionSnapshot().user?.id ?? "driver";

  const [swap, setSwap] = useState<VehicleSwapRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const steps = useMemo(() => {
    if (!swap) return [];
    return [
      "requested",
      "awaiting_ops",
      "replacement_identified",
      "approved",
      "paused",
      "old_vehicle_closed",
      "replacement_verifying",
      "replacement_checking",
      "resumed",
    ] as VehicleSwapStatus[];
  }, [swap]);

  function startRequest() {
    if (!duty?.vehicle) return;
    const request = createSwapRequest({
      dutyId,
      journeyId: duty.primaryJourneyId ?? duty.runs[0]?.id ?? dutyId,
      fromVehicleId: duty.vehicle.id,
      fromRegistration: duty.vehicle.registrationNumber,
      reason: "Vehicle marked VOR during journey",
      currentSafetyStatus: duty.vehicle.vorStatus ? "VOR" : "held",
      requestedBy: driverId,
    });
    setSwap(advanceSwap(request, "awaiting_ops"));
    setError(null);
  }

  function advance(to: VehicleSwapStatus, patch?: Partial<VehicleSwapRequest>) {
    if (!swap) return;
    try {
      setSwap(advanceSwap(swap, to, patch));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot advance swap");
    }
  }

  if (!duty?.vehicle) {
    return <p className="text-sm text-muted">No vehicle on this duty.</p>;
  }

  if (!swap) {
    return (
      <div className="animate-in-up space-y-4">
        <div className="rounded-md border border-warn/30 bg-warn/5 p-3">
          <Badge variant="default" className="border-warn/40 bg-warn/10 text-warn">
            Vehicle swap needed
          </Badge>
          <p className="mt-2 text-sm text-warn">
            {duty.vehicle.registrationNumber} cannot continue. Request a controlled swap — Ops must approve a
            replacement before you resume.
          </p>
        </div>
        <p className="text-sm text-muted leading-relaxed">
          Accepting a swap is not a one-tap continue. You will pause this journey, close the current vehicle,
          verify the replacement, and complete a fresh walkaround.
        </p>
        <Button size="lg" className="h-12 w-full font-bold uppercase tracking-widest" onClick={startRequest}>
          Request vehicle swap
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link to={`/duties/${dutyId}/journey/active`}>Back to journey</Link>
        </Button>
      </div>
    );
  }

  const copy = STEP_COPY[swap.status];
  const stepIndex = steps.indexOf(swap.status);

  return (
    <div className="animate-in-up space-y-4">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
          Swap · step {Math.max(stepIndex, 0) + 1} of {steps.length}
        </p>
        <h1 className="font-display text-xl font-extrabold">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted">{copy.detail}</p>
      </header>

      <section className="rounded-xl border border-border bg-card p-4 text-sm space-y-2">
        <p>
          From <span className="font-mono font-bold">{swap.fromRegistration}</span>
        </p>
        {swap.replacementRegistration && (
          <p>
            To <span className="font-mono font-bold">{swap.replacementRegistration}</span>
            {swap.assignmentVersion ? ` · assignment v${swap.assignmentVersion}` : ""}
          </p>
        )}
        <p className="text-muted">{swap.reason}</p>
      </section>

      {error && <p className="text-sm text-vor">{error}</p>}

      {swap.status === "awaiting_ops" && (
        <Button
          size="lg"
          className="h-12 w-full font-bold uppercase tracking-widest"
          onClick={() =>
            advance("replacement_identified", {
              replacementVehicleId: "veh_wx21",
              replacementRegistration: "WX21 FYV",
            })
          }
        >
          Ops: identify replacement (demo)
        </Button>
      )}

      {swap.status === "replacement_identified" && (
        <Button
          size="lg"
          className="h-12 w-full font-bold uppercase tracking-widest"
          onClick={() =>
            advance("approved", {
              approvedBy: "ops_controller",
              approvedAt: new Date().toISOString(),
              accessibilityValidated: true,
              capacityValidated: true,
              assignmentVersion: 2,
            })
          }
        >
          Ops: approve replacement (demo)
        </Button>
      )}

      {swap.status === "approved" && (
        <Button size="lg" className="h-12 w-full font-bold uppercase tracking-widest" onClick={() => advance("paused")}>
          Pause journey on {swap.fromRegistration}
        </Button>
      )}

      {swap.status === "paused" && (
        <Button
          size="lg"
          className="h-12 w-full font-bold uppercase tracking-widest"
          onClick={() => advance("old_vehicle_closed")}
        >
          Close readings on old vehicle
        </Button>
      )}

      {swap.status === "old_vehicle_closed" && (
        <Button
          size="lg"
          className="h-12 w-full font-bold uppercase tracking-widest"
          onClick={() => advance("replacement_verifying")}
        >
          Verify WX21 FYV assignment
        </Button>
      )}

      {swap.status === "replacement_verifying" && (
        <Button
          size="lg"
          className="h-12 w-full font-bold uppercase tracking-widest"
          onClick={() => advance("replacement_checking")}
        >
          Open walkaround for replacement
        </Button>
      )}

      {swap.status === "replacement_checking" && (
        <div className="space-y-2">
          <Button asChild size="lg" className="h-12 w-full font-bold uppercase tracking-widest">
            <Link to="/checks">Complete vehicle check</Link>
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full font-bold uppercase tracking-widest"
            onClick={() => advance("resumed")}
          >
            Mark check complete (demo)
          </Button>
        </div>
      )}

      {swap.status === "resumed" && (
        <Button asChild size="lg" className="h-12 w-full font-bold uppercase tracking-widest">
          <Link to={`/duties/${dutyId}/journey/active`}>Resume remaining journey</Link>
        </Button>
      )}

      <Button asChild variant="ghost" className="w-full">
        <Link to={`/duties/${dutyId}/journey/active`}>Back to journey</Link>
      </Button>
    </div>
  );
}
