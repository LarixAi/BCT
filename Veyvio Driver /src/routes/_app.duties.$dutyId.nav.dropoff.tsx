import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  DROPOFF_OUTCOME_LABELS,
  dropoffRequiresReason,
  type PassengerDropoffOutcome,
} from "@veyvio/ops";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NavShell } from "@/components/driver/journey/NavShell";
import { getHeadingStop } from "@/domain/journey/journey-helpers";
import { formatTime } from "@/lib/utils";
import { useDriverStore } from "@/store/driver";
import { dispatchOperationalCommand } from "@/domain/ops/dispatch-operational-command";
import { getSessionSnapshot } from "@/platform/auth/session-store";
import { useNavigationStore } from "@/store/navigation";

const DROPOFF_OPTIONS: PassengerDropoffOutcome[] = [
  "handed_over",
  "independent_drop_off",
  "handover_delayed",
  "authorised_person_absent",
  "drop_off_refused",
  "alternative_drop_off_authorised",
  "safeguarding_escalation",
];

export const Route = createFileRoute("/_app/duties/$dutyId/nav/dropoff")({
  head: () => ({ meta: [{ title: "Drop-off — Veyvio Driver" }] }),
  component: NavDropoffPage,
});

function NavDropoffPage() {
  const { dutyId } = Route.useParams();
  const navigate = useNavigate();
  const loadDuty = useDriverStore((s) => s.loadDuty);
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const stop = duty ? getHeadingStop(duty) : null;
  const dropoffTask = stop?.passengerTasks.find((t) => t.type === "dropoff");
  const [outcome, setOutcome] = useState<PassengerDropoffOutcome>("handed_over");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function confirm() {
    if (!stop || !duty || !dropoffTask) return;
    if (dropoffRequiresReason(outcome) && !notes.trim()) return;
    setSaving(true);
    try {
      await dispatchOperationalCommand({
        type: "passenger.outcome",
        payload: {
          dutyId,
          stopId: stop.id,
          journeyId: duty.primaryJourneyId ?? duty.runs[0]?.id,
          passengerId: dropoffTask.passengerId,
          taskId: dropoffTask.id,
          type: "dropoff",
          dropoffOutcome: outcome,
          notes: notes.trim() || undefined,
          recordedAt: new Date().toISOString(),
          recordedBy: getSessionSnapshot().user?.id ?? "driver",
        },
        idempotencyKey: `pax.${stop.id}.${dropoffTask.passengerId}.${outcome}.${Date.now()}`,
      });
      await loadDuty(dutyId);
      useNavigationStore.getState().clearRoute(dutyId);
      const refreshed = useDriverStore.getState().getDuty(dutyId);
      if (refreshed) {
        void useNavigationStore.getState().loadRoute(dutyId, refreshed);
      }

      if (outcome === "handover_delayed") {
        return;
      }
      void navigate({ to: "/duties/$dutyId/nav/depart", params: { dutyId } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <NavShell
      dutyId={dutyId}
      eta="Arrived"
      nextStop={stop?.name ?? "Drop off"}
      footer={
        <div className="space-y-3 text-center">
          <Badge variant="default">Drop off</Badge>
          <h1 className="font-display text-xl font-extrabold">{stop?.name ?? "Destination"}</h1>
          <p className="text-sm text-muted">
            {dropoffTask?.passengerName ?? "Passenger"} · Scheduled{" "}
            {stop ? formatTime(stop.plannedArrival) : "—"}
          </p>
          <div className="space-y-2 text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Drop-off outcome
            </p>
            {DROPOFF_OPTIONS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOutcome(o)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                  outcome === o ? "border-link bg-driver-blue-soft font-bold" : "border-border bg-card"
                }`}
              >
                {DROPOFF_OUTCOME_LABELS[o]}
              </button>
            ))}
            {dropoffRequiresReason(outcome) ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes for Operations / safeguarding"
                className="min-h-20 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
              />
            ) : null}
          </div>
          <Button
            size="lg"
            className="h-12 w-full font-bold uppercase tracking-widest"
            disabled={saving || (dropoffRequiresReason(outcome) && !notes.trim()) || !dropoffTask}
            onClick={() => void confirm()}
          >
            {saving ? "Recording…" : "Confirm drop-off"}
          </Button>
        </div>
      }
    />
  );
}
