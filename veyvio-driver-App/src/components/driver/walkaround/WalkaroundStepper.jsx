const STEPS = [
  { id: "vehicle", label: "Vehicle" },
  { id: "checklist", label: "Checklist" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

function stepIndex(activeStep) {
  const map = { confirm: 0, checklist: 1, review: 2, result: 3 };
  return map[activeStep] ?? 0;
}

export default function WalkaroundStepper({ activeStep }) {
  const current = stepIndex(activeStep);

  return (
    <div className="px-4 py-3 border-b border-border bg-card">
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <div key={step.id} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  done
                    ? "bg-[#8ec63f] border-[#8ec63f] text-white"
                    : active
                      ? "border-[#1eaeae] text-[#1eaeae] bg-[#1eaeae]/10"
                      : "border-border text-muted-foreground bg-muted/30"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {done ? "✓" : index + 1}
              </div>
              <span
                className={`text-[10px] font-medium truncate w-full text-center ${
                  active ? "text-[#1eaeae]" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      {STEPS.map((_, index) => null)}
      <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-[#8ec63f] transition-all duration-300"
          style={{ width: `${((current + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
