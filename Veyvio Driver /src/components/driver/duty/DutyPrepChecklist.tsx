import { cn } from "@/lib/utils";
import type { DutyPrepStep } from "@/domain/duty/duty-prep-steps";

export function DutyPrepChecklist({ steps }: { steps: DutyPrepStep[] }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Before this journey</p>
      <ol className="mt-3 space-y-2">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={cn(
              "flex gap-3 rounded-md border px-3 py-2.5",
              step.current && "border-link bg-driver-blue-soft",
              step.done && !step.current && "border-ok/30 bg-ok/5",
              !step.done && !step.current && "border-border bg-background",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                step.done && "bg-ok text-white",
                step.current && "bg-link text-white",
                !step.done && !step.current && "bg-secondary text-muted",
              )}
            >
              {step.done ? "✓" : index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold">{step.label}</p>
              <p className="text-xs text-muted">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
