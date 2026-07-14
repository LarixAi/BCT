import type { TriStateAnswer } from "@veyvio/incidents";
import { triStateOptions } from "@veyvio/incidents";
import { cn } from "@/lib/utils";

export function TriStateField({
  label,
  value,
  onChange,
  helpText,
}: {
  label: string;
  value?: TriStateAnswer;
  onChange: (value: TriStateAnswer) => void;
  helpText?: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">{label}</legend>
      {helpText && <p className="text-xs text-muted">{helpText}</p>}
      <div className="grid grid-cols-2 gap-2">
        {triStateOptions().map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-12 rounded-xs border px-3 text-left text-sm font-medium transition-colors",
              value === option.value
                ? "border-link bg-link/10 text-foreground"
                : "border-border bg-card hover:bg-secondary/50",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
