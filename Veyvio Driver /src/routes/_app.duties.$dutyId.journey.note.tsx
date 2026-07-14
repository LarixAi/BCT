import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getHeadingStop, resolveJourneyIdForCommands } from "@/domain/journey/journey-helpers";
import { formatTime } from "@/lib/utils";
import { useDriverStore } from "@/store/driver";
import { dispatchOperationalCommand } from "@/domain/ops/dispatch-operational-command";
import { getSessionSnapshot } from "@/platform/auth/session-store";

export const Route = createFileRoute("/_app/duties/$dutyId/journey/note")({
  head: () => ({ meta: [{ title: "Journey note — Veyvio Driver" }] }),
  component: JourneyNotePage,
});

function JourneyNotePage() {
  const { dutyId } = Route.useParams();
  const navigate = useNavigate();
  const loadDuty = useDriverStore((s) => s.loadDuty);
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const stop = duty ? getHeadingStop(duty) : null;
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!duty) return null;

  async function save() {
    const body = note.trim();
    if (!body) {
      setError("Enter a note before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const noteId = `note_${crypto.randomUUID?.() ?? Date.now()}`;
      await dispatchOperationalCommand({
        type: "journey.note.add",
        payload: {
          dutyId,
          journeyId: resolveJourneyIdForCommands(duty),
          stopId: stop?.id,
          noteId,
          body,
          recordedAt: new Date().toISOString(),
          recordedBy: getSessionSnapshot().user?.id ?? "driver",
        },
        idempotencyKey: `journey.note.${dutyId}.${noteId}`,
      });
      await loadDuty(dutyId);
      void navigate({ to: `/duties/${dutyId}/journey/active` });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-in-up space-y-4">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Journey note</p>
        <h1 className="font-display text-xl font-extrabold">{duty.routeName}</h1>
        <p className="mt-1 text-sm text-muted">Saved to the outbox and synced when online</p>
      </header>
      <div className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
          placeholder="What should Operations know about this journey?"
        />
      </div>
      {stop && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Attach to stop</p>
          <div className="mt-2 rounded-md border-2 border-link bg-driver-blue-soft p-3 text-sm font-semibold">
            {stop.name.split("—")[0]?.trim()} · {formatTime(stop.plannedArrival)}
          </div>
        </div>
      )}
      {duty.journeyNotes && duty.journeyNotes.length > 0 ? (
        <div className="rounded-md border border-border bg-card p-3 text-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Saved on this duty</p>
          <ul className="mt-2 space-y-1 text-muted">
            {duty.journeyNotes.slice(-3).map((n) => (
              <li key={n.id}>· {n.body}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {error ? <p className="text-sm text-vor">{error}</p> : null}
      <Button
        size="lg"
        className="h-12 w-full font-bold uppercase tracking-widest"
        disabled={saving || !note.trim()}
        onClick={() => void save()}
      >
        {saving ? "Saving…" : "Save note"}
      </Button>
      <Button asChild variant="ghost" className="w-full">
        <Link to={`/duties/${dutyId}/journey/active`}>Cancel</Link>
      </Button>
    </div>
  );
}
