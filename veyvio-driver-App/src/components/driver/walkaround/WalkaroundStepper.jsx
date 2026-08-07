const STEPS = [
  { id: "vehicle", label: "Vehicle" },
  { id: "checklist", label: "Checklist" },
  { id: "review", label: "Review" },
  { id: "done", label: "Submit" },
];

function stepIndex(activeStep) {
  const map = { confirm: 0, checklist: 1, review: 2, result: 3 };
  return map[activeStep] ?? 0;
}

export default function WalkaroundStepper({ activeStep }) {
  const current = stepIndex(activeStep);

  return (
    <div className="border-b border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <div key={step.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold ${
                  done
                    ? "border-[var(--ridova-lime)] bg-[var(--ridova-lime)] text-[var(--ridova-navy)]"
                    : active
                      ? "border-[var(--ridova-teal)] bg-[var(--ridova-teal)]/10 text-[var(--ridova-teal)]"
                      : "border-border bg-muted/30 text-muted-foreground"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {done ? "✓" : index + 1}
              </div>
              <span
                className={`w-full truncate text-center text-[10px] font-medium ${
                  active ? "text-[var(--ridova-teal)]" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-[var(--ridova-lime)] transition-all duration-300"
          style={{ width: `${((current + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
