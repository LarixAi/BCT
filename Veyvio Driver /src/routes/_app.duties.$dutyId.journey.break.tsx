import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getHeadingStop, resolveJourneyIdForCommands } from "@/domain/journey/journey-helpers";
import { formatTime } from "@/lib/utils";
import { useDriverStore } from "@/store/driver";
import { dispatchOperationalCommand } from "@/domain/ops/dispatch-operational-command";
import { buildActiveJourneyHomeSummary, buildOnBreakHomeSummary } from "@/data/mocks/home-summary";

export const Route = createFileRoute("/_app/duties/$dutyId/journey/break")({
  head: () => ({ meta: [{ title: "Rest break — Veyvio Driver" }] }),
  component: JourneyBreakPage,
});

function elapsedLabel(startedAt: string, nowMs: number): string {
  const mins = Math.max(0, Math.floor((nowMs - new Date(startedAt).getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m} min`;
  return `${h}h ${m}m`;
}

function JourneyBreakPage() {
  const { dutyId } = Route.useParams();
  const navigate = useNavigate();
  const loadDuty = useDriverStore((s) => s.loadDuty);
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const next = duty ? getHeadingStop(duty) : null;
  const [acting, setActing] = useState<"start" | "end" | null>(null);
  const [tick, setTick] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadDuty(dutyId);
  }, [dutyId, loadDuty]);

  useEffect(() => {
    if (!duty?.activeBreak) return;
    const id = window.setInterval(() => setTick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [duty?.activeBreak]);

  if (!duty) return <p className="text-sm text-muted">Loading break…</p>;

  const breakState = duty.activeBreak;
  const minMinutes = breakState?.minMinutes ?? 30;
  const startedLabel = breakState
    ? new Date(breakState.startedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : null;

  async function startBreak() {
    setActing("start");
    setError(null);
    try {
      const journeyId = resolveJourneyIdForCommands(duty);
      await dispatchOperationalCommand({
        type: "journey.break.start",
        payload: {
          dutyId,
          journeyId,
          startedAt: new Date().toISOString(),
          locationLabel: "Safe lay-by / authorised location",
          minMinutes: 30,
        },
        idempotencyKey: `break.start.${dutyId}.${journeyId}.${Date.now()}`,
      });
      await loadDuty(dutyId);
      useDriverStore.setState({ homeSummary: buildOnBreakHomeSummary(dutyId) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start break.");
    } finally {
      setActing(null);
    }
  }

  async function endBreak() {
    if (!breakState) return;
    setActing("end");
    setError(null);
    try {
      await dispatchOperationalCommand({
        type: "journey.break.end",
        payload: {
          dutyId,
          journeyId: breakState.journeyId,
          endedAt: new Date().toISOString(),
        },
        idempotencyKey: `break.end.${dutyId}.${breakState.journeyId}.${breakState.startedAt}`,
      });
      await loadDuty(dutyId);
      useDriverStore.setState({ homeSummary: buildActiveJourneyHomeSummary() });
      void navigate({ to: "/duties/$dutyId/journey/active", params: { dutyId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not end break.");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="animate-in-up space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Rest break</p>
          <h1 className="font-display text-xl font-extrabold">
            {breakState ? "Break in progress" : "Start rest break"}
          </h1>
        </div>
        {breakState ? (
          <Badge variant="default" className="border-warn/40 bg-warn/10 text-warn">
            On break
          </Badge>
        ) : null}
      </header>

      {breakState ? (
        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Break started</p>
          <p className="mt-1 font-display text-3xl font-extrabold tabular-nums">{startedLabel}</p>
          <p className="mt-2 text-sm font-semibold">Elapsed {elapsedLabel(breakState.startedAt, tick)}</p>
          <p className="mt-2 text-sm text-muted">
            Company minimum {minMinutes} min
            {next
              ? ` · Next stop ${next.name.split("—")[0]?.trim()} at ${formatTime(next.plannedArrival)}`
              : ""}
          </p>
          {breakState.locationLabel ? (
            <p className="mt-2 text-xs text-muted">{breakState.locationLabel}</p>
          ) : null}
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
          Confirm passengers are off the vehicle (or journey allows a break), the vehicle is secure, and
          you are in a safe place before starting the timer. Elapsed time is saved to the duty record.
        </section>
      )}

      <div className="rounded-md border border-ok/30 bg-ok/5 p-3 text-sm text-ok">
        Vehicle secure · {duty.vehicle?.registrationNumber ?? "No vehicle"}
      </div>

      {error ? <p className="text-sm text-vor">{error}</p> : null}

      {breakState ? (
        <Button
          size="lg"
          className="h-12 w-full font-bold uppercase tracking-widest"
          disabled={acting !== null}
          onClick={() => void endBreak()}
        >
          {acting === "end" ? "Ending break…" : "End break and resume"}
        </Button>
      ) : (
        <Button
          size="lg"
          className="h-12 w-full font-bold uppercase tracking-widest"
          disabled={acting !== null}
          onClick={() => void startBreak()}
        >
          {acting === "start" ? "Starting…" : "Start break"}
        </Button>
      )}

      <Button asChild variant="ghost" className="w-full">
        <Link to={`/duties/${dutyId}/journey/active`}>Back to journey</Link>
      </Button>
    </div>
  );
}
