import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SAY_OR_DO_SCENARIOS } from "@/domain/passenger/passenger-training";
import { useTrainingStore } from "@/store/training";
import { cn } from "@/lib/utils";

export function SayOrDoScenariosPanel() {
  const completedIds = useTrainingStore((s) => s.progress.completedScenarioIds);
  const completeScenario = useTrainingStore((s) => s.completeScenario);
  const [index, setIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const scenario = SAY_OR_DO_SCENARIOS[index];
  const selectedOption = scenario?.options.find((option) => option.id === selectedOptionId);
  const scenarioComplete = scenario ? completedIds.includes(scenario.id) : false;

  function pickOption(optionId: string) {
    if (!scenario || scenarioComplete) return;
    setSelectedOptionId(optionId);
    const option = scenario.options.find((item) => item.id === optionId);
    if (option?.correct) {
      completeScenario(scenario.id);
    }
  }

  function goToScenario(nextIndex: number) {
    setIndex(nextIndex);
    setSelectedOptionId(null);
  }

  if (!scenario) return null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Read the situation, choose what you would say or do, then read the feedback before moving on.
      </p>

      <div className="flex flex-wrap gap-2">
        {SAY_OR_DO_SCENARIOS.map((item, scenarioIndex) => (
          <span
            key={item.id}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
              completedIds.includes(item.id)
                ? "bg-ok/15 text-ok"
                : scenarioIndex === index
                  ? "bg-link/15 text-link"
                  : "bg-secondary text-muted",
            )}
          >
            {completedIds.includes(item.id) && <Check className="size-3" aria-hidden />}
            {item.passengerName}
          </span>
        ))}
      </div>

      <article className="space-y-3 rounded-xl border border-border bg-card p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Scenario {index + 1}</p>
        <h2 className="font-display text-lg font-extrabold">{scenario.title}</h2>
        <p className="text-sm text-muted">{scenario.context}</p>

        <div className="space-y-2">
          {scenario.options.map((option) => {
            const picked = selectedOptionId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                disabled={scenarioComplete && !picked}
                onClick={() => pickOption(option.id)}
                className={cn(
                  "flex min-h-12 w-full items-start rounded-xs border px-3 py-3 text-left text-sm transition-colors",
                  picked
                    ? option.correct
                      ? "border-ok bg-ok/10"
                      : "border-vor bg-vor/10"
                    : "border-border bg-card hover:bg-secondary/40",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {selectedOption && (
          <div
            className={cn(
              "rounded-xl px-4 py-3 text-sm",
              selectedOption.correct ? "border border-ok/25 bg-ok/5" : "border border-vor/25 bg-vor/5",
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Feedback</p>
            <p className="mt-1">{selectedOption.feedback}</p>
          </div>
        )}
      </article>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={index === 0}
          onClick={() => goToScenario(index - 1)}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <p className="text-xs text-muted">
          {completedIds.length} of {SAY_OR_DO_SCENARIOS.length} completed
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={index >= SAY_OR_DO_SCENARIOS.length - 1}
          onClick={() => goToScenario(index + 1)}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
