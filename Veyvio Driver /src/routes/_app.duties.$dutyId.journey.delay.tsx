import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  createDelayEvent,
  DELAY_REASON_LABELS,
  type DelayReason,
} from "@veyvio/ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getHeadingStop } from "@/domain/journey/journey-helpers";
import { formatTime } from "@/lib/utils";
import { useDriverStore } from "@/store/driver";
import { getSessionSnapshot } from "@/platform/auth/session-store";
import { createPlatformEvent, globalPlatformEventBus } from "@veyvio/ops";
import { getTenancySnapshot } from "@/platform/tenancy/context-store";

const REASONS: DelayReason[] = [
  "traffic",
  "passenger_not_ready",
  "road_closure",
  "vehicle_issue",
  "weather",
  "other",
];

export const Route = createFileRoute("/_app/duties/$dutyId/journey/delay")({
  head: () => ({ meta: [{ title: "Report delay — Veyvio Driver" }] }),
  component: JourneyDelayPage,
});

function JourneyDelayPage() {
  const { dutyId } = Route.useParams();
  const navigate = useNavigate();
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const stop = duty ? getHeadingStop(duty) : null;
  const [reason, setReason] = useState<DelayReason>("traffic");
  const [minutes, setMinutes] = useState("8");
  const [assistance, setAssistance] = useState(false);

  if (!duty || !stop) return null;

  function submit() {
    const delay = createDelayEvent({
      dutyId,
      journeyId: duty!.primaryJourneyId ?? duty!.runs[0]?.id ?? dutyId,
      stopId: stop!.id,
      reason,
      expectedDelayMinutes: Number(minutes) || 0,
      reportedBy: getSessionSnapshot().user?.id ?? "driver",
      locationLabel: stop!.name,
      assistanceRequired: assistance,
    });

    const tenancy = getTenancySnapshot();
    if (tenancy.companyId && tenancy.depotId) {
      globalPlatformEventBus.publish(
        createPlatformEvent({
          eventType: "delay.reported",
          tenantId: tenancy.companyId,
          depotId: tenancy.depotId,
          actorId: delay.reportedBy,
          correlationId: delay.id,
          aggregateId: delay.journeyId,
          aggregateVersion: 1,
          payload: delay,
        }),
      );
    }

    void navigate({ to: `/duties/${dutyId}/journey/active` });
  }

  return (
    <div className="animate-in-up space-y-4">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Report delay</p>
        <h1 className="font-display text-xl font-extrabold">{stop.name.split("—")[0]?.trim() ?? stop.name}</h1>
        <p className="mt-1 text-sm text-muted">{stop.address}</p>
        <p className="text-sm text-muted">Scheduled {formatTime(stop.plannedArrival)}</p>
      </header>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Reason</p>
        <div className="mt-2 space-y-2">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`w-full rounded-md border px-3 py-3 text-left text-sm ${
                reason === r ? "border-link bg-driver-blue-soft font-bold" : "border-border bg-card"
              }`}
            >
              {DELAY_REASON_LABELS[r]}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="delay-min">Estimated delay (minutes)</Label>
        <Input id="delay-min" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="h-12" />
      </div>
      <label className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-3 text-sm">
        <input type="checkbox" checked={assistance} onChange={(e) => setAssistance(e.target.checked)} />
        Assistance required from Operations
      </label>
      <p className="text-xs text-muted">
        This creates a structured delay event for dispatch — not only a chat message.
      </p>
      <Button size="lg" className="h-12 w-full font-bold uppercase tracking-widest" onClick={submit}>
        Send delay to operations
      </Button>
      <p className="text-center text-xs text-muted">Passengers and yard will be notified</p>
      <Button asChild variant="ghost" className="w-full">
        <Link to={`/duties/${dutyId}/journey/active`}>Cancel</Link>
      </Button>
    </div>
  );
}
