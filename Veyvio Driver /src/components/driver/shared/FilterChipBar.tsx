import { cn } from "@/lib/utils";

export interface FilterChipOption<T extends string> {
  id: T;
  label: string;
}

export function FilterChipBar<T extends string>({
  options,
  active,
  onChange,
  label = "Filters",
  size = "md",
  className,
}: {
  options: FilterChipOption<T>[];
  active: T;
  onChange: (value: T) => void;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <nav
      className={cn("flex gap-2 overflow-x-auto pb-1", className)}
      aria-label={label}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "shrink-0 rounded-full border font-semibold transition-colors",
            size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm",
            active === option.id
              ? "border-primary bg-link/10 text-link"
              : "border-border bg-card text-muted hover:text-foreground",
          )}
          aria-current={active === option.id ? "true" : undefined}
        >
          {option.label}
        </button>
      ))}
    </nav>
  );
}
