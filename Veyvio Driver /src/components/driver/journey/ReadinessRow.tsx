import { cn } from "@/lib/utils";

export function ReadinessRow({
  label,
  detail,
  passed,
}: {
  label: string;
  detail: string;
  passed: boolean;
}) {
  return (
    <div className="flex gap-3 rounded-md border border-border bg-card p-3">
      <div
        className={cn(
          "grid size-[18px] shrink-0 place-items-center rounded-full text-[9px] font-extrabold",
          passed ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn",
        )}
        aria-hidden
      >
        {passed ? "✓" : "!"}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{detail}</p>
      </div>
    </div>
  );
}
