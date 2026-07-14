import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useYard } from "@/store/yard";
import { RegPlate, SectionHeader, EmptyState } from "@/components/yard/primitives";
import { yardCopy } from "@/copy/yard-messages";
import { pendingDamageReviews } from "@/domain/condition/condition-helpers";
import { computeEvidenceSimilarityHint, findDuplicateDamageCandidates } from "@/domain/condition/evidence-similarity";
import { SimilarityHintPanel } from "@/components/condition/SimilarityHintPanel";
import { formatDamageRef } from "@/domain/condition/condition-helpers";
import { OBSERVATION_LABELS, type ObservationClassification } from "@/types/condition";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardCheck, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/inspections/damage-review")({
  head: () => ({
    meta: [{ title: "Damage Review — Veyvio Yard" }],
  }),
  component: DamageReviewQueue,
});

function DamageReviewQueue() {
  const vehicles = useYard(s => s.vehicles);
  const observations = useYard(s => s.damageObservations);
  const reviews = useYard(s => s.damageReviews);
  const trips = useYard(s => s.trips);
  const reviewDamage = useYard(s => s.reviewDamageObservation);
  const damageRecords = useYard(s => s.damageRecords);

  const queue = useMemo(() => pendingDamageReviews(observations, reviews), [observations, reviews]);
  const [activeId, setActiveId] = useState<string | null>(queue[0]?.id ?? null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!queue.some(o => o.id === activeId)) {
      setActiveId(queue[0]?.id ?? null);
    }
  }, [queue, activeId]);

  const active = queue.find(o => o.id === activeId);

  const activeHint = useMemo(() => {
    if (!active) return null;
    return computeEvidenceSimilarityHint({
      vehicleId: active.vehicleId,
      zoneId: active.zoneId,
      damageType: active.damageType,
      observedAt: active.observedAt,
      description: active.description,
      reportSource: active.reportSource,
      damageRecords,
    });
  }, [active, damageRecords]);

  const duplicateCandidates = useMemo(
    () => (active ? findDuplicateDamageCandidates(active, damageRecords) : []),
    [active, damageRecords],
  );

  const submitReview = (decision: ObservationClassification) => {
    if (!active) return;
    reviewDamage(active.id, decision, {
      notes,
      createNewDamage: decision === "new_not_reported",
      linkedDamageId: active.damageId ?? activeHint?.matchedDamageId,
    });
    toast.success(yardCopy.toast.inspection.reviewRecorded);
    setNotes("");
    setActiveId(queue.find(o => o.id !== active.id)?.id ?? null);
  };

  return (
    <div className="space-y-5 animate-in-up pb-8">
      <Link to="/inspections" className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
        ← Inspections
      </Link>

      <header>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-xl font-extrabold uppercase tracking-tight">Damage review</h1>
          <span className="px-2 py-0.5 rounded-sm bg-warn/15 border border-warn/40 text-warn text-xs font-bold tabular-nums">
            {queue.length}
          </span>
        </div>
        <p className="text-sm text-muted mt-1">Triage driver and yard reports — compare evidence before deciding.</p>
      </header>

      {queue.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="size-8 mx-auto" />}
          title={yardCopy.empty.noDamageReview}
          hint={yardCopy.empty.noDamageReviewHint}
          action={
            <Link to="/simulate/driver-report" className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">
              Simulate a driver report →
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4 lg:gap-6">
          <div className="space-y-2">
            <SectionHeader title="In queue" />
            {queue.map(o => {
              const v = vehicles.find(x => x.id === o.vehicleId);
              const trip = trips.find(t => t.id === o.tripId);
              const waiting = Math.round((Date.now() - new Date(o.observedAt).getTime()) / 60000);
              const selected = activeId === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setActiveId(o.id)}
                  className={`w-full text-left rounded-sm border p-3.5 shadow-sm transition-all min-h-[88px] ${
                    selected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border bg-white hover:border-primary/30 hover:shadow-md"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    {v && <RegPlate reg={v.reg} />}
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted shrink-0">
                      <Clock className="size-3" /> {waiting}m
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-semibold capitalize">
                    {o.reportSource.replace(/_/g, " ")} · {o.reportedBy}
                  </div>
                  <p className="text-sm text-muted mt-1 line-clamp-2 leading-snug">{o.description}</p>
                  {trip && <p className="text-[10px] text-muted mt-1.5">Trip {trip.code}</p>}
                </button>
              );
            })}
          </div>

          {active && (
            <div className="lg:sticky lg:top-20 space-y-4">
              <div className="bg-white border border-border rounded-sm shadow-sm p-4 sm:p-5 space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Reviewing</p>
                  <p className="text-base font-medium mt-1 leading-relaxed">{active.description}</p>
                </div>

                <p className="text-xs text-muted leading-relaxed border-l-2 border-primary/30 pl-3">
                  Compare with the condition record before deciding. This records an investigation outcome — it does not assign blame to the driver.
                </p>

                {activeHint && <SimilarityHintPanel hint={activeHint} vehicleId={active.vehicleId} compact />}

                {duplicateCandidates.length > 0 && (
                  <div className="bg-warn/10 border border-warn/40 rounded-sm p-3 text-xs">
                    <div className="font-bold uppercase tracking-widest text-[10px] text-warn">Possible duplicates</div>
                    <ul className="mt-2 space-y-1">
                      {duplicateCandidates.map(d => (
                        <li key={d.id}>
                          <Link
                            to="/yard/$vehicleId/condition/damage/$damageId"
                            params={{ vehicleId: active.vehicleId, damageId: d.id }}
                            className="hover:underline font-medium"
                          >
                            {formatDamageRef(d.id)} — {d.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Link
                  to="/yard/$vehicleId/condition/compare"
                  params={{ vehicleId: active.vehicleId }}
                  search={{ zoneId: active.zoneId }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary hover:underline"
                >
                  <ExternalLink className="size-3.5" /> Compare zone evidence
                </Link>

                <Textarea
                  placeholder="Investigation notes (optional)…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="min-h-[80px] text-sm"
                />

                {activeHint && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full text-xs font-bold uppercase tracking-widest"
                    onClick={() => submitReview(activeHint.suggestedClassification)}
                  >
                    Apply hint: {OBSERVATION_LABELS[activeHint.suggestedClassification]}
                  </Button>
                )}

                <div className="space-y-2 pt-1 border-t border-border">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Or choose manually</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button onClick={() => submitReview("existing_unchanged")} variant="outline" className="text-xs h-11">
                      Existing — unchanged
                    </Button>
                    <Button onClick={() => submitReview("existing_worsened")} variant="outline" className="text-xs h-11">
                      Existing — worsened
                    </Button>
                    <Button
                      onClick={() => submitReview("new_not_reported")}
                      className="text-xs h-11 bg-vor hover:bg-vor/90 text-white sm:col-span-2"
                    >
                      New — not previously reported
                    </Button>
                    <Button onClick={() => submitReview("possible_new_review")} variant="outline" className="text-xs h-11 sm:col-span-2">
                      Unclear — needs more review
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
