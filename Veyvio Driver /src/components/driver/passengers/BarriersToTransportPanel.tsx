import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BARRIERS_INTRO,
  BARRIER_CATEGORY_LABELS,
  BARRIER_PERSPECTIVES,
} from "@/domain/passenger/passenger-training";
import { useTrainingStore } from "@/store/training";
import { cn } from "@/lib/utils";
import type { BarrierPerspective } from "@/domain/passenger/passenger-barriers";

function PerspectiveQuote({ perspective }: { perspective: BarrierPerspective }) {
  return (
    <figure className="space-y-3">
      <blockquote className="rounded-xl border border-link/20 bg-link/5 px-4 py-3 text-sm leading-relaxed">
        &ldquo;{perspective.quote}&rdquo;
      </blockquote>
      <figcaption className="text-sm font-semibold">— {perspective.name}</figcaption>
      <div className="flex flex-wrap gap-2">
        {perspective.barrierCategories.map((category) => (
          <span
            key={category}
            className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted"
          >
            {BARRIER_CATEGORY_LABELS[category]}
          </span>
        ))}
      </div>
      <div className="rounded-xl border border-ok/25 bg-ok/5 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-ok">What to do on shift</p>
        <p className="mt-1 text-sm">{perspective.driverTakeaway}</p>
      </div>
    </figure>
  );
}

export function BarriersToTransportPanel({
  initialPerspectiveId,
}: {
  initialPerspectiveId?: string;
}) {
  const viewedIds = useTrainingStore((s) => s.progress.viewedBarrierIds);
  const markBarrierViewed = useTrainingStore((s) => s.markBarrierViewed);

  const initialIndex = Math.max(
    0,
    BARRIER_PERSPECTIVES.findIndex((item) => item.id === initialPerspectiveId),
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex === -1 ? 0 : initialIndex);

  const active = BARRIER_PERSPECTIVES[activeIndex];
  const allViewed = viewedIds.length >= BARRIER_PERSPECTIVES.length;

  useEffect(() => {
    if (!active) return;
    markBarrierViewed(active.id);
  }, [active?.id, markBarrierViewed]);

  function selectIndex(index: number) {
    setActiveIndex(index);
  }

  function step(delta: number) {
    setActiveIndex((prev) => {
      const next = prev + delta;
      if (next < 0) return 0;
      if (next >= BARRIER_PERSPECTIVES.length) return BARRIER_PERSPECTIVES.length - 1;
      return next;
    });
  }

  if (!active) return null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{BARRIERS_INTRO}</p>

      <div className="flex items-start gap-2 rounded-xl border border-link/25 bg-link/5 px-3 py-2.5 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-link" aria-hidden />
        <p>Select each name to read their experience and what to do differently.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,11rem)_1fr]">
        <ul className="space-y-2 rounded-xl border border-border bg-card p-2" aria-label="Passenger perspectives">
          {BARRIER_PERSPECTIVES.map((perspective, index) => {
            const selected = index === activeIndex;
            const viewed = viewedIds.includes(perspective.id);
            return (
              <li key={perspective.id}>
                <button
                  type="button"
                  onClick={() => selectIndex(index)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    selected ? "border-2 border-warn bg-warn/10 font-semibold" : "border border-transparent hover:bg-secondary/60",
                  )}
                >
                  <span>
                    {perspective.name}
                    {perspective.role === "parent_carer" && (
                      <span className="mt-0.5 block text-xs font-normal text-muted">Parent perspective</span>
                    )}
                  </span>
                  {viewed && <Check className="size-4 shrink-0 text-ok" aria-label="Viewed" />}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="min-w-0 rounded-xl border border-border bg-card p-4">
          <PerspectiveQuote perspective={active} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" size="sm" disabled={activeIndex === 0} onClick={() => step(-1)}>
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <p className="text-xs text-muted">
          {activeIndex + 1} of {BARRIER_PERSPECTIVES.length}
          {allViewed && " · All viewed"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={activeIndex >= BARRIER_PERSPECTIVES.length - 1}
          onClick={() => step(1)}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
