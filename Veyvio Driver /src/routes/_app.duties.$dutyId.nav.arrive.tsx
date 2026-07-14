import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  PICKUP_OUTCOME_LABELS,
  pickupRequiresReason,
  type PassengerPickupOutcome,
} from "@veyvio/ops";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NavShell } from "@/components/driver/journey/NavShell";
import { getHeadingStop, nextPassengerDetail } from "@/domain/journey/journey-helpers";
import { getProfileForStop } from "@/domain/passenger/passenger-pickup";
import { PassengerPickupBrief } from "@/components/driver/passengers/PassengerPickupBrief";
import { formatTime } from "@/lib/utils";
import { useDriverStore } from "@/store/driver";
import { enqueueDriverMutation } from "@/platform/driver/enqueue-driver-mutation";
import { getSessionSnapshot } from "@/platform/auth/session-store";
import { useNavigationStore } from "@/store/navigation";

const PICKUP_OPTIONS: PassengerPickupOutcome[] = [
  "boarded",
  "no_show",
  "not_ready",
  "refused",
  "unreachable",
  "unsafe_to_board",
  "transport_not_required",
];

export const Route = createFileRoute("/_app/duties/$dutyId/nav/arrive")({
  head: () => ({ meta: [{ title: "Arrive at pickup — Veyvio Driver" }] }),
  component: NavArrivePage,
});

function NavArrivePage() {
  const { dutyId } = Route.useParams();
  const navigate = useNavigate();
  const loadDuty = useDriverStore((s) => s.loadDuty);
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const stop = duty ? getHeadingStop(duty) : null;
  const pickupProfile = duty ? getProfileForStop(stop) : null;
  const [outcome, setOutcome] = useState<PassengerPickupOutcome>("boarded");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function confirm() {
    if (!stop || !duty) return;
    if (pickupRequiresReason(outcome) && !notes.trim()) return;
    setSaving(true);
    try {
      const passengerId =
        stop.passengerTasks.find((t) => t.type === "pickup")?.passengerId ??
        pickupProfile?.id ??
        "unknown";
      await enqueueDriverMutation(
        "passenger.outcome",
        {
          dutyId,
          stopId: stop.id,
          journeyId: duty.primaryJourneyId ?? duty.runs[0]?.id,
          passengerId,
          type: "pickup",
          pickupOutcome: outcome,
          notes: notes.trim() || undefined,
          recordedAt: new Date().toISOString(),
          recordedBy: getSessionSnapshot().user?.id ?? "driver",
        },
        `pax.${stop.id}.${passengerId}.${outcome}.${Date.now()}`,
      );
      // Pull completed stop + next approaching into the store, then refresh nav route target
      await loadDuty(dutyId);
      useNavigationStore.getState().clearRoute(dutyId);
      const refreshed = useDriverStore.getState().getDuty(dutyId);
      if (refreshed) {
        void useNavigationStore.getState().loadRoute(dutyId, refreshed);
      }

      if (outcome === "boarded" || outcome === "no_show" || outcome === "transport_not_required") {
        void navigate({ to: "/duties/$dutyId/nav/depart", params: { dutyId } });
      } else if (outcome === "not_ready") {
        // Stay on arrive — still waiting for this passenger
        return;
      } else {
        void navigate({ to: "/duties/$dutyId/nav/depart", params: { dutyId } });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <NavShell
      dutyId={dutyId}
      eta="Arrived"
      nextStop={stop?.name.split("—")[0]?.trim() ?? "Stop"}
      footer={
        <div className="space-y-3 text-center">
          <Badge variant="primary">Pick up</Badge>
          <h1 className="font-display text-xl font-extrabold">{stop?.name.split("—")[0]?.trim()}</h1>
          {stop && (
            <p className="text-sm text-muted">
              {nextPassengerDetail(stop)} · Scheduled {formatTime(stop.plannedArrival)}
            </p>
          )}
          {pickupProfile && (
            <div className="text-left">
              <PassengerPickupBrief dutyId={dutyId} profile={pickupProfile} />
            </div>
          )}
          <div className="space-y-2 text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Pickup outcome</p>
            {PICKUP_OPTIONS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOutcome(o)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                  outcome === o ? "border-link bg-driver-blue-soft font-bold" : "border-border bg-card"
                }`}
              >
                {PICKUP_OUTCOME_LABELS[o]}
              </button>
            ))}
            {pickupRequiresReason(outcome) && (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-input px-3 py-2 text-sm"
                placeholder="Reason for Operations"
              />
            )}
          </div>
          <Button
            size="lg"
            className="h-12 w-full font-bold uppercase tracking-widest"
            disabled={saving || (pickupRequiresReason(outcome) && !notes.trim())}
            onClick={() => void confirm()}
          >
            {outcome === "boarded" ? "Confirm passenger boarded" : "Record outcome"}
          </Button>
          <Link
            to="/duties/$dutyId/journey/active"
            params={{ dutyId }}
            className="block text-xs font-bold uppercase tracking-widest text-muted"
          >
            Cancel
          </Link>
        </div>
      }
    />
  );
}
