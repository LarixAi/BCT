import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DELAY_REASON_LABELS, type DelayReason } from "@veyvio/ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getHeadingStop, resolveJourneyIdForCommands } from "@/domain/journey/journey-helpers";
import { formatTime } from "@/lib/utils";
import { useDriverStore } from "@/store/driver";
import { getSessionSnapshot } from "@/platform/auth/session-store";
import { dispatchOperationalCommand } from "@/domain/ops/dispatch-operational-command";

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
  const loadDuty = useDriverStore((s) => s.loadDuty);
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const stop = duty ? getHeadingStop(duty) : null;
  const [reason, setReason] = useState<DelayReason>("traffic");
  const [minutes, setMinutes] = useState("8");
  const [note, setNote] = useState("");
  const [assistance, setAssistance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!duty) return <p className="text-sm text-muted">Loading…</p>;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const delayId = `delay_${crypto.randomUUID?.() ?? Date.now()}`;
      const journeyId = resolveJourneyIdForCommands(duty);
      await dispatchOperationalCommand({
        type: "delay.report",
        payload: {
          dutyId,
          journeyId,
          stopId: stop?.id,
          delayId,
          reason,
          estimatedMinutes: Number(minutes) || 0,
          expectedDelayMinutes: Number(minutes) || 0,
          note: note.trim() || undefined,
          locationLabel: stop?.name,
          location: stop
            ? { lat: stop.latitude, lng: stop.longitude, label: stop.name }
            : undefined,
          assistanceRequired: assistance,
          recordedAt: new Date().toISOString(),
          recordedBy: getSessionSnapshot().user?.id ?? "driver",
        },
        idempotencyKey: `delay.report.${dutyId}.${delayId}`,
      });
      await loadDuty(dutyId);
      void navigate({ to: `/duties/${dutyId}/journey/active` });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send delay report.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-in-up space-y-4">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Report delay</p>
        <h1 className="font-display text-xl font-extrabold">
          {stop?.name.split("—")[0]?.trim() ?? duty.routeName}
        </h1>
        {stop ? (
          <>
            <p className="mt-1 text-sm text-muted">{stop.address}</p>
            <p className="text-sm text-muted">Scheduled {formatTime(stop.plannedArrival)}</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">No active stop — delay still records against this journey.</p>
        )}
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
      <div className="space-y-2">
        <Label htmlFor="delay-note">Note (optional)</Label>
        <textarea
          id="delay-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-3 text-sm">
        <input type="checkbox" checked={assistance} onChange={(e) => setAssistance(e.target.checked)} />
        Assistance required from Operations
      </label>
      <p className="text-xs text-muted">
        One delay.report command — used from Home, journey, and Messages shortcuts.
      </p>
      {error ? <p className="text-sm text-vor">{error}</p> : null}
      <Button
        size="lg"
        className="h-12 w-full font-bold uppercase tracking-widest"
        disabled={saving}
        onClick={() => void submit()}
      >
        {saving ? "Sending…" : "Send delay to Operations"}
      </Button>
      <Button asChild variant="ghost" className="w-full">
        <Link to={`/duties/${dutyId}/journey/active`}>Cancel</Link>
      </Button>
    </div>
  );
}
