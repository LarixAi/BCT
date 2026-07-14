import { cn } from "@/lib/utils";

export function AuthStepHeader({
  step,
  totalSteps,
  title,
  subtitle,
  className,
}: {
  step?: number;
  totalSteps?: number;
  title: string;
  subtitle: string;
  className?: string;
}) {
  return (
    <header className={cn("mb-5 space-y-2", className)}>
      {step != null && totalSteps != null && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
          Step {step} of {totalSteps}
        </p>
      )}
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
      <p className="text-sm leading-relaxed text-muted">{subtitle}</p>
    </header>
  );
}
