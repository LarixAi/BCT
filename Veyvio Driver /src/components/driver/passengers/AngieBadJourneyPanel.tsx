import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ANGIE_BAD_JOURNEY_BEATS, ANGIE_BAD_JOURNEY_INTRO } from "@/domain/passenger/passenger-training";
import { useTrainingStore } from "@/store/training";

export function AngieBadJourneyPanel() {
  const completeAngieBadJourney = useTrainingStore((s) => s.completeAngieBadJourney);
  const completed = useTrainingStore((s) => s.progress.angieBadJourneyCompleted);
  const [index, setIndex] = useState(0);

  const beat = ANGIE_BAD_JOURNEY_BEATS[index];
  const isLast = index >= ANGIE_BAD_JOURNEY_BEATS.length - 1;

  function finish() {
    completeAngieBadJourney();
  }

  if (!beat) return null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{ANGIE_BAD_JOURNEY_INTRO}</p>

      <div className="rounded-xl border border-vor/25 bg-vor/5 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-vor">Angie&apos;s journey</p>
        <p className="mt-1 font-display text-lg font-extrabold">{beat.heading}</p>
        <p className="mt-2 text-sm">{beat.narrative}</p>
      </div>

      {beat.angieQuote && (
        <blockquote className="rounded-xl border border-warn/25 bg-warn/5 px-4 py-3 text-sm leading-relaxed">
          &ldquo;{beat.angieQuote}&rdquo;
          <footer className="mt-2 text-sm font-semibold">— Angie</footer>
        </blockquote>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-vor/30 bg-vor/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-vor">What went wrong</p>
          <p className="mt-2 text-sm">{beat.wrongApproach}</p>
        </div>
        <div className="rounded-xl border border-ok/30 bg-ok/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ok">Better on shift</p>
          <p className="mt-2 text-sm">{beat.betterApproach}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" size="sm" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <p className="text-xs text-muted">
          {index + 1} of {ANGIE_BAD_JOURNEY_BEATS.length}
        </p>
        {isLast ? (
          <Button type="button" size="sm" onClick={finish} disabled={completed}>
            {completed ? "Completed" : "Mark complete"}
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setIndex((i) => i + 1)}>
            Next
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
